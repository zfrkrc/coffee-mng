import { Injectable } from '@nestjs/common';
import { AppError, uuidv7 } from '@cafeos/shared';
import { computeOrderTotals } from '@cafeos/domain';
import type {
  CafeTable,
  CustomerOrderLine,
  CustomerOrderView,
  DailyReport,
  InventoryItem,
  MenuItem,
  OpsOverview,
  TableWithQr,
} from './customer.types';

export interface CreateCustomerOrderInput {
  tableCode: string;
  items: Array<{ productId: string; quantity: number }>;
}

export interface MenuItemUpsertInput {
  id: string;
  name: string;
  category: MenuItem['category'];
  priceCents: number;
  note: string;
  imageUrl?: string;
}

export interface UpsertTableInput {
  id?: string;
  code: string;
  name: string;
  capacity: number;
}

type StoredOrder = CustomerOrderView & { statusIndex: number };
type CustomerState = {
  tables: CafeTable[];
  menu: MenuItem[];
  inventory: InventoryItem[];
  orders: Map<string, StoredOrder>;
};

const STATUS_FLOW: CustomerOrderView['status'][] = ['received', 'preparing', 'ready'];

@Injectable()
export class CustomerService {
  private readonly defaultTables: CafeTable[] = [
    { id: 't-1', code: 'T1', name: 'Masa 1', capacity: 2 },
    { id: 't-2', code: 'T2', name: 'Masa 2', capacity: 2 },
    { id: 't-3', code: 'T3', name: 'Masa 3', capacity: 4 },
    { id: 't-4', code: 'T4', name: 'Masa 4', capacity: 4 },
    { id: 't-5', code: 'T5', name: 'Masa 5', capacity: 6 },
    { id: 't-6', code: 'T6', name: 'Masa 6', capacity: 6 },
    { id: 't-7', code: 'T7', name: 'Masa 7', capacity: 8 },
    { id: 't-8', code: 'T8', name: 'Masa 8', capacity: 8 },
  ];

  private readonly defaultMenu: MenuItem[] = [
    {
      id: 'latte',
      name: 'Cafe Latte',
      category: 'coffee',
      priceCents: 14500,
      note: 'Double shot, silky milk',
      imageUrl: 'https://images.unsplash.com/photo-1494314671902-399b18174975?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 'americano',
      name: 'Americano',
      category: 'coffee',
      priceCents: 11000,
      note: 'Clean and bold',
      imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 'earlgrey',
      name: 'Earl Grey',
      category: 'tea',
      priceCents: 9500,
      note: 'Bergamot black tea',
      imageUrl: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 'toast',
      name: 'Avocado Toast',
      category: 'food',
      priceCents: 18000,
      note: 'Sourdough + lemon',
      imageUrl: 'https://images.unsplash.com/photo-1603046891744-9bcaf8f7f6d9?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 'croissant',
      name: 'Butter Croissant',
      category: 'food',
      priceCents: 8500,
      note: 'Fresh baked daily',
      imageUrl: 'https://images.unsplash.com/photo-1555507036-ab794f4afe5b?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 'tiramisu',
      name: 'Tiramisu',
      category: 'dessert',
      priceCents: 16500,
      note: 'House special',
      imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=900&q=80',
    },
  ];

  private readonly defaultInventory: InventoryItem[] = [
    {
      id: 'inv-latte',
      productId: 'latte',
      productName: 'Cafe Latte',
      unit: 'pcs',
      stock: 34,
      threshold: 10,
    },
    {
      id: 'inv-americano',
      productId: 'americano',
      productName: 'Americano',
      unit: 'pcs',
      stock: 28,
      threshold: 10,
    },
    {
      id: 'inv-earlgrey',
      productId: 'earlgrey',
      productName: 'Earl Grey',
      unit: 'pcs',
      stock: 7,
      threshold: 8,
    },
    {
      id: 'inv-toast',
      productId: 'toast',
      productName: 'Avocado Toast',
      unit: 'pcs',
      stock: 12,
      threshold: 6,
    },
    {
      id: 'inv-croissant',
      productId: 'croissant',
      productName: 'Butter Croissant',
      unit: 'pcs',
      stock: 5,
      threshold: 8,
    },
    {
      id: 'inv-tiramisu',
      productId: 'tiramisu',
      productName: 'Tiramisu',
      unit: 'pcs',
      stock: 9,
      threshold: 5,
    },
  ];

  private readonly states = new Map<string, CustomerState>();

  getMenu(domain: string): MenuItem[] {
    return this.stateFor(domain).menu;
  }

  upsertMenuItem(domain: string, input: MenuItemUpsertInput): MenuItem {
    const state = this.stateFor(domain);
    const normalizedId = input.id.trim();
    const normalizedName = input.name.trim();
    if (!normalizedId || !normalizedName) {
      throw AppError.validation('Menu item id and name are required');
    }
    if (input.priceCents <= 0) {
      throw AppError.validation('Price must be positive', { priceCents: 'must be > 0' });
    }

    const existingIdx = state.menu.findIndex((m) => m.id === normalizedId);
    const next: MenuItem = {
      id: normalizedId,
      name: normalizedName,
      category: input.category,
      priceCents: input.priceCents,
      note: input.note.trim(),
      imageUrl: input.imageUrl?.trim() || undefined,
    };

    if (existingIdx >= 0) {
      state.menu[existingIdx] = next;
    } else {
      state.menu.push(next);
      state.inventory.push({
        id: `inv-${normalizedId}`,
        productId: normalizedId,
        productName: normalizedName,
        unit: 'pcs',
        stock: 0,
        threshold: 5,
      });
    }

    return next;
  }

  deleteMenuItem(domain: string, itemId: string): void {
    const state = this.stateFor(domain);
    const idx = state.menu.findIndex((m) => m.id === itemId);
    if (idx === -1) throw AppError.notFound('Menu item not found');
    state.menu.splice(idx, 1);
  }

  getTables(domain: string, baseUrl: string, branchSlug?: string | null): TableWithQr[] {
    const branchQuery = branchSlug ? `?branch=${encodeURIComponent(branchSlug)}` : '';
    return this.stateFor(domain).tables.map((table) => ({
      ...table,
      customerUrl: `${baseUrl}/m?table=${table.code}${branchSlug ? `&branch=${encodeURIComponent(branchSlug)}` : ''}`,
      qrImageUrl: `${baseUrl}/api/customer/qr/${table.code}${branchQuery}`,
    }));
  }

  upsertTable(domain: string, input: UpsertTableInput): CafeTable {
    const state = this.stateFor(domain);
    const code = input.code.trim().toUpperCase();
    const name = input.name.trim();
    const capacity = Math.max(1, Math.floor(input.capacity));
    if (!code || !name) throw AppError.validation('Table code and name are required');

    const existing = state.tables.find((t) => t.code === code || (input.id && t.id === input.id));
    if (existing) {
      existing.code = code;
      existing.name = name;
      existing.capacity = capacity;
      return existing;
    }

    const table: CafeTable = {
      id: input.id?.trim() || `t-${code.toLowerCase()}`,
      code,
      name,
      capacity,
    };
    state.tables.push(table);
    return table;
  }

  deleteTable(domain: string, tableCode: string): void {
    const state = this.stateFor(domain);
    const code = tableCode.trim().toUpperCase();
    const idx = state.tables.findIndex((t) => t.code === code);
    if (idx === -1) throw AppError.notFound('Table not found');
    const hasOrders = Array.from(state.orders.values()).some((o) => o.tableCode === code);
    if (hasOrders) {
      throw AppError.conflict('Table has existing orders and cannot be removed');
    }
    state.tables.splice(idx, 1);
  }

  tableByCode(domain: string, tableCode: string): CafeTable {
    const found = this.stateFor(domain).tables.find((t) => t.code === tableCode);
    if (!found) throw AppError.validation('Unknown table code', { tableCode });
    return found;
  }

  getInventory(domain: string): InventoryItem[] {
    return this.stateFor(domain).inventory;
  }

  adjustInventory(domain: string, productId: string, delta: number): InventoryItem {
    const state = this.stateFor(domain);
    const item = state.inventory.find((x) => x.productId === productId);
    if (!item) throw AppError.notFound('Inventory item not found');
    if (!Number.isInteger(delta)) {
      throw AppError.validation('Delta must be integer', { delta: 'must be integer' });
    }
    item.stock = Math.max(0, item.stock + delta);
    return item;
  }

  createOrder(domain: string, input: CreateCustomerOrderInput): CustomerOrderView {
    const state = this.stateFor(domain);
    const tableCode = input.tableCode.trim().toUpperCase();
    const table = this.tableByCode(domain, tableCode);
    if (input.items.length === 0) {
      throw AppError.validation('At least one item is required', { items: 'empty' });
    }

    const lines: CustomerOrderLine[] = input.items.map((item) => {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw AppError.validation('Quantity must be a positive integer', {
          quantity: `invalid for product ${item.productId}`,
        });
      }
      const product = state.menu.find((m) => m.id === item.productId);
      if (!product) {
        throw AppError.validation('Unknown product', { productId: item.productId });
      }
      return {
        productId: product.id,
        name: product.name,
        quantity: item.quantity,
        unitPriceCents: product.priceCents,
        lineTotalCents: product.priceCents * item.quantity,
      };
    });

    const totals = computeOrderTotals(
      lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
      })),
    );

    const now = new Date().toISOString();
    const id = uuidv7();
    const order: StoredOrder = {
      id,
      tableCode,
      tableName: table.name,
      status: 'received',
      statusIndex: 0,
      items: lines,
      totalCents: totals.totalCents,
      createdAt: now,
      updatedAt: now,
    };

    state.orders.set(id, order);
    return this.publicOrder(order);
  }

  getOrder(domain: string, orderId: string): CustomerOrderView {
    const state = this.stateFor(domain);
    const found = state.orders.get(orderId);
    if (!found) throw AppError.notFound('Order not found');

    const now = Date.now();
    const created = new Date(found.createdAt).getTime();
    const elapsedSec = Math.floor((now - created) / 1000);
    const nextIndex = elapsedSec >= 12 ? 2 : elapsedSec >= 4 ? 1 : 0;

    if (nextIndex !== found.statusIndex) {
      found.statusIndex = nextIndex;
      found.status = STATUS_FLOW[nextIndex];
      found.updatedAt = new Date().toISOString();
      state.orders.set(found.id, found);
    }

    return this.publicOrder(found);
  }

  getKitchenOrders(domain: string): CustomerOrderView[] {
    return Array.from(this.stateFor(domain).orders.values())
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((order) => this.publicOrder(order));
  }

  getOverview(domain: string): OpsOverview {
    const state = this.stateFor(domain);
    const all = Array.from(state.orders.values());
    const lowStockCount = state.inventory.filter((i) => i.stock <= i.threshold).length;
    const totalRevenueCents = all.filter((o) => o.status === 'ready').reduce((acc, o) => acc + o.totalCents, 0);
    return {
      menuCount: state.menu.length,
      tableCount: state.tables.length,
      openOrders: all.filter((o) => o.status !== 'ready').length,
      lowStockCount,
      totalRevenueCents,
    };
  }

  getDailyReport(domain: string): DailyReport {
    const today = new Date().toISOString().slice(0, 10);
    const orders = Array.from(this.stateFor(domain).orders.values());
    const grossRevenueCents = orders.reduce((acc, o) => acc + o.totalCents, 0);
    const byProduct = new Map<string, { name: string; qty: number }>();
    const byTable = new Map<string, { tableName: string; orders: number }>();

    for (const order of orders) {
      const tableRow = byTable.get(order.tableCode) ?? { tableName: order.tableName, orders: 0 };
      tableRow.orders += 1;
      byTable.set(order.tableCode, tableRow);

      for (const item of order.items) {
        const prod = byProduct.get(item.productId) ?? { name: item.name, qty: 0 };
        prod.qty += item.quantity;
        byProduct.set(item.productId, prod);
      }
    }

    const topProducts = Array.from(byProduct.entries())
      .map(([productId, v]) => ({ productId, name: v.name, qty: v.qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const tableLoad = Array.from(byTable.entries())
      .map(([tableCode, v]) => ({ tableCode, tableName: v.tableName, orders: v.orders }))
      .sort((a, b) => b.orders - a.orders);

    return {
      date: today,
      orderCount: orders.length,
      grossRevenueCents,
      averageOrderCents: orders.length ? Math.round(grossRevenueCents / orders.length) : 0,
      topProducts,
      tableLoad,
    };
  }

  advanceOrder(domain: string, orderId: string): CustomerOrderView {
    const state = this.stateFor(domain);
    const found = state.orders.get(orderId);
    if (!found) throw AppError.notFound('Order not found');
    const next = Math.min(found.statusIndex + 1, STATUS_FLOW.length - 1);
    found.statusIndex = next;
    found.status = STATUS_FLOW[next];
    found.updatedAt = new Date().toISOString();
    state.orders.set(found.id, found);
    return this.publicOrder(found);
  }

  private stateFor(domain: string): CustomerState {
    const key = domain.trim().toLowerCase();
    const existing = this.states.get(key);
    if (existing) return existing;

    const created: CustomerState = {
      tables: this.defaultTables.map((table) => ({ ...table })),
      menu: this.defaultMenu.map((item) => ({ ...item })),
      inventory: this.defaultInventory.map((item) => ({ ...item })),
      orders: new Map<string, StoredOrder>(),
    };
    this.states.set(key, created);
    return created;
  }

  private publicOrder(order: StoredOrder): CustomerOrderView {
    return {
      id: order.id,
      tableCode: order.tableCode,
      tableName: order.tableName,
      status: order.status,
      items: order.items,
      totalCents: order.totalCents,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
