import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (path: string) => readFileSync(path, 'utf8');
describe('Sales production host delivery', () => {
  it('passes its browser entry from Compose through Docker to federation configuration', () => {
    expect(read('deploy/compose.yml')).toContain('VITE_SALES_PORTAL_ENTRY: ${VITE_SALES_PORTAL_ENTRY:-http://localhost:5173/remotes/sales/assets/remoteEntry.js}');
    expect(read('deploy/Dockerfile')).toContain('ARG VITE_SALES_PORTAL_ENTRY=');
    expect(read('deploy/Dockerfile')).toContain('ENV VITE_SALES_PORTAL_ENTRY=$VITE_SALES_PORTAL_ENTRY');
    expect(read('vite.config.ts')).toContain('salesPortal: env.VITE_SALES_PORTAL_ENTRY || federationConfig.remotes.salesPortal');
  });
  it('routes all Sales assets internally with lazy DNS, retaining Products and production identity guard', () => {
    const nginx = read('deploy/nginx.conf');
    expect(nginx).toContain('location /remotes/sales/');
    expect(nginx).toContain('http://synkro-sales-portal:80');
    expect(nginx).toContain('rewrite ^/remotes/sales/(.*)$ /$1 break;');
    expect(nginx).toContain('location /remotes/products/');
    expect(read('deploy/compose.yml')).toContain('VITE_DEV_SIGN_IN:-false');
  });
});
