import { getSession, setSession } from '../auth/session';
import { createApiClient } from './apiClient';

// The app's single HTTP client. A 401 only clears the session: RequireAuth
// subscribes to the session store, so any mounted protected page redirects
// to /login by itself.
export const api = createApiClient(
  import.meta.env.VITE_API_BASE_URL ?? '',
  () => getSession()?.token ?? null,
  () => setSession(null)
);
