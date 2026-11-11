import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { authentication } from '../core/http/api';
import { copy } from './copy';
import { NavIcon } from './NavIcon';
import { navSectionsFor } from './sidebarSections';
import { useNarrowViewport } from './useNarrowViewport';

function initialsOf(name: string): string {
  return (
    name
      .split(/[\s._@-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join('') || '?'
  );
}

const pad = (value: number) => String(value).padStart(2, '0');
const timeLabel = (date: Date) => date.toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' });

interface SidebarProps {
  role: string | undefined;
  user: string;
  expiresAt: number | undefined;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ role, user, expiresAt, open, onClose }: SidebarProps) {
  const narrow = useNarrowViewport();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const account = useRef<HTMLDivElement>(null);
  const firstItem = useRef<HTMLButtonElement>(null);
  const roleName = role ? (copy.roles[role] ?? role) : '';
  const expires = expiresAt === undefined ? null : new Date(expiresAt);

  useEffect(() => {
    if (menuOpen) firstItem.current?.focus();
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const away = (event: MouseEvent) => {
      if (!account.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener('click', away);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('click', away);
      document.removeEventListener('keydown', escape);
    };
  }, [menuOpen]);

  const classes = ['sidebar', collapsed && !narrow && 'sidebar--collapsed', open && 'sidebar--open'].filter(Boolean).join(' ');

  return (
    <aside id="sidebar" className={classes} {...(narrow && !open ? { inert: true } : {})}>
      <div className="sidebar__brand">
        <Link to="/dashboard" className="sidebar__logo-card" aria-label={copy.sidebar.homeLink}>
          <img className="sidebar__logo" src="/synkro-logo.png" alt={copy.sidebar.logoAlt} />
        </Link>
        <button
          type="button"
          className="sidebar__collapse"
          aria-controls="sidebar"
          aria-expanded={!collapsed}
          aria-label={collapsed ? copy.sidebar.expand : copy.sidebar.collapse}
          title={collapsed ? copy.sidebar.expand : copy.sidebar.collapse}
          onClick={() => setCollapsed((value) => !value)}
        >
          <NavIcon name="chevronLeft" />
        </button>
      </div>

      <nav aria-label={copy.navigation.label} className="sidebar__nav">
        {navSectionsFor(role).map((section) => (
          <div key={section.label} role="group" aria-label={section.label} className="nav-group">
            <p className="nav-group__label" aria-hidden="true">{section.label}</p>
            <ul>
              {section.items.map((item) => (
                <li key={item.path}>
                  <NavLink to={item.path} className="nav-link" title={item.label} onClick={onClose}>
                    <NavIcon name={item.path} />
                    <span className="nav-link__label">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="account" ref={account}>
        {menuOpen && (
          <div className="account-menu" role="menu" aria-label={copy.sidebar.accountLabel}>
            <div className="account-menu__header">
              <span className="avatar avatar--large" aria-hidden="true">{initialsOf(user)}</span>
              <span className="account-menu__details">
                <strong className="account-menu__name">{user}</strong>
                <span className="role-badge">{roleName}</span>
              </span>
            </div>
            {expires && (
              <div className="account-menu__session">
                <span>{copy.sidebar.sessionExpires}</span>
                <time dateTime={`${expires.getFullYear()}-${pad(expires.getMonth() + 1)}-${pad(expires.getDate())}T${pad(expires.getHours())}:${pad(expires.getMinutes())}`}>
                  {timeLabel(expires)}
                </time>
              </div>
            )}
            <button
              type="button"
              role="menuitem"
              className="account-menu__logout"
              ref={firstItem}
              onClick={() => void authentication.logout()}
            >
              <NavIcon name="logout" />
              {copy.sidebar.logout}
            </button>
          </div>
        )}
        <button
          type="button"
          ref={trigger}
          className="account__trigger"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={copy.sidebar.accountMenu(user)}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span className="avatar" aria-hidden="true">{initialsOf(user)}</span>
          <span className="account__identity">
            <span className="account__name">{user}</span>
            <span className="account__role">{roleName}</span>
          </span>
          <NavIcon name="chevronUp" />
        </button>
      </div>
    </aside>
  );
}
