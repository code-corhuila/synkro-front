import { useSyncExternalStore, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getSession, subscribeSession } from './session';

export function RequireAuth({ children }: { children: ReactNode }) {
  // Subscribed, not read once: a 401 elsewhere clears the session and this
  // guard must re-render and redirect the page that is already mounted.
  const session = useSyncExternalStore(subscribeSession, getSession);
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}
