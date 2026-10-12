import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {api,authentication} from './api';
import {getSession,setSession} from '../auth/session';
const response=(status=200)=>new Response(JSON.stringify({error:status===403?'FORBIDDEN':'UNAUTHORIZED',message:'denied',traceId:'id'}),{status});
beforeEach(()=>{setSession({token:'test',sub:'alice',role:'ADMIN'});});
afterEach(()=>{setSession(null);vi.unstubAllGlobals();});
it('protected 401 clears session without refresh or replay',async()=>{
 const fetcher=vi.fn().mockResolvedValue(response(401));vi.stubGlobal('fetch',fetcher);
 await expect(api.request('/api/v1/products')).rejects.toMatchObject({status:401});expect(getSession()).toBeNull();expect(fetcher).toHaveBeenCalledTimes(1);
});
it('protected 403 retains session and normalized access error',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(403)));
 await expect(api.request('/api/v1/products')).rejects.toMatchObject({status:403});expect(getSession()?.sub).toBe('alice');
});
it.each([200,401])('late protected %s cannot affect a replacement session',async status=>{
 let resolve!:(r:Response)=>void;vi.stubGlobal('fetch',vi.fn().mockReturnValue(new Promise<Response>(yes=>resolve=yes)));
 const pending=api.request('/api/v1/products');await vi.waitFor(()=>expect(fetch).toHaveBeenCalledOnce());
 setSession({token:'new',sub:'bob',role:'ADMIN'});resolve(response(status));
 await expect(pending).rejects.toMatchObject({body:{error:'CANCELLED'}});expect(getSession()?.sub).toBe('bob');
});
it('logout ends session before networking settles',async()=>{await authentication.logout();expect(getSession()).toBeNull();});
