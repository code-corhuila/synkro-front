import { createElement, type ComponentType } from 'react';
import { RemoteBoundary } from '../core/errors/RemoteBoundary';
import type { PortalEntry } from './registry';

// Mounts one registry entry inside its own RemoteBoundary, so a portal that
// fails to load only blanks its own area.
export function PortalOutlet({ portal }: { portal: PortalEntry }) {
  return (
    <RemoteBoundary load={portal.load} portalName={portal.name}>
      {(loaded) =>
        portal.kind === 'custom-element'
          ? createElement(loaded as string)
          : createElement((loaded as { default: ComponentType }).default)
      }
    </RemoteBoundary>
  );
}

// Router paths for a portal: each prefix it owns, plus everything nested
// under it (the portal does its own routing below that point).
export function portalRoutePaths(portal: PortalEntry): string[] {
  return portal.routePrefixes.map((prefix) => `${prefix}/*`);
}
