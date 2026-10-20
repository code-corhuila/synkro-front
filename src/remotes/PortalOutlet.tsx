import { createElement, type ComponentType } from 'react';
import { RemoteBoundary } from '../core/errors/RemoteBoundary';
import type { PortalEntry } from './registry';
import { CustomersElement } from './CustomersElement';

// Mounts one registry entry inside its own RemoteBoundary, so a portal that
// fails to load only blanks its own area.
export function PortalOutlet({ portal }: { portal: PortalEntry }) {
  return (
    <RemoteBoundary key={portal.name} load={portal.load} portalName={portal.name}>
      {(loaded) =>
        portal.kind === 'custom-element'
          ? <CustomersElement tag={loaded as string} />
          : createElement((loaded as { default: ComponentType }).default)
      }
    </RemoteBoundary>
  );
}
