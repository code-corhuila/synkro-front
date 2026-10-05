import { describe, it, expect, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';
import { setSession } from './session';

function Protected() {
  return <div>secret content</div>;
}
function Login() {
  return <div>login screen</div>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/customers"
          element={
            <RequireAuth>
              <Protected />
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('RequireAuth', () => {
  beforeEach(() => setSession(null));

  it('redirects to /login when there is no session', () => {
    renderAt('/customers');
    expect(screen.getByText('login screen')).toBeInTheDocument();
  });

  it('renders the protected content when a session exists', () => {
    setSession({ token: 'x', sub: 'alice', role: 'ADMIN' });
    renderAt('/customers');
    expect(screen.getByText('secret content')).toBeInTheDocument();
  });

  it('redirects to /login when the session is cleared while mounted (e.g. after a 401)', () => {
    setSession({ token: 'x', sub: 'alice', role: 'ADMIN' });
    renderAt('/customers');
    expect(screen.getByText('secret content')).toBeInTheDocument();

    act(() => setSession(null));

    expect(screen.getByText('login screen')).toBeInTheDocument();
  });
});
