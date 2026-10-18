import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RemoteBoundary } from './RemoteBoundary';

describe('RemoteBoundary', () => {
  it('renders the loaded content when the load function succeeds', async () => {
    const load = vi.fn().mockResolvedValue('ok');
    render(
      <RemoteBoundary load={load} portalName="products">
        {() => <div>products content</div>}
      </RemoteBoundary>
    );
    await waitFor(() => expect(screen.getByText('products content')).toBeInTheDocument());
  });

  it('shows the unavailable notice when the load function rejects, without crashing the page', async () => {
    const load = vi.fn().mockRejectedValue(new Error('remote entry not found'));
    render(
      <div>
        <div>rest of the layout</div>
        <RemoteBoundary load={load} portalName="products">
          {() => <div>products content</div>}
        </RemoteBoundary>
      </div>
    );
    await waitFor(() =>
      expect(screen.getByText(/products.*not available/i)).toBeInTheDocument()
    );
    // the rest of the page must still be there — the point of the boundary
    expect(screen.getByText('rest of the layout')).toBeInTheDocument();
  });

  it('isolates a failure in one portal from another mounted at the same time', async () => {
    const failingLoad = vi.fn().mockRejectedValue(new Error('down'));
    const okLoad = vi.fn().mockResolvedValue('ok');
    render(
      <div>
        <RemoteBoundary load={failingLoad} portalName="products">
          {() => <div>products content</div>}
        </RemoteBoundary>
        <RemoteBoundary load={okLoad} portalName="sales">
          {() => <div>sales content</div>}
        </RemoteBoundary>
      </div>
    );
    await waitFor(() => expect(screen.getByText(/products.*not available/i)).toBeInTheDocument());
    expect(screen.getByText('sales content')).toBeInTheDocument();
  });

  it('shows the unavailable notice even when load rejects with a non-Error value', async () => {
    const load = vi.fn().mockRejectedValue(undefined);
    render(
      <RemoteBoundary load={load} portalName="products">
        {() => <div>products content</div>}
      </RemoteBoundary>
    );
    await waitFor(() => expect(screen.getByText(/products.*not available/i)).toBeInTheDocument());
  });
});
