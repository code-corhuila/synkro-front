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

  // The menu is grouped by section (General, Comercial, Inventario, Administración).
  it('shows ADMIN every screen except the salesperson-only stock lookup', () => {
    renderShellAs('ADMIN');
    expect(navLabels()).toEqual([
      'Panel',
      'Clientes',
      'Ventas',
      'Productos',
      'Alertas de stock',
      'Usuarios',
      'Tokens de servicio',
    ]);
  });

  it('shows SALESPERSON dashboard, customers, stock lookup and sales', () => {
    renderShellAs('SALESPERSON');
    expect(navLabels()).toEqual(['Panel', 'Clientes', 'Ventas', 'Existencias']);
  });

  it('shows INVENTORY dashboard, products and stock alerts', () => {
    renderShellAs('INVENTORY');
    expect(navLabels()).toEqual(['Panel', 'Productos', 'Alertas de stock']);
  });

  it('shows only the dashboard to an unknown role', () => {
    renderShellAs('SOMETHING_ELSE');
    expect(navLabels()).toEqual(['Panel']);
  });

  it('links each item to its route', () => {
    renderShellAs('SALESPERSON');
    expect(screen.getByRole('link', { name: 'Existencias' })).toHaveAttribute('href', '/stock');
  });

  it('names the navigation in Spanish', () => {
    renderShellAs('ADMIN');
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument();
  });

  it.each([
    ['ADMIN', 'Administrador'],
    ['SALESPERSON', 'Vendedor'],
    ['INVENTORY', 'Inventario'],
  ])('shows the signed-in user and the Spanish name of the %s role', (role, label) => {
    renderShellAs(role);
    const account = screen.getByRole('button', { name: 'Menú de cuenta de someone' });
    expect(account).toHaveTextContent('someone');
    expect(account).toHaveTextContent(label);
  });

  it('shows the raw role key for a role it has no name for', () => {
    renderShellAs('SOMETHING_ELSE');
    expect(screen.getByRole('button', { name: 'Menú de cuenta de someone' })).toHaveTextContent('SOMETHING_ELSE');
  });

  it('renders a header and the active route inside the outlet area', () => {
    renderShellAs('ADMIN');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getByText('active portal area')).toBeInTheDocument();
  });
});
