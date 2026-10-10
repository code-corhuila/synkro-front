import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { setSession } from './core/auth/session';

vi.mock('./remotes/registry', () => ({
  portals: [
    {
      name: 'products',
      kind: 'module-federation',
      routePrefixes: ['/products', '/stock', '/stock-alerts'],
      load: async () => ({ default: () => <div>products portal</div> }),
    },
    {
      name: 'auth',
      kind: 'module-federation',
      routePrefixes: ['/users', '/service-tokens'],
      load: async () => ({ default: () => <div>auth portal</div> }),
    },
  ],
}));

// The matrix lets only SALESPERSON open /stock; every other route here is open to ADMIN.
const roleFor = (path: string) => (path.startsWith('/stock/') || path === '/stock' ? 'SALESPERSON' : 'ADMIN');

function visit(path: string) {
  setSession({ token: 't', sub: 'alice', role: roleFor(path) });
  window.history.pushState({}, '', path);
  render(<App />);
}

describe('portal routes', () => {
  beforeEach(() => setSession({ token: 't', sub: 'alice', role: 'ADMIN' }));

  it.each([
    ['/products', 'products portal'],
    ['/stock', 'products portal'],
    ['/stock-alerts', 'products portal'],
    ['/users', 'auth portal'],
    ['/service-tokens', 'auth portal'],
  ])('mounts the owning portal at %s', async (path, content) => {
    visit(path);
    expect(await screen.findByText(content)).toBeInTheDocument();
    expect(window.location.pathname).toBe(path);
  });

  it('hands nested paths under any prefix to the portal', async () => {
    visit('/stock/42');
    expect(await screen.findByText('products portal')).toBeInTheDocument();
  });
});
