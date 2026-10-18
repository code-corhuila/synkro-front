import type { PortalEntry } from './registry';

// Router paths for a portal: each prefix it owns, plus everything nested
// under it (the portal does its own routing below that point).
export function portalRoutePaths(portal: PortalEntry): string[] {
  return portal.routePrefixes.map((prefix) => `${prefix}/*`);
}
