# CafeOS Edge Deployment Guide

## Requirements
- Docker and Docker Compose plugin.
- Linux host recommended.
- Local copy of repository with `.env.edge` configured.

## First-Time Setup
1. Copy env template:
   - `cp .env.edge.example .env.edge`
2. Adjust environment values for site/network.
3. Start stack:
   - `./infra/scripts/cafeos.sh up`

## Operational Commands
- Start/build: `./infra/scripts/cafeos.sh up`
- Stop: `./infra/scripts/cafeos.sh down`
- Restart: `./infra/scripts/cafeos.sh restart`
- Status: `./infra/scripts/cafeos.sh status`
- Logs: `./infra/scripts/cafeos.sh logs`

## Published Endpoints
- Web UI: `http://<host>:${WEB_PORT}` (default example now uses 3003 on shared dev host).
- API: internal-only (`cafe-api:3000`) unless intentionally published.

## Health Model
- Compose-level health checks validate each container.
- Use `status` command to confirm healthy services.

## Build Notes
- API image regenerates Prisma client after `pnpm deploy` in `/app/out`.
- Web image uses Next.js standalone output and starts at `apps/web/server.js`.

## Upgrade Procedure
1. Pull new code.
2. Review `.env.edge` changes.
3. Rebuild/restart with `./infra/scripts/cafeos.sh up`.
4. Verify status and UI reachability.
