import { readFileSync } from 'node:fs';
import { describe,it,expect } from 'vitest';
const read=(path:string)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
describe('CLI-UI-16 same-origin Customers delivery',()=>{
  it('wires the actual runtime variable in Docker and Compose',()=>{
    expect(read('deploy/Dockerfile')).toContain('ARG VITE_CUSTOMERS_PORTAL_ENTRY=/remotes/customers/remoteEntry.js');
    expect(read('deploy/Dockerfile')).toContain('ENV VITE_CUSTOMERS_PORTAL_ENTRY=$VITE_CUSTOMERS_PORTAL_ENTRY');
    expect(read('deploy/compose.yml')).toContain('VITE_CUSTOMERS_PORTAL_ENTRY: ${VITE_CUSTOMERS_PORTAL_ENTRY:-/remotes/customers/remoteEntry.js}');
  });
  it('proxies the real portal through lazy DNS, preserving its own cache policy',()=>{
    const nginx=read('deploy/nginx.conf');
    expect(nginx).toContain('location /remotes/customers/');
    expect(nginx).toContain('set $customers_portal http://synkro-customers-portal:80;');
    expect(nginx).toContain('rewrite ^/remotes/customers/(.*)$ /$1 break;');
  });
});
