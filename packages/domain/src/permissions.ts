/**
 * RBAC permission definitions.
 *
 * Permission keys are the single source of truth. The API resolves a user's
 * role against these grants. Role → permission mapping must live here, not in
 * the database, so a misconfigured row can never elevate privileges.
 */

export type PermissionKey =
  // Auth / users
  | 'auth.login'
  | 'users.read'
  | 'users.manage'
  | 'roles.manage'
  | 'tenant.manage'
  | 'branch.manage'
  | 'settings.read'
  | 'settings.manage'
  // Floor & tables
  | 'tables.read'
  | 'tables.manage'
  | 'reservations.manage'
  // Menu
  | 'menu.read'
  | 'menu.manage'
  // Orders / service
  | 'orders.create'
  | 'orders.read'
  | 'orders.manage'
  | 'orders.transfer'
  | 'orders.merge'
  | 'orders.split'
  // Payments
  | 'payments.collect'
  | 'payments.refund'
  | 'payments.void'
  | 'discounts.apply'
  | 'complimentary.apply'
  | 'cash.drawer'
  // Inventory
  | 'inventory.read'
  | 'inventory.manage'
  | 'inventory.count'
  | 'purchases.manage'
  | 'suppliers.manage'
  | 'waste.manage'
  // Shifts
  | 'shifts.read'
  | 'shifts.manage'
  // Customers / loyalty
  | 'customers.read'
  | 'customers.manage'
  | 'campaigns.manage'
  // Reports
  | 'reports.read'
  // Audit / system
  | 'audit.read'
  | 'backup.manage'
  | 'system.health'
  | 'system.manage'
  // QR menu / self-service (cafe-user)
  | 'qr.read'
  | 'orders.self_service';

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

/** Role → permission grants. Keep minimal and explicit. */
export const ROLE_PERMISSIONS: Record<UserRole, readonly PermissionKey[]> = {
  owner: [
    'auth.login', 'users.read', 'users.manage', 'roles.manage', 'tenant.manage',
    'branch.manage', 'settings.read', 'settings.manage', 'tables.read', 'tables.manage',
    'reservations.manage', 'menu.read', 'menu.manage', 'orders.create', 'orders.read',
    'orders.manage', 'orders.transfer', 'orders.merge', 'orders.split', 'payments.collect',
    'payments.refund', 'payments.void', 'discounts.apply', 'complimentary.apply',
    'cash.drawer', 'inventory.read', 'inventory.manage', 'inventory.count',
    'purchases.manage', 'suppliers.manage', 'waste.manage', 'shifts.read', 'shifts.manage',
    'customers.read', 'customers.manage', 'campaigns.manage', 'reports.read', 'audit.read',
    'backup.manage', 'system.health', 'system.manage', 'qr.read', 'orders.self_service',
  ],
  admin: [
    'auth.login', 'users.read', 'users.manage', 'roles.manage', 'tenant.manage',
    'branch.manage', 'settings.read', 'settings.manage', 'tables.read', 'tables.manage',
    'reservations.manage', 'menu.read', 'menu.manage', 'orders.create', 'orders.read',
    'orders.manage', 'orders.transfer', 'orders.merge', 'orders.split', 'payments.collect',
    'payments.refund', 'payments.void', 'discounts.apply', 'complimentary.apply',
    'cash.drawer', 'inventory.read', 'inventory.manage', 'inventory.count',
    'purchases.manage', 'suppliers.manage', 'waste.manage', 'shifts.read', 'shifts.manage',
    'customers.read', 'customers.manage', 'campaigns.manage', 'reports.read', 'audit.read',
    'backup.manage', 'system.health',
  ],
  manager: [
    'auth.login', 'users.read', 'settings.read', 'tables.read', 'tables.manage',
    'reservations.manage', 'menu.read', 'menu.manage', 'orders.create', 'orders.read',
    'orders.manage', 'orders.transfer', 'orders.merge', 'orders.split', 'payments.collect',
    'payments.refund', 'payments.void', 'discounts.apply', 'complimentary.apply',
    'cash.drawer', 'inventory.read', 'inventory.manage', 'inventory.count',
    'purchases.manage', 'suppliers.manage', 'waste.manage', 'shifts.read', 'shifts.manage',
    'customers.read', 'campaigns.manage', 'reports.read', 'audit.read', 'system.health',
  ],
  waiter: [
    'auth.login', 'tables.read', 'menu.read', 'orders.create', 'orders.read',
    'orders.transfer', 'orders.merge', 'orders.split', 'customers.read', 'shifts.read',
  ],
  cashier: [
    'auth.login', 'tables.read', 'menu.read', 'orders.read', 'orders.split',
    'payments.collect', 'payments.refund', 'payments.void', 'discounts.apply',
    'complimentary.apply', 'cash.drawer', 'customers.read', 'shifts.read', 'reports.read',
  ],
  kitchen: ['auth.login', 'menu.read', 'orders.read', 'orders.manage', 'inventory.read', 'shifts.read'],
  bar: ['auth.login', 'menu.read', 'orders.read', 'orders.manage', 'inventory.read', 'shifts.read'],
  viewer: ['auth.login', 'tables.read', 'menu.read', 'orders.read', 'reports.read', 'system.health'],
  /**
   * cafe-user: QR menü / self-service kullanıcısı.
   * Masada QR kodunu okutup kendi siparişini veren müşteri/temsilci hesabı.
   * Yalnızca: menüye eriş, QR menüyü gör, kendi self-service siparişini oluştur,
   * kendi müşteri kaydını ve sadakat bakiyesini gör. Finansal/operasyonel
   * yetki YOK — siparişi personel onaylar, ödeme kasada yapılır.
   */
  'cafe-user': [
    'auth.login',
    'menu.read',
    'qr.read',
    'orders.self_service',
    'orders.read',
    'tables.read',
    'customers.read',
  ],
};

/** All valid roles (for DTO validation). */
export const VALID_ROLES = Object.keys(ROLE_PERMISSIONS) as UserRole[];

/** Check whether a role holds a permission. */
export function hasPermission(role: UserRole, permission: PermissionKey): boolean {
  const grants = ROLE_PERMISSIONS[role];
  return grants !== undefined && grants.includes(permission);
}
