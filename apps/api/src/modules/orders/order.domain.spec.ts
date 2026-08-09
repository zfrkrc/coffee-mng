/**
 * Unit tests for shared domain rules used by the API.
 *
 * These run WITHOUT a database — they verify pure business invariants.
 */
import {
  computeLineTotalCents,
  computeOrderTotals,
  validateOrderLine,
  splitLines,
  mergeOrderLines,
  isOrderMutable,
  nextLineStatus,
} from '@cafeos/domain';
import { AppError } from '@cafeos/shared';

describe('domain/order', () => {
  describe('validateOrderLine', () => {
    it('accepts a valid line', () => {
      expect(() =>
        validateOrderLine({ productId: 'p1', quantity: 2, unitPriceCents: 1000 }),
      ).not.toThrow();
    });

    it('rejects zero quantity', () => {
      expect(() => validateOrderLine({ productId: 'p1', quantity: 0, unitPriceCents: 1000 })).toThrow(
        AppError,
      );
    });

    it('rejects negative price', () => {
      expect(() => validateOrderLine({ productId: 'p1', quantity: 1, unitPriceCents: -5 })).toThrow(
        AppError,
      );
    });

    it('rejects fractional quantity', () => {
      expect(() => validateOrderLine({ productId: 'p1', quantity: 1.5, unitPriceCents: 100 })).toThrow(
        AppError,
      );
    });
  });

  describe('computeOrderTotals', () => {
    const lines = [
      { productId: 'coffee', quantity: 2, unitPriceCents: 6000 },
      { productId: 'burger', quantity: 1, unitPriceCents: 15000 },
    ];

    it('computes subtotal and total with no discount', () => {
      const t = computeOrderTotals(lines);
      expect(t.subtotalCents).toBe(27000);
      expect(t.totalCents).toBe(27000);
      expect(t.discountCents).toBe(0);
    });

    it('applies discount without going below zero', () => {
      const t = computeOrderTotals(lines, 5000);
      expect(t.subtotalCents).toBe(27000);
      expect(t.discountCents).toBe(5000);
      expect(t.totalCents).toBe(22000);
    });

    it('clamps discount at subtotal', () => {
      const t = computeOrderTotals(lines, 999999);
      expect(t.discountCents).toBe(27000);
      expect(t.totalCents).toBe(0);
    });
  });

  describe('splitLines', () => {
    const lines = [
      { id: 'a', name: 'c1', quantity: 1, unitPriceCents: 100, lineTotalCents: 100, status: 'pending', station: 'bar' },
      { id: 'b', name: 'c2', quantity: 1, unitPriceCents: 100, lineTotalCents: 100, status: 'pending', station: 'bar' },
      { id: 'c', name: 'b1', quantity: 1, unitPriceCents: 100, lineTotalCents: 100, status: 'pending', station: 'kitchen' },
    ] as const;

    it('splits lines into N parts without duplication', () => {
      const parts = splitLines(lines as never, 2);
      expect(parts).toHaveLength(2);
      const all = parts.flat();
      expect(all.map((l) => l.id).sort()).toEqual(['a', 'b', 'c']);
    });

    it('single part returns all lines', () => {
      const parts = splitLines(lines as never, 1);
      expect(parts).toEqual([lines as never]);
    });

    it('rejects zero parts', () => {
      expect(() => splitLines(lines as never, 0)).toThrow(AppError);
    });
  });

  describe('mergeOrderLines', () => {
    it('combines primary and secondary lines', () => {
      const primary = [{ id: 'a', name: 'x', quantity: 1, unitPriceCents: 100, lineTotalCents: 100, status: 'pending', station: 'bar' }];
      const secondary = [{ id: 'b', name: 'y', quantity: 2, unitPriceCents: 50, lineTotalCents: 100, status: 'pending', station: 'kitchen' }];
      const merged = mergeOrderLines(primary as never, secondary as never);
      expect(merged).toHaveLength(2);
    });
  });

  describe('isOrderMutable', () => {
    it('allows open and in_progress', () => {
      expect(isOrderMutable({ status: 'open' })).toBe(true);
      expect(isOrderMutable({ status: 'in_progress' })).toBe(true);
    });
    it('blocks closed and cancelled', () => {
      expect(isOrderMutable({ status: 'completed' })).toBe(false);
      expect(isOrderMutable({ status: 'cancelled' })).toBe(false);
    });
  });

  describe('nextLineStatus', () => {
    it('advances pending -> started -> ready', () => {
      expect(nextLineStatus('pending')).toBe('started');
      expect(nextLineStatus('started')).toBe('ready');
      expect(nextLineStatus('ready')).toBe('ready');
    });
  });
});
