/**
 * CafeOS Edge node-agent — lightweight host telemetry + remote action gateway.
 *
 * Responsibilities (v0.1):
 *  - expose /health for compose healthcheck
 *  - collect basic host metrics (CPU/RAM/disk/uptime/os) and API/DB health
 *  - expose an allowlist-gated remote action endpoint (local trust for now)
 *
 * Later phases: outbound-only mTLS to Cafe Cloud, signed command verification,
 * update orchestration, backup trigger. See docs/NODE-AGENT.md.
 */
import express, { Request, Response, NextFunction } from 'express';
import { loadConfig, nodeAgentEnvSchema } from '@cafeos/config';
import { Logger } from '@cafeos/shared';

const env = loadConfig(nodeAgentEnvSchema);
const logger = new Logger({ nodeId: env.NODE_ID, level: env.LOG_LEVEL });

/** Actions permitted by default (from REMOTE_ACTION_ALLOWLIST env). */
const allowlist = new Set(env.REMOTE_ACTION_ALLOWLIST.split(',').map((s) => s.trim()).filter(Boolean));

function nowIso(): string {
  return new Date().toISOString();
}

interface HostInfo {
  os: string;
  hostname: string;
  uptimeSeconds: number;
  cpuLoad1: number;
  cpuLoad5: number;
  ramUsedMb: number;
  ramTotalMb: number;
  diskUsedMb: number;
  diskTotalMb: number;
}

function collectHost(): HostInfo {
  const os = require('os');
  const loadavg = os.loadavg();
  const totalMem = os.totalmem() / 1024 / 1024;
  const freeMem = os.freemem() / 1024 / 1024;
  const diskUsed = process.platform === 'linux' ? readDiskUsed() : { used: 0, total: 0 };
  return {
    os: `${os.type()} ${os.release()}`,
    hostname: os.hostname(),
    uptimeSeconds: Math.floor(os.uptime()),
    cpuLoad1: loadavg[0],
    cpuLoad5: loadavg[1],
    ramUsedMb: Math.round(totalMem - freeMem),
    ramTotalMb: Math.round(totalMem),
    diskUsedMb: diskUsed.used,
    diskTotalMb: diskUsed.total,
  };
}

function readDiskUsed(): { used: number; total: number } {
  try {
    const { execSync } = require('child_process');
    const out = execSync("df -P / | tail -1", { encoding: 'utf8' });
    const parts = out.trim().split(/\s+/);
    const totalKb = parseInt(parts[1] ?? '0', 10);
    const usedKb = parseInt(parts[2] ?? '0', 10);
    return { used: usedKb / 1024, total: totalKb / 1024 };
  } catch {
    return { used: 0, total: 0 };
  }
}

async function checkApiHealth(): Promise<{ status: string; detail?: string }> {
  try {
    const res = await fetch(`${env.API_URL}/api/health/live`, { signal: AbortSignal.timeout(3000) });
    return res.ok ? { status: 'ok' } : { status: 'degraded', detail: `http ${res.status}` };
  } catch (err) {
    return { status: 'down', detail: err instanceof Error ? err.message : 'unreachable' };
  }
}

const app = express();
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', version: '0.1.0', nodeId: env.NODE_ID, ts: nowIso() });
});

app.get('/metrics', async (_req: Request, res: Response) => {
  const host = collectHost();
  const api = await checkApiHealth();
  res.json({ host, api, license: { status: 'unknown', detail: 'license-agent in phase 8' }, ts: nowIso() });
});

interface RemoteActionRequest {
  action: string;
  /** Cloud-signed payload in later phases; must be verified. */
  signature?: string;
  requestId?: string;
}

app.post('/remote/actions', (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as RemoteActionRequest;
    const { action } = body ?? {};
    if (!action || typeof action !== 'string') {
      res.status(422).json({ error: { code: 'VALIDATION', message: 'action is required' } });
      return;
    }
    if (!allowlist.has(action)) {
      logger.warn('remote action rejected (not in allowlist)', { action });
      res.status(403).json({ error: { code: 'FORBIDDEN', message: `action "${action}" not allowed` } });
      return;
    }
    logger.info('remote action accepted', { action, requestId: body.requestId });
    // v0.1: actions are logged and acknowledged. Execution (health_check,
    // collect_logs, backup_now, ...) is wired in phase 9.
    res.json({ ok: true, action, accepted: true, ts: nowIso() });
  } catch (err) {
    next(err);
  }
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'not found' } });
});

app.listen(env.PORT, '0.0.0.0', () => {
  logger.info(`node-agent listening on :${env.PORT}`, { nodeId: env.NODE_ID });
});
