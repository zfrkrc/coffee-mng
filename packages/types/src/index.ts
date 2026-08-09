/**
 * @cafeos/types — shared domain types used across Edge apps.
 *
 * These types describe the business entities and events of the CafeOS Edge.
 * They are intentionally framework-agnostic (no Prisma/NestJS imports) so the
 * web client, api, node-agent and backup-agent can all share them.
 */

/** Sortable, globally-unique identifier (UUIDv7). */
export type EntityId = string;

/** Soft-delete aware base attributes shared by every persisted entity. */
export interface BaseEntity {
  id: EntityId;
  tenantId: EntityId;
  branchId?: EntityId | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  /** Optimistic concurrency version. */
  version: number;
}

/** Core user roles — aligned with RBAC permission groups. */
export type UserRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'waiter'
  | 'cashier'
  | 'kitchen'
  | 'bar'
  | 'viewer'
  | 'cafe-user';

export interface UserProfile {
  id: EntityId;
  tenantId: EntityId;
  branchId?: EntityId | null;
  email: string;
  username: string;
  fullName?: string | null;
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string | null;
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export interface SessionContext {
  userId: EntityId;
  tenantId: EntityId;
  branchId?: EntityId | null;
  role: UserRole;
  /** Unix ms when the access token expires. */
  exp: number;
}

/* ------------------------------------------------------------------ */
/* Realtime events                                                     */
/* ------------------------------------------------------------------ */

export type RealtimeEventType =
  | 'order.created'
  | 'order.updated'
  | 'order.cancelled'
  | 'order.ready'
  | 'table.opened'
  | 'table.updated'
  | 'table.closed'
  | 'kitchen.new_order'
  | 'kitchen.item_started'
  | 'kitchen.item_ready'
  | 'payment.completed'
  | 'stock.changed';

/** Base envelope for every realtime event broadcast over Socket.IO. */
export interface RealtimeEvent<T = unknown> {
  type: RealtimeEventType;
  /** Tenant scope of the event. */
  tenantId: EntityId;
  /** Branch scope of the event (null for cross-branch). */
  branchId?: EntityId | null;
  /** Server-side Unix ms timestamp. */
  occurredAt: number;
  /** Monotonic per-tenant sequence for ordering/audit. */
  seq: number;
  payload: T;
}

/* ------------------------------------------------------------------ */
/* Order domain (shared shape for display clients)                     */
/* ------------------------------------------------------------------ */

export type OrderStatus = 'open' | 'in_progress' | 'ready' | 'completed' | 'cancelled';

export interface OrderItemView {
  id: EntityId;
  productId: EntityId;
  name: string;
  quantity: number;
  unitPriceCents: number;
  /** Effective unit price after discounts (line level). */
  lineTotalCents: number;
  status: 'pending' | 'started' | 'ready' | 'served' | 'cancelled';
  station: 'kitchen' | 'bar' | 'none';
  modifiers?: string[];
  notes?: string | null;
}

export interface OrderView {
  id: EntityId;
  tableId?: EntityId | null;
  tableName?: string | null;
  waiterId?: EntityId | null;
  waiterName?: string | null;
  status: OrderStatus;
  items: OrderItemView[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  openedAt: string;
  closedAt?: string | null;
}

/* ------------------------------------------------------------------ */
/* Health (node-agent / API / web all surface this)                    */
/* ------------------------------------------------------------------ */

export interface HealthComponent {
  status: 'ok' | 'degraded' | 'down';
  detail?: string;
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  uptimeSeconds: number;
  timestamp: string;
  components: Record<string, HealthComponent>;
}
