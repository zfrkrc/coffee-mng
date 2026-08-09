export type MenuCategory = 'coffee' | 'tea' | 'food' | 'dessert';
export type CustomerOrderStatus = 'received' | 'preparing' | 'ready';

export interface CafeTable {
  id: string;
  code: string;
  name: string;
  capacity: number;
}

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
  tableCode: string;
  tableName: string;
  status: CustomerOrderStatus;
  items: CustomerOrderLine[];
  totalCents: number;
  createdAt: string;
  updatedAt: string;
}

export interface TableWithQr extends CafeTable {
  customerUrl: string;
  qrImageUrl: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  unit: 'pcs' | 'kg' | 'lt';
  stock: number;
  threshold: number;
}

export interface OpsOverview {
  menuCount: number;
  tableCount: number;
  openOrders: number;
  lowStockCount: number;
  totalRevenueCents: number;
}

export interface DailyReport {
  date: string;
  orderCount: number;
  grossRevenueCents: number;
  averageOrderCents: number;
  topProducts: Array<{ productId: string; name: string; qty: number }>;
  tableLoad: Array<{ tableCode: string; tableName: string; orders: number }>;
}
