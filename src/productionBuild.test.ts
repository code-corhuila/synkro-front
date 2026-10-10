// @vitest-environment node
/// <reference types="node" />
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const SCRIPT = resolve('scripts/check-production-build.mjs');

interface Finding {
  file: string;
  marker: string;
}

async function loadGuard(): Promise<{
  DEV_SIGN_IN_MARKERS: string[];
  findDevSignInMarkers: (directory: string) => Finding[];
}> {
  return import(/* @vite-ignore */ pathToFileURL(SCRIPT).href);
}

// Builds the host the way CI and the Dockerfile do, with the development
// sign-in flag as given and without reading any .env file.
async function buildHost(devSignIn: string | undefined): Promise<string> {
  const outDir = mkdtempSync(join(tmpdir(), 'synkro-host-prod-'));
  const previous = process.env.VITE_DEV_SIGN_IN;
  if (devSignIn === undefined) delete process.env.VITE_DEV_SIGN_IN;
  else process.env.VITE_DEV_SIGN_IN = devSignIn;
  try {
    await build({
      configFile: resolve('vite.config.ts'),
      mode: 'production',
      envDir: false,
      logLevel: 'silent',
      build: { outDir, emptyOutDir: true },
    });
  } finally {
    if (previous === undefined) delete process.env.VITE_DEV_SIGN_IN;
    else process.env.VITE_DEV_SIGN_IN = previous;
  }
  return outDir;
}

// A build for `main` has the development sign-in off. It must not carry the
// sign-in, nor the key it stores a session under: the sign-in is replaced by
// synkro-auth-portal and must never reach production.
describe('production build without the development sign-in', () => {
  let withoutFlag: string;
  let withFlag: string;

  beforeAll(async () => {
    withoutFlag = await buildHost(undefined);
    withFlag = await buildHost('true');
  }, 180_000);

  afterAll(() => {
    for (const directory of [withoutFlag, withFlag]) rmSync(directory, { recursive: true, force: true });
  });

  it('contains none of the development sign-in markers', async () => {
    const { findDevSignInMarkers } = await loadGuard();

    expect(findDevSignInMarkers(withoutFlag)).toEqual([]);
  });

  it('is told apart from a build that has the sign-in on, which does contain them', async () => {
    const { DEV_SIGN_IN_MARKERS, findDevSignInMarkers } = await loadGuard();

    expect([...new Set(findDevSignInMarkers(withFlag).map((finding) => finding.marker))].sort()).toEqual(
      [...DEV_SIGN_IN_MARKERS].sort()
    );
  });

  it('looks for the storage key and the sign-in field and strings', async () => {
    const { DEV_SIGN_IN_MARKERS } = await loadGuard();

    expect(DEV_SIGN_IN_MARKERS).toEqual(expect.arrayContaining(['synkro_dev_token', 'dev-token', 'Token de desarrollo']));
  });

  describe('as a command, the way CI runs it', () => {
    const run = (directory: string) => {
      try {
        const output = execFileSync(process.execPath, [SCRIPT, directory], { encoding: 'utf8', stdio: 'pipe' });
        return { status: 0, output };
      } catch (error) {
        const failure = error as { status: number; stdout: string; stderr: string };
        return { status: failure.status, output: failure.stdout + failure.stderr };
      }
    };

    it('exits 0 for a build without the sign-in', () => {
      expect(run(withoutFlag).status).toBe(0);
    });

    it('exits 1 and names what it found for a build with the sign-in', () => {
      const result = run(withFlag);

      expect(result.status).toBe(1);
      expect(result.output).toContain('synkro_dev_token');
    });

    it('exits 1 when there is no build to check, rather than passing on nothing', () => {
      expect(run(join(withoutFlag, 'does-not-exist')).status).toBe(1);
    });
  });
});
