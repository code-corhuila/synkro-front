import { describe, it, expect, vi } from 'vitest';
import { portals } from './registry';
import { customersPortalEntryUrl, loadCustomElement } from './customElement';
import { navItems } from '../layout/navigation';

vi.mock('./customElement', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./customElement')>();
  return { ...actual, loadCustomElement: vi.fn(() => async () => 'loaded') };
});

describe('portal registry', () => {
  it('has exactly one entry per domain portal', () => {
    const names = portals.map((p) => p.name);
    expect(names.sort()).toEqual(
      ['auth', 'customers', 'products', 'sales'].sort()
    );
  });

  it('marks the Angular portal with kind "custom-element", the rest "module-federation"', () => {
    const customers = portals.find((p) => p.name === 'customers');
    expect(customers?.kind).toBe('custom-element');

    const others = portals.filter((p) => p.name !== 'customers');
    expect(others.every((p) => p.kind === 'module-federation')).toBe(true);
  });

  it('every entry has at least one route prefix and a load function', () => {
    for (const portal of portals) {
      expect(portal.routePrefixes.length).toBeGreaterThan(0);
      expect(portal.routePrefixes.every((prefix) => prefix.startsWith('/'))).toBe(true);
      expect(typeof portal.load).toBe('function');
    }
  });

  it('owns the routes navigation-map.md assigns to each portal', () => {
    const owned = Object.fromEntries(portals.map((p) => [p.name, p.routePrefixes]));
    expect(owned).toEqual({
      auth: ['/users', '/service-tokens'],
      customers: ['/customers'],
      products: ['/products', '/stock', '/stock-alerts'],
      sales: ['/sales'],
    });
  });
});

describe('customers portal entry', () => {
  it('loads through the custom-element loader: entry file import, then the bounded whenDefined wait', () => {
    expect(loadCustomElement).toHaveBeenCalledWith({
      tagName: 'synkro-customers-portal',
      entryUrl: customersPortalEntryUrl,
    });
    const customers = portals.find((p) => p.name === 'customers');
    expect(vi.mocked(loadCustomElement).mock.results[0].value).toBe(customers?.load);
  });
});

describe('module-federation entries', () => {
  const federated = portals.filter((p) => p.kind === 'module-federation');

  it('are the auth, products and sales portals', () => {
    expect(federated.map((p) => p.name).sort()).toEqual(['auth', 'products', 'sales']);
  });

  // The specifiers only resolve through the federation plugin in a build; under
  // Vitest they resolve to a stub through the alias in vite.config.ts, so no
  // network is involved.
  it.each(['auth', 'products', 'sales'])('loads the %s portal as a module with a React component', async (name) => {
    const portal = portals.find((p) => p.name === name);

    const loaded = (await portal?.load()) as { default: unknown };

    expect(typeof loaded.default).toBe('function');
  });
});

describe('portal registry and the access matrix', () => {
  const owned = portals.flatMap((p) => p.routePrefixes);
  const matrixPaths = navItems.map((item) => item.path).filter((path) => path !== '/dashboard');

  // RequireRole fails closed: a prefix with no matrix entry would be denied to everyone.
  it('has a matrix entry for every route prefix a portal owns', () => {
    expect(owned.filter((prefix) => !matrixPaths.includes(prefix))).toEqual([]);
  });

  it('has exactly one portal for every screen the matrix lists apart from /dashboard', () => {
    expect([...owned].sort()).toEqual([...matrixPaths].sort());
  });
});
