import { describe, expect, it } from 'vitest';
import { parseRules } from './cssRules';

describe('parseRules', () => {
  it('reads selectors and declarations, one rule per block', () => {
    const rules = parseRules('.a, .b > p { color: red; margin: 0 }\n#x { top: 1px; }');

    expect(rules).toEqual([
      { media: null, selectors: ['.a', '.b > p'], declarations: [['color', 'red'], ['margin', '0']] },
      { media: null, selectors: ['#x'], declarations: [['top', '1px']] },
    ]);
  });

  it('ignores comments, including ones that contain braces', () => {
    const rules = parseRules('/* .gone { color: red; } */ .kept { color: blue; /* a { b } */ }');

    expect(rules).toEqual([{ media: null, selectors: ['.kept'], declarations: [['color', 'blue']] }]);
  });

  it('records the @media condition a nested rule sits in', () => {
    const rules = parseRules('.a { top: 0; } @media (prefers-color-scheme: dark) { .a { top: 1px; } .b { top: 2px; } }');

    expect(rules.map((rule) => [rule.media, rule.selectors[0]])).toEqual([
      [null, '.a'],
      ['(prefers-color-scheme: dark)', '.a'],
      ['(prefers-color-scheme: dark)', '.b'],
    ]);
  });

  it('keeps a value that holds a function call whole', () => {
    expect(parseRules('.a { outline: 2px solid var(--color-primary-500); }')[0].declarations).toEqual([
      ['outline', '2px solid var(--color-primary-500)'],
    ]);
  });
});
