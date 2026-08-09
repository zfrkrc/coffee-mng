# CafeOS Edge Architecture

## Goal
CafeOS Edge is an offline-first cafe platform designed to keep core operations running on local network infrastructure even when internet is unavailable.

## Runtime Components
- `cafe-web` (Next.js): tablet-first PWA UI, single host-exposed entrypoint.
- `cafe-api` (NestJS): business API, internal-only on Docker network.
- `postgres` (PostgreSQL): source of truth for transactional data.
- `redis` (Redis): cache, session helpers, queue primitives.
- `node-agent` (Express): local node health and controlled remote actions.
- `backup-agent` (Express + cron): scheduled local backups.

## Network Model
- Internal services run on `edge` bridge network (`172.30.1.0/24`).
- Only web is published to host (`WEB_PORT -> container 3001`).
- API and agents are not host-published by default (`expose` only).

## Monorepo Layout
- `apps/api`: NestJS API.
- `apps/web`: Next.js app.
- `apps/node-agent`: edge diagnostics and remote action allowlist.
- `apps/backup-agent`: backup scheduler and retention.
- `packages/domain`: domain rules and role permissions.
- `packages/shared`: shared utilities (errors, logger, ids).
- `packages/config`: zod-based config schemas.
- `packages/types`: shared type contracts.
- `infra/docker`: compose stack and container runtime config.
- `infra/scripts/cafeos.sh`: operational helper commands.

## Architectural Principles
- Offline first: all critical workflows must work with LAN-only connectivity.
- Modular monolith: API modules remain in one process with clear boundaries.
- Tenant isolation: every business row is tenant-scoped.
- Least exposure: minimal externally published ports.
- Deterministic deploys: lockfile-based builds, explicit health checks.

## Request Flow (Current)
1. Browser opens `cafe-web` on host port (`WEB_PORT`).
2. Web calls API on Docker network (`cafe-api:3000`) for server-side needs.
3. API persists to PostgreSQL and uses Redis for transient state.
4. Node and backup agents run independently and expose internal health endpoints.

## Real-Time and Future Extensions
- Planned real-time updates via Socket.IO through API.
- Planned cloud sync remains optional and never in critical local path.
- Planned advanced domain modules: floors, tables, menu, orders, KDS, payments.
