import { hasPermission, ROLE_PERMISSIONS } from '@cafeos/domain';

describe('domain/permissions', () => {
  it('cafe-user has limited self-service permissions only', () => {
    const perms = ROLE_PERMISSIONS['cafe-user'];
    expect(perms).toContain('menu.read');
    expect(perms).toContain('qr.read');
    expect(perms).toContain('orders.self_service');
    // No financial/operational privileges.
    expect(perms).not.toContain('payments.collect');
    expect(perms).not.toContain('inventory.manage');
    expect(perms).not.toContain('users.manage');
    expect(perms).not.toContain('discounts.apply');
  });

  it('waiter can create orders but not void payments', () => {
    expect(hasPermission('waiter', 'orders.create')).toBe(true);
    expect(hasPermission('waiter', 'payments.void')).toBe(false);
  });

  it('cashier can refund but kitchen cannot', () => {
    expect(hasPermission('cashier', 'payments.refund')).toBe(true);
    expect(hasPermission('kitchen', 'payments.refund')).toBe(false);
  });

  it('owner has every permission', () => {
    const all = ROLE_PERMISSIONS.owner;
    for (const perm of Object.values(ROLE_PERMISSIONS).flat()) {
      expect(all).toContain(perm);
    }
  });
});
