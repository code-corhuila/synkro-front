import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PortalOutlet } from './PortalOutlet';
import type { PortalEntry } from './registry';

describe('PortalOutlet', () => {
  it('renders a module-federation portal through its default export', async () => {
    const portal: PortalEntry = {
      name: 'products',
      kind: 'module-federation',
      routePrefix: '/products',
      load: async () => ({ default: () => <div>remote products app</div> }),
    };
    render(<PortalOutlet portal={portal} />);
    expect(await screen.findByText('remote products app')).toBeInTheDocument();
  });

  it('renders a custom-element portal as its tag', async () => {
    const portal: PortalEntry = {
      name: 'customers',
      kind: 'custom-element',
      routePrefix: '/customers',
      load: async () => 'synkro-customers-portal',
    };
    const { container } = render(<PortalOutlet portal={portal} />);
    await waitFor(() =>
      expect(container.querySelector('synkro-customers-portal')).not.toBeNull()
    );
  });

  it('shows the unavailable notice when the portal fails to load', async () => {
    const portal: PortalEntry = {
      name: 'sales',
      kind: 'module-federation',
      routePrefix: '/sales',
      load: () => Promise.reject(new Error('remoteEntry.js 404')),
    };
    render(<PortalOutlet portal={portal} />);
    expect(await screen.findByText(/sales.*not available/i)).toBeInTheDocument();
  });
});
