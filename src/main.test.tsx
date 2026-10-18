import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

function fakeJwt(payload: Record<string, unknown>) {
  const b64 = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64(payload)}.`;
}

// Boots the real entry point, exactly as the browser does: a fresh module
// graph (so this is also what a page reload looks like) rendering into #root.
async function boot(path: string) {
  vi.resetModules();
  window.history.pushState({}, '', path);
  document.body.innerHTML = '<div id="root"></div>';
  await act(async () => {
    await import('./main');
  });
  const { api } = await import('./core/http/api');
  const session = await import('./core/auth/session');
  return { api, session };
}

describe('host shell, assembled', () => {
  let fetchMock: Mock<typeof fetch>;

  beforeEach(() => {
    sessionStorage.clear();
    vi.stubEnv('VITE_DEV_SIGN_IN', 'true');
    vi.stubEnv('VITE_API_BASE_URL', 'http://gateway');
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sends an unauthenticated visitor to /login, then back to where they were going after signing in', async () => {
    await boot('/dashboard');

    expect(window.location.pathname).toBe('/login');

    await userEvent.type(
      screen.getByLabelText(/development token/i),
      fakeJwt({ sub: 'alice', roles: ['ADMIN'] })
    );
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(window.location.pathname).toBe('/dashboard');
    expect(await screen.findByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
  });

  it('keeps the session across a reload', async () => {
    await boot('/login');
    await userEvent.type(
      screen.getByLabelText(/development token/i),
      fakeJwt({ sub: 'bob', roles: ['SALESPERSON'] })
    );
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await boot('/dashboard');

    expect(window.location.pathname).toBe('/dashboard');
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
  });

  it('sends the signed-in token through the api client, and a 401 kicks a mounted page back to /login', async () => {
    const token = fakeJwt({ sub: 'alice', roles: ['ADMIN'] });
    const { api, session } = await boot('/login');
    await userEvent.type(screen.getByLabelText(/development token/i), token);
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'UNAUTHORIZED', message: 'expired', traceId: 't' }), { status: 401 })
    );

    await act(async () => {
      await expect(api.request('/api/v1/products')).rejects.toMatchObject({ status: 401 });
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://gateway/api/v1/products');
    expect((init?.headers as Record<string, string>)['Authorization']).toBe(`Bearer ${token}`);

    expect(session.getSession()).toBeNull();
    expect(sessionStorage.getItem('synkro_dev_token')).toBeNull();
    expect(window.location.pathname).toBe('/login');
    expect(screen.getByLabelText(/development token/i)).toBeInTheDocument();
  });

  it('does not offer development sign-in when VITE_DEV_SIGN_IN is not "true"', async () => {
    vi.stubEnv('VITE_DEV_SIGN_IN', 'false');
    await boot('/dashboard');

    expect(window.location.pathname).toBe('/login');
    expect(screen.queryByLabelText(/development token/i)).not.toBeInTheDocument();
    expect(within(document.body).queryByRole('heading', { name: /dashboard/i })).not.toBeInTheDocument();
  });
});
