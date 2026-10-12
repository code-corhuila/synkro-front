import { describe, it, expect, vi, afterEach } from 'vitest';
import { createApiClient } from './apiClient';
describe('internal Auth transport',()=>{
  afterEach(()=>vi.unstubAllGlobals());
  it('uses the same transport without exposing a portal gate bypass',async()=>{
    const fetcher=vi.fn().mockImplementation(()=>Promise.resolve(new Response('{}')));vi.stubGlobal('fetch',fetcher);
    const client=createApiClient('http://gateway',()=> 'access',vi.fn());
    await client.authenticate('login',{email:'a',password:'b'});
    await client.authenticate('refresh',{refreshToken:'r'});
    expect(fetcher.mock.calls[0][0]).toBe('http://gateway/api/v1/auth/login');
    expect(fetcher.mock.calls[1][1].headers).not.toHaveProperty('Authorization');
    await client.authenticate('logout',{refreshToken:'r'},undefined,'old-access');
    expect(fetcher.mock.calls[2][1].headers.Authorization).toBe('Bearer old-access');
  });
  it.each(['5','Mon, 12 Oct 2026 12:00:05 GMT'])('preserves Retry-After %s as an absolute deadline',async header=>{
    vi.spyOn(Date,'now').mockReturnValue(Date.parse('2026-10-12T12:00:00Z'));
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{}',{status:429,headers:{'Retry-After':header}})));
    const client=createApiClient('',()=>null,vi.fn());
    await expect(client.authenticate('login',{})).rejects.toMatchObject({status:429,retryAt:Date.now()+5000});vi.restoreAllMocks();
  });
});
