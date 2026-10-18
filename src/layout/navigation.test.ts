import { describe, it, expect } from 'vitest';
import { canAccess, defaultPathFor, navItems, type Role } from './navigation';

// navigation-map.md, "Default landing route per role — target design".
describe('defaultPathFor', () => {
  it.each(['ADMIN', 'SALESPERSON', 'INVENTORY'])('lands %s on /dashboard', (role) => {
    expect(defaultPathFor(role)).toBe('/dashboard');
  });
});

const ROLES: Role[] = ['ADMIN', 'SALESPERSON', 'INVENTORY'];

// navigation-map.md, "Access matrix".
describe('canAccess', () => {
  it.each<[Role, string[], string[]]>([
    [
      'ADMIN',
      ['/dashboard', '/customers', '/products', '/stock-alerts', '/sales', '/users', '/service-tokens'],
      ['/stock'],
    ],
    ['SALESPERSON', ['/dashboard', '/customers', '/stock', '/sales'], ['/products', '/stock-alerts', '/users', '/service-tokens']],
    ['INVENTORY', ['/dashboard', '/products', '/stock-alerts'], ['/customers', '/stock', '/sales', '/users', '/service-tokens']],
  ])('%s: allowed %j, denied %j', (role, allowed, denied) => {
    expect(allowed.filter((path) => !canAccess(role, path))).toEqual([]);
    expect(denied.filter((path) => canAccess(role, path))).toEqual([]);
  });

  it.each(navItems)('follows the access matrix for $path, for every role', ({ path, roles }) => {
    for (const role of ROLES) {
      expect(canAccess(role, path)).toBe(path === '/dashboard' || roles.includes(role));
    }
  });

  describe('matches by path segment, not by string prefix', () => {
    it('does not let /stock grant /stock-alerts, or the other way round', () => {
      expect(canAccess('SALESPERSON', '/stock')).toBe(true);
      expect(canAccess('SALESPERSON', '/stock-alerts')).toBe(false);
      expect(canAccess('INVENTORY', '/stock-alerts')).toBe(true);
      expect(canAccess('INVENTORY', '/stock')).toBe(false);
    });

    it('governs nested paths by the route that owns them', () => {
      expect(canAccess('INVENTORY', '/products/12/edit')).toBe(true);
      expect(canAccess('SALESPERSON', '/products/12/edit')).toBe(false);
      expect(canAccess('SALESPERSON', '/stock/42')).toBe(true);
      expect(canAccess('INVENTORY', '/stock-alerts/7')).toBe(true);
      expect(canAccess('ADMIN', '/stock/42')).toBe(false);
    });

    it('does not extend a route to a longer name that merely starts with it', () => {
      expect(canAccess('ADMIN', '/productsx')).toBe(false);
      expect(canAccess('ADMIN', '/sales-archive')).toBe(false);
    });

    it('ignores a trailing slash and the case, as the router does', () => {
      expect(canAccess('INVENTORY', '/products/')).toBe(true);
      expect(canAccess('INVENTORY', '/Products')).toBe(true);
      expect(canAccess('SALESPERSON', '/PRODUCTS/')).toBe(false);
    });
  });

  describe('fails closed', () => {
    it('denies a path the matrix does not list', () => {
      expect(canAccess('ADMIN', '/reports')).toBe(false);
      expect(canAccess('ADMIN', '/')).toBe(false);
    });

    it('lets a role the matrix does not know, or no role, reach only /dashboard', () => {
      for (const role of ['AUDITOR', '', undefined]) {
        expect(canAccess(role, '/dashboard')).toBe(true);
        expect(canAccess(role, '/dashboard/summary')).toBe(true);
        for (const path of ['/customers', '/products', '/stock', '/stock-alerts', '/sales', '/users', '/service-tokens']) {
          expect(canAccess(role, path), `${String(role)} ${path}`).toBe(false);
        }
      }
    });

    it('does not treat a role name as a pattern', () => {
      expect(canAccess('ADMIN|INVENTORY', '/stock')).toBe(false);
      expect(canAccess('admin', '/users')).toBe(false);
    });
  });
});
