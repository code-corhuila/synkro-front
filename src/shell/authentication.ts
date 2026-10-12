import { authentication as host } from '../core/http/api';
import type { LoginOptions } from '../core/auth/authentication';
import { AuthenticationError } from '../core/auth/authentication';
// Token-free, additive federation contract. Navigation stays inside the Host.
let navigate: (path: string) => void = path => { window.location.assign(path); };
export function installAuthenticationNavigation(callback: (path: string) => void) {
    navigate = callback;
    return () => { if (navigate === callback)
        navigate = path => { window.location.assign(path); }; };
}
export const authentication = {
    async login(credentials: {
        email: string;
        password: string;
    }, options: LoginOptions = {}) {
        const result = await host.login(credentials, options);
        if (options.signal?.aborted || !host.isCurrentOutcome(result))
            throw new AuthenticationError('CANCELLED');
        navigate(result.destination);
        return result;
    },
    logout: () => host.logout(),
    state: host.state,
    subscribe: host.subscribe,
};
