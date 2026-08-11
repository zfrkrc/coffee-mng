/**
 * End-to-end flow tests for the CafeOS ordering pipeline.
 *
 * CustomerService holds all state in memory (no DB), so the full
 * menu -> order -> kitchen -> advance flow is exercised directly.
 * Tenant isolation is verified by domain keys.
 */
import { CustomerService } from './customer.service';
import { AppError } from '@cafeos/shared';

describe('CustomerService flow (e2e)', () => {
  let svc: CustomerService;

  beforeEach(() => {
    svc = new CustomerService();
  });

  describe('menu', () => {
    it('serves the default menu for a fresh domain', () => {
      const menu = svc.getMenu('cafeos.waycoffee.com.tr');
      expect(menu.length).toBeGreaterThan(0);
      expect(menu[0]).toHaveProperty('id');
      expect(menu[0].priceCents).toBeGreaterThan(0);
    });

    it('keeps menu isolated per domain', () => {
      const base = svc.getMenu('cafeos.zk.net.tr');
      svc.upsertMenuItem('cafeos.zk.net.tr', {
        id: 'special',
        name: 'Special Drink',
        category: 'coffee',
        priceCents: 5000,
        note: '',
      });
      expect(svc.getMenu('cafeos.zk.net.tr').some((m) => m.id === 'special')).toBe(true);
      expect(svc.getMenu('cafeos.waycoffee.com.tr').some((m) => m.id === 'special')).toBe(false);
      expect(base.map((m) => m.id)).toEqual(svc.getMenu('cafeos.zk.net.tr').map((m) => m.id).slice(0, base.length) as string[]);
    });
  });

  describe('tables', () => {
    it('lists default tables', () => {
      const tables = svc.getTables('cafeos.waycoffee.com.tr', 'http://localhost');
      expect(tables.length).toBeGreaterThanOrEqual(8);
      expect(tables[0].code).toBe('T1');
    });
  });

  describe('ordering flow', () => {
    it('creates an order from menu items', () => {
      const order = svc.createOrder('cafeos.waycoffee.com.tr', {
        tableCode: 'T1',
        items: [{ productId: 'latte', quantity: 2 }],
      });
      expect(order.status).toBe('received');
      expect(order.tableCode).toBe('T1');
      expect(order.totalCents).toBe(2 * 14500);
      expect(order.items).toHaveLength(1);
      expect(order.items[0].name).toBe('Cafe Latte');
    });

    it('rejects ordering for an unknown table', () => {
      expect(() =>
        svc.createOrder('cafeos.waycoffee.com.tr', {
          tableCode: 'A1',
          items: [{ productId: 'latte', quantity: 1 }],
        }),
      ).toThrow(AppError);
    });

    it('rejects ordering for a product not on the menu', () => {
      expect(() =>
        svc.createOrder('cafeos.waycoffee.com.tr', {
          tableCode: 'T1',
          items: [{ productId: 'nope', quantity: 1 }],
        }),
      ).toThrow(AppError);
    });

    it('rejects empty item list', () => {
      expect(() =>
        svc.createOrder('cafeos.waycoffee.com.tr', { tableCode: 'T1', items: [] }),
      ).toThrow(AppError);
    });

    it('appears on the kitchen board', () => {
      const order = svc.createOrder('cafeos.waycoffee.com.tr', {
        tableCode: 'T2',
        items: [{ productId: 'americano', quantity: 1 }],
      });
      const kitchen = svc.getKitchenOrders('cafeos.waycoffee.com.tr');
      expect(kitchen.some((o) => o.id === order.id)).toBe(true);
      expect(kitchen.find((o) => o.id === order.id)?.status).toBe('received');
    });

    it('advances status through the flow', () => {
      const order = svc.createOrder('cafeos.zk.net.tr', {
        tableCode: 'T3',
        items: [{ productId: 'toast', quantity: 1 }],
      });
      const cooking = svc.advanceOrder('cafeos.zk.net.tr', order.id);
      expect(cooking.status).toBe('preparing');
      const ready = svc.advanceOrder('cafeos.zk.net.tr', order.id);
      expect(ready.status).toBe('ready');
    });

    it('cannot advance an unknown order', () => {
      expect(() => svc.advanceOrder('cafeos.zk.net.tr', 'does-not-exist')).toThrow(AppError);
    });

    it('can edit an order before it is ready', () => {
      const order = svc.createOrder('cafeos.zk.net.tr', {
        tableCode: 'T4',
        items: [{ productId: 'latte', quantity: 1 }],
      });
      const edited = svc.updateOrder('cafeos.zk.net.tr', order.id, {
        tableCode: 'T4',
        items: [{ productId: 'latte', quantity: 3 }],
      });
      expect(edited.totalCents).toBe(3 * 14500);
    });
  });

  describe('tenant isolation', () => {
    it('keeps orders separate per domain', () => {
      const a = svc.createOrder('cafeos.zk.net.tr', {
        tableCode: 'T1',
        items: [{ productId: 'latte', quantity: 1 }],
      });
      expect(
        svc.getKitchenOrders('cafeos.waycoffee.com.tr').some((o) => o.id === a.id),
      ).toBe(false);
      expect(svc.getKitchenOrders('cafeos.zk.net.tr').some((o) => o.id === a.id)).toBe(true);
    });

    it('isolates branch state within a domain', () => {
      const branchDomain = 'cafeos.zk.net.tr::west';
      const mainDomain = 'cafeos.zk.net.tr';
      const order = svc.createOrder(branchDomain, {
        tableCode: 'T1',
        items: [{ productId: 'latte', quantity: 1 }],
      });
      expect(svc.getKitchenOrders(mainDomain).some((o) => o.id === order.id)).toBe(false);
      expect(svc.getKitchenOrders(branchDomain).some((o) => o.id === order.id)).toBe(true);
    });
  });

  describe('daily report', () => {
    it('reports totals for completed orders', () => {
      svc.createOrder('cafeos.zk.net.tr', {
        tableCode: 'T1',
        items: [{ productId: 'latte', quantity: 2 }],
      });
      svc.createOrder('cafeos.zk.net.tr', {
        tableCode: 'T2',
        items: [{ productId: 'americano', quantity: 1 }],
      });
      const report = svc.getDailyReport('cafeos.zk.net.tr');
      expect(report.orderCount).toBeGreaterThanOrEqual(2);
      expect(report.grossRevenueCents).toBeGreaterThanOrEqual(2 * 14500 + 11000);
    });
  });
});