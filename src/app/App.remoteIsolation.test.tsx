import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { setSession } from '../core/auth/session';

const remote = vi.hoisted(() => ({ available: false }));
vi.mock('../remotes/registry', () => ({ portals: [
  { name: 'sales', kind: 'module-federation', routePrefixes: ['/sales'],
    load: async () => { if (!remote.available) throw new Error('Sales remote unavailable');
      return { default: () => <div>real sales mount</div> }; } },
  { name: 'products', kind: 'module-federation', routePrefixes: ['/products'],
    load: async () => ({ default: () => <div>real products mount</div> }) },
] }));

describe('shell navigation after unavailable Sales', () => {
  beforeEach(() => {
    remote.available = false;
    setSession({ token: 'test', sub: 'operator', role: 'ADMIN' });
    window.history.replaceState({}, '', '/sales');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('keeps navigation usable, loads Products without a reload, then retries Sales on return', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const shell = screen.getByRole('navigation');
    expect(await screen.findByText('Este módulo no está disponible en este momento.')).toBeInTheDocument();
    await user.click(container.querySelector('a[href="/products"]')!);
    expect(await screen.findByText('real products mount')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/products');
    expect(screen.getByRole('navigation')).toBe(shell);
    remote.available = true;
    await user.click(container.querySelector('a[href="/sales"]')!);
    expect(await screen.findByText('real sales mount')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/sales');
    expect(screen.getByRole('navigation')).toBe(shell);
  });
});
