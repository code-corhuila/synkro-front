import { describe, it, expect } from 'vitest';
import { portals } from './registry';

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

  it('every entry has a route prefix and a load function', () => {
    for (const portal of portals) {
      expect(portal.routePrefix.startsWith('/')).toBe(true);
      expect(typeof portal.load).toBe('function');
    }
  });
});
