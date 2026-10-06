export type Role = 'ADMIN' | 'SALESPERSON' | 'INVENTORY';

export interface NavItem {
  label: string;
  path: string;
  roles: readonly Role[];
}

// The access matrix from synkro-docs' navigation-map.md, in display order.
export const navItems: readonly NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', roles: ['ADMIN', 'SALESPERSON', 'INVENTORY'] },
  { label: 'Customers', path: '/customers', roles: ['ADMIN', 'SALESPERSON'] },
  { label: 'Products', path: '/products', roles: ['ADMIN', 'INVENTORY'] },
  { label: 'Stock', path: '/stock', roles: ['SALESPERSON'] },
  { label: 'Stock alerts', path: '/stock-alerts', roles: ['ADMIN', 'INVENTORY'] },
  { label: 'Sales', path: '/sales', roles: ['ADMIN', 'SALESPERSON'] },
  { label: 'Users', path: '/users', roles: ['ADMIN'] },
  { label: 'Service tokens', path: '/service-tokens', roles: ['ADMIN'] },
];

export function navItemsFor(role: string | undefined): NavItem[] {
  // Dashboard is every signed-in user's landing point, even for a role
  // this matrix doesn't know yet.
  return navItems.filter(
    (item) => item.path === '/dashboard' || (role !== undefined && item.roles.includes(role as Role))
  );
}

// navigation-map.md, "Default landing route per role — target design": every
// role lands on /dashboard, which scopes its content by role. (The per-role
// table next to it describes synkro-tech's MVP, not this host.)
export function defaultPathFor(_role: string | undefined): string {
  return '/dashboard';
}
