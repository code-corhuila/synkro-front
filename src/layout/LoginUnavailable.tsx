import { useSyncExternalStore } from 'react';
import { Navigate } from 'react-router-dom';
import { getSession, subscribeSession } from '../core/auth/session';
import { copy } from './copy';
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
      <h1 className="heading heading--page">{copy.signIn.title}</h1>
      <p>{copy.signIn.unavailable}</p>
    </main>
  );
}
