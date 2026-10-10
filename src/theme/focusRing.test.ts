import { describe, expect, it } from 'vitest';
import { contrastRatio } from './contrast';
import { parseRules, type CssRule } from './cssRules';
import { parsePublishedSheet, readSourceFiles, readThemeFile, resolveToken } from './tokenSheet';

const published = parsePublishedSheet(readThemeFile('tokens.css'));
const hostStylesheets = [...readSourceFiles()].filter(([path]) => path.endsWith('.css') && !path.startsWith('theme/'));

const DARK = '(prefers-color-scheme: dark)';

const focusRules = hostStylesheets.flatMap(([path, css]) =>
  parseRules(css)
    .filter((rule) => rule.selectors.some((selector) => selector.includes('focus-visible')))
    .map((rule) => ({ path, ...rule }))
);

// The token a rule's outline uses, from `outline: 2px solid var(--x)` or `outline-color: var(--x)`.
function ringToken(rule: CssRule | undefined): string | undefined {
  const outline = rule?.declarations.find(([property]) => property === 'outline' || property === 'outline-color');
  return outline?.[1].match(/var\((--[\w-]+)\)/)?.[1];
}

const lightRing = ringToken(focusRules.find((rule) => rule.media === null));
const darkRing = ringToken(focusRules.find((rule) => rule.media === DARK));

const valueIn = (theme: 'light' | 'dark', token: string | undefined): string => resolveToken(published, theme, token ?? '');

describe('focus ring', () => {
  it('is one shared :focus-visible rule in the base stylesheet, not one per component', () => {
    expect(focusRules.length).toBeGreaterThan(0);
    expect(focusRules.filter((rule) => rule.selectors.join() !== ':focus-visible').map((rule) => `${rule.path}: ${rule.selectors}`)).toEqual([]);
    expect([...new Set(focusRules.map((rule) => rule.path))]).toEqual(['index.css']);
  });

  it('keeps --color-primary-500 in the light scheme, as the design system says', () => {
    expect(lightRing).toBe('--color-primary-500');
  });

  it('has its own colour in the dark scheme, where primary-500 is a button fill', () => {
    expect(darkRing).toBeDefined();
    expect(darkRing).not.toBe(lightRing);
  });

  // WCAG 1.4.11: the indicator of a focused control needs 3:1 against what it sits on.
  it.each([
    ['light', '--color-bg-page'],
    ['light', '--color-bg-card'],
    ['dark', '--color-bg-page'],
    ['dark', '--color-bg-card'],
  ] as const)('reaches 3:1 in the %s scheme against %s', (theme, surface) => {
    const ring = theme === 'dark' ? darkRing : lightRing;

    expect(contrastRatio(valueIn(theme, ring), valueIn(theme, surface))).toBeGreaterThanOrEqual(3);
  });
});
