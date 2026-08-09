# CafeOS Edge Security Baseline

## Security Goals
- Protect local business data and credentials.
- Minimize attack surface on edge deployments.
- Preserve auditable operations for sensitive actions.

## Secrets and Credentials
- Secrets are stored in `.env.edge` (gitignored) in development.
- No plaintext tokens/passwords should be committed.
- Production should use managed secret injection where available.

## Network Exposure
- Only `cafe-web` is host-published.
- Database, API, Redis, and agents are internal-only by default.
- Docker socket mount for node-agent is read-only and intentionally constrained.

## Auth and Authorization
- Role model includes `owner`, `admin`, `manager`, `staff`, `cafe-user`, `viewer`.
- Permission map is centralized in `packages/domain/src/permissions.ts`.
- `cafe-user` scope is limited to self-service and read-only menu/table contexts.

## Application Controls
- API uses structured exception handling and request correlation IDs.
- Input config is validated with zod schemas.
- Audit tables exist from Phase 1 for critical event logging.

## Token Handling Policy
- PAT/keys shared in chat are considered compromised and must be revoked.
- New tokens must be stored outside repository content.

## Hardening Next Steps
- Add rate limiting and brute-force protections in auth routes.
- Add secure cookie/session strategy and refresh token rotation.
- Add encryption-at-rest strategy for backups and sensitive fields.
