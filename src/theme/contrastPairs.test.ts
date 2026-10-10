import { describe, expect, it } from 'vitest';
import { contrastRatio } from './contrast';
import { parsePublishedSheet, readThemeFile } from './tokenSheet';

const published = parsePublishedSheet(readThemeFile('tokens.css'));

type Theme = 'light' | 'dark';

// A pair for which design-system.md states a contrast ratio. `stated` is the
// doc's figure. `minimum` is WCAG AA: 4.5 for text, and 3 where the doc marks
// the colour as large text or decorative only.
interface StatedPair {
  theme: Theme;
  foreground: string;
  background: string;
  stated: number;
  minimum: number;
}

const WHITE = '#FFFFFF';

const STATED_PAIRS: StatedPair[] = [
  // Light: "on white" in the doc is --color-bg-card, which is #FFFFFF in this theme
  { theme: 'light', foreground: '--color-primary-300', background: '--color-bg-card', stated: 4.26, minimum: 3 },
  { theme: 'light', foreground: WHITE, background: '--color-primary-500', stated: 6.68, minimum: 4.5 },
  { theme: 'light', foreground: '--color-primary-900', background: '--color-bg-card', stated: 12.15, minimum: 4.5 },
  { theme: 'light', foreground: '--color-text-primary', background: '--color-bg-card', stated: 16.66, minimum: 4.5 },
  { theme: 'light', foreground: '--color-text-secondary', background: '--color-bg-card', stated: 5.47, minimum: 4.5 },
  { theme: 'light', foreground: '--color-success-700', background: '--color-bg-card', stated: 4.58, minimum: 4.5 },
  { theme: 'light', foreground: '--color-warning-700', background: '--color-bg-card', stated: 4.53, minimum: 4.5 },
  { theme: 'light', foreground: '--color-error-700', background: '--color-bg-card', stated: 4.54, minimum: 4.5 },

  // Dark: "on surface" in the doc is --color-bg-card (#161E2F) in this theme
  { theme: 'dark', foreground: '--color-primary-300', background: '--color-bg-card', stated: 8.71, minimum: 4.5 },
  { theme: 'dark', foreground: WHITE, background: '--color-primary-500', stated: 6.88, minimum: 4.5 },
  { theme: 'dark', foreground: '--color-success-700', background: '--color-bg-card', stated: 8.67, minimum: 4.5 },
  { theme: 'dark', foreground: '--color-error-700', background: '--color-bg-card', stated: 6.19, minimum: 4.5 },
  { theme: 'dark', foreground: '--color-text-primary', background: '--color-bg-page', stated: 15.88, minimum: 4.5 },
  { theme: 'dark', foreground: '--color-text-secondary', background: '--color-bg-page', stated: 7.81, minimum: 4.5 },
];

// A token's value in a theme: the dark override when the dark theme has one,
// otherwise the light value. A hex literal (white text) is used as written.
function valueOf(theme: Theme, token: string): string {
  if (token.startsWith('#')) return token;
  const value = (theme === 'dark' && published.dark.get(token)) || published.light.get(token);
  if (value === undefined) throw new Error(`${token} is not published for the ${theme} theme`);
  return value;
}

describe('contrast of the stated token pairs', () => {
  it.each(STATED_PAIRS)('$theme: $foreground on $background', ({ theme, foreground, background, stated, minimum }) => {
    const ratio = contrastRatio(valueOf(theme, foreground), valueOf(theme, background));

    expect(ratio).toBeGreaterThanOrEqual(minimum);
    expect(Math.abs(ratio - stated)).toBeLessThanOrEqual(0.05);
  });
});

// design-system.md describes these as the status-badge pairing ("-700 text on
// -50 background") and says every pair is verified at 4.5:1. The light-theme
// pairings do not reach it, and the doc's own figures are measured on white,
// not on these backgrounds. Recorded here, not asserted, until the design
// owner decides how to fix the tones.
describe('badge pairings the design system describes but does not meet', () => {
  it.todo('light: success-700 text on success-50 is 4.16:1, needs 4.5:1');
  it.todo('light: warning-700 text on warning-50 is 4.08:1, needs 4.5:1');
  it.todo('light: error-700 text on error-50 is 3.90:1, needs 4.5:1');
});
