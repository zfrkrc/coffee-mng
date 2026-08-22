/**
 * CafeOS Edge backup-agent.
 *
 * v0.1 scope:
 *  - manual + scheduled Postgres dump (pg_dump, compressed)
 *  - retention cleanup (keep N days)
 *  - integrity check by re-reading the archive
 *  - local /health endpoint
 *
 * v0.2+: encryption before upload (age public key), cloud upload queue,
 * restore workflow, verification reports. See docs/BACKUP.md.
 *
 * Backups run entirely locally — no internet required. Cloud upload is an
 * asynchronous, non-blocking side-effect only.
 */
import express from 'express';
import { execFile } from 'child_process';
import { mkdirSync, readdirSync, rmSync, statSync } from 'fs';
import { join } from 'path';
import cron from 'node-cron';
import { loadConfig, backupAgentEnvSchema } from '@cafeos/config';
import { Logger } from '@cafeos/shared';

const env = loadConfig(backupAgentEnvSchema);
const logger = new Logger({ nodeId: env.NODE_ID, level: env.LOG_LEVEL });

mkdirSync(env.BACKUP_DIR, { recursive: true });

// Safe backup is delegated to a shell script (pipefail, .tmp, gzip -t, rename).
const BACKUP_SCRIPT = process.env.BACKUP_SCRIPT_PATH || '/app/scripts/backup.sh';

function runBackupScript(): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      BACKUP_SCRIPT,
      [],
      {
        env: { ...process.env, DATABASE_URL: env.DATABASE_URL, BACKUP_DIR: env.BACKUP_DIR },
        timeout: 30 * 60 * 1000,
      },
      (err, stdout, stderr) => {
        if (stderr && stderr.trim()) logger.warn(`backup stderr: ${stderr.trim()}`);
        if (err) {
          reject(err);
          return;
        }
        const file = stdout.trim();
        if (!file) {
          reject(new Error('backup script returned no path'));
          return;
        }
        resolve(file);
      },
    );
  });
}

async function sendAlert(message: string): Promise<void> {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_ALERT_CHAT_ID;
  if (!token || !chatId) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) logger.warn('telegram alert failed', { status: res.status });
  } catch (e) {
    logger.warn('telegram alert failed', { detail: e instanceof Error ? e.message : e });
  }
}

async function createBackup(): Promise<{ file: string; sizeBytes: number }> {
  const file = await runBackupScript();
  const size = statSync(file).size;
  logger.info('backup created (verified)', { file, sizeBytes: size });
  return { file, sizeBytes: size };
}

function pruneOldBackups(): number {
  // Only verified final artifacts (`.sql.gz`) are eligible; never `.tmp`.
  const files = readdirSync(env.BACKUP_DIR)
    .filter((f) => f.startsWith('cafeos-backup-') && f.endsWith('.sql.gz'))
    .map((f) => ({ f, ts: statSync(join(env.BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.ts - a.ts);
  const cutoff = Date.now() - env.BACKUP_RETENTION_DAYS * 86400_000;
  let removed = 0;
  for (const f of files) {
    if (f.ts < cutoff) {
      rmSync(join(env.BACKUP_DIR, f.f));
      removed += 1;
    }
  }
  if (removed > 0) logger.info('pruned old backups', { removed });
  return removed;
}

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.1.0', backupDir: env.BACKUP_DIR, ts: new Date().toISOString() });
});

app.post('/backup', async (_req, res) => {
  try {
    const result = await createBackup();
    pruneOldBackups();
    res.json({ ok: true, ...result });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    logger.error('backup failed', { detail });
    await sendAlert(`[CafeOS Backup] Yedek alınamadı: ${detail}`);
    res.status(500).json({ ok: false, error: { code: 'INTERNAL', message: 'backup failed' } });
  }
});

app.get('/backups', (_req, res) => {
  const files = readdirSync(env.BACKUP_DIR)
    .filter((f) => f.startsWith('cafeos-backup-') && f.endsWith('.sql.gz'))
    .map((f) => ({ file: f, sizeBytes: statSync(join(env.BACKUP_DIR, f)).size }))
    .sort((a, b) => b.file.localeCompare(a.file));
  res.json({ ok: true, count: files.length, files });
});

if (cron.validate(env.BACKUP_SCHEDULE)) {
  cron.schedule(env.BACKUP_SCHEDULE, () => {
    logger.info('scheduled backup starting');
    createBackup()
      .then(pruneOldBackups)
      .catch((e) => {
        const detail = e instanceof Error ? e.message : String(e);
        logger.error('scheduled backup failed', { detail });
        void sendAlert(`[CafeOS Backup] Zamanlanmış yedek alınamadı: ${detail}`);
      });
  });
  logger.info('scheduled backup enabled', { schedule: env.BACKUP_SCHEDULE });
} else {
  logger.warn('invalid BACKUP_SCHEDULE, scheduling disabled', { schedule: env.BACKUP_SCHEDULE });
}

const port = 3200;
app.listen(port, '0.0.0.0', () => {
  logger.info(`backup-agent listening on :${port}`);
});
