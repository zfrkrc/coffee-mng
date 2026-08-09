# CafeOS Edge Offline Strategy

## Objective
Guarantee uninterrupted cafe operations on local infrastructure without internet dependency for the core business path.

## Offline-Critical Path
- Order taking and status updates.
- Menu reads and table context.
- Staff authentication against local database.
- Local audit logging.

## Network Assumptions
- LAN connectivity is available between staff devices and edge node.
- Internet connectivity may be absent for extended durations.

## Design Decisions
- API, DB, Redis, and web run locally.
- Cloud integration is optional and disabled by default.
- Backups are local-first; cloud upload is additive and non-blocking.

## Browser/PWA Behavior
- Web app is installable with manifest + service worker.
- Static assets can be served from cache for resilience.
- Dynamic business actions still target local API endpoints.

## Sync Boundary (Planned)
- Cloud sync never gates order flow.
- Sync jobs must be idempotent and retry-safe.
- Conflict strategy will be deterministic (timestamp + version rules).

## Failure Scenarios
- Internet down: system remains fully usable on LAN.
- API restart: browser reconnects, data persists in PostgreSQL.
- Node reboot: containers auto-restart via compose `unless-stopped`.
