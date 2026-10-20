import {afterEach,it,expect,vi} from 'vitest';
import {authentication,installAuthenticationNavigation} from './authentication';
import {authentication as host} from '../core/http/api';
import {setSession} from '../core/auth/session';
const pair=()=>({accessToken:`${btoa('{"alg":"RS256"}')}.${btoa(JSON.stringify({sub:'alice',roles:['ADMIN'],permissions:[],iat:Date.now()/1000,exp:Date.now()/1000+3600,jti:'id'}))}.signature`,refreshToken:'refresh',tokenType:'Bearer',expiresIn:3600});
afterEach(()=>{setSession(null);vi.unstubAllGlobals();vi.restoreAllMocks();});
it('token-free capability navigates inside Host to an authorized return destination',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockImplementation(()=>Promise.resolve(new Response(JSON.stringify(pair())))));
 const navigate=vi.fn();const detach=installAuthenticationNavigation(navigate);
 const result=await authentication.login({email:'a',password:'b'},{returnTo:'/sales/42'});
 expect(result).toEqual({user:{sub:'alice',role:'ADMIN'},destination:'/sales/42'});expect(navigate).toHaveBeenCalledWith('/sales/42');detach();
});
it('does not navigate when a completed login is invalidated before its consumer resumes',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockImplementation(()=>Promise.resolve(new Response(JSON.stringify(pair())))));
 const navigate=vi.fn();const detach=installAuthenticationNavigation(navigate);
 const original=host.login;vi.spyOn(host,'login').mockImplementation(async(...args)=>{const result=await original(...args);setSession(null);return result;});
 await expect(authentication.login({email:'a',password:'b'})).rejects.toMatchObject({code:'CANCELLED'});expect(navigate).not.toHaveBeenCalled();detach();
});
