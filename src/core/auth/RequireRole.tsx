import { useSyncExternalStore, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { canAccess, defaultPathFor } from '../../layout/navigation';
import { getSession, subscribeSession } from './session';

// Sits above a portal, so a route the role may not open never mounts the
// portal and its code is never requested. Denied means redirected to the
// role's default module: the design system has no separate 403 screen.
export function RequireRole({ children }: { children: ReactNode }) {
  // Subscribed for the same reason as RequireAuth: a session change while
  // mounted must re-evaluate the route.
  const session = useSyncExternalStore(subscribeSession, getSession);
  const { pathname } = useLocation();

  if (!canAccess(session?.role, pathname)) {
    return <Navigate to={defaultPathFor(session?.role)} replace />;
  }
  return <>{children}</>;
}
