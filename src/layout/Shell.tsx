import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { getSession, subscribeSession } from '../core/auth/session';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useNarrowViewport } from './useNarrowViewport';
import './Shell.css';

// The signed-in frame: sidebar navigation, a top bar and the portal outlet.
export function Shell() {
  // Subscribed for the same reason as RequireAuth: a session change while
  // mounted (sign-in, 401) must re-scope the navigation.
  const session = useSyncExternalStore(subscribeSession, getSession);
  // The drawer is open for the route it was opened on: any navigation closes it without an effect.
  const { pathname } = useLocation();
  const narrow = useNarrowViewport();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const drawerOpen = openOn === pathname;
  const opener = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const closeDrawer = () => setOpenOn(null);

  useEffect(() => {
    if (!drawerOpen) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      closeDrawer();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [drawerOpen]);

  // However the drawer closes (Escape, backdrop, picking a destination), focus must
  // return to the button that opened it. Runs after the content area's `inert` has
  // already cleared, since focusing into a still-inert subtree would be a no-op.
  useEffect(() => {
    if (wasOpen.current && !drawerOpen) opener.current?.querySelector<HTMLElement>('.topbar__menu')?.focus();
    wasOpen.current = drawerOpen;
  }, [drawerOpen]);

  return (
    <div className="app-shell">
      <Sidebar
        role={session?.role}
        user={session?.sub ?? ''}
        expiresAt={session?.expiresAt}
        open={drawerOpen}
        onClose={closeDrawer}
      />
      {drawerOpen && <div className="sidebar-backdrop" data-testid="sidebar-backdrop" onClick={closeDrawer} />}
      {/* The backdrop only blocks pointer input: inert keeps Tab from reaching the page it covers. */}
      <div className="content" {...(narrow && drawerOpen ? { inert: true } : {})}>
        <div ref={opener} className="topbar-host">
          <Topbar menuOpen={drawerOpen} onOpenMenu={() => setOpenOn(pathname)} />
        </div>
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
