import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ThemeSelector } from '../shared/ui/ThemeSelector';
import { copy } from './copy';
import { NavIcon } from './NavIcon';
import { navItems } from './navigation';

const dateFormat = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// The section the address belongs to, by path segment ("/stock" owns "/stock/42", not "/stock-alerts").
function sectionLabel(pathname: string): string | undefined {
  const segments = pathname.toLowerCase().split('/').filter(Boolean);
  return navItems.find((item) => item.path.split('/').filter(Boolean).every((segment, index) => segment === segments[index]))?.label;
}

const capitalized = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// Not a heading: every screen owns its single h1.
export function Topbar({ menuOpen, onOpenMenu }: { menuOpen: boolean; onOpenMenu: () => void }) {
  const { pathname } = useLocation();
  const [today] = useState(() => new Date());
  const section = sectionLabel(pathname);
  const atRoot = !section || pathname.toLowerCase().startsWith('/dashboard');

  return (
    <header className="topbar">
      <div className="topbar__lead">
        <button
          type="button"
          className="topbar__menu"
          aria-controls="sidebar"
          aria-expanded={menuOpen}
          aria-label={copy.sidebar.open}
          onClick={onOpenMenu}
        >
          <NavIcon name="menu" />
        </button>
        <span className="topbar__breadcrumb">
          {atRoot ? copy.sidebar.breadcrumbRoot : <>{copy.sidebar.breadcrumbRoot} / <strong>{section}</strong></>}
        </span>
      </div>
      <div className="topbar__tools">
        <ThemeSelector />
        <span className="topbar__date">{capitalized(dateFormat.format(today))}</span>
      </div>
    </header>
  );
}
