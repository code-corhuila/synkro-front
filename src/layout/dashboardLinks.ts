import { copy } from './copy';
import { canAccess, navItems } from './navigation';

export interface DashboardLink {
  label: string;
  description: string;
  path: string;
}

// Destinations the dashboard does not offer. Users and service tokens still
// render the Auth portal's "not available" placeholder, so the dashboard
// promises no administration control.
const NOT_OFFERED = new Set(['/dashboard', '/users', '/service-tokens']);

// The Sales portal's report screens (navigation-map.md, route ownership). They
// live under /sales, so the access matrix already decides who may open them.
const REPORT_PATHS = ['/sales/reports/daily', '/sales/reports/monthly', '/sales/reports/top-products'];

// What the role may open, from the same matrix as the menu and the route
// guard: the dashboard cannot offer a link the guard would bounce.
export function dashboardLinksFor(role: string | undefined): DashboardLink[] {
  const paths = [...navItems.map((item) => item.path).filter((path) => !NOT_OFFERED.has(path)), ...REPORT_PATHS];
  return paths
    .filter((path) => canAccess(role, path))
    .map((path) => ({ path, ...copy.shortcuts[path] }));
}
