# CafeOS Edge Implementation Status

## Snapshot
- Date: 2026-08-09
- Phase: Phase 1 foundation
- Status: Core stack operational

## Completed in This Iteration
- Multi-branch support added for a single tenant domain.
  - Added `access_branches` model (slug/name/address/active) in Prisma schema.
  - Added superadmin APIs for branch CRUD-lite (`list`, `create`, `active toggle`).
  - Added Hero panel branch management UI.
  - Tenant login now accepts optional `branchSlug` and persists it in JWT claim.
  - Customer runtime state is now partitioned by `domain::branchSlug` (fallback `domain`).
  - Branch isolation now applies to menu, table, inventory, order, kitchen and AI-station datasets.
- Prisma runtime init issue fixed for API container build.
  - Root cause: `pnpm deploy` preserved placeholder Prisma client in deployed tree.
  - Fix: regenerate Prisma client inside `/app/out` during API image build.
- Web container startup fixed for Next.js standalone in monorepo.
  - Root cause: wrong runtime entry (`server.js`) for workspace-root standalone output.
  - Fix: set entry to `apps/web/server.js` and configure tracing root.
- Monorepo tracing hardened for web build.
  - `outputFileTracingRoot` set in `apps/web/next.config.js`.
- Healthcheck reliability improved.
  - Replaced `localhost` with `127.0.0.1` for compose healthchecks.
- Shared-host port conflicts resolved.
  - Web host port set to `3003` in local `.env.edge` for this environment.
- Kitchen order correction flow added for staff.
  - New endpoint: `POST /api/customer/kitchen/orders/:orderId/edit`
  - Constraint: `ready` status orders cannot be edited.
  - Editable fields: `tableCode`, `items[]` (productId + quantity).
  - Kitchen UI now includes inline edit form per order card for non-ready orders.
- First-load and refresh stability improved on web.
  - Kitchen page now handles `401/403` by stopping poll loop and redirecting to login.
  - Login page query parsing hardened for refresh path.
  - PWA service worker cache bumped (`v2`) and navigation strategy moved to network-first to reduce stale bundle issues.
- QR SVG output hardened.
  - Escaped QR target label in SVG (`&` -> `&amp;`) to prevent XML parsing errors on branch URLs.
- AI token usage tracking added (Redis backed, 30-day retention).
  - Per AI snapshot call: estimated `promptTokens`, `completionTokens`, `totalTokens`, `costTl` recorded.
  - Cost math (TL): prompt and completion token rates are calculated per 1K token.
  - New superadmin endpoint: `GET /api/ai-station/usage?hours=24`.
  - Hero panel now shows 24h usage totals + domain breakdown (token and cost visibility).

## Current Runtime State
- `cafe-api`: healthy
- `cafe-web`: healthy
- `node-agent`: healthy
- `backup-agent`: healthy
- `postgres`: healthy
- `redis`: healthy

## Validation Notes (2026-08-09)
- `pnpm --filter @cafeos/api typecheck` -> pass
- `pnpm --filter @cafeos/web typecheck` -> pass
- API tests pass when explicit Jest config is provided:
  - `pnpm --filter @cafeos/api exec jest --runInBand --config jest.config.js`
- Web test command currently returns `No test files found` (expected in current repo state).
- Deploy check:
  - `./infra/scripts/cafeos.sh up cafe-api cafe-web` completed
  - `./infra/scripts/cafeos.sh status` -> all critical services healthy

## Docs Added
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/OFFLINE.md`
- `docs/SECURITY.md`
- `docs/DEPLOYMENT.md`
- `docs/BACKUP.md`
- `docs/LICENSE.md`
- `docs/UPDATE.md`

## Security Notes
- Any PAT/token pasted in chat must be considered compromised and revoked.
- Secrets remain outside repository content (`.env.edge` is gitignored).

## Next Recommended Phase-1 Tasks
1. Implement auth endpoints (login/refresh/logout) with role-bound claims.
2. Add tenant/branch bootstrap seed flow.
3. Add first domain module slice (menu read + order draft).
4. Add smoke tests for compose lifecycle and health endpoints.
