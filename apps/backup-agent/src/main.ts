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
import { execFile, execFileSync } from 'child_process';
import { mkdirSync, readdirSync, rmSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import cron from 'node-cron';
import { loadConfig, backupAgentEnvSchema } from '@cafeos/config';
import { Logger } from '@cafeos/shared';

const env = loadConfig(backupAgentEnvSchema);
const logger = new Logger({ nodeId: env.NODE_ID, level: env.LOG_LEVEL });

mkdirSync(env.BACKUP_DIR, { recursive: true });

function parseConnectionString(url: string): {
  host: string;
  port: string;
  db: string;
  user: string;
} {
  const m = url.match(/postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:/]+):?(\d+)?\/(.+)/);
  if (!m) throw new Error(`Cannot parse DATABASE_URL: ${url}`);
  return { user: m[1], port: m[4] ?? '5432', host: m[3], db: m[5] };
}

function runPgDump(): Promise<string> {
  return new Promise((resolve, reject) => {
    const { host, port, db, user } = parseConnectionString(env.DATABASE_URL);
    const file = join(env.BACKUP_DIR, `cafeos-backup-${Date.now()}.sql.gz`);
    const writeStream = require('fs').createWriteStream(file);
    writeStream.on('error', reject);

    const dump = execFile(
      'pg_dump',
      ['-h', host, '-p', port, '-U', user, '-d', db, '--no-owner', '--no-privileges', '-Fc'],
      { env: { ...process.env, PGPASSWORD: new URL(env.DATABASE_URL).password } },
      (err) => {
        if (err) reject(err);
      },
    );
    const gzip = execFile('gzip', ['-9'], (err) => {
      if (err) reject(err);
    });

    if (dump.stdout && gzip.stdin) {
      dump.stdout.pipe(gzip.stdin);
    }
    if (gzip.stdout) {
      gzip.stdout.pipe(writeStream);
    }
    writeStream.on('finish', () => resolve(file));
    dump.stderr?.on('data', (d: Buffer) => logger.debug(`pg_dump: ${d.toString()}`));
  });
}

async function createBackup(): Promise<{ file: string; sizeBytes: number; checksum?: string }> {
  const file = await runPgDump();
  const size = statSync(file).size;
  // Integrity: verify the archive is a readable gzip stream.
  execFileSync('gzip', ['-t', file]);
  logger.info('backup created', { file, sizeBytes: size });
  return { file, sizeBytes: size };
}

function pruneOldBackups(): number {
  const files = readdirSync(env.BACKUP_DIR)
    .filter((f) => f.startsWith('cafeos-backup-'))
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
    logger.error('backup failed', { detail: err instanceof Error ? err.message : err });
    res.status(500).json({ ok: false, error: { code: 'INTERNAL', message: 'backup failed' } });
  }
});

app.get('/backups', (_req, res) => {
  const files = readdirSync(env.BACKUP_DIR)
    .filter((f) => f.startsWith('cafeos-backup-'))
    .map((f) => ({ file: f, sizeBytes: statSync(join(env.BACKUP_DIR, f)).size }))
    .sort((a, b) => b.file.localeCompare(a.file));
  res.json({ ok: true, count: files.length, files });
});

if (cron.validate(env.BACKUP_SCHEDULE)) {
  cron.schedule(env.BACKUP_SCHEDULE, () => {
    logger.info('scheduled backup starting');
    createBackup().then(pruneOldBackups).catch((e) => logger.error('scheduled backup failed', { detail: e.message }));
  });
  logger.info('scheduled backup enabled', { schedule: env.BACKUP_SCHEDULE });
} else {
  logger.warn('invalid BACKUP_SCHEDULE, scheduling disabled', { schedule: env.BACKUP_SCHEDULE });
}

const port = 3200;
app.listen(port, '0.0.0.0', () => {
  logger.info(`backup-agent listening on :${port}`);
});
