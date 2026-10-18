import { useSyncExternalStore } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { getSession, subscribeSession } from '../core/auth/session';
import { navItemsFor } from './navigation';

export function Shell() {
  // Subscribed for the same reason as RequireAuth: a session change while
  // mounted (sign-in, 401) must re-scope the navigation.
  const session = useSyncExternalStore(subscribeSession, getSession);

  return (
    <>
      <header>
        <strong>Synkro</strong>
        {session && <span> {session.sub} ({session.role})</span>}
        <nav aria-label="Main">
          <ul>
            {navItemsFor(session?.role).map((item) => (
              <li key={item.path}>
                <NavLink to={item.path}>{item.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
