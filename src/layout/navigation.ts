import { copy } from './copy';

export type Role = 'ADMIN' | 'SALESPERSON' | 'INVENTORY';

export interface NavItem {
  label: string;
  path: string;
  roles: readonly Role[];
}

const DASHBOARD_PATH = '/dashboard';

// The access matrix from synkro-docs' navigation-map.md, in display order.
// It is the only place that says who may open what: the menu and the route
// guard both read it.
export const navItems: readonly NavItem[] = [
  { label: copy.navigation.dashboard, path: DASHBOARD_PATH, roles: ['ADMIN', 'SALESPERSON', 'INVENTORY'] },
  { label: copy.navigation.customers, path: '/customers', roles: ['ADMIN', 'SALESPERSON'] },
  { label: copy.navigation.products, path: '/products', roles: ['ADMIN', 'INVENTORY'] },
  { label: copy.navigation.stock, path: '/stock', roles: ['SALESPERSON'] },
  { label: copy.navigation.stockAlerts, path: '/stock-alerts', roles: ['ADMIN', 'INVENTORY'] },
  { label: copy.navigation.sales, path: '/sales', roles: ['ADMIN', 'SALESPERSON'] },
  { label: copy.navigation.users, path: '/users', roles: ['ADMIN'] },
  { label: copy.navigation.serviceTokens, path: '/service-tokens', roles: ['ADMIN'] },
];

export function navItemsFor(role: string | undefined): NavItem[] {
  // Dashboard is every signed-in user's landing point, even for a role
  // this matrix doesn't know yet.
  return navItems.filter(
    (item) => item.path === DASHBOARD_PATH || (role !== undefined && item.roles.includes(role as Role))
  );
}

// Compared by path segment and ignoring case and a trailing slash, the way
// the router matches: "/stock" owns "/stock/42" but never "/stock-alerts".
function segmentsOf(path: string): string[] {
  return path.toLowerCase().split('/').filter(Boolean);
}

function isWithin(path: string, owner: string): boolean {
  const pathSegments = segmentsOf(path);
  return segmentsOf(owner).every((segment, index) => segment === pathSegments[index]);
}

// Whether `role` may open `pathname`. A path no matrix entry owns is denied,
// and so is a role the matrix does not know; only /dashboard is open to every
// signed-in user.
export function canAccess(role: string | undefined, pathname: string): boolean {
  const owner = navItems.find((item) => isWithin(pathname, item.path));
  if (!owner) return false;
  return owner.path === DASHBOARD_PATH || (role !== undefined && owner.roles.includes(role as Role));
}

// navigation-map.md, "Default landing route per role — target design": every
// role lands on /dashboard, which scopes its content by role. (The per-role
// table next to it describes synkro-tech's MVP, not this host.)
export function defaultPathFor(_role: string | undefined): string {
  return DASHBOARD_PATH;
}
