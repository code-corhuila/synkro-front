import { describe, expect, it } from 'vitest';
import { contrastRatio } from './contrast';
import { parseRules, type CssRule } from './cssRules';
import { parsePublishedSheet, readSourceFiles, readThemeFile, resolveToken } from './tokenSheet';

const published = parsePublishedSheet(readThemeFile('tokens.css'));
const rules = parseRules(readSourceFiles().get('shared/ui/Button.css') ?? '');

// The declarations of the rule with exactly this selector.
function declared(selector: string): Record<string, string> {
  const matching = rules.filter((rule: CssRule) => rule.selectors.includes(selector));
  return Object.fromEntries(matching.flatMap((rule) => rule.declarations));
}

// The token a declaration names, from `var(--x)`.
const tokenIn = (value: string | undefined) => value?.match(/^var\((--[\w-]+)\)$/)?.[1];

const colour = (theme: 'light' | 'dark', value: string | undefined) => resolveToken(published, theme, tokenIn(value) ?? '');

// design-system.md, Buttons.
describe('button styles', () => {
  it('reads a stylesheet for the shared button', () => {
    expect(rules.length).toBeGreaterThan(0);
  });

  it('paints primary on --color-primary-500 and brightens it on hover (--color-primary-700)', () => {
    expect(declared('.button--primary').background).toBe('var(--color-primary-500)');
    expect(declared('.button--primary:hover:not(:disabled)').background).toBe('var(--color-primary-700)');
  });

  it('draws secondary as a transparent button in the role alias, which flips per theme', () => {
    expect(declared('.button--secondary')).toMatchObject({
      background: 'transparent',
      color: 'var(--color-secondary-action)',
      border: '1px solid var(--color-secondary-action)',
    });
  });

  it('dims a disabled button and shows it cannot be used', () => {
    expect(declared('.button:disabled')).toMatchObject({ opacity: '0.5', cursor: 'not-allowed' });
  });

  it('keeps the page font on a button, which browsers do not inherit by default', () => {
    expect(declared('.button')).toMatchObject({ font: 'inherit' });
  });

  describe('label contrast reaches 4.5:1 in both themes', () => {
    const labelOnFill = declared('.button--primary').color;

    it.each(['light', 'dark'] as const)('primary label on its fill and on hover, %s', (theme) => {
      const label = colour(theme, labelOnFill);

      expect(contrastRatio(label, colour(theme, declared('.button--primary').background))).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(label, colour(theme, declared('.button--primary:hover:not(:disabled)').background))).toBeGreaterThanOrEqual(4.5);
    });

    it.each(['light', 'dark'] as const)('secondary label on the card and on the page, %s', (theme) => {
      const label = colour(theme, declared('.button--secondary').color);

      for (const surface of ['--color-bg-card', '--color-bg-page']) {
        expect(contrastRatio(label, resolveToken(published, theme, surface)), surface).toBeGreaterThanOrEqual(4.5);
      }
    });
  });
});
