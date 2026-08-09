import { Injectable } from '@nestjs/common';
import { AppError, uuidv7 } from '@cafeos/shared';
import { computeOrderTotals } from '@cafeos/domain';
import type { CustomerOrderLine, CustomerOrderView, MenuItem } from './customer.types';

export interface CreateCustomerOrderInput {
  tableName: string;
  items: Array<{ productId: string; quantity: number }>;
}

type StoredOrder = CustomerOrderView & { statusIndex: number };

const STATUS_FLOW: CustomerOrderView['status'][] = ['received', 'preparing', 'ready'];

@Injectable()
export class CustomerService {
  private readonly menu: MenuItem[] = [
    {
      id: 'latte',
      name: 'Cafe Latte',
      category: 'coffee',
      priceCents: 14500,
      note: 'Double shot, silky milk',
    },
    {
      id: 'americano',
      name: 'Americano',
      category: 'coffee',
      priceCents: 11000,
      note: 'Clean and bold',
    },
    {
      id: 'earlgrey',
      name: 'Earl Grey',
      category: 'tea',
      priceCents: 9500,
      note: 'Bergamot black tea',
    },
    {
      id: 'toast',
      name: 'Avocado Toast',
      category: 'food',
      priceCents: 18000,
      note: 'Sourdough + lemon',
    },
    {
      id: 'croissant',
      name: 'Butter Croissant',
      category: 'food',
      priceCents: 8500,
      note: 'Fresh baked daily',
    },
    {
      id: 'tiramisu',
      name: 'Tiramisu',
      category: 'dessert',
      priceCents: 16500,
      note: 'House special',
    },
  ];

  private readonly orders = new Map<string, StoredOrder>();

  getMenu(): MenuItem[] {
    return this.menu;
  }

  createOrder(input: CreateCustomerOrderInput): CustomerOrderView {
    const tableName = input.tableName.trim();
    if (!tableName) {
      throw AppError.validation('Table name is required', { tableName: 'required' });
    }
    if (input.items.length === 0) {
      throw AppError.validation('At least one item is required', { items: 'empty' });
    }

    const lines: CustomerOrderLine[] = input.items.map((item) => {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw AppError.validation('Quantity must be a positive integer', {
          quantity: `invalid for product ${item.productId}`,
        });
      }
      const product = this.menu.find((m) => m.id === item.productId);
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
      tableName,
      status: 'received',
      statusIndex: 0,
      items: lines,
      totalCents: totals.totalCents,
      createdAt: now,
      updatedAt: now,
    };

    this.orders.set(id, order);
    return this.publicOrder(order);
  }

  getOrder(orderId: string): CustomerOrderView {
    const found = this.orders.get(orderId);
    if (!found) throw AppError.notFound('Order not found');

    const now = Date.now();
    const created = new Date(found.createdAt).getTime();
    const elapsedSec = Math.floor((now - created) / 1000);
    const nextIndex = elapsedSec >= 12 ? 2 : elapsedSec >= 4 ? 1 : 0;

    if (nextIndex !== found.statusIndex) {
      found.statusIndex = nextIndex;
      found.status = STATUS_FLOW[nextIndex];
      found.updatedAt = new Date().toISOString();
      this.orders.set(found.id, found);
    }

    return this.publicOrder(found);
  }

  private publicOrder(order: StoredOrder): CustomerOrderView {
    return {
      id: order.id,
      tableName: order.tableName,
      status: order.status,
      items: order.items,
      totalCents: order.totalCents,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
