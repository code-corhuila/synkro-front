import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../app/App';
import { setSession } from '../core/auth/session';
import { parseRules } from '../theme/cssRules';
import { readSourceFiles } from '../theme/tokenSheet';

function visit(path: string) {
  window.history.pushState({}, '', path);
  render(<App />);
}

// The host's own headings carry the type scale through classes, because a bare
// h1 rule would restyle every portal that renders inside the host.
describe('host headings carry the type scale through classes', () => {
  beforeEach(() => setSession(null));
  afterEach(() => vi.unstubAllEnvs());

  it('on the dashboard', () => {
    setSession({ token: 't', sub: 'alice', role: 'ADMIN' });
    visit('/dashboard');

    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('heading', 'heading--page');
  });

  it('on the 404 screen', () => {
    setSession({ token: 't', sub: 'alice', role: 'ADMIN' });
    visit('/definitely-not-a-route');

    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('heading', 'heading--page');
  });

  it('on the sign-in unavailable page', () => {
    vi.stubEnv('VITE_DEV_SIGN_IN', 'false');
    visit('/login');

    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('heading', 'heading--page');
  });

  describe('in the base stylesheet', () => {
    const rules = parseRules(readSourceFiles().get('index.css') ?? '');
    const declared = (selector: string) =>
      Object.fromEntries(rules.filter((rule) => rule.selectors.includes(selector)).flatMap((rule) => rule.declarations));

    it('gives .heading the heading face, black weight and capitals', () => {
      expect(declared('.heading')).toMatchObject({
        'font-family': 'var(--font-family-heading)',
        'font-weight': 'var(--font-weight-black)',
        'text-transform': 'uppercase',
      });
    });

    it('gives .heading--page the page-title size', () => {
      expect(declared('.heading--page')).toMatchObject({ 'font-size': 'var(--font-size-2xl)' });
    });
  });
});
