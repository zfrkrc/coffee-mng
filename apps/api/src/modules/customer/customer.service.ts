// @ts-nocheck — persistence patch, Prisma types from schema
import { Injectable, Inject } from '@nestjs/common';
import { AppError, uuidv7 } from '@cafeos/shared';
import { computeOrderTotals } from '@cafeos/domain';
import { PrismaClient } from '@prisma/client';
import { PRISMA } from '../../core/database/prisma.module';
import type {
  AccountView, CafeTable, CustomerOrderLine, CustomerOrderView,
  DailyReport, InventoryItem, MenuItem, OpsOverview, PaymentMethod,
  TableAccount, TableWithQr,
} from './customer.types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface CreateCustomerOrderInput { tableCode: string; items: Array<{ productId: string; quantity: number }>; }
export interface UpdateCustomerOrderInput { tableCode: string; items: Array<{ productId: string; quantity: number }>; }
export interface MenuItemUpsertInput { id: string; name: string; category: MenuItem['category']; priceCents: number; note: string; imageUrl?: string; }
export interface UpsertTableInput { id?: string; code: string; name: string; capacity: number; }

const STATUS_FLOW: CustomerOrderView['status'][] = ['received', 'preparing', 'ready'];

@Injectable()
export class CustomerService {
  constructor(@Inject(PRISMA) private readonly db: PrismaClient) {}

  // ── helpers ──────────────────────────────────────────────────────────────
  private resolveMember(domain: string): { memberId: string; branchSlug: string | null } {
    const key = domain.trim().toLowerCase();
    const idx = key.indexOf('::');
    return {
      memberId: idx === -1 ? key : key.slice(0, idx),
      branchSlug: idx === -1 ? null : key.slice(idx + 2).trim().toLowerCase() || null,
    };
  }

  private menuFilter(memberId: string, branchSlug: string | null) {
    return { memberId, branchSlug: branchSlug ?? null };
  }

  // ── seed ─────────────────────────────────────────────────────────────────
  private async seedTables(memberId: string, branchSlug: string | null) {
    const existing = await this.db.cafeTable.count({ where: { memberId, branchSlug: branchSlug ?? null } });
    if (existing > 0) return;
    const defaults = [
      { code: 'T1', name: 'Masa 1', capacity: 2 },
      { code: 'T2', name: 'Masa 2', capacity: 2 },
      { code: 'T3', name: 'Masa 3', capacity: 4 },
      { code: 'T4', name: 'Masa 4', capacity: 4 },
      { code: 'T5', name: 'Masa 5', capacity: 6 },
      { code: 'T6', name: 'Masa 6', capacity: 6 },
      { code: 'T7', name: 'Masa 7', capacity: 8 },
      { code: 'T8', name: 'Masa 8', capacity: 8 },
    ];
    await this.db.cafeTable.createMany({
      data: defaults.map((t) => ({
        id: uuidv7(), memberId, branchSlug: branchSlug ?? null,
        code: t.code, name: t.name, capacity: t.capacity,
      })),
    });
  }

  private async seedMenu(memberId: string, branchSlug: string | null) {
    const existing = await this.db.cafeMenuItem.count({ where: { memberId, branchSlug: branchSlug ?? null } });
    if (existing > 0) return;
    const defaults = [
      { id: 'latte', name: 'Cafe Latte', category: 'coffee', priceCents: 14500, note: 'Double shot, silky milk', imageUrl: 'https://images.unsplash.com/photo-1494314671902-399b18174975?auto=format&fit=crop&w=900&q=80' },
      { id: 'americano', name: 'Americano', category: 'coffee', priceCents: 11000, note: 'Clean and bold', imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80' },
      { id: 'earlgrey', name: 'Earl Grey', category: 'tea', priceCents: 9500, note: 'Bergamot black tea', imageUrl: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=900&q=80' },
      { id: 'toast', name: 'Avocado Toast', category: 'food', priceCents: 18000, note: 'Sourdough + lemon', imageUrl: 'https://images.unsplash.com/photo-1603046891744-9bcaf8f7d6d9?auto=format&fit=crop&w=900&q=80' },
      { id: 'croissant', name: 'Butter Croissant', category: 'food', priceCents: 8500, note: 'Fresh baked daily', imageUrl: 'https://images.unsplash.com/photo-1555507036-ab794f4afe5b?auto=format&fit=crop&w=900&q=80' },
      { id: 'tiramisu', name: 'Tiramisu', category: 'dessert', priceCents: 16500, note: 'House special', imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=900&q=80' },
    ];
    await this.db.cafeMenuItem.createMany({
      data: defaults.map((m) => ({
        id: m.id, memberId, branchSlug: branchSlug ?? null,
        name: m.name, category: m.category, priceCents: m.priceCents,
        note: m.note, imageUrl: m.imageUrl,
      })),
    });
  }

  private async ensureSeeded(memberId: string, branchSlug: string | null) {
    await this.seedTables(memberId, branchSlug);
    await this.seedMenu(memberId, branchSlug);
    await this.seedInventory(memberId, branchSlug);
  }

  // ── menu ─────────────────────────────────────────────────────────────────
  async getMenu(domain: string): Promise<MenuItem[]> {
    const { memberId, branchSlug } = this.resolveMember(domain);
    await this.ensureSeeded(memberId, branchSlug);
    const rows = await this.db.cafeMenuItem.findMany({ where: this.menuFilter(memberId, branchSlug) });
    return rows.map((r) => ({
      id: r.id, name: r.name, category: r.category as MenuItem['category'],
      priceCents: r.priceCents, note: r.note, imageUrl: r.imageUrl ?? undefined,
    }));
  }

  async upsertMenuItem(domain: string, input: MenuItemUpsertInput): Promise<MenuItem> {
    const { memberId, branchSlug } = this.resolveMember(domain);
    if (!input.id.trim() || !input.name.trim()) throw AppError.validation('Menu item id and name are required');
    if (input.priceCents <= 0) throw AppError.validation('Price must be positive');
    await this.db.cafeMenuItem.upsert({
      where: { memberId_branchSlug_id: { memberId, branchSlug: branchSlug ?? null, id: input.id.trim() } },
      create: { id: input.id.trim(), memberId, branchSlug: branchSlug ?? null, name: input.name.trim(), category: input.category, priceCents: input.priceCents, note: input.note.trim(), imageUrl: input.imageUrl?.trim() || null },
      update: { name: input.name.trim(), category: input.category, priceCents: input.priceCents, note: input.note.trim(), imageUrl: input.imageUrl?.trim() || null },
    });
    return { id: input.id.trim(), name: input.name.trim(), category: input.category, priceCents: input.priceCents, note: input.note.trim(), imageUrl: input.imageUrl?.trim() };
  }

  async deleteMenuItem(domain: string, itemId: string): Promise<void> {
    const { memberId, branchSlug } = this.resolveMember(domain);
    await this.db.cafeMenuItem.deleteMany({ where: { ...this.menuFilter(memberId, branchSlug), id: itemId } });
  }

  // ── tables ───────────────────────────────────────────────────────────────
  async getTables(domain: string, baseUrl: string, branchSlug?: string | null): Promise<TableWithQr[]> {
    const { memberId, branchSlug: bs } = this.resolveMember(domain);
    const slug = branchSlug ?? bs;
    await this.ensureSeeded(memberId, slug);
    const rows = await this.db.cafeTable.findMany({ where: { memberId, branchSlug: slug ?? null } });
    const bq = slug ? `?branch=${encodeURIComponent(slug)}` : '';
    return rows.map((t) => ({
      id: t.id, code: t.code, name: t.name, capacity: t.capacity,
      customerUrl: `${baseUrl}/m?table=${t.code}${slug ? `&branch=${encodeURIComponent(slug)}` : ''}`,
      qrImageUrl: `${baseUrl}/api/customer/qr/${t.code}${bq}`,
    }));
  }

  async upsertTable(domain: string, input: UpsertTableInput): Promise<CafeTable> {
    const { memberId, branchSlug } = this.resolveMember(domain);
    const code = input.code.trim().toUpperCase();
    const name = input.name.trim();
    const capacity = Math.max(1, Math.floor(input.capacity));
    if (!code || !name) throw AppError.validation('Table code and name are required');
    const existing = await this.db.cafeTable.findFirst({ where: { memberId, branchSlug: branchSlug ?? null, code } });
    if (existing) {
      return this.db.cafeTable.update({ where: { id: existing.id }, data: { name, capacity } });
    }
    const created = await this.db.cafeTable.create({
      data: { id: input.id?.trim() || `t-${code.toLowerCase()}`, memberId, branchSlug: branchSlug ?? null, code, name, capacity },
    });
    return created;
  }

  async deleteTable(domain: string, tableCode: string): Promise<void> {
    const { memberId, branchSlug } = this.resolveMember(domain);
    await this.db.cafeTable.deleteMany({ where: { memberId, branchSlug: branchSlug ?? null, code: tableCode.trim().toUpperCase() } });
  }

  async tableByCode(domain: string, tableCode: string): Promise<CafeTable> {
    const { memberId, branchSlug } = this.resolveMember(domain);
    const found = await this.db.cafeTable.findFirst({ where: { memberId, branchSlug: branchSlug ?? null, code: tableCode } });
    if (!found) throw AppError.validation('Unknown table code', { tableCode });
    return found;
  }

  // ── inventory (DB-backed, persists through restarts) ───────────────────
  async getInventory(domain: string): Promise<InventoryItem[]> {
    const { memberId, branchSlug } = this.resolveMember(domain);
    const rows = await this.db.cafeInventory.findMany({ where: { memberId, branchSlug: branchSlug ?? null } });
    return rows.map((r) => ({
      id: r.id, productId: r.menuItemId, productName: r.productName,
      unit: r.unit as InventoryItem['unit'], stock: r.stock, threshold: r.threshold,
    }));
  }

  async adjustInventory(domain: string, productId: string, delta: number): Promise<InventoryItem> {
    const { memberId, branchSlug } = this.resolveMember(domain);
    if (!Number.isInteger(delta)) throw AppError.validation('Delta must be integer');
    const item = await this.db.cafeInventory.findFirst({
      where: { memberId, branchSlug: branchSlug ?? null, menuItemId: productId },
    });
    if (!item) throw AppError.notFound('Inventory item not found');
    const updated = await this.db.cafeInventory.update({
      where: { id: item.id },
      data: { stock: Math.max(0, item.stock + delta) },
    });
    return { id: updated.id, productId: updated.menuItemId, productName: updated.productName,
             unit: updated.unit as InventoryItem['unit'], stock: updated.stock, threshold: updated.threshold };
  }

  private async seedInventory(memberId: string, branchSlug: string | null) {
    const existing = await this.db.cafeInventory.count({ where: { memberId, branchSlug: branchSlug ?? null } });
    if (existing > 0) return;
    const menu = await this.db.cafeMenuItem.findMany({ where: { memberId, branchSlug: branchSlug ?? null } });
    const defaults = [
      { productId: 'latte', threshold: 10, stock: 34 },
      { productId: 'americano', threshold: 10, stock: 28 },
      { productId: 'earlgrey', threshold: 8, stock: 7 },
      { productId: 'toast', threshold: 6, stock: 12 },
      { productId: 'croissant', threshold: 8, stock: 5 },
      { productId: 'tiramisu', threshold: 5, stock: 9 },
    ];
    await this.db.cafeInventory.createMany({
      data: defaults.map((d) => {
        const m = menu.find((x) => x.id === d.productId);
        return {
          id: uuidv7(), memberId, branchSlug: branchSlug ?? null,
          menuItemId: d.productId, productName: m?.name ?? d.productId,
          unit: 'pcs', stock: d.stock, threshold: d.threshold,
        };
      }),
    });
  }

  // ── orders ───────────────────────────────────────────────────────────────
  async createOrder(domain: string, input: CreateCustomerOrderInput): Promise<CustomerOrderView> {
    const { memberId, branchSlug } = this.resolveMember(domain);
    const tableCode = input.tableCode.trim().toUpperCase();
    const table = await this.tableByCode(domain, tableCode);
    if (input.items.length === 0) throw AppError.validation('At least one item is required');

    const menu = await this.getMenu(domain);
    const lines = input.items.map((item) => {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) throw AppError.validation('Quantity must be positive');
      const product = menu.find((m) => m.id === item.productId);
      if (!product) throw AppError.validation('Unknown product', { productId: item.productId });
      return { productId: product.id, name: product.name, quantity: item.quantity, unitPriceCents: product.priceCents, lineTotalCents: product.priceCents * item.quantity };
    });

    const totals = computeOrderTotals(lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPriceCents: l.unitPriceCents })));

    // Ensure day shift
    let shift = await this.db.dayShift.findFirst({ where: { memberId, branchSlug: branchSlug ?? null, status: 'open' }, orderBy: { openedAt: 'desc' } });
    if (!shift) {
      shift = await this.db.dayShift.create({ data: { id: uuidv7(), memberId, branchSlug: branchSlug ?? null, status: 'open' } });
    }

    const order = await this.db.order.create({
      data: {
        id: uuidv7(), memberId, branchSlug: branchSlug ?? null, dayShiftId: shift.id,
        tableCode: table.code, tableName: table.name, status: 'received', totalCents: totals.totalCents,
        items: { create: lines.map((l) => ({ id: uuidv7(), name: l.name, quantity: l.quantity, unitPriceCents: l.unitPriceCents, lineTotalCents: l.lineTotalCents })) },
      },
      include: { items: true },
    });

    await this.attachOrderToAccount(domain, tableCode, order.id);
    return this.toView(order);
  }

  async getOrder(domain: string, orderId: string): Promise<CustomerOrderView> {
    const order = await this.db.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw AppError.notFound('Order not found');
    return this.toView(order);
  }

  async getKitchenOrders(domain: string): Promise<CustomerOrderView[]> {
    const { memberId, branchSlug } = this.resolveMember(domain);
    const orders = await this.db.order.findMany({
      where: { memberId, branchSlug: branchSlug ?? null, status: { not: 'ready' } },
      include: { items: true }, orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.toView(o));
  }

  async getOverview(domain: string): Promise<OpsOverview> {
    const { memberId, branchSlug } = this.resolveMember(domain);
    const [menuCount, tableCount, openOrders, orders] = await Promise.all([
      this.db.cafeMenuItem.count({ where: this.menuFilter(memberId, branchSlug) }),
      this.db.cafeTable.count({ where: { memberId, branchSlug: branchSlug ?? null } }),
      this.db.order.count({ where: { memberId, branchSlug: branchSlug ?? null, status: { not: 'ready' } } }),
      this.db.order.findMany({ where: { memberId, branchSlug: branchSlug ?? null } }),
    ]);
    const inv = await this.db.cafeInventory.findMany({ where: { memberId, branchSlug: branchSlug ?? null } });
    const lowStockCount = inv.filter((i) => i.stock <= i.threshold).length;
    const totalRevenueCents = orders.filter((o) => o.status === 'ready').reduce((a, o) => a + o.totalCents, 0);
    return { menuCount, tableCount, openOrders, lowStockCount, totalRevenueCents };
  }

  async getDailyReport(domain: string): Promise<DailyReport> {
    const { memberId, branchSlug } = this.resolveMember(domain);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const orders = await this.db.order.findMany({
      where: { memberId, branchSlug: branchSlug ?? null, createdAt: { gte: today } },
      include: { items: true },
    });
    const grossRevenueCents = orders.reduce((a, o) => a + o.totalCents, 0);
    const byProduct = new Map<string, { name: string; qty: number }>();
    const byTable = new Map<string, { tableName: string; orders: number }>();
    for (const o of orders) {
      const tr = byTable.get(o.tableCode) ?? { tableName: o.tableName, orders: 0 }; tr.orders++; byTable.set(o.tableCode, tr);
      for (const item of o.items) { const pr = byProduct.get(item.name) ?? { name: item.name, qty: 0 }; pr.qty += item.quantity; byProduct.set(item.name, pr); }
    }
    const topProducts = Array.from(byProduct.entries()).map(([k, v]) => ({ productId: k, name: v.name, qty: v.qty })).sort((a, b) => b.qty - a.qty).slice(0, 5);
    const tableLoad = Array.from(byTable.entries()).map(([k, v]) => ({ tableCode: k, tableName: v.tableName, orders: v.orders })).sort((a, b) => b.orders - a.orders);
    return { date: today.toISOString().slice(0, 10), orderCount: orders.length, grossRevenueCents, averageOrderCents: orders.length ? Math.round(grossRevenueCents / orders.length) : 0, topProducts, tableLoad };
  }

  async advanceOrder(domain: string, orderId: string): Promise<CustomerOrderView> {
    const order = await this.db.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw AppError.notFound('Order not found');
    const curIdx = STATUS_FLOW.indexOf(order.status as any);
    const next = STATUS_FLOW[Math.min(curIdx + 1, STATUS_FLOW.length - 1)];
    const updated = await this.db.order.update({ where: { id: orderId }, data: { status: next }, include: { items: true } });
    return this.toView(updated);
  }

  async updateOrder(domain: string, orderId: string, input: UpdateCustomerOrderInput): Promise<CustomerOrderView> {
    const order = await this.db.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw AppError.notFound('Order not found');
    if (order.status === 'ready') throw AppError.conflict('Ready orders cannot be edited');
    const table = await this.tableByCode(domain, input.tableCode.trim().toUpperCase());
    const menu = await this.getMenu(domain);
    const lines = input.items.map((item) => {
      const product = menu.find((m) => m.id === item.productId);
      if (!product) throw AppError.validation('Unknown product', { productId: item.productId });
      return { productId: product.id, name: product.name, quantity: item.quantity, unitPriceCents: product.priceCents, lineTotalCents: product.priceCents * item.quantity };
    });
    const totals = computeOrderTotals(lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPriceCents: l.unitPriceCents })));
    await this.db.orderItem.deleteMany({ where: { orderId } });
    const updated = await this.db.order.update({
      where: { id: orderId }, data: { tableCode: table.code, tableName: table.name, totalCents: totals.totalCents, items: { create: lines.map((l) => ({ id: uuidv7(), name: l.name, quantity: l.quantity, unitPriceCents: l.unitPriceCents, lineTotalCents: l.lineTotalCents })) } },
      include: { items: true },
    });
    return this.toView(updated);
  }

  // ── accounts ─────────────────────────────────────────────────────────────
  async getTableAccounts(domain: string): Promise<AccountView[]> {
    const { memberId, branchSlug } = this.resolveMember(domain);
    const accounts = await this.db.tableAccount.findMany({
      where: { memberId, branchSlug: branchSlug ?? null },
      orderBy: { openedAt: 'desc' }, include: { orders: { include: { items: true } } },
    });
    return accounts.map((a) => this.toAccountView(a));
  }

  async getAccountByTable(domain: string, tableCode: string): Promise<AccountView | null> {
    const { memberId, branchSlug } = this.resolveMember(domain);
    const account = await this.db.tableAccount.findFirst({
      where: { memberId, branchSlug: branchSlug ?? null, tableCode, status: { not: 'paid' } },
      orderBy: { openedAt: 'desc' }, include: { orders: { include: { items: true } } },
    });
    return account ? this.toAccountView(account) : null;
  }

  async openAccount(domain: string, tableCode: string): Promise<AccountView> {
    const { memberId, branchSlug } = this.resolveMember(domain);
    const table = await this.tableByCode(domain, tableCode);
    const existing = await this.db.tableAccount.findFirst({ where: { memberId, branchSlug: branchSlug ?? null, tableCode: table.code, status: { not: 'paid' } }, orderBy: { openedAt: 'desc' } });
    if (existing) return this.toAccountView(existing);
    const acc = await this.db.tableAccount.create({
      data: { id: uuidv7(), memberId, branchSlug: branchSlug ?? null, dayShiftId: (await this.ensureShift(domain)).id, tableCode: table.code, tableName: table.name, status: 'open' },
      include: { orders: { include: { items: true } } },
    });
    return this.toAccountView(acc);
  }

  async requestAccount(domain: string, tableCode: string): Promise<AccountView> {
    const { memberId, branchSlug } = this.resolveMember(domain);
    let acc = await this.db.tableAccount.findFirst({ where: { memberId, branchSlug: branchSlug ?? null, tableCode, status: { not: 'paid' } }, orderBy: { openedAt: 'desc' } });
    if (!acc) return this.openAccount(domain, tableCode);
    acc = await this.db.tableAccount.update({ where: { id: acc.id }, data: { status: 'requested', requestedAt: new Date() }, include: { orders: { include: { items: true } } } });
    return this.toAccountView(acc);
  }

  async closeAccount(domain: string, tableCode: string, paymentMethod: PaymentMethod): Promise<AccountView> {
    const { memberId, branchSlug } = this.resolveMember(domain);
    const acc = await this.db.tableAccount.findFirst({ where: { memberId, branchSlug: branchSlug ?? null, tableCode, status: { not: 'paid' } }, orderBy: { openedAt: 'desc' } });
    if (!acc) throw AppError.notFound('No open account for this table');
    if (acc.status === 'paid') throw AppError.conflict('Account already paid');
    if (paymentMethod !== 'cash' && paymentMethod !== 'card') throw AppError.validation('paymentMethod must be cash or card');
    const updated = await this.db.tableAccount.update({ where: { id: acc.id }, data: { status: 'paid', paymentMethod, closedAt: new Date() }, include: { orders: { include: { items: true } } } });
    return this.toAccountView(updated);
  }

  // ── private helpers ──────────────────────────────────────────────────────
  private async ensureShift(domain: string) {
    const { memberId, branchSlug } = this.resolveMember(domain);
    let shift = await this.db.dayShift.findFirst({ where: { memberId, branchSlug: branchSlug ?? null, status: 'open' }, orderBy: { openedAt: 'desc' } });
    if (!shift) shift = await this.db.dayShift.create({ data: { id: uuidv7(), memberId, branchSlug: branchSlug ?? null, status: 'open' } });
    return shift;
  }

  private async attachOrderToAccount(domain: string, tableCode: string, orderId: string) {
    const { memberId, branchSlug } = this.resolveMember(domain);
    let acc = await this.db.tableAccount.findFirst({ where: { memberId, branchSlug: branchSlug ?? null, tableCode, status: { not: 'paid' } }, orderBy: { openedAt: 'desc' } });
    if (!acc) {
      const shift = await this.ensureShift(domain);
      acc = await this.db.tableAccount.create({ data: { id: uuidv7(), memberId, branchSlug: branchSlug ?? null, dayShiftId: shift.id, tableCode, tableName: tableCode, status: 'open' } });
    }
    await this.db.order.update({ where: { id: orderId }, data: { accountId: acc.id } });
  }

  private toView(o: any): CustomerOrderView {
    return {
      id: o.id, tableCode: o.tableCode, tableName: o.tableName, status: o.status,
      items: (o.items || []).map((i: any) => ({ productId: i.menuItemId || i.id, name: i.name, quantity: i.quantity, unitPriceCents: i.unitPriceCents, lineTotalCents: i.lineTotalCents })),
      totalCents: o.totalCents, createdAt: o.createdAt?.toISOString?.() ?? o.createdAt, updatedAt: o.updatedAt?.toISOString?.() ?? o.updatedAt,
    };
  }

  private toAccountView(a: any): AccountView {
    const orders = (a.orders || []);
    const totalCents = orders.reduce((s: number, o: any) => s + o.totalCents, 0);
    const itemCount = orders.reduce((s: number, o: any) => s + (o.items || []).reduce((n: number, i: any) => n + i.quantity, 0), 0);
    return {
      id: a.id, tableCode: a.tableCode, tableName: a.tableName, status: a.status,
      openedAt: a.openedAt?.toISOString?.() ?? a.openedAt, requestedAt: a.requestedAt?.toISOString?.() ?? a.requestedAt,
      closedAt: a.closedAt?.toISOString?.() ?? a.closedAt, paymentMethod: a.paymentMethod,
      totalCents, itemCount, orderIds: orders.map((o: any) => o.id),
    };
  }
}