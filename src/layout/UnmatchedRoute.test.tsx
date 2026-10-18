import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';
import { setSession } from '../core/auth/session';

function visit(path: string) {
  window.history.pushState({}, '', path);
  render(<App />);
}

// navigation-map.md, "Navigation rules": an unmatched route redirects to the
// user's default module rather than showing a 404 page.
describe('unmatched route', () => {
  beforeEach(() => {
    setSession(null);
    vi.stubEnv('VITE_DEV_SIGN_IN', 'true');
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each(['ADMIN', 'SALESPERSON', 'INVENTORY'])(
    'redirects a signed-in %s to their default module',
    async (role) => {
      setSession({ token: 't', sub: 'someone', role });
      visit('/definitely-not-a-route');
      expect(window.location.pathname).toBe('/dashboard');
      expect(await screen.findByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    }
  );

  it('redirects a visitor with no session to /login', () => {
    visit('/definitely-not-a-route');
    expect(window.location.pathname).toBe('/login');
    expect(screen.getByLabelText(/development token/i)).toBeInTheDocument();
  });

  it('does not show a not-found page', () => {
    setSession({ token: 't', sub: 'someone', role: 'ADMIN' });
    visit('/definitely-not-a-route');
    expect(screen.queryByRole('heading', { name: /not found/i })).not.toBeInTheDocument();
  });

  it('stops at /login, without redirecting again, when no sign-in is available', () => {
    vi.stubEnv('VITE_DEV_SIGN_IN', 'false');
    visit('/definitely-not-a-route');
    expect(window.location.pathname).toBe('/login');
    expect(screen.getByText(/sign-in is not available/i)).toBeInTheDocument();
  });
});
