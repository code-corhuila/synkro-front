// @vitest-environment node
/// <reference types="node" />
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// The range a portal asks for (synkro-products-portal's federation.config.ts).
// A portal falls back to its own bundled React, and its hooks then fail inside
// the host's React DOM, when no version the host registers satisfies it.
const PORTAL_REACT_RANGE = '^19.2.8';

const installedVersion = (name: string): string =>
  JSON.parse(readFileSync(resolve('node_modules', name, 'package.json'), 'utf8')).version;

// The federation plugin's own range check: the same code the built page runs
// when a remote asks the shared scope for React.
async function loadSatisfy(): Promise<(version: string, range: string) => boolean> {
  const file = resolve('node_modules/@originjs/vite-plugin-federation/dist/satisfy.mjs');
  return (await import(/* @vite-ignore */ pathToFileURL(file).href)).satisfy;
}

// The version key under which a built chunk registers a shared module.
function registeredVersion(builtCode: string, name: string): string | undefined {
  const registration = new RegExp(`[{,]["'\`]?${name}["'\`]?:\\{["'\`]?([^"'\`:{}]*)["'\`]?:\\{get:`);
  return builtCode.match(registration)?.[1];
}

describe('shared React in the built host', () => {
  let outDir: string;
  let builtCode: string;

  beforeAll(async () => {
    outDir = mkdtempSync(join(tmpdir(), 'synkro-host-build-'));
    await build({
      configFile: resolve('vite.config.ts'),
      mode: 'production',
      logLevel: 'silent',
      build: { outDir, emptyOutDir: true },
    });
    const assets = join(outDir, 'assets');
    builtCode = readdirSync(assets)
      .filter((file) => file.endsWith('.js'))
      .map((file) => readFileSync(join(assets, file), 'utf8'))
      .join('\n');
  }, 120_000);

  afterAll(() => rmSync(outDir, { recursive: true, force: true }));

  it('registers react and react-dom under the installed version, never under undefined', () => {
    expect({
      react: registeredVersion(builtCode, 'react'),
      'react-dom': registeredVersion(builtCode, 'react-dom'),
    }).toEqual({
      react: installedVersion('react'),
      'react-dom': installedVersion('react-dom'),
    });
  });

  it('registers a version that satisfies the range a portal declares', async () => {
    const satisfy = await loadSatisfy();

    for (const name of ['react', 'react-dom']) {
      const version = registeredVersion(builtCode, name);
      expect(version, `${name} registered version`).toBeDefined();
      expect(satisfy(version as string, PORTAL_REACT_RANGE), `${name}@${version} vs ${PORTAL_REACT_RANGE}`).toBe(true);
    }
  });
});
