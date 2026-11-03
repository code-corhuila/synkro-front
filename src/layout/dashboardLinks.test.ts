import { describe, expect, it } from 'vitest';
import { canAccess } from './navigation';
import { dashboardLinksFor } from './dashboardLinks';

const labels = (role: string | undefined) => dashboardLinksFor(role).map((link) => link.label);
const paths = (role: string | undefined) => dashboardLinksFor(role).map((link) => link.path);

describe('dashboard links', () => {
  it('lists, per role, only destinations the route guard lets that role open', () => {
    expect(labels('ADMIN')).toEqual(['Clientes', 'Productos', 'Alertas de stock', 'Ventas', 'Reporte diario', 'Reporte mensual', 'Productos más vendidos']);
    expect(labels('SALESPERSON')).toEqual(['Clientes', 'Existencias', 'Ventas', 'Reporte diario', 'Reporte mensual', 'Productos más vendidos']);
    expect(labels('INVENTORY')).toEqual(['Productos', 'Alertas de stock']);
  });

  it.each(['ADMIN', 'SALESPERSON', 'INVENTORY', 'UNKNOWN', undefined])('agrees with canAccess for %s', (role) => {
    for (const path of paths(role)) expect(canAccess(role, path), `${role} ${path}`).toBe(true);
  });

  it('offers nothing to a role or a missing session the matrix does not know', () => {
    expect(dashboardLinksFor('UNKNOWN')).toEqual([]);
    expect(dashboardLinksFor(undefined)).toEqual([]);
  });

  it('never exposes sales reports to INVENTORY', () => {
    expect(paths('INVENTORY').some((path) => path.startsWith('/sales'))).toBe(false);
  });

  it('does not promise the administration screens that are still placeholders', () => {
    for (const role of ['ADMIN', 'SALESPERSON', 'INVENTORY']) {
      expect(paths(role)).not.toContain('/users');
      expect(paths(role)).not.toContain('/service-tokens');
    }
  });

  it('points the report cards at the Sales portal routes', () => {
    expect(paths('ADMIN').filter((path) => path.startsWith('/sales/'))).toEqual([
      '/sales/reports/daily', '/sales/reports/monthly', '/sales/reports/top-products',
    ]);
  });

  it('gives every card a short description in Spanish', () => {
    for (const link of dashboardLinksFor('ADMIN')) expect(link.description.length).toBeGreaterThan(10);
  });
});
