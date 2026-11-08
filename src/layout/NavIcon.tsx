// Menu icons: 24x24 outline paths, drawn with the current text colour.
const PATHS: Record<string, string> = {
  '/dashboard': 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  '/customers': 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M22 19v-1a4 4 0 0 0-3-3.9M16 5.1a3 3 0 0 1 0 5.8',
  '/sales': 'M3 4h2l2.4 11h11.2L21 8H6.2M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2M18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2',
  '/stock': 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5',
  '/products': 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  '/stock-alerts': 'M18 16H6l1.5-2v-4a4.5 4.5 0 0 1 9 0v4zM10 19a2 2 0 0 0 4 0',
  '/users': 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21v-1a6 6 0 0 1 12 0v1M19 8v6M16 11h6',
  '/service-tokens': 'M14 4a6 6 0 1 1-5.2 9L3 18.8V21h3v-2h2v-2h2l.8-.8A6 6 0 0 1 14 4zM16 8h.01',
  chevronLeft: 'M15 6l-6 6 6 6',
  chevronUp: 'M6 15l6-6 6 6',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11',
  menu: 'M4 6h16M4 12h16M4 18h16',
};

export function NavIcon({ name, className = 'icon' }: { name: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={PATHS[name] ?? PATHS['/dashboard']} />
    </svg>
  );
}
