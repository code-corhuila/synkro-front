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
      expect(screen.getByText('Este módulo no está disponible en este momento.')).toBeInTheDocument()
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
    await waitFor(() => expect(screen.getByText('Este módulo no está disponible en este momento.')).toBeInTheDocument());
    expect(screen.getByText('sales content')).toBeInTheDocument();
  });

  it('shows the unavailable notice even when load rejects with a non-Error value', async () => {
    const load = vi.fn().mockRejectedValue(undefined);
    render(
      <RemoteBoundary load={load} portalName="products">
        {() => <div>products content</div>}
      </RemoteBoundary>
    );
    await waitFor(() => expect(screen.getByText('Este módulo no está disponible en este momento.')).toBeInTheDocument());
  });

  it('does not put the portal name in the notice a person reads', async () => {
    const load = vi.fn().mockRejectedValue(new Error('down'));
    render(
      <RemoteBoundary load={load} portalName="products">
        {() => <div>products content</div>}
      </RemoteBoundary>
    );

    expect(await screen.findByRole('status')).not.toHaveTextContent(/products/i);
  });

  describe('while the portal loads', () => {
    it('shows an accessible loading message, then the portal', async () => {
      let finish: (value: unknown) => void = () => {};
      const load = vi.fn(() => new Promise<unknown>((resolve) => (finish = resolve)));
      render(
        <RemoteBoundary load={load} portalName="products">
          {() => <div>products content</div>}
        </RemoteBoundary>
      );

      expect(screen.getByRole('status')).toHaveTextContent('Cargando módulo…');
      expect(screen.queryByText('products content')).not.toBeInTheDocument();

      finish('ok');

      expect(await screen.findByText('products content')).toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('gives way to the unavailable notice, not to a second message, when the load fails', async () => {
      const load = vi.fn().mockRejectedValue(new Error('down'));
      render(
        <RemoteBoundary load={load} portalName="products">
          {() => <div>products content</div>}
        </RemoteBoundary>
      );

      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent('Este módulo no está disponible en este momento.')
      );
      expect(screen.getAllByRole('status')).toHaveLength(1);
    });
  });
});
