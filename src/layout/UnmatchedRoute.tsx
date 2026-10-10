import { useSyncExternalStore } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getSession, subscribeSession } from '../core/auth/session';
import { defaultPathFor } from './navigation';

// navigation-map.md, "Navigation rules": an unmatched route redirects to the
// user's default module rather than a 404 page; without a session, to /login.
export function UnmatchedRoute() {
  const session = useSyncExternalStore(subscribeSession, getSession);
  const { pathname } = useLocation();

  if (session) {
    return <Navigate to={defaultPathFor(session.role)} replace />;
  }
  if (pathname === '/login') {
    // /login itself is unmatched when no sign-in route is registered (dev
    // sign-in off, no auth portal yet); redirecting again would loop.
    return (
      <main className="page">
        <h1>Sign in</h1>
        <p>Sign-in is not available in this environment.</p>
      </main>
    );
  }
  return <Navigate to="/login" replace />;
}
