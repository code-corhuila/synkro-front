/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// _stacks/frontend.md, "Folder structure": deploy/Dockerfile (Node 22, npm ci),
// deploy/nginx.conf and deploy/compose.yml.
const read = (path: string) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

// The body of the nginx block that starts at `header`, braces balanced.
function nginxBlock(config: string, header: RegExp): string | undefined {
  const start = config.search(header);
  if (start === -1) return undefined;
  const open = config.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < config.length; i++) {
    if (config[i] === '{') depth++;
    if (config[i] === '}' && --depth === 0) return config.slice(open + 1, i);
  }
  return undefined;
}

describe('Node version', () => {
  it('is 22 for nvm and for the package', () => {
    expect(read('.nvmrc').trim()).toBe('22');
    expect(JSON.parse(read('package.json')).engines).toEqual({ node: '>=22' });
  });
});

describe('deploy/Dockerfile', () => {
  const dockerfile = () => read('deploy/Dockerfile');

  it('builds on Node 22 and serves from nginx, in two stages', () => {
    const stages = [...dockerfile().matchAll(/^FROM (\S+)(?: AS (\S+))?/gm)];

    expect(stages.map(([, image]) => image.split(':')[0])).toEqual(['node', 'nginx']);
    expect(stages[0][1]).toMatch(/^node:22/);
  });

  it('installs with npm ci, never npm install, and copies the lockfile first for the cache', () => {
    expect(dockerfile()).toMatch(/^RUN npm ci\b/m);
    expect(dockerfile()).not.toMatch(/npm install/);
    expect(dockerfile().indexOf('COPY package')).toBeLessThan(dockerfile().indexOf('RUN npm ci'));
  });

  it('takes the gateway address as a build argument', () => {
    expect(dockerfile()).toMatch(/^ARG VITE_API_BASE_URL\b/m);
  });

  it('has the development sign-in off unless a build argument turns it on', () => {
    expect(dockerfile()).toMatch(/^ARG VITE_DEV_SIGN_IN=false$/m);
  });

  it('builds, and checks the build for the sign-in when it is off', () => {
    expect(dockerfile()).toMatch(/npm run build/);
    expect(dockerfile()).toMatch(/npm run check:production-build/);
  });

  it('serves the built files with its own nginx config', () => {
    expect(dockerfile()).toMatch(/COPY deploy\/nginx\.conf \/etc\/nginx\/conf\.d\/default\.conf/);
    expect(dockerfile()).toMatch(/COPY --from=\S+ \/app\/dist \/usr\/share\/nginx\/html/);
  });

  it('does not copy a .env file into the image', () => {
    expect(dockerfile()).not.toMatch(/COPY[^\n]*\.env/);
    expect(read('.dockerignore').split('\n')).toEqual(expect.arrayContaining(['.env', '.env.*', 'node_modules', 'dist']));
  });
});

describe('deploy/nginx.conf', () => {
  const config = () => read('deploy/nginx.conf');

  it('falls back to index.html, for the single-page app', () => {
    expect(config()).toMatch(/try_files \$uri \$uri\/ \/index\.html;/);
  });

  it('never caches the federation entry, which portals fetch to find the host', () => {
    const entry = nginxBlock(config(), /location = \/assets\/remoteEntry\.js/);

    expect(entry).toBeDefined();
    expect(entry).toMatch(/add_header Cache-Control "no-store" always;/);
  });

  it('lets portals served from another origin load the entry and the host chunks it imports', () => {
    const entry = nginxBlock(config(), /location = \/assets\/remoteEntry\.js/);
    const assets = nginxBlock(config(), /location \/assets\//);

    expect(entry).toMatch(/add_header Access-Control-Allow-Origin "\*" always;/);
    expect(assets).toMatch(/add_header Access-Control-Allow-Origin "\*" always;/);
  });

  it('caches the hashed assets for a year, as immutable', () => {
    const assets = nginxBlock(config(), /location \/assets\//);

    expect(assets).toMatch(/add_header Cache-Control "public, max-age=31536000, immutable" always;/);
  });

  it('does not cache index.html, which names the current hashed files', () => {
    const index = nginxBlock(config(), /location = \/index\.html/);

    expect(index).toMatch(/add_header Cache-Control "no-cache" always;/);
  });

  it('compresses text responses', () => {
    expect(config()).toMatch(/gzip on;/);
    expect(config()).toMatch(/gzip_types [^;]*application\/javascript/);
  });

  it('has balanced braces', () => {
    const opens = (config().match(/\{/g) ?? []).length;
    const closes = (config().match(/\}/g) ?? []).length;

    expect(opens).toBeGreaterThan(0);
    expect(opens).toBe(closes);
  });
});

describe('deploy/compose.yml', () => {
  const compose = () => read('deploy/compose.yml');

  it('builds the host from the repository root with the Dockerfile in deploy/', () => {
    expect(compose()).toMatch(/context: \.\.\n\s+dockerfile: deploy\/Dockerfile/);
  });

  it('publishes the host on port 5173', () => {
    expect(compose()).toMatch(/- "5173:80"/);
  });

  it('takes the gateway address and the sign-in flag from the environment, the flag defaulting to off', () => {
    expect(compose()).toMatch(/VITE_API_BASE_URL: \$\{VITE_API_BASE_URL[^}]*\}/);
    expect(compose()).toMatch(/VITE_DEV_SIGN_IN: \$\{VITE_DEV_SIGN_IN:-false\}/);
  });

  it('holds no secret, and reads values from a .env that is never committed', () => {
    expect(compose()).not.toMatch(/(?:token|secret|password|key)\s*[:=]/i);
    expect(read('.gitignore')).toMatch(/^\.env$/m);
  });
});
