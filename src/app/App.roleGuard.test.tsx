import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { setSession } from '../core/auth/session';

const loads = vi.hoisted(() => ({ products: vi.fn(), sales: vi.fn(), auth: vi.fn() }));

vi.mock('../remotes/registry', () => ({
  portals: [
    {
      name: 'products',
      kind: 'module-federation',
      routePrefixes: ['/products', '/stock', '/stock-alerts'],
      load: loads.products,
    },
    { name: 'sales', kind: 'module-federation', routePrefixes: ['/sales'], load: loads.sales },
    { name: 'auth', kind: 'module-federation', routePrefixes: ['/users', '/service-tokens'], load: loads.auth },
  ],
}));

function visitAs(role: string, path: string) {
  setSession({ token: 't', sub: 'alice', role });
  window.history.pushState({}, '', path);
  render(<App />);
}

describe('portal routes are guarded by role', () => {
  beforeEach(() => {
    loads.products.mockReset().mockResolvedValue({ default: () => <div>products portal</div> });
    loads.sales.mockReset().mockResolvedValue({ default: () => <div>sales portal</div> });
    loads.auth.mockReset().mockResolvedValue({ default: () => <div>auth portal</div> });
  });

  it('mounts a portal for a role the matrix allows', async () => {
    visitAs('INVENTORY', '/products');

    expect(await screen.findByText('products portal')).toBeInTheDocument();
    expect(loads.products).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe('/products');
  });

  it.each([
    ['INVENTORY', '/sales', 'sales'],
    ['INVENTORY', '/stock', 'products'],
    ['SALESPERSON', '/products', 'products'],
    ['SALESPERSON', '/stock-alerts', 'products'],
    ['SALESPERSON', '/users', 'auth'],
    ['ADMIN', '/stock', 'products'],
    ['ADMIN', '/stock/42', 'products'],
    ['AUDITOR', '/sales', 'sales'],
  ] as const)('sends %s from %s to /dashboard without requesting the %s portal', (role, path, portal) => {
    visitAs(role, path);

    expect(window.location.pathname).toBe('/dashboard');
    expect(loads[portal]).not.toHaveBeenCalled();
    expect(screen.queryByText(`${portal} portal`)).not.toBeInTheDocument();
  });

  it('keeps the menu working after a denied route', () => {
    visitAs('INVENTORY', '/sales');

    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});
