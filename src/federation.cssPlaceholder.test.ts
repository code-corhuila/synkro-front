import { describe, it, expect } from 'vitest';
import { resolveCssPlaceholders } from './federation.cssPlaceholder';

// Vite 8's minifier writes string literals as template literals, which
// @originjs/vite-plugin-federation's `["']__v__css__…` regex never matches, so
// the remote entry ships a bare string where dynamicLoadingCss expects an array
// and every exposed module throws "e.forEach is not a function".
describe('resolveCssPlaceholders', () => {
  it('turns a backtick placeholder into an empty css list', () => {
    const code = 'a(`__v__css__C:/work/synkro-front/src/shell/session.ts`,!1,`./session`)';

    expect(resolveCssPlaceholders(code)).toBe('a([],!1,`./session`)');
  });

  it('leaves quoted placeholders to the federation plugin', () => {
    const code = `a("__v__css__/src/App.tsx",!1,"./App")`;

    expect(resolveCssPlaceholders(code)).toBe(code);
  });

  it('leaves code without placeholders untouched', () => {
    expect(resolveCssPlaceholders('const x = `plain`')).toBe('const x = `plain`');
  });
});
