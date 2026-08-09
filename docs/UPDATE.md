# CafeOS Edge Update Policy

## Objective
Deliver safe, repeatable updates without breaking local operations.

## Update Principles
- Prefer planned maintenance windows.
- Keep database backups before image upgrades.
- Roll forward with deterministic container rebuilds.

## Standard Update Flow
1. Confirm current health: `./infra/scripts/cafeos.sh status`
2. Take backup (manual trigger or scheduled confirmation).
3. Pull latest code.
4. Apply env changes if required.
5. Rebuild and restart: `./infra/scripts/cafeos.sh up`
6. Re-check health and open web UI.

## Rollback Basics
- If update fails, redeploy previous known-good image tags/commit.
- Restore DB backup only when schema/data compatibility requires it.

## Compatibility Guidelines
- Schema migrations must be explicit and reversible where possible.
- API contract changes should be backward-compatible for at least one release step.

## Planned Improvements
- Add explicit release manifest with image digests.
- Add scripted rollback helper.
- Add post-update smoke test script across API/web/agents.
