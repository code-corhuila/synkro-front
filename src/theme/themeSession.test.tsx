import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setSession } from '../core/auth/session';
import { Shell } from '../layout/Shell';
import { AuthLogin } from '../remotes/AuthLogin';
import { THEME_STORAGE_KEY, theme } from './themePreference';

describe('theme preference across the session', () => {
  // Node 25 ships its own half-working localStorage global; a plain in-memory one is deterministic.
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      get length() {
        return store.size;
      },
    });
    setSession(null);
    theme.start();
    theme.set('system');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('is offered inside the application, in the Shell header', () => {
    setSession({ token: 't', sub: 'ana', role: 'ADMIN' });
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/dashboard" element={<div />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('radiogroup', { name: 'Tema' })).toBeInTheDocument();
  });

  it('is offered on the login, even when its remote is down', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthLogin load={() => Promise.reject(new Error('down'))} />
      </MemoryRouter>
    );
    await screen.findByText('No pudimos cargar el acceso.');

    await userEvent.click(screen.getByRole('radio', { name: 'Oscuro' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('survives signing in and out, and never touches the session', () => {
    theme.set('dark');
    setSession({ token: 't', sub: 'ana', role: 'ADMIN' });
    setSession(null);

    expect(store.get(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect([...store.keys()]).toEqual([THEME_STORAGE_KEY]);
  });
});
