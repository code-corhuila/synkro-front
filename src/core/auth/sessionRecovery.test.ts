import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthentication } from './authentication';
import { setSession } from './session';
import { session } from '../../shell/session';

const pair = (sub = 'alice') => ({
  accessToken: `${btoa(JSON.stringify({ alg: 'RS256' }))}.${btoa(JSON.stringify({ sub, roles: ['ADMIN'], permissions: [], iat: Date.now() / 1000, exp: Date.now() / 1000 + 3600, jti: 'id' }))}.signature`,
  refreshToken: crypto.randomUUID(), tokenType: 'Bearer', expiresIn: 3600,
});
const deferred = () => { let resolve!: (value: unknown) => void;
  const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; };
const uuid = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;

describe('Host recovery ownership (Auth transport doubles)', () => {
  const transport = vi.fn();
  let auth: ReturnType<typeof createAuthentication>;
  const subscriptions: (() => void)[] = [];
  const credentials = { email: 'a@example.test', password: 'test-only' };
  const login = async (sub = 'alice') => { transport.mockResolvedValueOnce(pair(sub)); await auth.login(credentials); };
  beforeEach(() => {
    vi.useFakeTimers(); vi.stubEnv('VITE_DEV_SIGN_IN', 'false');
    sessionStorage.clear(); setSession(null); transport.mockReset(); auth = createAuthentication(transport);
  });
  afterEach(() => {
    subscriptions.splice(0).forEach(unsubscribe => unsubscribe());
    vi.restoreAllMocks(); auth.dispose(); setSession(null); vi.useRealTimers(); vi.unstubAllEnvs();
  });
  it('commits coherent identity/opaque identifier before notifying and never exposes tokens', async () => {
    const snapshots: unknown[] = [];
    subscriptions.push(session.subscribe(() => snapshots.push([session.user(), session.sessionId()])));
    await login();
    expect(session.sessionId()).toMatch(uuid);
    expect(snapshots).toEqual([[null, null], [{ sub: 'alice', role: 'ADMIN' }, session.sessionId()]]);
    expect(JSON.stringify(snapshots)).not.toMatch(/signature|refreshToken|accessToken/);
  });
  it('preserves the identifier through renewal', async () => {
    await login(); const id = session.sessionId();
    vi.setSystemTime(Date.now() + 3540000); transport.mockResolvedValueOnce(pair());
    await auth.ensureReady(); expect(session.sessionId()).toBe(id);
  });
  it('publishes null before logout listeners, isolates failures and preserves foreign keys', async () => {
    await login(); sessionStorage.setItem('other-owner', 'keep');
    subscriptions.push(session.subscribe(() => { throw new Error('bad consumer'); }));
    const listener = vi.fn(() => { expect(session.user()).toBeNull(); expect(session.sessionId()).toBeNull(); });
    subscriptions.push(session.subscribe(listener)); transport.mockResolvedValueOnce({});
    await auth.logout(); expect(listener).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem('other-owner')).toBe('keep');
    expect(sessionStorage.getItem('synkro_session')).toBeNull();
  });
  it('deduplicates listeners and supports idempotent unsubscribe after portal unmount', async () => {
    await login(); const listener = vi.fn();
    const off = session.subscribe(listener); subscriptions.push(session.subscribe(listener));
    transport.mockResolvedValueOnce({}); await auth.logout(); expect(listener).toHaveBeenCalledOnce();
    off(); off(); await login(); expect(listener).toHaveBeenCalledOnce();
  });
  it.each(['alice', 'bob'])('new login for %s replaces the identifier', async sub => {
    await login(); const id = session.sessionId(); await login(sub);
    expect(session.user()?.sub).toBe(sub); expect(session.sessionId()).not.toBe(id);
  });
  it('late refresh cannot replace the new session', async () => {
    await login(); vi.setSystemTime(Date.now() + 3540000);
    const pending = deferred(); transport.mockReturnValueOnce(pending.promise);
    const renewal = auth.ensureReady(); const rejected = expect(renewal).rejects.toMatchObject({ code: 'CANCELLED' });
    await login('bob'); const id = session.sessionId(); pending.resolve(pair()); await rejected;
    expect(session.user()?.sub).toBe('bob'); expect(session.sessionId()).toBe(id);
  });
  it('late login cannot resurrect logout or overwrite a replacement', async () => {
    const pending = deferred(); transport.mockReturnValueOnce(pending.promise);
    const attempt = auth.login(credentials); await auth.logout(); await login('bob');
    const id = session.sessionId(); pending.resolve(pair());
    await expect(attempt).rejects.toMatchObject({ code: 'CANCELLED' }); expect(session.sessionId()).toBe(id);
  });
  it('storage removal failures cannot interrupt in-memory invalidation or listeners', async () => {
    await login(); const listener = vi.fn(); subscriptions.push(session.subscribe(listener));
    vi.spyOn(Object.getPrototypeOf(sessionStorage), 'removeItem').mockImplementation(() => { throw new Error('denied'); });
    transport.mockResolvedValueOnce({}); await auth.logout();
    expect(session.user()).toBeNull(); expect(session.sessionId()).toBeNull(); expect(listener).toHaveBeenCalledOnce();
  });
  it('failed metadata persistence rolls back credentials and never publishes a login', async () => {
    const original = sessionStorage.setItem;
    vi.spyOn(Object.getPrototypeOf(sessionStorage) as Storage, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === 'synkro_session') throw new Error('quota'); original.call(this, key, value);
    });
    transport.mockResolvedValueOnce(pair());
    await expect(auth.login(credentials)).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    expect(session.user()).toBeNull(); expect(session.sessionId()).toBeNull(); expect(sessionStorage.length).toBe(0);
  });
  it('a failing authentication observer cannot interrupt session transitions', async () => {
    const off = auth.subscribe(() => { throw new Error('observer'); });
    try { await login(); expect(session.sessionId()).toMatch(uuid); await auth.logout(); expect(session.sessionId()).toBeNull(); }
    finally { off(); }
  });
  it('a synchronous logout observer cannot leave a committed login or renewal timer', async () => {
    subscriptions.push(session.subscribe(() => { if (session.user()) void auth.logout(); }));
    transport.mockResolvedValueOnce(pair());
    await expect(auth.login(credentials)).rejects.toMatchObject({ code: 'CANCELLED' });
    expect(session.user()).toBeNull(); expect(session.sessionId()).toBeNull(); expect(auth.state()).toBe('anonymous');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('storage failure before rotation transmits no refresh and invalidates', async () => {
    await login(); vi.setSystemTime(Date.now() + 3540000);
    vi.spyOn(Object.getPrototypeOf(sessionStorage), 'removeItem').mockImplementation(() => { throw new Error('denied'); });
    await expect(auth.ensureReady()).rejects.toMatchObject({ code: 'INDETERMINATE' });
    expect(transport).toHaveBeenCalledOnce(); expect(session.user()).toBeNull(); expect(session.sessionId()).toBeNull();
  });
  it.each(['preserved', 'missing', 'corrupt', 'wrong-subject', 'invalid-id'])('reload validates Auth before publishing %s metadata', async mode => {
    await login(); const id = session.sessionId(); const stored = sessionStorage.getItem('synkro_session');
    auth.dispose(); vi.resetModules();
    if (mode === 'missing') sessionStorage.removeItem('synkro_session');
    if (mode === 'corrupt') sessionStorage.setItem('synkro_session', '{bad');
    if (mode === 'wrong-subject') sessionStorage.setItem('synkro_session', JSON.stringify({ id, sub: 'bob' }));
    if (mode === 'invalid-id') sessionStorage.setItem('synkro_session', JSON.stringify({ id: 'credential-like', sub: 'alice' }));
    const reloaded = await import('./authentication'); const facade = (await import('../../shell/session')).session;
    const pending = deferred(); const server = vi.fn().mockReturnValueOnce(pending.promise);
    const restored = reloaded.createAuthentication(server);
    try {
      const recovery = restored.recover(); expect(facade.user()).toBeNull(); expect(facade.sessionId()).toBeNull();
      pending.resolve(pair()); await recovery;
      expect(facade.user()?.sub).toBe('alice'); expect(facade.sessionId()).toMatch(uuid);
      if (mode === 'preserved') { expect(stored).not.toBeNull(); expect(facade.sessionId()).toBe(id); }
      else expect(facade.sessionId()).not.toBe(id);
    } finally { await restored.logout(); restored.dispose(); }
  });
  it.each(['absent', 'rejected', 'unreadable'])('metadata with %s credential cannot invent authentication', async mode => {
    sessionStorage.setItem('synkro_session', JSON.stringify({ id: crypto.randomUUID(), sub: 'alice' }));
    if (mode === 'rejected') { sessionStorage.setItem('synkro_refresh', 'invalid'); transport.mockRejectedValueOnce({ status: 401 }); }
    if (mode === 'unreadable') vi.spyOn(Object.getPrototypeOf(sessionStorage), 'getItem').mockImplementation(() => { throw new Error('denied'); });
    await auth.recover(); expect(session.user()).toBeNull(); expect(session.sessionId()).toBeNull();
  });
});
