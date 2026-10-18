import {it,expect,vi} from 'vitest';
import {createAuthLoader} from './authLoader';
it('an explicit retry resets the same federation runtime with a fresh entry URL',async()=>{
 const load=vi.fn().mockRejectedValueOnce(new Error('remote down')).mockResolvedValueOnce({default:()=>null});
 const reset=vi.fn();const retry=createAuthLoader(load,reset,'/remotes/auth/assets/remoteEntry.js');
 await expect(retry()).rejects.toThrow('remote down');await retry();
 expect(reset).toHaveBeenCalledWith('authPortal',expect.objectContaining({from:'vite',format:'esm',url:expect.any(Function)}));
 expect(await reset.mock.calls[0][1].url()).toMatch(/remoteEntry\.js\?recovery=1$/);
});
