# CafeOS Edge Backup Strategy

## Scope
Backup-agent provides scheduled local PostgreSQL backups with retention control.

## Service
- App: `apps/backup-agent`
- Runtime port: `3200` (internal Docker network)
- Health endpoint: `GET /health`

## Backup Mechanism
- Uses `pg_dump -Fc` for compressed, restorable PostgreSQL dumps.
- Writes backups under mounted volume path `/var/lib/cafeos-backups`.
- Optional manual trigger endpoint: `POST /backup`.
- Backup list endpoint: `GET /backups`.

## Scheduling and Retention
- Schedule via `BACKUP_SCHEDULE` (default: `0 3 * * *`).
- Retention via `BACKUP_RETENTION_DAYS` (default: `30`).
- Old files are pruned by retention policy.

## Environment Variables
- `DATABASE_URL`
- `BACKUP_DIR`
- `BACKUP_SCHEDULE`
- `BACKUP_RETENTION_DAYS`
- `BACKUP_ENCRYPTION_PUBLIC_KEY` (planned/enabled flow)

## Restore (Current Manual Path)
1. Identify desired dump from backup directory.
2. Stop write-heavy services if needed.
3. Use `pg_restore` into target database.
4. Validate tenant and branch data integrity.

## Hardening Next Steps
- Encrypt backup payload before off-site upload.
- Add checksum verification and restore drill script.
- Add retention metrics to node-agent or API admin panel.
