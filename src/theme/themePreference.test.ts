import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY, createThemeController } from './themePreference';

type Listener = (event: { matches: boolean }) => void;

// A controllable prefers-color-scheme: dark query that counts its listeners.
function fakeMedia(dark: boolean) {
  const listeners = new Set<Listener>();
  const query = {
    matches: dark,
    addEventListener: vi.fn((_type: string, listener: Listener) => listeners.add(listener)),
    removeEventListener: vi.fn((_type: string, listener: Listener) => listeners.delete(listener)),
  };
  return {
    query,
    listeners,
    setDark(next: boolean) {
      query.matches = next;
      for (const listener of [...listeners]) listener({ matches: next });
    },
  };
}

function windowWith(media: ReturnType<typeof fakeMedia>, storage: unknown) {
  return {
    document,
    matchMedia: () => media.query,
    get localStorage(): Storage {
      if (!storage) throw new DOMException('blocked', 'SecurityError');
      return storage as Storage;
    },
  } as unknown as Window;
}

function setup(options: { dark?: boolean; stored?: string; blocked?: boolean } = {}) {
  const media = fakeMedia(options.dark ?? false);
  const store = new Map<string, string>();
  if (options.stored !== undefined) store.set(THEME_STORAGE_KEY, options.stored);
  const storage = options.blocked
    ? null
    : { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value) };
  const controller = createThemeController(windowWith(media, storage));
  return { controller, media, store, root: document.documentElement };
}

describe('theme preference', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-theme-preference');
  });
  afterEach(() => vi.restoreAllMocks());

  it('uses System when nothing is stored, and follows the device', () => {
    const { controller, root } = setup({ dark: true });
    controller.start();

    expect(controller.preference()).toBe('system');
    expect(root.dataset.theme).toBe('dark');
    expect(root.dataset.themePreference).toBe('system');
  });

  it.each(['light', 'dark', 'system'] as const)('restores a stored %s preference', (stored) => {
    const { controller, root } = setup({ stored, dark: stored === 'light' });
    controller.start();

    expect(controller.preference()).toBe(stored);
    expect(root.dataset.theme).toBe(stored === 'system' ? 'light' : stored);
  });

  it('stores only the visual preference, under its own key', () => {
    const { controller, store } = setup();
    controller.start();
    controller.set('dark');

    expect([...store.entries()]).toEqual([[THEME_STORAGE_KEY, 'dark']]);
  });

  it('applies an explicit choice against the device theme, in both directions', () => {
    const { controller, root } = setup({ dark: true });
    controller.start();
    controller.set('light');
    expect(root.dataset.theme).toBe('light');

    const other = setup({ dark: false });
    other.controller.start();
    other.controller.set('dark');
    expect(other.root.dataset.theme).toBe('dark');
  });

  it.each(['', 'DARK', 'blue', 'null', '{"theme":"dark"}'])('treats the invalid stored value %j as System', (stored) => {
    const { controller, root } = setup({ stored, dark: true });
    controller.start();

    expect(controller.preference()).toBe('system');
    expect(root.dataset.theme).toBe('dark');
  });

  it('reacts to device changes while on System, without a reload', () => {
    const { controller, media, root } = setup({ dark: false });
    controller.start();
    media.setDark(true);
    expect(root.dataset.theme).toBe('dark');
    media.setDark(false);
    expect(root.dataset.theme).toBe('light');
  });

  it('ignores device changes under an explicit choice', () => {
    const { controller, media, root } = setup({ stored: 'light', dark: false });
    controller.start();
    media.setDark(true);

    expect(root.dataset.theme).toBe('light');
    expect(media.listeners.size).toBe(0);
  });

  it('keeps working when storage is blocked, and changes theme for the session', () => {
    const { controller, root } = setup({ blocked: true, dark: false });
    expect(() => controller.start()).not.toThrow();
    expect(controller.preference()).toBe('system');

    expect(() => controller.set('dark')).not.toThrow();
    expect(controller.preference()).toBe('dark');
    expect(root.dataset.theme).toBe('dark');
  });

  it('keeps the choice for the session when writing fails', () => {
    const media = fakeMedia(false);
    const failing = createThemeController(
      windowWith(media, {
        getItem: () => null,
        setItem: () => {
          throw new DOMException('quota', 'QuotaExceededError');
        },
      })
    );
    failing.start();

    expect(() => failing.set('dark')).not.toThrow();
    expect(failing.preference()).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('notifies subscribers on change and stops after unsubscribe', () => {
    const { controller } = setup();
    controller.start();
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);
    controller.set('dark');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    controller.set('light');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('removes the device listener when leaving System and when stopped', () => {
    const { controller, media } = setup();
    const stop = controller.start();
    expect(media.listeners.size).toBe(1);
    controller.set('dark');
    expect(media.listeners.size).toBe(0);
    controller.set('system');
    expect(media.listeners.size).toBe(1);
    stop();
    expect(media.listeners.size).toBe(0);
    expect(media.query.addEventListener).toHaveBeenCalledTimes(2);
    expect(media.query.removeEventListener).toHaveBeenCalledTimes(2);
  });

  it('never registers two device listeners when started twice', () => {
    const { controller, media } = setup();
    controller.start();
    controller.start();
    expect(media.listeners.size).toBe(1);
  });
});
