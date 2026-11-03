import { describe, expect, it } from 'vitest';
import { parseRules } from './cssRules';
import { readSourceFiles } from './tokenSheet';

const sources = readSourceFiles();
const text = (path: string) => sources.get(path) ?? '';
const rules = (path: string) => parseRules(text(path));
const declared = (path: string, selector: string): Record<string, string> =>
  Object.fromEntries(rules(path).filter((rule) => rule.selectors.includes(selector)).flatMap((rule) => rule.declarations));

// HU-FE-09, FE09-04: the orphan native-style controls under the login must not come back.
describe('login access region (visual regression contract)', () => {
  it.each(['remotes/AuthLogin.tsx', 'core/errors/RemoteBoundary.tsx'])('%s has no native button or anchor, only the shared components', (path) => {
    expect(text(path), `${path} should exist`).not.toBe('');
    expect(text(path)).not.toMatch(/<button[\s>]/);
    expect(text(path)).not.toMatch(/<a[\s>]/);
    expect(text(path)).not.toMatch(/<Link[\s>]/);
  });

  it('does not render recovery controls from the page itself: they belong to the boundary panel', () => {
    expect(text('remotes/AuthLogin.tsx')).not.toContain('Volver a cargar el acceso');
    // The only control the page passes is the way home, handed to the boundary as an action.
    expect(text('remotes/AuthLogin.tsx')).not.toMatch(/<Button[\s>]/);
    expect(text('remotes/AuthLogin.tsx').match(/<ButtonLink[\s>]/g)).toHaveLength(1);
    expect(text('remotes/AuthLogin.tsx')).toMatch(/actions=\{\s*<ButtonLink/);
  });

  it('lays the actions out in a wrapping row spaced with tokens', () => {
    expect(declared('core/errors/RemoteBoundary.css', '.portal-notice__actions')).toMatchObject({
      display: 'flex',
      'flex-wrap': 'wrap',
      gap: 'var(--space-3)',
    });
  });

  it('keeps the panel the width of the login card and centred', () => {
    expect(declared('core/errors/RemoteBoundary.css', '.portal-notice--access')).toMatchObject({
      'max-width': '28rem',
      'margin-inline': 'auto',
    });
  });

  it('lets the shared button styles apply to a link: no underline, laid out like a button', () => {
    expect(declared('shared/ui/Button.css', '.button')).toMatchObject({
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'text-decoration': 'none',
    });
  });

  it('keeps the single shared focus ring (no per-component outline for the new controls)', () => {
    for (const path of ['shared/ui/Button.css', 'core/errors/RemoteBoundary.css']) {
      expect(text(path)).not.toMatch(/outline/);
    }
  });
});
