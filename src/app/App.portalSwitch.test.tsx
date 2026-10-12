import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { setSession } from '../core/auth/session';

const UNAVAILABLE = 'Este módulo no está disponible en este momento.';

const { productsLoad } = vi.hoisted(() => ({ productsLoad: vi.fn() }));

vi.mock('../remotes/registry', () => ({
  portals: [
    {
      name: 'sales',
      kind: 'module-federation',
      routePrefixes: ['/sales'],
      load: () => Promise.reject(new Error('sales entry 404')),
    },
    {
      name: 'products',
      kind: 'module-federation',
      routePrefixes: ['/products', '/stock-alerts'],
      load: () => productsLoad(),
    },
  ],
}));

describe('navigating between portals in the host', () => {
  beforeEach(() => {
    productsLoad.mockReset();
    productsLoad.mockImplementation(async () => ({ default: () => <div>products portal</div> }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    setSession({ token: 't', sub: 'alice', role: 'ADMIN' });
  });

  it('replaces the unavailable notice of Sales with Products, without a reload', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/sales');
    render(<App />);
    expect(await screen.findByText(UNAVAILABLE)).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Productos' }));

    expect(await screen.findByText('products portal')).toBeInTheDocument();
    expect(screen.queryByText(UNAVAILABLE)).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/products');
  });

  it('keeps Products mounted when moving between routes it owns', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/products');
    render(<App />);
    expect(await screen.findByText('products portal')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Alertas de stock' }));

    expect(window.location.pathname).toBe('/stock-alerts');
    expect(screen.getByText('products portal')).toBeInTheDocument();
    expect(productsLoad).toHaveBeenCalledTimes(1);
  });

  it('still redirects a role that may not open the target portal', async () => {
    setSession({ token: 't', sub: 'alice', role: 'INVENTORY' });
    window.history.pushState({}, '', '/sales');
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Panel' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/dashboard');
    expect(screen.queryByText(UNAVAILABLE)).not.toBeInTheDocument();
  });
});
