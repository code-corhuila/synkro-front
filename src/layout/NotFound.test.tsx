import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';
import { setSession } from '../core/auth/session';

describe('not-found route', () => {
  beforeEach(() => setSession(null));

  it('renders the not-found page for an unregistered route', () => {
    window.history.pushState({}, '', '/definitely-not-a-route');
    render(<App />);
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard');
  });

  it('does not render it for a registered route', () => {
    setSession({ token: 't', sub: 'alice', role: 'ADMIN' });
    window.history.pushState({}, '', '/dashboard');
    render(<App />);
    expect(screen.queryByRole('heading', { name: /page not found/i })).not.toBeInTheDocument();
  });
});
