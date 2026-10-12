// @vitest-environment node
/// <reference types="node" />
import {readFileSync} from 'node:fs';import {it,expect} from 'vitest';
it('delivers Auth compiled assets through the Host with configurable shell and remote locations',()=>{
 expect(readFileSync('deploy/nginx.conf','utf8')).toContain('location /remotes/auth/');
 expect(readFileSync('deploy/Dockerfile','utf8')).toContain('ARG VITE_AUTH_PORTAL_ENTRY');
 expect(readFileSync('deploy/compose.yml','utf8')).toContain('VITE_AUTH_PORTAL_ENTRY');
});
