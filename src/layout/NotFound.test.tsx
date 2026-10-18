import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';
import { setSession } from '../core/auth/session';

function visit(path: string) {
  window.history.pushState({}, '', path);
  render(<App />);
}

// design-system.md, "Error handling": a nonexistent route shows a 404 screen
// with a link back to the user's default module. Without a session the host
// sends the visitor to /login, whatever the path, so it does not reveal which
// routes exist.
describe('route that does not exist', () => {
  beforeEach(() => {
    setSession(null);
    vi.stubEnv('VITE_DEV_SIGN_IN', 'true');
  });
  afterEach(() => vi.unstubAllEnvs());

  describe('signed in', () => {
    it.each(['ADMIN', 'SALESPERSON', 'INVENTORY'])('shows %s a 404 screen at the same address', (role) => {
      setSession({ token: 't', sub: 'someone', role });
      visit('/definitely-not-a-route');

      expect(window.location.pathname).toBe('/definitely-not-a-route');
      expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
      expect(screen.getByText('La ruta que buscas no existe o fue movida.')).toBeInTheDocument();
    });

    it('renders the screen inside the shell, so the menu stays', () => {
      setSession({ token: 't', sub: 'someone', role: 'INVENTORY' });
      visit('/definitely-not-a-route');

      expect(screen.getByRole('banner')).toBeInTheDocument();
      const nav = screen.getByRole('navigation');
      expect(within(nav).getAllByRole('link').length).toBeGreaterThan(0);
      expect(within(screen.getByRole('main')).getByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
    });

    it('links back to the default module, and the link works', async () => {
      setSession({ token: 't', sub: 'someone', role: 'SALESPERSON' });
      visit('/definitely-not-a-route');

      const link = screen.getByRole('link', { name: 'Volver al panel' });
      expect(link).toHaveAttribute('href', '/dashboard');
      await userEvent.click(link);

      expect(window.location.pathname).toBe('/dashboard');
    });

    it('shows it for a name that only starts like a portal route', () => {
      setSession({ token: 't', sub: 'someone', role: 'ADMIN' });
      visit('/productsx');

      expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
    });
  });

  describe('signed out', () => {
    it('sends the visitor to /login', () => {
      visit('/definitely-not-a-route');

      expect(window.location.pathname).toBe('/login');
      expect(screen.getByLabelText(/token de desarrollo/i)).toBeInTheDocument();
      expect(screen.queryByText('Página no encontrada')).not.toBeInTheDocument();
    });

    it('stops at /login, without redirecting again, when no sign-in is available', () => {
      vi.stubEnv('VITE_DEV_SIGN_IN', 'false');
      visit('/definitely-not-a-route');

      expect(window.location.pathname).toBe('/login');
      expect(screen.getByText(/el inicio de sesión no está disponible/i)).toBeInTheDocument();
    });
  });

  it('sends a signed-in user away from /login to their default module when no sign-in is available', () => {
    vi.stubEnv('VITE_DEV_SIGN_IN', 'false');
    setSession({ token: 't', sub: 'someone', role: 'ADMIN' });
    visit('/login');

    expect(window.location.pathname).toBe('/dashboard');
  });
});
