export type PortalKind = 'module-federation' | 'custom-element';

export interface PortalEntry {
  name: string;
  kind: PortalKind;
  routePrefix: string;
  // Returns the mountable thing: for module-federation, a React component
  // module; for custom-element, the tag name to wait for and render.
  load: () => Promise<unknown>;
}

export const portals: PortalEntry[] = [
  {
    name: 'auth',
    kind: 'module-federation',
    routePrefix: '/users',
    load: () => import('authPortal/App'),
  },
  {
    name: 'customers',
    kind: 'custom-element',
    routePrefix: '/customers',
    load: async () => {
      await customElements.whenDefined('synkro-customers-portal');
      return 'synkro-customers-portal';
    },
  },
  {
    name: 'products',
    kind: 'module-federation',
    routePrefix: '/products',
    load: () => import('productsPortal/App'),
  },
  {
    name: 'sales',
    kind: 'module-federation',
    routePrefix: '/sales',
    load: () => import('salesPortal/App'),
  },
];
