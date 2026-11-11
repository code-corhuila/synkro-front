// The visual theme preference: Light, Dark or System.
//
// Only the preference is stored, in its own key; session, tokens and every
// other key are untouched. The resolved theme ("light" | "dark") is written to
// <html data-theme> so the host's tokens and the portals' stylesheets read one
// attribute instead of each re-implementing prefers-color-scheme.
//
// public/theme-init.js repeats the read/resolve step, as a classic script, so
// the first paint already has the right theme. Keep the two in step.
import { useSyncExternalStore } from 'react';

export const THEME_STORAGE_KEY = 'synkro.theme-preference';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'];

const DARK_QUERY = '(prefers-color-scheme: dark)';

function isPreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);
}

export interface ThemeController {
  preference(): ThemePreference;
  resolved(): ResolvedTheme;
  set(next: ThemePreference): void;
  subscribe(listener: () => void): () => void;
  // Applies the theme and, on System, follows the device. Returns the cleanup.
  start(): () => void;
}

export function createThemeController(win: Window): ThemeController {
  let current: ThemePreference = 'system';
  let resolvedTheme: ResolvedTheme = 'light';
  let query: MediaQueryList | null = null;
  let watching = false;
  const listeners = new Set<() => void>();

  // Storage can throw on access (blocked cookies) or hold anything: neither may break the app.
  const read = (): ThemePreference => {
    try {
      const stored = win.localStorage.getItem(THEME_STORAGE_KEY);
      return isPreference(stored) ? stored : 'system';
    } catch {
      return 'system';
    }
  };
  const write = (value: ThemePreference) => {
    try {
      win.localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {
      // The choice still applies for this session.
    }
  };

  const deviceIsDark = () => {
    try {
      query ??= win.matchMedia(DARK_QUERY);
      return query.matches;
    } catch {
      return false;
    }
  };

  const onDeviceChange = () => apply();

  const unwatch = () => {
    if (watching && query) query.removeEventListener('change', onDeviceChange);
    watching = false;
  };
  const watch = () => {
    if (watching) return;
    deviceIsDark();
    if (query) {
      query.addEventListener('change', onDeviceChange);
      watching = true;
    }
  };

  function apply() {
    resolvedTheme = current === 'system' ? (deviceIsDark() ? 'dark' : 'light') : current;
    const root = win.document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.dataset.themePreference = current;
    if (current === 'system') watch();
    else unwatch();
    for (const listener of [...listeners]) listener();
  }

  return {
    preference: () => current,
    resolved: () => resolvedTheme,
    set(next) {
      if (!isPreference(next)) return;
      current = next;
      write(next);
      apply();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    start() {
      current = read();
      apply();
      return () => unwatch();
    },
  };
}

// The application's controller. Started in main.tsx, before the first render.
export const theme = createThemeController(window);

export function useThemePreference(controller: ThemeController = theme): ThemePreference {
  return useSyncExternalStore(controller.subscribe, controller.preference);
}
