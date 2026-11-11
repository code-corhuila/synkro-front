/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { THEME_STORAGE_KEY } from './themePreference';

// public/theme-init.js runs from <head> before first paint, so it is a plain
// script, not a module. The test runs it the way the browser does.
const source = readFileSync(resolve(__dirname, '../../public/theme-init.js'), 'utf8');

function run(options: { stored?: string | null; dark?: boolean; blocked?: boolean }) {
  const root = document.createElement('html');
  const win = {
    document: { documentElement: root },
    matchMedia: () => ({ matches: options.dark ?? false }),
    get localStorage() {
      if (options.blocked) throw new DOMException('blocked', 'SecurityError');
      return { getItem: (key: string) => (key === THEME_STORAGE_KEY ? (options.stored ?? null) : null) };
    },
  };
  new Function('window', 'document', source)(win, win.document);
  return root;
}

describe('theme-init.js', () => {
  it('applies a stored explicit choice against the device theme', () => {
    expect(run({ stored: 'light', dark: true }).dataset.theme).toBe('light');
    expect(run({ stored: 'dark', dark: false }).dataset.theme).toBe('dark');
  });

  it('follows the device on System, when absent or invalid', () => {
    expect(run({ stored: 'system', dark: true }).dataset.theme).toBe('dark');
    expect(run({ stored: null, dark: false }).dataset.theme).toBe('light');
    expect(run({ stored: 'purple', dark: true }).dataset.theme).toBe('dark');
  });

  it('does not throw when storage is blocked', () => {
    expect(run({ blocked: true, dark: true }).dataset.theme).toBe('dark');
  });

  it('is a classic script in the head of index.html, before the app module', () => {
    const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
    const init = html.indexOf('theme-init.js');
    expect(init).toBeGreaterThan(-1);
    expect(init).toBeLessThan(html.indexOf('src/main.tsx'));
    expect(html.slice(html.lastIndexOf('<script', init), init)).not.toContain('type="module"');
    expect(init).toBeLessThan(html.indexOf('</head>'));
  });
});
