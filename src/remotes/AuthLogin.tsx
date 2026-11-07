import { createElement, useEffect, useSyncExternalStore, type ComponentType } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { RemoteBoundary } from '../core/errors/RemoteBoundary';
import { installAuthenticationNavigation } from '../shell/authentication';
import { getSession, subscribeSession } from '../core/auth/session';
import { authenticationDestination } from '../core/auth/authentication';
import { __federation_method_setRemote } from 'virtual:__federation__';
import { createAuthLoader } from './authLoader';
import { authentication } from '../core/http/api';
import { copy } from '../layout/copy';
import { ButtonLink } from '../shared/ui/ButtonLink';
import { ThemeSelector } from '../shared/ui/ThemeSelector';

const defaultLoad = createAuthLoader(
  () => import('authPortal/Login'),
  __federation_method_setRemote,
  import.meta.env.VITE_AUTH_PORTAL_ENTRY || 'http://localhost:5174/assets/remoteEntry.js'
);

// A healthy login is only the Auth form. When its remote cannot be loaded the
// boundary shows one recovery panel in its place, with the retry and the way
// home inside it; nothing is rendered beside the form on the happy path.
export function AuthLogin({ load = defaultLoad }: { load?: () => Promise<unknown> }) {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => installAuthenticationNavigation((path) => navigate(path, { replace: true })), [navigate]);
  const session = useSyncExternalStore(subscribeSession, getSession);
  const authState = useSyncExternalStore(authentication.subscribe, authentication.state);
  const from = location.state?.from;
  const returnTo = typeof from === 'string' ? from : from?.pathname ? `${from.pathname}${from.search || ''}${from.hash || ''}` : undefined;
  if (session) return <Navigate to={authenticationDestination(session.role, returnTo)} replace />;

  return (
    <main className="page">
      <div className="theme-login-bar"><ThemeSelector /></div>
      {authState === 'indeterminate' && (
        <p role="alert" className="portal-notice portal-notice--access">{copy.access.indeterminate}</p>
      )}
      <RemoteBoundary
        load={load}
        portalName="auth"
        variant="access"
        unavailableMessage={copy.access.unavailable}
        retryLabel={copy.access.retry}
        // "Ir al inicio" is a client-side route change to /dashboard: the guards
        // decide what happens next, and no session is touched.
        actions={<ButtonLink to="/dashboard" variant="secondary">{copy.access.home}</ButtonLink>}
      >
        {(loaded) => createElement((loaded as { default: ComponentType<{ returnTo?: string }> }).default, { returnTo })}
      </RemoteBoundary>
    </main>
  );
}
