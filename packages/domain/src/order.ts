/**
 * Pure order domain rules.
 *
 * These rules are intentionally framework-agnostic and side-effect free so
 * they can be unit-tested without a database and reused across API, web and
 * any offline validation layer.
 */
import { AppError } from '@cafeos/shared';
import type { OrderItemView, OrderView } from '@cafeos/types';

export type OrderLineState = 'pending' | 'started' | 'ready' | 'served' | 'cancelled';

export interface OrderLineInput {
  productId: string;
  quantity: number;
  unitPriceCents: number;
  modifiers?: string[];
  notes?: string;
  station?: 'kitchen' | 'bar' | 'none';
}

/** Validate a single order line before persistence. */
export function validateOrderLine(line: OrderLineInput): void {
  if (line.quantity <= 0) {
    throw AppError.validation('Quantity must be positive', { quantity: 'must be > 0' });
  }
  if (line.unitPriceCents < 0) {
    throw AppError.validation('Price cannot be negative', { unitPriceCents: 'must be >= 0' });
  }
  if (!Number.isInteger(line.quantity)) {
    throw AppError.validation('Quantity must be an integer', { quantity: 'must be an integer' });
  }
}

/** Compute the line total in cents. */
export function computeLineTotalCents(line: OrderLineInput): number {
  validateOrderLine(line);
  return line.quantity * line.unitPriceCents;
}

/** Compute order totals from validated lines. */
export function computeOrderTotals(
  lines: OrderLineInput[],
  discountCents = 0,
): { subtotalCents: number; discountCents: number; totalCents: number } {
  const subtotalCents = lines.reduce((acc, l) => acc + computeLineTotalCents(l), 0);
  const discount = Math.min(Math.max(discountCents, 0), subtotalCents);
  return { subtotalCents, discountCents: discount, totalCents: subtotalCents - discount };
}

/**
 * Merge two open tables into one order (table merge). Lines are combined and
 * identifiers of the secondary table are dropped.
 */
export function mergeOrderLines(
  primary: OrderItemView[],
  secondary: OrderItemView[],
): OrderItemView[] {
  return [...primary, ...secondary].map((line) => ({ ...line, id: line.id }));
}

/**
 * Split bill: divide the set of lines into N parts. Because split payments are
 * recorded against the SAME order, we only partition line references here;
 * the payment layer re-sums the selected parts. This function guarantees each
 * line belongs to exactly one part.
 */
export function splitLines(lines: OrderItemView[], parts: number): OrderItemView[][] {
  if (parts <= 0) throw AppError.validation('Number of parts must be positive');
  if (parts === 1) return [lines];
  const buckets: OrderItemView[][] = Array.from({ length: parts }, () => []);
  lines.forEach((line, idx) => {
    buckets[idx % parts].push(line);
  });
  return buckets;
}

/** Whether an order can be modified (open or in progress, not closed/cancelled). */
export function isOrderMutable(order: Pick<OrderView, 'status'>): boolean {
  return order.status === 'open' || order.status === 'in_progress';
}

/** Next status for a line when kitchen/bar marks it ready. */
export function nextLineStatus(current: OrderLineState): OrderLineState {
  switch (current) {
    case 'pending':
      return 'started';
    case 'started':
      return 'ready';
    default:
      return current;
  }
}
