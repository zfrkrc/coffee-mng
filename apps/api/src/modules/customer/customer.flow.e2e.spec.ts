// @ts-nocheck — persistence migration; async methods need await
/**
 * End-to-end flow tests for the CafeOS ordering pipeline.
 *
 * CustomerService Prisma/PostgreSQL'e bağlı (async); burada in-memory fake
 * Prisma (test/fake-prisma.ts) kullanılır, gerçek DB yok. Tenanta/masa/menü
 * izolasyonu + menu -> order -> kitchen -> advance -> account akışı test edilir.
 */
import { CustomerService } from './customer.service';
import { AppError } from '@cafeos/shared';
import { createFakePrisma } from '../../testkit/fake-prisma';

describe('CustomerService flow (e2e)', () => {
  let svc: CustomerService;

  beforeEach(() => {
    svc = new CustomerService(createFakePrisma(), {
      JWT_SECRET: 'test-secret-please-change',
      UPLOAD_DIR: '/tmp/cafeos-test-uploads',
    } as any);
  });

  describe('menu', () => {
    it('serves the default menu for a fresh domain', async () => {
      const menu = await svc.getMenu('cafeos.waycoffee.com.tr');
      expect(menu.length).toBeGreaterThan(0);
      expect(menu[0]).toHaveProperty('id');
      expect(menu[0].priceCents).toBeGreaterThan(0);
    });

    it('keeps menu isolated per domain', async () => {
      const base = await svc.getMenu('cafeos.zk.net.tr');
      await svc.upsertMenuItem('cafeos.zk.net.tr', {
        id: 'special',
        name: 'Special Drink',
        category: 'coffee',
        priceCents: 5000,
        note: '',
      });
      expect((await svc.getMenu('cafeos.zk.net.tr')).some((m) => m.id === 'special')).toBe(true);
      expect((await svc.getMenu('cafeos.waycoffee.com.tr')).some((m) => m.id === 'special')).toBe(false);
      const after = await svc.getMenu('cafeos.zk.net.tr');
      expect(base.map((m) => m.id)).toEqual(after.map((m) => m.id).slice(0, base.length) as string[]);
    });
  });

  describe('tables', () => {
    it('lists default tables', async () => {
      const tables = await svc.getTables('cafeos.waycoffee.com.tr', 'http://localhost');
      expect(tables.length).toBeGreaterThanOrEqual(8);
      expect(tables[0].code).toBe('T1');
    });
  });

  describe('ordering flow', () => {
    it('creates an order from menu items', async () => {
      const order = await svc.createOrder('cafeos.waycoffee.com.tr', {
        tableCode: 'T1',
        items: [{ productId: 'latte', quantity: 2 }],
      });
      expect(order.status).toBe('received');
      expect(order.tableCode).toBe('T1');
      expect(order.totalCents).toBe(2 * 14500);
      expect(order.items).toHaveLength(1);
      expect(order.items[0].name).toBe('Cafe Latte');
    });

    it('rejects ordering for an unknown table', async () => {
      await expect(
        svc.createOrder('cafeos.waycoffee.com.tr', {
          tableCode: 'A1',
          items: [{ productId: 'latte', quantity: 1 }],
        }),
      ).rejects.toThrow(AppError);
    });

    it('rejects ordering for a product not on the menu', async () => {
      await expect(
        svc.createOrder('cafeos.waycoffee.com.tr', {
          tableCode: 'T1',
          items: [{ productId: 'nope', quantity: 1 }],
        }),
      ).rejects.toThrow(AppError);
    });

    it('rejects empty item list', async () => {
      await expect(
        svc.createOrder('cafeos.waycoffee.com.tr', { tableCode: 'T1', items: [] }),
      ).rejects.toThrow(AppError);
    });

    it('appears on the kitchen board', async () => {
      const order = await svc.createOrder('cafeos.waycoffee.com.tr', {
        tableCode: 'T2',
        items: [{ productId: 'americano', quantity: 1 }],
      });
      const kitchen = await svc.getKitchenOrders('cafeos.waycoffee.com.tr');
      expect(kitchen.some((o) => o.id === order.id)).toBe(true);
      expect(kitchen.find((o) => o.id === order.id)?.status).toBe('received');
    });

    it('advances status through the flow', async () => {
      const order = await svc.createOrder('cafeos.zk.net.tr', {
        tableCode: 'T3',
        items: [{ productId: 'toast', quantity: 1 }],
      });
      const cooking = await svc.advanceOrder('cafeos.zk.net.tr', order.id);
      expect(cooking.status).toBe('preparing');
      const ready = await svc.advanceOrder('cafeos.zk.net.tr', order.id);
      expect(ready.status).toBe('ready');
    });

    it('cannot advance an unknown order', async () => {
      await expect(svc.advanceOrder('cafeos.zk.net.tr', 'does-not-exist')).rejects.toThrow(AppError);
    });

    it('can edit an order before it is ready', async () => {
      const order = await svc.createOrder('cafeos.zk.net.tr', {
        tableCode: 'T4',
        items: [{ productId: 'latte', quantity: 1 }],
      });
      const edited = await svc.updateOrder('cafeos.zk.net.tr', order.id, {
        tableCode: 'T4',
        items: [{ productId: 'latte', quantity: 3 }],
      });
      expect(edited.totalCents).toBe(3 * 14500);
    });
  });

  describe('tenant isolation', () => {
    it('keeps orders separate per domain', async () => {
      const a = await svc.createOrder('cafeos.zk.net.tr', {
        tableCode: 'T1',
        items: [{ productId: 'latte', quantity: 1 }],
      });
      expect((await svc.getKitchenOrders('cafeos.waycoffee.com.tr')).some((o) => o.id === a.id)).toBe(false);
      expect((await svc.getKitchenOrders('cafeos.zk.net.tr')).some((o) => o.id === a.id)).toBe(true);
    });

    it('isolates branch state within a domain', async () => {
      const branchDomain = 'cafeos.zk.net.tr::west';
      const mainDomain = 'cafeos.zk.net.tr';
      const order = await svc.createOrder(branchDomain, {
        tableCode: 'T1',
        items: [{ productId: 'latte', quantity: 1 }],
      });
      expect((await svc.getKitchenOrders(mainDomain)).some((o) => o.id === order.id)).toBe(false);
      expect((await svc.getKitchenOrders(branchDomain)).some((o) => o.id === order.id)).toBe(true);
    });
  });

  describe('daily report', () => {
    it('reports totals for completed orders', async () => {
      await svc.createOrder('cafeos.zk.net.tr', {
        tableCode: 'T1',
        items: [{ productId: 'latte', quantity: 2 }],
      });
      await svc.createOrder('cafeos.zk.net.tr', {
        tableCode: 'T2',
        items: [{ productId: 'americano', quantity: 1 }],
      });
      const report = await svc.getDailyReport('cafeos.zk.net.tr');
      expect(report.orderCount).toBeGreaterThanOrEqual(2);
      expect(report.grossRevenueCents).toBeGreaterThanOrEqual(2 * 14500 + 11000);
    });
  });

  describe('table accounts', () => {
    it('opens an account for a table', async () => {
      const account = await svc.openAccount('cafeos.waycoffee.com.tr', 'T5');
      expect(account.status).toBe('open');
      expect(account.tableCode).toBe('T5');
      expect(account.totalCents).toBe(0);
      expect(account.orderIds).toEqual([]);
    });

    it('returns the same account when reopening a table', async () => {
      await svc.openAccount('cafeos.waycoffee.com.tr', 'T5');
      const again = await svc.openAccount('cafeos.waycoffee.com.tr', 'T5');
      expect(again.status).toBe('open');
      const accounts = (await svc.getTableAccounts('cafeos.waycoffee.com.tr')).filter((a) => a.tableCode === 'T5');
      expect(accounts).toHaveLength(1);
    });

    it('attaches orders placed on the table to the open account', async () => {
      const first = await svc.createOrder('cafeos.waycoffee.com.tr', {
        tableCode: 'T5',
        items: [{ productId: 'latte', quantity: 2 }],
      });
      const second = await svc.createOrder('cafeos.waycoffee.com.tr', {
        tableCode: 'T5',
        items: [{ productId: 'toast', quantity: 1 }],
      });
      const account = await svc.getAccountByTable('cafeos.waycoffee.com.tr', 'T5');
      expect(account).not.toBeNull();
      expect(account!.orderIds.sort()).toEqual([first.id, second.id].sort());
      expect(account!.totalCents).toBe(2 * 14500 + 18000);
      expect(account!.itemCount).toBe(3);
    });

    it('marks an account as requested', async () => {
      await svc.createOrder('cafeos.waycoffee.com.tr', {
        tableCode: 'T6',
        items: [{ productId: 'americano', quantity: 1 }],
      });
      const requested = await svc.requestAccount('cafeos.waycoffee.com.tr', 'T6');
      expect(requested.status).toBe('requested');
      expect(requested.requestedAt).toBeDefined();
    });

    it('closes an account with a payment method', async () => {
      await svc.createOrder('cafeos.waycoffee.com.tr', {
        tableCode: 'T6',
        items: [{ productId: 'latte', quantity: 1 }],
      });
      await svc.requestAccount('cafeos.waycoffee.com.tr', 'T6');
      const closed = await svc.closeAccount('cafeos.waycoffee.com.tr', 'T6', 'card');
      expect(closed.status).toBe('paid');
      expect(closed.paymentMethod).toBe('card');
      expect(closed.closedAt).toBeDefined();
      expect(closed.totalCents).toBe(14500);
    });

    it('rejects closing an account without an open account', async () => {
      await expect(svc.closeAccount('cafeos.waycoffee.com.tr', 'T1', 'cash')).rejects.toThrow(AppError);
    });

    it('rejects closing an account twice', async () => {
      await svc.createOrder('cafeos.waycoffee.com.tr', {
        tableCode: 'T6',
        items: [{ productId: 'latte', quantity: 1 }],
      });
      await svc.closeAccount('cafeos.waycoffee.com.tr', 'T6', 'cash');
      await expect(svc.closeAccount('cafeos.waycoffee.com.tr', 'T6', 'card')).rejects.toThrow(AppError);
    });

    it('rejects an invalid payment method', async () => {
      await svc.createOrder('cafeos.waycoffee.com.tr', {
        tableCode: 'T6',
        items: [{ productId: 'latte', quantity: 1 }],
      });
      await expect(svc.closeAccount('cafeos.waycoffee.com.tr', 'T6', 'bitcoin' as never)).rejects.toThrow(AppError);
    });

    it('opens a fresh account after the previous is paid (does not reuse paid)', async () => {
      await svc.createOrder('cafeos.waycoffee.com.tr', {
        tableCode: 'T6',
        items: [{ productId: 'latte', quantity: 1 }],
      });
      const firstAcc = await svc.getAccountByTable('cafeos.waycoffee.com.tr', 'T6');
      await svc.closeAccount('cafeos.waycoffee.com.tr', 'T6', 'cash');
      const after = await svc.createOrder('cafeos.waycoffee.com.tr', {
        tableCode: 'T6',
        items: [{ productId: 'latte', quantity: 1 }],
      });
      const account = await svc.getAccountByTable('cafeos.waycoffee.com.tr', 'T6');
      expect(account).not.toBeNull();
      expect(account!.id).not.toBe(firstAcc!.id); // ödenmiş hesap yeniden kullanılmaz
      expect(account!.orderIds).toHaveLength(1);
      expect(account!.orderIds).toContain(after.id); // yeni sipariş yeni hesaba bağlanır
    });

    it('isolates accounts per domain and branch', async () => {
      await svc.openAccount('cafeos.waycoffee.com.tr', 'T2');
      await svc.openAccount('cafeos.waycoffee.com.tr::west', 'T2');
      const main = (await svc.getTableAccounts('cafeos.waycoffee.com.tr')).filter((a) => a.tableCode === 'T2');
      const branch = (await svc.getTableAccounts('cafeos.waycoffee.com.tr::west')).filter((a) => a.tableCode === 'T2');
      expect(main).toHaveLength(1);
      expect(branch).toHaveLength(1);
      expect(main[0].id).not.toBe(branch[0].id);
    });
  });
});