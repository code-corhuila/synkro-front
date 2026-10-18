import { describe, it, expect, beforeEach } from 'vitest';
import { setSession } from '../core/auth/session';
import { session } from './session';

describe('shell/session facade', () => {
  beforeEach(() => {
    sessionStorage.clear();
    setSession(null);
  });

  it('returns { sub, role } for a signed-in session', () => {
    setSession({ token: 'secret-token', sub: 'alice', role: 'ADMIN' });

    expect(session.user()).toEqual({ sub: 'alice', role: 'ADMIN' });
  });

  it('returns null without a session', () => {
    expect(session.user()).toBeNull();
  });

  it('follows the session: null again after sign-out', () => {
    setSession({ token: 'secret-token', sub: 'alice', role: 'ADMIN' });
    setSession(null);

    expect(session.user()).toBeNull();
  });

  describe('token isolation', () => {
    beforeEach(() => {
      setSession({ token: 'secret-token', sub: 'alice', role: 'ADMIN' });
    });

    it('the facade exposes exactly user', () => {
      expect(Object.keys(session)).toEqual(['user']);
      expect(Object.getOwnPropertyNames(session)).toEqual(['user']);
    });

    it('the user object has exactly sub and role', () => {
      const user = session.user();

      expect(Object.getOwnPropertyNames(user)).toEqual(['sub', 'role']);
      expect(JSON.stringify(user)).not.toContain('secret-token');
    });

    it('returns a copy: mutating it does not touch the session', () => {
      const user = session.user() as { sub: string };
      user.sub = 'mallory';

      expect(session.user()).toEqual({ sub: 'alice', role: 'ADMIN' });
    });
  });
});
