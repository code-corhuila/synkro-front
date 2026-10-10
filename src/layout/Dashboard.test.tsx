import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../app/App';
import { setSession } from '../core/auth/session';

describe('dashboard copy', () => {
  beforeEach(() => setSession({ token: 't', sub: 'alice', role: 'ADMIN' }));

  it('is in Spanish', () => {
    window.history.pushState({}, '', '/dashboard');
    render(<App />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Panel');
    expect(screen.getByText('Sesión iniciada como alice.')).toBeInTheDocument();
  });
});
