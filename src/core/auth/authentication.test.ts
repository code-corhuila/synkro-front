import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createAuthentication } from './authentication';
import { getSession, setSession } from './session';

const pair = (sub = 'alice', seconds = 3600) => ({
  accessToken: `${btoa(JSON.stringify({alg:'RS256'}))}.${btoa(JSON.stringify({sub, roles:['ADMIN'], permissions:['users:manage'], iat:Date.now()/1000, exp:Date.now()/1000+seconds, jti:'id'}))}.signature`,
  refreshToken: `refresh-${sub}-${seconds}-${Date.now()}`, tokenType:'Bearer', expiresIn:seconds,
});
const deferred = <T,>() => { let resolve!: (value:T)=>void; let reject!: (value:unknown)=>void;
  const promise = new Promise<T>((yes,no)=>{resolve=yes;reject=no}); return {promise,resolve,reject}; };
describe('Host authentication lifecycle', () => {
  const transport = vi.fn();
  let auth: ReturnType<typeof createAuthentication>;
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-12T12:00:00Z'));
    sessionStorage.clear(); setSession(null); transport.mockReset();
    auth = createAuthentication(transport);
  });
  afterEach(() => {auth.dispose(); setSession(null); vi.useRealTimers();});
  const login = async (sub = 'alice') => {transport.mockResolvedValueOnce(pair(sub)); return auth.login({email:'a@example.test',password:'secret'});};
  it('consumes valid pair and returns only rebuilt identity and approved destination', async () => {
    const result = await login();
    expect(result).toEqual({user:{sub:'alice',role:'ADMIN'},destination:'/dashboard'});
    expect(sessionStorage.length).toBe(1); expect(sessionStorage.getItem('synkro_refresh')).toBe(pair().refreshToken);
    expect(JSON.stringify(result)).not.toMatch(/accessToken|refreshToken|signature/);
  });
  it.each([{}, {...pair(),tokenType:'Basic'}, {...pair(),accessToken:'bad'}, pair('alice',60), {...pair(),refreshToken:''}])('rejects malformed or too short pair without committing: %j', async response => {
    transport.mockResolvedValue(response);
    await expect(auth.login({email:'a',password:'b'})).rejects.toMatchObject({code:'UNAVAILABLE'});
    expect(getSession()).toBeNull(); expect(sessionStorage.length).toBe(0);
  });
  it.each([[401,'INVALID_CREDENTIALS'],[403,'UNAVAILABLE'],[500,'UNAVAILABLE'],[0,'UNAVAILABLE'],[429,'RATE_LIMITED']])('normalizes login %s without refresh', async (status,code) => {
    transport.mockRejectedValue({status, retryAt:Date.now()+5000});
    await expect(auth.login({email:'a',password:'b'})).rejects.toMatchObject({code});
    expect(transport).toHaveBeenCalledTimes(1); expect(getSession()).toBeNull();
  });
  it('shares timer/focus/request renewal at exactly 60 seconds', async () => {
    await login(); const next = deferred<unknown>(); transport.mockReturnValue(next.promise);
    await vi.advanceTimersByTimeAsync(3540000);
    window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange'));
    const a = auth.ensureReady(); const b = auth.ensureReady();
    expect(transport).toHaveBeenCalledTimes(2);
    next.resolve(pair()); await Promise.all([a,b]); expect(auth.state()).toBe('authenticated');
  });
  it('does not renew with more than 60 seconds remaining', async () => {
    await login(); vi.setSystemTime(Date.now()+3539999); await auth.ensureReady(); expect(transport).toHaveBeenCalledTimes(1);
  });
  it('one waiting caller may cancel without aborting the shared rotation', async () => {
    await login(); vi.setSystemTime(Date.now()+3540000);
    const next=deferred<unknown>(); transport.mockReturnValue(next.promise);
    const caller=new AbortController(); const a=auth.ensureReady(caller.signal); const b=auth.ensureReady();
    caller.abort(); await expect(a).rejects.toMatchObject({code:'CANCELLED'});
    next.resolve(pair()); await b; expect(getSession()?.sub).toBe('alice'); expect(transport).toHaveBeenCalledTimes(2);
  });
  it('recovers missing memory from refresh and otherwise remains anonymous', async () => {
    sessionStorage.setItem('synkro_refresh','reload-credential'); transport.mockResolvedValue(pair());
    await auth.recover(); expect(getSession()?.sub).toBe('alice');
    expect(transport).toHaveBeenCalledWith('refresh',{refreshToken:'reload-credential'},undefined);
  });
  it('does not call Auth during recovery without a credential', async () => {await auth.recover();expect(transport).not.toHaveBeenCalled();});
  it('logout releases callers waiting on rotation even if the server never responds', async () => {
    await login();vi.setSystemTime(Date.now()+3540000);transport.mockReturnValueOnce(new Promise(()=>{}));
    const pending=auth.ensureReady();const observed=vi.fn();void pending.catch(observed);transport.mockResolvedValueOnce({});await auth.logout();
    await Promise.resolve();await Promise.resolve();
    expect(observed).toHaveBeenCalledWith(expect.objectContaining({code:'CANCELLED'}));
  });
  it('storage failure during login is normalized and never leaves a session', async () => {
    transport.mockResolvedValue(pair());const storage=vi.spyOn(Object.getPrototypeOf(sessionStorage),'setItem').mockImplementation(()=>{throw new Error('denied');});
    await expect(auth.login({email:'a',password:'b'})).rejects.toMatchObject({code:'UNAVAILABLE'});expect(getSession()).toBeNull();storage.mockRestore();
  });
  it.each([0,401,429,500])('refresh failure %s removes rotation credential without resubmitting', async status => {
    await login(); vi.setSystemTime(Date.now()+3540000); transport.mockRejectedValue({status});
    await expect(auth.ensureReady()).rejects.toMatchObject({code:status===401?'SIGN_IN_REQUIRED':'INDETERMINATE'});
    await expect(auth.ensureReady()).rejects.toMatchObject({code:'SIGN_IN_REQUIRED'});
    expect(transport).toHaveBeenCalledTimes(2); expect(sessionStorage.length).toBe(0); expect(getSession()).toBeNull();
  });
  it('rejects changed subject or non-rotated refresh', async () => {
    await login(); vi.setSystemTime(Date.now()+3540000);transport.mockResolvedValue(pair('other'));
    await expect(auth.ensureReady()).rejects.toMatchObject({code:'INDETERMINATE'});expect(getSession()).toBeNull();
  });
  it('logout while login is pending prevents late restoration', async () => {
    const next=deferred<unknown>();transport.mockReturnValueOnce(next.promise);
    const pending=auth.login({email:'a',password:'b'});await auth.logout(); next.resolve(pair());
    await expect(pending).rejects.toMatchObject({code:'CANCELLED'});expect(getSession()).toBeNull();
  });
  it('logout during refresh invalidates it and always clears locally on server failure', async () => {
    await login();vi.setSystemTime(Date.now()+3540000);const next=deferred<unknown>();transport.mockReturnValueOnce(next.promise);
    const pending=auth.ensureReady();transport.mockRejectedValueOnce({status:500});await auth.logout();next.resolve(pair('alice',7200));
    await expect(pending).rejects.toMatchObject({code:'CANCELLED'});expect(getSession()).toBeNull();expect(sessionStorage.length).toBe(0);
    expect(transport).toHaveBeenLastCalledWith('logout',{refreshToken:expect.stringMatching(/^refresh-alice-/)},undefined,expect.any(String));
  });
  it('account replacement invalidates a pending login', async () => {
    const next=deferred<unknown>();transport.mockReturnValueOnce(next.promise);const pending=auth.login({email:'a',password:'b'});
    await login('bob');next.resolve(pair());await expect(pending).rejects.toMatchObject({code:'CANCELLED'});expect(getSession()?.sub).toBe('bob');
  });
  it('component cancellation prevents late login commit', async () => {
    const next=deferred<unknown>();transport.mockReturnValueOnce(next.promise);const caller=new AbortController();
    const pending=auth.login({email:'a',password:'b'},{signal:caller.signal});caller.abort();next.resolve(pair());
    await expect(pending).rejects.toMatchObject({code:'CANCELLED'});expect(getSession()).toBeNull();
  });
  it.each(['https://evil.test','//evil.test','/sales/../users','/login','/products%2f..%2fusers','/\\evil.test'])('rejects unsafe return %s', async returnTo => {
    transport.mockResolvedValue(pair());expect((await auth.login({email:'a',password:'b'},{returnTo})).destination).toBe('/dashboard');
  });
  it('permits an authorized local destination and rejects another role destination', async () => {
    transport.mockResolvedValue(pair());expect((await auth.login({email:'a',password:'b'},{returnTo:'/sales/42?q=1'})).destination).toBe('/sales/42?q=1');
    const response=pair();response.accessToken=response.accessToken.replace(response.accessToken.split('.')[1],btoa(JSON.stringify({sub:'a',roles:['INVENTORY'],permissions:[],iat:Date.now()/1000,exp:Date.now()/1000+3600,jti:'i'})));
    transport.mockResolvedValue(response);expect((await auth.login({email:'a',password:'b'},{returnTo:'/sales'})).destination).toBe('/dashboard');
  });
});
