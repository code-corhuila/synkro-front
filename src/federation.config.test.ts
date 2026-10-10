/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { federationConfig } from './federation.config';

const installedVersion = (name: string): string =>
  JSON.parse(readFileSync(`node_modules/${name}/package.json`, 'utf8')).version;

describe('host federation config', () => {
  it('is named host and serves remoteEntry.js', () => {
    expect(federationConfig.name).toBe('host');
    expect(federationConfig.filename).toBe('remoteEntry.js');
  });

  it('exposes exactly ./apiClient and ./session', () => {
    expect(federationConfig.exposes).toEqual({
      './apiClient': './src/shell/apiClient.ts',
      './session': './src/shell/session.ts',
    });
  });

  it('keeps consuming the three React portals, productsPortal included', () => {
    expect(Object.keys(federationConfig.remotes).sort()).toEqual(['authPortal', 'productsPortal', 'salesPortal']);
    expect(federationConfig.remotes.productsPortal).toBe('http://localhost:5175/assets/remoteEntry.js');
  });

  // The plugin leaves a shared module's version undefined for this host, so a
  // portal's range check fails; the version is declared from the installed package.
  it('keeps sharing react and react-dom, each with the installed version', () => {
    expect(federationConfig.shared).toEqual({
      react: { version: installedVersion('react') },
      'react-dom': { version: installedVersion('react-dom') },
    });
  });
});
