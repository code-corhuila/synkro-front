import { useSyncExternalStore } from 'react';

const NARROW = '(max-width: 767px)';

// The viewport where the sidebar becomes a drawer. matchMedia may be absent (tests).
function subscribe(listener: () => void) {
  if (typeof window.matchMedia !== 'function') return () => undefined;
  const query = window.matchMedia(NARROW);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

const isNarrow = () => typeof window.matchMedia === 'function' && window.matchMedia(NARROW).matches;

export function useNarrowViewport(): boolean {
  return useSyncExternalStore(subscribe, isNarrow, () => false);
}
