import { canAccess, defaultPathFor } from '../../layout/navigation';
import { getSession, sessionGeneration, setSession, subscribeSession } from './session';
export type AuthCode = 'INVALID_CREDENTIALS' | 'UNAVAILABLE' | 'RATE_LIMITED' | 'CANCELLED' | 'SIGN_IN_REQUIRED' | 'INDETERMINATE';
export class AuthenticationError extends Error {
    readonly code: AuthCode;
    readonly retryAt?: number;
    constructor(code: AuthCode, retryAt?: number) {
        const copy = { INVALID_CREDENTIALS: 'Correo o contraseña incorrectos', UNAVAILABLE: 'El servicio no está disponible. Inténtalo de nuevo.',
            RATE_LIMITED: 'Demasiados intentos. Espera antes de volver a intentar.', CANCELLED: 'Operación cancelada.',
            SIGN_IN_REQUIRED: 'Inicia sesión para continuar.', INDETERMINATE: 'No pudimos recuperar la sesión. Inicia sesión de nuevo.' };
        super(copy[code]);
        this.name = 'AuthenticationError';
        this.code = code;
        this.retryAt = retryAt;
    }
}
export interface LoginOptions {
    signal?: AbortSignal;
    returnTo?: string;
}
export interface LoginOutcome {
    user: {
        sub: string;
        role: string;
    };
    destination: string;
}
export type AuthOperation = 'login' | 'refresh' | 'logout';
export type AuthTransport = (operation: AuthOperation, body: unknown, signal?: AbortSignal, token?: string) => Promise<unknown>;
type State = 'anonymous' | 'authenticating' | 'recovering' | 'authenticated' | 'renewing' | 'indeterminate';
const REFRESH_KEY = 'synkro_refresh';
const SESSION_KEY = 'synkro_session';
function restoredDescriptor() {
    try {
        const value = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null');
        return value && typeof value.sub === 'string' && typeof value.id === 'string' &&
            /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(value.id)
            ? { sub: value.sub as string, id: value.id as string } : null;
    } catch { return null; }
}
function removeStored(key: string) {
    try { sessionStorage.removeItem(key); } catch { /* Storage cannot prevent local invalidation. */ }
}
// Structural checks support scheduling/presentation only. Services verify JWTs.
function validatePair(value: unknown) {
    const pair = value as {
        accessToken?: string;
        refreshToken?: string;
        tokenType?: string;
        expiresIn?: number;
    };
    if (!pair || typeof pair.accessToken !== 'string' || typeof pair.refreshToken !== 'string' || !pair.refreshToken.trim() ||
        pair.tokenType !== 'Bearer' || !Number.isInteger(pair.expiresIn) || pair.expiresIn! <= 60)
        throw new AuthenticationError('UNAVAILABLE');
    try {
        const parts = pair.accessToken.split('.');
        if (parts.length !== 3 || !parts[2])
            throw new Error();
        const decode = (s: string) => JSON.parse(atob(s.replace(/-/g, '+').replace(/_/g, '/')));
        const header = decode(parts[0]);
        const claims = decode(parts[1]);
        if (header.alg !== 'RS256' || typeof claims.sub !== 'string' || !claims.sub || !Array.isArray(claims.roles) ||
            claims.roles.length !== 1 || !['ADMIN', 'SALESPERSON', 'INVENTORY'].includes(claims.roles[0]) ||
            !Array.isArray(claims.permissions) || !claims.permissions.every((p: unknown) => typeof p === 'string') ||
            !Number.isFinite(claims.iat) || !Number.isFinite(claims.exp) || typeof claims.jti !== 'string' || !claims.jti ||
            claims.exp * 1000 - Date.now() <= 60000 || claims.exp <= claims.iat)
            throw new Error();
        return { token: pair.accessToken, refresh: pair.refreshToken, sub: claims.sub as string, role: claims.roles[0] as string, expiresAt: claims.exp * 1000 };
    }
    catch {
        throw new AuthenticationError('UNAVAILABLE');
    }
}
export function authenticationDestination(role: string, path?: string) {
    if (path && path.startsWith('/') && !path.startsWith('//') && !/[\\%\s]/.test(path) && ![...path].some(c => c.charCodeAt(0) < 32)) {
        const url = new URL(path, 'https://host.invalid');
        if (url.pathname === path.split(/[?#]/)[0] && canAccess(role, url.pathname))
            return path;
    }
    return defaultPathFor(role);
}
function waitFor<T>(promise: Promise<T>, signal?: AbortSignal, reason: () => AuthCode = () => 'CANCELLED'): Promise<T> {
    if (signal?.aborted)
        return Promise.reject(new AuthenticationError('CANCELLED'));
    const generation = sessionGeneration();
    return new Promise((resolve, reject) => {
        const cancel = () => reject(new AuthenticationError('CANCELLED'));
        const unsubscribe = subscribeSession(() => { if (generation !== sessionGeneration()) {
            reject(new AuthenticationError(reason()));
            cleanup();
        } });
        const cleanup = () => { unsubscribe(); signal?.removeEventListener('abort', cancel); };
        signal?.addEventListener('abort', cancel, { once: true });
        promise.then(resolve, reject).finally(cleanup);
    });
}
export function createAuthentication(transport: AuthTransport) {
    let status: State = 'anonymous';
    let refresh: string | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight: Promise<void> | undefined;
    let committing = false;
    let retryAt = 0;
    let termination: AuthCode = 'CANCELLED';
    let descriptor: ReturnType<typeof restoredDescriptor> = null;
    const listeners = new Set<() => void>();
    const outcomes = new WeakMap<LoginOutcome, number>();
    const update = (next: State) => { status = next; for (const fn of [...listeners]) {
        if (listeners.has(fn)) { try { fn(); } catch { /* Isolate consumers. */ } }
    } };
    const removeRefresh = () => { refresh = null; descriptor = null; removeStored(REFRESH_KEY); removeStored(SESSION_KEY); };
    const clear = (reason: AuthCode = 'CANCELLED') => { termination = reason; clearTimeout(timer); inFlight = undefined; removeRefresh(); setSession(null); };
    const unsubscribe = subscribeSession(() => {
        clearTimeout(timer);
        if (!committing) {
            inFlight = undefined;
            removeRefresh();
            update(getSession() ? 'authenticated' : 'anonymous');
        }
    });
    function commit(pair: ReturnType<typeof validatePair>, replace = true) {
        const id = (!replace && (getSession()?.sessionId ??
            (descriptor?.sub === pair.sub ? descriptor.id : null))) || crypto.randomUUID();
        try {
            sessionStorage.setItem(REFRESH_KEY, pair.refresh);
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id, sub: pair.sub }));
        } catch {
            removeRefresh();
            throw new AuthenticationError('UNAVAILABLE');
        }
        refresh = pair.refresh;
        descriptor = { id, sub: pair.sub };
        const expected = sessionGeneration() + (replace ? 1 : 0);
        committing = true;
        try {
            setSession({ token: pair.token, sub: pair.sub, role: pair.role, expiresAt: pair.expiresAt, sessionId: id }, replace);
        }
        finally {
            committing = false;
        }
        assertCurrent(expected);
        update('authenticated');
        assertCurrent(expected);
        timer = setTimeout(check, Math.min(2147483647, Math.max(0, pair.expiresAt - Date.now() - 60000)));
    }
    function check() { if (getSession() || refresh)
        void ensureReady().catch(() => { }); }
    function assertCurrent(generation: number, signal?: AbortSignal) {
        if (generation !== sessionGeneration() || signal?.aborted)
            throw new AuthenticationError('CANCELLED');
    }
    async function login(credentials: {
        email: string;
        password: string;
    }, options: LoginOptions = {}): Promise<LoginOutcome> {
        if (options.signal?.aborted)
            throw new AuthenticationError('CANCELLED');
        if (Date.now() < retryAt)
            throw new AuthenticationError('RATE_LIMITED', retryAt);
        clear();
        const generation = sessionGeneration();
        update('authenticating');
        try {
            const result = await transport('login', credentials, options.signal);
            assertCurrent(generation, options.signal);
            const pair = validatePair(result);
            commit(pair);
            const outcome = { user: { sub: pair.sub, role: pair.role }, destination: authenticationDestination(pair.role, options.returnTo) };
            outcomes.set(outcome, sessionGeneration());
            return outcome;
        }
        catch (error) {
            assertCurrent(generation, options.signal);
            update('anonymous');
            if (error instanceof AuthenticationError)
                throw error;
            const failure = error as {
                status?: number;
                retryAt?: number;
                body?: {
                    error?: string;
                };
            };
            if (failure.status === 429) {
                retryAt = failure.retryAt ?? 0;
                throw new AuthenticationError('RATE_LIMITED', retryAt);
            }
            throw new AuthenticationError(failure.body?.error === 'CANCELLED' ? 'CANCELLED' : failure.status === 401 ? 'INVALID_CREDENTIALS' : 'UNAVAILABLE');
        }
    }
    async function renew() {
        const credential = refresh;
        const generation = sessionGeneration();
        const subject = getSession()?.sub;
        if (!credential)
            throw new AuthenticationError('SIGN_IN_REQUIRED');
        update(subject ? 'renewing' : 'recovering');
        // Remove BEFORE transmission: a reload during rotation cannot replay it.
        try {
            // Do not transmit a rotating credential when it cannot be consumed
            // from persistent storage. Its descriptor is equally unavailable
            // for a reload until this rotation completes successfully.
            sessionStorage.removeItem(REFRESH_KEY);
            sessionStorage.removeItem(SESSION_KEY);
            const value = await transport('refresh', { refreshToken: credential }, undefined);
            assertCurrent(generation);
            const pair = validatePair(value);
            if (pair.refresh === credential || (subject && pair.sub !== subject))
                throw new AuthenticationError('INDETERMINATE');
            commit(pair, false);
        }
        catch (error) {
            assertCurrent(generation);
            const rejected = (error as {
                status?: number;
            }).status === 401;
            clear(rejected ? 'SIGN_IN_REQUIRED' : 'INDETERMINATE');
            update(rejected ? 'anonymous' : 'indeterminate');
            throw new AuthenticationError(rejected ? 'SIGN_IN_REQUIRED' : 'INDETERMINATE');
        }
    }
    function ensureReady(signal?: AbortSignal): Promise<void> {
        if (signal?.aborted)
            return Promise.reject(new AuthenticationError('CANCELLED'));
        if (inFlight)
            return waitFor(inFlight, signal, () => termination);
        const session = getSession();
        if (session && (session.expiresAt === undefined || session.expiresAt - Date.now() > 60000))
            return Promise.resolve();
        if (!refresh) {
            clear();
            update('anonymous');
            return Promise.reject(new AuthenticationError('SIGN_IN_REQUIRED'));
        }
        const pending = renew();
        inFlight = pending;
        void pending.finally(() => { if (inFlight === pending)
            inFlight = undefined; }).catch(() => { });
        return waitFor(pending, signal, () => termination);
    }
    async function recover() {
        if (getSession() || inFlight)
            return inFlight;
        try {
            refresh = sessionStorage.getItem(REFRESH_KEY);
            descriptor = restoredDescriptor();
        }
        catch {
            clear();
            return;
        }
        if (refresh) {
            try {
                await ensureReady();
            }
            catch { /* UI shows fresh sign-in. */ }
        } else {
            removeStored(SESSION_KEY);
        }
    }
    async function logout() {
        const credential = refresh;
        const token = getSession()?.token;
        clear();
        update('anonymous');
        if (credential) {
            try {
                await transport('logout', { refreshToken: credential }, undefined, token);
            }
            catch { /* Local logout always succeeds. */ }
        }
    }
    const visible = () => { if (document.visibilityState === 'visible')
        check(); };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', visible);
    return { login, logout, ensureReady, recover, isCurrentOutcome: (outcome: LoginOutcome) => outcomes.get(outcome) === sessionGeneration(), state: () => status, subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
        dispose: () => { clearTimeout(timer); unsubscribe(); window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', visible); } };
}
