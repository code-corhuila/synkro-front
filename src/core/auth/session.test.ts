import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSession, setSession, signInWithDevToken } from './session';

function fakeJwt(payload: Record<string, unknown>) {
  const b64 = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64(payload)}.`;
}

describe('session', () => {
  beforeEach(() => {
    sessionStorage.clear();
    setSession(null);
  });

  it('starts with no session', () => {
    expect(getSession()).toBeNull();
  });

  it('signs in with a well-formed development token', () => {
    const ok = signInWithDevToken(fakeJwt({ sub: 'alice', roles: ['ADMIN'] }));
    expect(ok).toBe(true);
    expect(getSession()).toMatchObject({ sub: 'alice', role: 'ADMIN' });
  });

  it('rejects a token with no decodable payload', () => {
    expect(signInWithDevToken('not-a-jwt')).toBe(false);
    expect(getSession()).toBeNull();
  });

  it('rejects a token missing sub or role', () => {
    expect(signInWithDevToken(fakeJwt({ foo: 'bar' }))).toBe(false);
    expect(getSession()).toBeNull();
  });

  it('persists the session in sessionStorage across a restore', async () => {
    signInWithDevToken(fakeJwt({ sub: 'bob', roles: ['SALESPERSON'] }));

    // Simulate a reload: a fresh module instance (in-memory session gone)
    // while sessionStorage survives. setSession(null) can't be used here —
    // that is sign-out, and it clears storage too.
    vi.resetModules();
    const reloaded = await import('./session');
    expect(reloaded.getSession()).toBeNull();

    reloaded.restoreSession();
    expect(reloaded.getSession()).toMatchObject({ sub: 'bob', role: 'SALESPERSON' });
  });

  it('clears sessionStorage on sign-out', () => {
    signInWithDevToken(fakeJwt({ sub: 'alice', roles: ['ADMIN'] }));
    setSession(null);
    expect(getSession()).toBeNull();
    expect(sessionStorage.getItem('synkro_dev_token')).toBeNull();
  });
});
