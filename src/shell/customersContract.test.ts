import {describe,it,expect,vi,afterEach} from 'vitest';
import {customersContract} from './customersContract';
import {apiClient} from './apiClient';
import {setSession} from '../core/auth/session';
describe('ShellContract v1 adapter',()=>{
  afterEach(()=>{vi.restoreAllMocks();setSession(null);});
  it('preserves query, payload, idempotency and signal in the existing Host transport',async()=>{
    const request=vi.spyOn(apiClient,'request').mockResolvedValue({ok:true});
    const contract=customersContract(vi.fn()); const signal=new AbortController().signal;
    const options={query:{page:'2',active:'false'},body:{name:'Persona'},idempotencyKey:'stable-key',signal};
    await contract.api.request('POST','/api/v1/customers',options);
    expect(request).toHaveBeenCalledWith('/api/v1/customers',{...options,method:'POST'});
    await expect(contract.api.request('GET','https://foreign.test')).rejects.toThrow('relative');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('rebuilds identity without tokens and constrains navigation to local paths',()=>{
    setSession({token:'private-value',sub:'person',role:'ADMIN'});
    const navigate=vi.fn(); const contract=customersContract(navigate);
    expect(contract.session.user()).toEqual({sub:'person',role:'ADMIN'});
    contract.navigate('/customers/new'); contract.navigate('//foreign.test'); contract.navigate('/\\foreign');
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/customers/new');
    setSession({token:'private-value',sub:'person',role:'SERVICE'}); expect(contract.session.user()).toBeNull();
  });
});
