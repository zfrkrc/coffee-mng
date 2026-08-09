export type ServiceKey =
  | 'customer-order'
  | 'kitchen-board'
  | 'qr-management'
  | 'ops-dashboard'
  | 'ai-station';

export interface MemberAccount {
  id: string;
  email: string;
  slug: string;
  displayName: string;
  domain: string;
  services: ServiceKey[];
  active: boolean;
  token: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffUser {
  id: string;
  memberId: string;
  email: string;
  displayName: string;
  role: 'admin' | 'cashier' | 'waiter' | 'kitchen' | 'viewer';
  active: boolean;
  createdAt: string;
}
