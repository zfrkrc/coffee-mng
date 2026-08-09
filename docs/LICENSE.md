# CafeOS Edge Licensing Model

## Purpose
Licensing controls feature availability and node authorization while preserving offline operation.

## Current Foundation (Phase 1)
- `licenses` table exists in Prisma schema.
- Fields include tenant, branch, device, plan, enabled features, validity, signature, and last verification timestamp.
- `LICENSE_PUBLIC_KEY` and `LICENSE_GRACE_SECONDS` are part of config surface.

## Offline Verification Model
- License payload includes signed claims.
- Edge node verifies signature locally with public key.
- No cloud roundtrip is required for normal operation.

## Grace Behavior
- If verification cannot refresh due to temporary issues, grace period (`LICENSE_GRACE_SECONDS`) allows continuity.
- On grace expiry, restricted behavior is applied according to policy (to be finalized in enforcement module).

## Planned Enforcement
- Feature flags checked per request/module.
- Device binding (`device_id`) enforced for issued license.
- Administrative visibility via health/admin endpoint.

## Operational Policy
- Public key can be embedded or injected securely at deploy time.
- Private key must never exist on edge node.
