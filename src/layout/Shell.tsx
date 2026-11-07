import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { getSession, subscribeSession } from '../core/auth/session';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import './Shell.css';

// The signed-in frame: sidebar navigation, a top bar and the portal outlet.
export function Shell() {
  // Subscribed for the same reason as RequireAuth: a session change while
  // mounted (sign-in, 401) must re-scope the navigation.
  const session = useSyncExternalStore(subscribeSession, getSession);
  // The drawer is open for the route it was opened on: any navigation closes it without an effect.
  const { pathname } = useLocation();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const drawerOpen = openOn === pathname;
  const setDrawerOpen = (open: boolean) => setOpenOn(open ? pathname : null);
  const opener = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpenOn(null);
      opener.current?.querySelector<HTMLElement>('.topbar__menu')?.focus();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [drawerOpen]);

  return (
    <div className="app-shell">
      <Sidebar
        role={session?.role}
        user={session?.sub ?? ''}
        expiresAt={session?.expiresAt}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
      {drawerOpen && <div className="sidebar-backdrop" data-testid="sidebar-backdrop" onClick={() => setDrawerOpen(false)} />}
      <div className="content">
        <div ref={opener} className="topbar-host">
          <Topbar menuOpen={drawerOpen} onOpenMenu={() => setDrawerOpen(true)} />
        </div>
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
