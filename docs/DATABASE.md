# CafeOS Edge Database Design

## Engine and Access
- Engine: PostgreSQL 17.
- Runtime: containerized, internal Docker network only.
- ORM: Prisma (`apps/api/prisma/schema.prisma`).

## Core Rules
- IDs are UUIDv7-compatible and generated app-side for deterministic offline behavior.
- Business tables carry `tenant_id` (and `branch_id` when branch-scoped).
- Soft delete via `deleted_at` is used where recovery/audit matters.
- `version` columns support optimistic concurrency in mutable entities.

## Current Phase-1 Tables
- `tenants`
- `branches`
- `users`
- `auth_sessions`
- `cafe_settings`
- `licenses`
- `audit_logs`

## Access and Branch Management Tables
- `access_members`: tenant owner account mapped to a domain and service set.
- `access_staff`: per-member staff users and roles.
- `access_branches`: branch definitions per member (`slug`, `name`, optional `address`, `active`).

`access_branches` uniqueness is `(member_id, slug)` to support multiple branches under one domain while keeping stable branch slugs.

## Tenant and Branch Isolation
- Session context determines active tenant and branch.
- Client-provided tenant identity is never trusted.
- Queries and writes must filter by tenant scope.

## Migrations and Schema Lifecycle
- Schema source: `apps/api/prisma/schema.prisma`.
- Local generation: `pnpm --filter @cafeos/api exec prisma generate`.
- Container build regenerates Prisma client in deployed tree to avoid pnpm deploy stub issues.

## Backup Compatibility
- Backup-agent uses `pg_dump -Fc` for consistent logical snapshots.
- Database URL is injected from compose env values.

## Planned Next Tables
- Floor/table layout entities.
- Menu catalog (categories, items, modifiers, prices).
- Order lifecycle (draft, confirmed, preparing, served, paid, canceled).
- Payment records and reconciliation artifacts.
