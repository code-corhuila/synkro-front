import { createAuthentication } from '../auth/authentication';
import { getSession, sessionGeneration, setSession } from '../auth/session';
import { ApiClientError, createApiClient, type RequestOptions } from './apiClient';
// The app's single HTTP client. A 401 only clears the session: RequireAuth
// subscribes to the session store, so any mounted protected page redirects
// to /login by itself.
const transport = createApiClient(import.meta.env.VITE_API_BASE_URL ?? '', () => getSession()?.token ?? null, () => { });
export const authentication = createAuthentication(transport.authenticate);
const cancelled = () => new ApiClientError(0, { error: 'CANCELLED', message: 'Request cancelled', traceId: crypto.randomUUID() });
export const api = {
    async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
        const pathname = decodeURIComponent(new URL(path, 'https://host.invalid').pathname);
        if (/^\/api\/v1\/auth\/(login|refresh|logout)\/?$/.test(pathname)) {
            throw new ApiClientError(403, { error: 'FORBIDDEN', message: 'Use the Host authentication capability', traceId: crypto.randomUUID() });
        }
        const entered = sessionGeneration();
        try {
            await authentication.ensureReady(options.signal);
        }
        catch (error) {
            const code = (error as {
                code?: string;
            }).code;
            throw new ApiClientError(0, { error: code ?? 'SIGN_IN_REQUIRED', message: (error as Error).message, traceId: crypto.randomUUID() });
        }
        // A completed renewal replaces credentials within the same identity.
        if (entered !== sessionGeneration())
            throw cancelled();
        const generation = sessionGeneration();
        try {
            const result = await transport.request<T>(path, options);
            if (generation !== sessionGeneration() || options.signal?.aborted)
                throw cancelled();
            return result;
        }
        catch (error) {
            if (generation !== sessionGeneration())
                throw cancelled();
            if (error instanceof ApiClientError && error.status === 401)
                setSession(null);
            throw error;
        }
    },
};
