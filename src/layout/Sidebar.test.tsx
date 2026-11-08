import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Shell } from './Shell';
import { setSession } from '../core/auth/session';
import { authentication } from '../core/http/api';

function renderShell(role = 'ADMIN', path = '/dashboard', expiresAt?: number) {
  setSession({ token: 't', sub: 'ana', role, expiresAt });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Shell />}>
          <Route path="*" element={<div>portal area</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

function mobileViewport(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('max-width') ? matches : false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

const sidebar = () => screen.getByRole('complementary');

describe('Sidebar', () => {
  beforeEach(() => setSession(null));
  afterEach(() => vi.unstubAllGlobals());

  it('groups the menu by section and hides sections with no item for the role', () => {
    renderShell('INVENTORY');
    const groups = within(sidebar()).getAllByRole('group').map((group) => group.getAttribute('aria-label'));

    expect(groups).toEqual(['General', 'Inventario']);
  });

  it('shows every section to ADMIN, in order', () => {
    renderShell('ADMIN');

    expect(within(sidebar()).getAllByRole('group').map((group) => group.getAttribute('aria-label'))).toEqual([
      'General',
      'Comercial',
      'Inventario',
      'Administración',
    ]);
  });

  it('marks the current screen with aria-current and nothing else', () => {
    renderShell('ADMIN', '/customers');

    expect(screen.getByRole('link', { name: 'Clientes' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Panel' })).not.toHaveAttribute('aria-current');
  });

  it('shows the Synkro logo as a link to the dashboard', () => {
    renderShell();

    expect(screen.getByRole('link', { name: 'Ir al panel' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByAltText('Synkro Tech')).toHaveAttribute('src', '/synkro-logo.png');
  });

  describe('collapse', () => {
    it('toggles between icons-only and full, and keeps the links named', async () => {
      renderShell();
      const toggle = screen.getByRole('button', { name: 'Contraer menú' });
      expect(toggle).toHaveAttribute('aria-expanded', 'true');

      await userEvent.click(toggle);

      expect(sidebar()).toHaveClass('sidebar--collapsed');
      expect(screen.getByRole('button', { name: 'Expandir menú' })).toHaveAttribute('aria-expanded', 'false');
      expect(screen.getByRole('link', { name: 'Clientes' })).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Expandir menú' }));
      expect(sidebar()).not.toHaveClass('sidebar--collapsed');
    });
  });

  describe('account menu', () => {
    it('is closed at first and shows the identity, role and sign-out when opened', async () => {
      renderShell('SALESPERSON');
      const trigger = screen.getByRole('button', { name: 'Menú de cuenta de ana' });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('menuitem', { name: 'Cerrar sesión' })).toBeNull();

      await userEvent.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      const menu = screen.getByRole('menu', { name: 'Cuenta' });
      expect(within(menu).getByText('ana')).toBeInTheDocument();
      expect(within(menu).getByText('Vendedor')).toBeInTheDocument();
      expect(within(menu).getByRole('menuitem', { name: 'Cerrar sesión' })).toHaveFocus();
    });

    it('shows when the session expires, only if it is known', async () => {
      const expiresAt = new Date(2026, 10, 6, 10, 12).getTime();
      const { unmount } = renderShell('ADMIN', '/dashboard', expiresAt);
      await userEvent.click(screen.getByRole('button', { name: 'Menú de cuenta de ana' }));
      expect(screen.getByText('Tu sesión vence')).toBeInTheDocument();
      expect(screen.getByText('Tu sesión vence').parentElement!.querySelector('time')).toHaveAttribute('datetime', '2026-11-06T10:12');
      unmount();

      renderShell('ADMIN');
      await userEvent.click(screen.getByRole('button', { name: 'Menú de cuenta de ana' }));
      expect(screen.queryByText('Tu sesión vence')).toBeNull();
    });

    it('closes with Escape and returns focus to the trigger', async () => {
      renderShell();
      const trigger = screen.getByRole('button', { name: 'Menú de cuenta de ana' });
      await userEvent.click(trigger);
      await userEvent.keyboard('{Escape}');

      expect(screen.queryByRole('menu')).toBeNull();
      expect(trigger).toHaveFocus();
    });

    it('closes when clicking outside', async () => {
      renderShell();
      await userEvent.click(screen.getByRole('button', { name: 'Menú de cuenta de ana' }));
      await userEvent.click(screen.getByText('portal area'));

      expect(screen.queryByRole('menu')).toBeNull();
    });

    it('signs out through the single authentication client', async () => {
      const logout = vi.spyOn(authentication, 'logout').mockResolvedValue(undefined as never);
      renderShell();
      await userEvent.click(screen.getByRole('button', { name: 'Menú de cuenta de ana' }));
      await userEvent.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }));

      expect(logout).toHaveBeenCalledTimes(1);
    });
  });

  describe('narrow screens', () => {
    it('hides the sidebar from keyboard and assistive tech until the menu button opens it', async () => {
      mobileViewport(true);
      renderShell();
      const open = screen.getByRole('button', { name: 'Abrir menú' });
      expect(open).toHaveAttribute('aria-expanded', 'false');
      expect(sidebar()).toHaveAttribute('inert');

      await userEvent.click(open);

      expect(open).toHaveAttribute('aria-expanded', 'true');
      expect(sidebar()).not.toHaveAttribute('inert');
      expect(sidebar()).toHaveClass('sidebar--open');
      expect(screen.getByTestId('sidebar-backdrop')).toBeVisible();
    });

    it('closes with Escape, with the backdrop and after choosing a destination, returning focus to the opener each time', async () => {
      mobileViewport(true);
      renderShell();
      const open = screen.getByRole('button', { name: 'Abrir menú' });

      await userEvent.click(open);
      await userEvent.keyboard('{Escape}');
      expect(sidebar()).not.toHaveClass('sidebar--open');
      expect(open).toHaveFocus();

      await userEvent.click(open);
      await userEvent.click(screen.getByTestId('sidebar-backdrop'));
      expect(sidebar()).not.toHaveClass('sidebar--open');
      expect(open).toHaveFocus();

      await userEvent.click(open);
      await userEvent.click(screen.getByRole('link', { name: 'Clientes' }));
      expect(sidebar()).not.toHaveClass('sidebar--open');
      expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveFocus();
    });

    it('is never inert on a wide screen', () => {
      mobileViewport(false);
      renderShell();

      expect(sidebar()).not.toHaveAttribute('inert');
    });

    it('keeps the page behind the open drawer out of the tab order and the accessibility tree', async () => {
      mobileViewport(true);
      renderShell();
      const content = () => screen.getByRole('main').closest('.content');
      expect(content()).not.toHaveAttribute('inert');

      await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
      expect(content()).toHaveAttribute('inert');

      await userEvent.keyboard('{Escape}');
      expect(content()).not.toHaveAttribute('inert');
    });
  });
});

describe('Topbar', () => {
  beforeEach(() => setSession(null));
  afterEach(() => vi.useRealTimers());

  it('names the current section without adding a second h1', () => {
    renderShell('ADMIN', '/customers');
    const bar = screen.getByRole('banner');

    expect(within(bar).getByText('Clientes')).toBeInTheDocument();
    expect(within(bar).queryByRole('heading')).toBeNull();
  });

  it('shows the date in Spanish', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 6, 9, 0));
    renderShell();

    expect(within(screen.getByRole('banner')).getByText(/viernes, 6 de noviembre de 2026/i)).toBeInTheDocument();
  });

  it('holds the shared theme selector', () => {
    renderShell();

    expect(within(screen.getByRole('banner')).getByRole('radiogroup', { name: 'Tema' })).toBeInTheDocument();
  });
});
