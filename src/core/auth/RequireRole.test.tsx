import { describe, it, expect, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { RequireRole } from './RequireRole';
import { setSession } from './session';

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Where />
      <Routes>
        <Route path="/dashboard" element={<div>dashboard</div>} />
        <Route
          path="/products/*"
          element={
            <RequireRole>
              <div>products screen</div>
            </RequireRole>
          }
        />
        <Route
          path="/stock-alerts/*"
          element={
            <RequireRole>
              <div>alerts screen</div>
            </RequireRole>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

const signInAs = (role: string) => setSession({ token: 't', sub: 'alice', role });

describe('RequireRole', () => {
  beforeEach(() => signInAs('INVENTORY'));

  it('renders the route for a role the matrix allows', () => {
    renderAt('/products');

    expect(screen.getByText('products screen')).toBeInTheDocument();
  });

  it('governs nested paths by the route that owns them', () => {
    renderAt('/products/12/edit');

    expect(screen.getByText('products screen')).toBeInTheDocument();
  });

  it('sends a role the matrix denies to the default module, replacing the entry', () => {
    signInAs('SALESPERSON');
    renderAt('/products');

    expect(screen.queryByText('products screen')).not.toBeInTheDocument();
    expect(screen.getByText('dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/dashboard');
  });

  it('does not let /stock-alerts be opened through the /stock rule', () => {
    signInAs('SALESPERSON');
    renderAt('/stock-alerts');

    expect(screen.queryByText('alerts screen')).not.toBeInTheDocument();
    expect(screen.getByText('dashboard')).toBeInTheDocument();
  });

  it('denies a role the matrix does not know', () => {
    signInAs('AUDITOR');
    renderAt('/products');

    expect(screen.queryByText('products screen')).not.toBeInTheDocument();
    expect(screen.getByText('dashboard')).toBeInTheDocument();
  });

  it('re-evaluates when the session changes while the route is mounted', () => {
    renderAt('/products');
    expect(screen.getByText('products screen')).toBeInTheDocument();

    act(() => signInAs('SALESPERSON'));

    expect(screen.queryByText('products screen')).not.toBeInTheDocument();
    expect(screen.getByText('dashboard')).toBeInTheDocument();
  });
});
