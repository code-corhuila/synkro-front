import {render,screen,waitFor,cleanup} from '@testing-library/react';
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import App from './App';
import {setSession} from '../core/auth/session';
import {authentication} from '../core/http/api';
vi.mock('authPortal/Login',()=>({default:()=> <h1>Formulario remoto de credenciales</h1>}));
beforeEach(()=>{vi.stubEnv('VITE_DEV_SIGN_IN','false');setSession(null);window.history.replaceState({},'', '/login');});
afterEach(()=>{cleanup();vi.unstubAllEnvs();vi.restoreAllMocks();});
it('mounts real remote login on the public route',async()=>{render(<App/>);await waitFor(()=>expect(screen.getByRole('heading',{name:'Formulario remoto de credenciales'})).toBeInTheDocument());});
it('explains indeterminate recovery without blaming the password',()=>{
  vi.spyOn(authentication,'state').mockReturnValue('indeterminate');render(<App/>);
  expect(screen.getByRole('alert')).toHaveTextContent('No pudimos recuperar la sesión. Inicia sesión de nuevo.');
});
it('preserves an authorized return path when session notification precedes navigation',async()=>{
  window.history.replaceState({usr:{from:{pathname:'/products',search:'?page=2',hash:''}}},'', '/login');
  setSession({sub:'alice',role:'ADMIN',token:'test'});render(<App/>);
  await waitFor(()=>expect(window.location.pathname).toBe('/products'));
  expect(window.location.search).toBe('?page=2');
});
