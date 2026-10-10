/// <reference types="node" />
// Test-only reader for the token stylesheets. It reads the CSS text the way a
// reviewer would: the custom properties on :root, and the dark overrides
// inside the prefers-color-scheme block. The app never parses CSS at runtime.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Vitest hands CSS imports back as empty strings and jsdom's URL differs from
// Node's, so the files are read from disk, next to this module.
const THEME_DIR = dirname(fileURLToPath(import.meta.url));

export function readThemeFile(name: string): string {
  return readFileSync(resolve(THEME_DIR, name), 'utf8');
}

export type Declarations = Map<string, string>;

export interface ThemeTokens {
  light: Declarations;
  dark: Declarations;
}

const COMMENT = /\/\*[\s\S]*?\*\//g;
const DARK_BLOCK = /@media \(prefers-color-scheme: dark\)\s*\{\s*:root\s*\{([\s\S]*?)\}\s*\}/;
const ROOT_BLOCK = /:root\s*\{([\s\S]*?)\}/;
const SECTION_MARKER = /\/\* \[(light|dark|shared)\] \*\//;

function stripComments(css: string): string {
  return css.replace(COMMENT, '');
}

// Values are compared as written, with runs of whitespace collapsed.
export function declarations(block: string): Declarations {
  const found: Declarations = new Map();
  for (const [, name, value] of stripComments(block).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    found.set(name, value.trim().replace(/\s+/g, ' '));
  }
  return found;
}

// The published stylesheet: :root holds the light theme, and the dark theme is
// the only override, inside the prefers-color-scheme block.
export function parsePublishedSheet(css: string): ThemeTokens {
  const source = stripComments(css);
  const darkMatch = source.match(DARK_BLOCK);
  const lightSource = darkMatch ? source.replace(DARK_BLOCK, '') : source;
  return {
    light: declarations(lightSource.match(ROOT_BLOCK)?.[1] ?? ''),
    dark: declarations(darkMatch?.[1] ?? ''),
  };
}

// The design-system fixture, split by its [light] / [dark] / [shared] markers.
// Shared tokens (typography, spacing) belong to the light set: the design
// system gives them one value for both themes.
export function parseTokenSections(css: string): ThemeTokens {
  const light: Declarations = new Map();
  const dark: Declarations = new Map();
  const parts = css.split(SECTION_MARKER);
  for (let i = 1; i < parts.length; i += 2) {
    const target = parts[i] === 'dark' ? dark : light;
    for (const [name, value] of declarations(parts[i + 1])) {
      target.set(name, value);
    }
  }
  return { light, dark };
}

// Every stylesheet and component source under src/, keyed by its path relative
// to src/ with forward slashes. Read from disk for the same reason as above.
const SRC_DIR = resolve(THEME_DIR, '..');

export function readSourceFiles(): Map<string, string> {
  const files = new Map<string, string>();
  for (const entry of readdirSync(SRC_DIR, { recursive: true })) {
    const path = entry.replaceAll('\\', '/');
    if (/\.(css|tsx?)$/.test(path)) {
      files.set(path, readFileSync(resolve(SRC_DIR, path), 'utf8'));
    }
  }
  return files;
}
