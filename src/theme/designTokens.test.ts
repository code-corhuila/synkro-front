/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parsePublishedSheet, parseTokenSections } from './tokenSheet';

// Read with node:fs. Vitest returns CSS modules, including ?raw imports, as an
// empty string, which would make every comparison below pass vacuously.
const readText = (relativeUrl: string) => readFileSync(new URL(relativeUrl, import.meta.url), 'utf8');

const published = parsePublishedSheet(readText('./tokens.css'));
// The expected names and values come from the design system's own token
// blocks (see the fixture's header), not from this file.
const documented = parseTokenSections(readText('./__fixtures__/design-system.tokens.css'));

// Dark-only names that 12-ux-ui/design-system.md defines with no light value.
// Publishing them would introduce names the light theme does not have, and a
// light value would be a design decision the doc does not make. They stay out
// until the design owner decides; this list keeps the gap visible.
const DOCUMENTED_GAPS = ['--color-bg-card-alt', '--color-border'];

// Every stylesheet the application imports, so the import check cannot miss one.
const sourceFiles = import.meta.glob('../**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('published design tokens', () => {
  it('reads a non-empty design-system fixture and published stylesheet', () => {
    expect(documented.light.size).toBeGreaterThan(0);
    expect(documented.dark.size).toBeGreaterThan(0);
    expect(published.light.size).toBeGreaterThan(0);
  });

  it('publishes every token the design system lists, with its light value', () => {
    const mismatched = [...documented.light].filter(([name, value]) => published.light.get(name) !== value);

    expect(mismatched).toEqual([]);
  });

  it('redefines in the dark theme only names that the light theme publishes', () => {
    const introduced = [...published.dark.keys()].filter((name) => !published.light.has(name));

    expect(introduced).toEqual([]);
  });

  it('publishes the dark values the design system lists, except the documented gaps', () => {
    const mismatched = [...documented.dark].filter(
      ([name, value]) => !DOCUMENTED_GAPS.includes(name) && published.dark.get(name) !== value
    );

    expect(mismatched).toEqual([]);
  });

  it('leaves out only the documented gaps from the dark theme', () => {
    const leftOut = [...documented.dark.keys()].filter((name) => !published.dark.has(name));

    expect(leftOut.sort()).toEqual([...DOCUMENTED_GAPS].sort());
  });

  it('is imported once, by the application entry', () => {
    expect(Object.keys(sourceFiles)).toContain('../main.tsx');

    const importers = Object.entries(sourceFiles)
      .filter(([path, source]) => !path.includes('.test.') && /['"][^'"]*theme\/tokens\.css['"]/.test(source))
      .map(([path]) => path);

    expect(importers).toEqual(['../main.tsx']);
  });
});
