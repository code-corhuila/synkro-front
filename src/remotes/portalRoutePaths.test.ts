import { describe, it, expect } from 'vitest';
import { portalRoutePaths } from './portalRoutePaths';
import type { PortalEntry } from './registry';

const portal = (routePrefixes: string[]): PortalEntry => ({
  name: 'products',
  kind: 'module-federation',
  routePrefixes,
  load: async () => ({}),
});

describe('portalRoutePaths', () => {
  it('matches each prefix a portal owns and everything nested under it', () => {
    expect(portalRoutePaths(portal(['/products', '/stock-alerts']))).toEqual(['/products/*', '/stock-alerts/*']);
  });

  it('gives no route to a portal that owns no prefix', () => {
    expect(portalRoutePaths(portal([]))).toEqual([]);
  });
});
