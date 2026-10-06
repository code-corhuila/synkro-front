import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Shell } from './Shell';
import { setSession } from '../core/auth/session';

function renderShellAs(role: string | null) {
  setSession(role ? { token: 't', sub: 'someone', role } : null);
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/dashboard" element={<div>active portal area</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

function navLabels() {
  const nav = screen.getByRole('navigation');
  return within(nav)
    .getAllByRole('link')
    .map((link) => link.textContent);
}

// Mirrors navigation-map.md's access matrix.
describe('Shell navigation', () => {
  beforeEach(() => setSession(null));

  it('shows ADMIN every screen except the salesperson-only stock lookup', () => {
    renderShellAs('ADMIN');
    expect(navLabels()).toEqual([
      'Dashboard',
      'Customers',
      'Products',
      'Stock alerts',
      'Sales',
      'Users',
      'Service tokens',
    ]);
  });

  it('shows SALESPERSON dashboard, customers, stock lookup and sales', () => {
    renderShellAs('SALESPERSON');
    expect(navLabels()).toEqual(['Dashboard', 'Customers', 'Stock', 'Sales']);
  });

  it('shows INVENTORY dashboard, products and stock alerts', () => {
    renderShellAs('INVENTORY');
    expect(navLabels()).toEqual(['Dashboard', 'Products', 'Stock alerts']);
  });

  it('shows only the dashboard to an unknown role', () => {
    renderShellAs('SOMETHING_ELSE');
    expect(navLabels()).toEqual(['Dashboard']);
  });

  it('links each item to its route', () => {
    renderShellAs('SALESPERSON');
    expect(screen.getByRole('link', { name: 'Stock' })).toHaveAttribute('href', '/stock');
  });

  it('renders a header and the active route inside the outlet area', () => {
    renderShellAs('ADMIN');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getByText('active portal area')).toBeInTheDocument();
  });
});
