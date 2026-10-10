import { useSyncExternalStore } from 'react';
import { Navigate } from 'react-router-dom';
import { getSession, subscribeSession } from '../core/auth/session';
import { defaultPathFor } from './navigation';

// /login when no sign-in exists in this environment (development sign-in off,
// no auth portal yet). It is its own route, so a visitor sent here by
// RequireAuth stops here instead of being redirected again. A signed-in user
// has no business on it and goes to their default module.
export function LoginUnavailable() {
  const session = useSyncExternalStore(subscribeSession, getSession);

  if (session) {
    return <Navigate to={defaultPathFor(session.role)} replace />;
  }
  return (
    <main className="page">
      <h1 className="heading heading--page">Sign in</h1>
      <p>Sign-in is not available in this environment.</p>
    </main>
  );
}
