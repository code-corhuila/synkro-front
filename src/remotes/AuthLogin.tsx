import { createElement, useEffect, useState, useSyncExternalStore, type ComponentType } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { RemoteBoundary } from '../core/errors/RemoteBoundary';
import { installAuthenticationNavigation } from '../shell/authentication';
import { getSession, subscribeSession } from '../core/auth/session';
import { authenticationDestination } from '../core/auth/authentication';
import { __federation_method_setRemote } from 'virtual:__federation__';
import { createAuthLoader } from './authLoader';
import { authentication } from '../core/http/api';
const load = createAuthLoader(() => import('authPortal/Login'), __federation_method_setRemote, import.meta.env.VITE_AUTH_PORTAL_ENTRY || 'http://localhost:5174/assets/remoteEntry.js');
export function AuthLogin() {
    const navigate = useNavigate();
    const location = useLocation();
    const [attempt, setAttempt] = useState(0);
    useEffect(() => installAuthenticationNavigation(path => navigate(path, { replace: true })), [navigate]);
    const session = useSyncExternalStore(subscribeSession, getSession);
    const authState = useSyncExternalStore(authentication.subscribe, authentication.state);
    const from = location.state?.from;
    const returnTo = typeof from === 'string' ? from : from?.pathname ? `${from.pathname}${from.search || ''}${from.hash || ''}` : undefined;
    if (session)
        return <Navigate to={authenticationDestination(session.role, returnTo)} replace/>;
    return <main className="page">
    {authState === 'indeterminate' && <p role="alert">No pudimos recuperar la sesión. Inicia sesión de nuevo.</p>}
    <RemoteBoundary key={attempt} load={load} portalName="auth">
      {loaded => createElement((loaded as {
        default: ComponentType<{
            returnTo?: string;
        }>;
    }).default, { returnTo })}
    </RemoteBoundary>
    <button type="button" onClick={() => setAttempt(value => value + 1)}>Volver a cargar el acceso</button>
    <Link to="/dashboard">Ir al inicio</Link>
  </main>;
}
