export type MenuCategory = 'coffee' | 'tea' | 'food' | 'dessert';
export type CustomerOrderStatus = 'received' | 'preparing' | 'ready';

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  priceCents: number;
  note: string;
}

export interface CustomerOrderLine {
  productId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface CustomerOrderView {
  id: string;
  tableName: string;
  status: CustomerOrderStatus;
  items: CustomerOrderLine[];
  totalCents: number;
  createdAt: string;
  updatedAt: string;
}
