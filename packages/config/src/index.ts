/**
 * @cafeos/config — validated, centralized configuration for CafeOS Edge.
 *
 * Every process (api, web server, node-agent, backup-agent) loads its
 * configuration through these schemas so environment mistakes are caught at
 * startup instead of failing at runtime deep inside business logic.
 *
 * No hardcoded tenant/branch ids. No secrets in source.
 */
import { z } from 'zod';

const bool = z
  .string()
  .optional()
  .transform((v) => v !== undefined && v !== 'false' && v !== '0' && v !== '');

const int = (def: number) =>
  z.coerce
    .number()
    .int()
    .positive()
    .default(def);

/** Common fields shared by all Edge processes. */
export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  /** Node instance id — must be stable across restarts (MAC or persisted id). */
  NODE_ID: z.string().min(1).default('edge-node'),
  /** The physical branch this Edge serves. */
  BRANCH_ID: z.string().default('local-branch'),
});

/** Schema for the cafe-api process. */
export const apiEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://cafeos:cafeos@postgres:5432/cafeos'),
  REDIS_URL: z.string().min(1).default('redis://redis:6379'),
  /** Public key (PEM, base64 or raw) used to verify offline license tokens. Empty = verification disabled (dev only). */
  LICENSE_PUBLIC_KEY: z.string().optional().default(''),
  LICENSE_GRACE_SECONDS: z.coerce.number().int().default(7 * 24 * 3600),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().default(43200),
  JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().default(7 * 24 * 3600),
  JWT_ISSUER: z.string().default('cafeos-edge'),
  JWT_SECRET: z.string().min(16).default('cafeos-dev-secret-please-change'),
  SUPERADMIN_PASSWORD: z.string().min(8).default('HeroKey2026!'),
  /** Space-separated CORS origins for the web app. */
  WEB_ORIGINS: z.string().default('http://localhost:3001,http://cafe.local'),
  /** Merkezi InsightMap AI Gateway (opsiyonel — boşsa AI yardımcıları deterministik kalır). */
  INSIGHTMAP_AI_URL: z.string().default('https://insightmap.tr'),
  INSIGHTMAP_AI_SERVICE_KEY: z.string().default(''),
  CLOUD_API_URL: z.string().default(''),
  CLOUD_SYNC_ENABLED: bool,
  ENABLE_SWAGGER: bool,
});

/** Schema for the Next.js web app. */
export const webEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().int().default(3001),
  API_URL: z.string().min(1).default('http://api:3000'),
  /** Public base URL used by the browser (PWA manifest, service worker scope). */
  NEXT_PUBLIC_API_URL: z.string().min(1).default('http://cafe.local:3000'),
});

/** Schema for the node-agent process. */
export const nodeAgentEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().int().default(3100),
  API_URL: z.string().min(1).default('http://api:3000'),
  CLOUD_API_URL: z.string().default(''),
  /** Allowlist of remote actions permitted by the cloud. */
  REMOTE_ACTION_ALLOWLIST: z.string().default('health_check,collect_logs'),
  /** Path where agent writes its state / command log. */
  AGENT_STATE_DIR: z.string().default('/var/lib/cafeos-agent'),
});

/** Schema for the backup-agent process. */
export const backupAgentEnvSchema = baseEnvSchema.extend({
  DATABASE_URL: z.string().min(1).default('postgresql://cafeos:cafeos@postgres:5432/cafeos'),
  BACKUP_DIR: z.string().default('/var/lib/cafeos-backups'),
  BACKUP_SCHEDULE: z.string().default('0 3 * * *'),
  BACKUP_RETENTION_DAYS: z.coerce.number().int().default(30),
  BACKUP_ENCRYPTION_PUBLIC_KEY: z.string().optional().default(''),
  CLOUD_API_URL: z.string().default(''),
  CLOUD_SYNC_ENABLED: bool,
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type WebEnv = z.infer<typeof webEnvSchema>;
export type NodeAgentEnv = z.infer<typeof nodeAgentEnvSchema>;
export type BackupAgentEnv = z.infer<typeof backupAgentEnvSchema>;

/** Parse process.env against a schema; throws a readable error on mismatch. */
export function loadConfig<T extends z.ZodTypeAny>(
  schema: T,
  env: NodeJS.ProcessEnv = process.env,
): z.infer<T> {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
