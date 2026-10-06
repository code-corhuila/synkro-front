import { customersPortalEntryUrl, loadCustomElement } from './customElement';

export type PortalKind = 'module-federation' | 'custom-element';

export interface PortalEntry {
  name: string;
  kind: PortalKind;
  // Every top-level route this portal owns (navigation-map.md, "Route
  // ownership"); each also matches the paths nested under it.
  routePrefixes: string[];
  // Returns the mountable thing: for module-federation, a React component
  // module; for custom-element, the tag name to wait for and render.
  load: () => Promise<unknown>;
}

export const portals: PortalEntry[] = [
  {
    name: 'auth',
    kind: 'module-federation',
    routePrefixes: ['/users', '/service-tokens'],
    load: () => import('authPortal/App'),
  },
  {
    name: 'customers',
    kind: 'custom-element',
    routePrefixes: ['/customers'],
    load: loadCustomElement({
      tagName: 'synkro-customers-portal',
      entryUrl: customersPortalEntryUrl,
    }),
  },
  {
    name: 'products',
    kind: 'module-federation',
    routePrefixes: ['/products', '/stock', '/stock-alerts'],
    load: () => import('productsPortal/App'),
  },
  {
    name: 'sales',
    kind: 'module-federation',
    routePrefixes: ['/sales'],
    load: () => import('salesPortal/App'),
  },
];
