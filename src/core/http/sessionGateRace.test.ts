import {it,expect,vi} from 'vitest';
import {api} from './api';
import {setSession} from '../auth/session';
it('replacement while a protected caller enters the gate cannot release work as another account',async()=>{
 setSession({token:'old',sub:'alice',role:'ADMIN'});
 const fetcher=vi.fn().mockResolvedValue(new Response('{}'));vi.stubGlobal('fetch',fetcher);
 const pending=api.request('/api/v1/products');setSession({token:'new',sub:'bob',role:'ADMIN'});
 await expect(pending).rejects.toMatchObject({body:{error:'CANCELLED'}});expect(fetcher).not.toHaveBeenCalled();setSession(null);vi.unstubAllGlobals();
});
it.each(['/api/v1/auth/login','/api/v1/auth/refresh','/api/v1/auth/logout'])('portals cannot consume credential endpoints via apiClient: %s',async path=>{
 setSession({token:'old',sub:'alice',role:'ADMIN'});const fetcher=vi.fn().mockResolvedValue(new Response('{}'));vi.stubGlobal('fetch',fetcher);
 await expect(api.request(path,{method:'POST',body:{}})).rejects.toMatchObject({body:{error:'FORBIDDEN'}});expect(fetcher).not.toHaveBeenCalled();setSession(null);vi.unstubAllGlobals();
});
