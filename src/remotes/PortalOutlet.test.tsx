import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { act, render as renderUI, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PortalOutlet } from './PortalOutlet';
import type { PortalEntry } from './registry';
import { MemoryRouter } from 'react-router-dom';

const UNAVAILABLE = 'Este módulo no está disponible en este momento.';
const render = (ui: React.ReactNode) => renderUI(ui, {wrapper: MemoryRouter});

describe('PortalOutlet', () => {
  it('CLI-UI-01 delivers v1 as a property with identity, basePath and navigation', async () => {
    const tag = 'synkro-contract-test';
    if (!customElements.get(tag)) customElements.define(tag, class extends HTMLElement {});
    const portal: PortalEntry = {name:'customers',kind:'custom-element',routePrefixes:['/customers'],load:async()=>tag};
    const {container} = render(<PortalOutlet portal={portal}/>);
    await waitFor(()=>expect(container.querySelector(tag)).not.toBeNull());
    const element = container.querySelector(tag) as HTMLElement & {shellContract?: {contractVersion:number;basePath:string;session:{user:()=>unknown};navigate:unknown}};
    expect(element.shellContract?.contractVersion).toBe(1);
    expect(element.shellContract?.basePath).toBe('/customers');
    expect(element.hasAttribute('shellContract')).toBe(false);
    expect(element.shellContract?.session.user()).toBeNull();
    expect(element.shellContract?.navigate).toBeTypeOf('function');
  });
  it('renders a module-federation portal through its default export', async () => {
    const portal: PortalEntry = {
      name: 'products',
      kind: 'module-federation',
      routePrefixes: ['/products'],
      load: async () => ({ default: () => <div>remote products app</div> }),
    };
    render(<PortalOutlet portal={portal} />);
    expect(await screen.findByText('remote products app')).toBeInTheDocument();
  });

  it('renders a custom-element portal as its tag', async () => {
    const portal: PortalEntry = {
      name: 'customers',
      kind: 'custom-element',
      routePrefixes: ['/customers'],
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
      routePrefixes: ['/sales'],
      load: () => Promise.reject(new Error('remoteEntry.js 404')),
    };
    render(<PortalOutlet portal={portal} />);
    expect(await screen.findByText(UNAVAILABLE)).toBeInTheDocument();
  });
  it('CLI-UI-14 recovers by explicit retry without reloading the Host',async()=>{
    const load=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({default:()=> <p>recuperado</p>});
    render(<PortalOutlet portal={{name:'customers',kind:'module-federation',routePrefixes:['/customers'],load}}/>);
    await screen.findByText(UNAVAILABLE); await userEvent.click(screen.getByRole('button',{name:'Reintentar módulo'}));
    expect(await screen.findByText('recuperado')).toBeInTheDocument(); expect(load).toHaveBeenCalledTimes(2);
  });

  describe('switching portals', () => {
    const failing = (name: string, load = vi.fn(() => Promise.reject(new Error(`${name} entry 404`)))): PortalEntry => ({
      name,
      kind: 'module-federation',
      routePrefixes: [`/${name}`],
      load,
    });
    const available = (name: string): PortalEntry => ({
      name,
      kind: 'module-federation',
      routePrefixes: [`/${name}`],
      load: async () => ({ default: () => <div>{`${name} app`}</div> }),
    });

    it('A: replaces the notice of a failed Sales with an available Products', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const { rerender } = render(<PortalOutlet portal={failing('sales')} />);
      expect(await screen.findByText(UNAVAILABLE)).toBeInTheDocument();

      rerender(<PortalOutlet portal={available('products')} />);

      expect(await screen.findByText('products app')).toBeInTheDocument();
      expect(screen.queryByText(UNAVAILABLE)).not.toBeInTheDocument();
    });

    it('B: replaces the notice of a failed Products with an available Sales', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const { rerender } = render(<PortalOutlet portal={failing('products')} />);
      expect(await screen.findByText(UNAVAILABLE)).toBeInTheDocument();

      rerender(<PortalOutlet portal={available('sales')} />);

      expect(await screen.findByText('sales app')).toBeInTheDocument();
      expect(screen.queryByText(UNAVAILABLE)).not.toBeInTheDocument();
    });

    it('C: runs the second loader and reports its own failure', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const productsLoad = vi.fn(() => Promise.reject(new Error('products entry 404')));
      const { rerender } = render(
        <div>
          <nav>host shell</nav>
          <PortalOutlet portal={failing('sales')} />
        </div>
      );
      expect(await screen.findByText(UNAVAILABLE)).toBeInTheDocument();

      rerender(
        <div>
          <nav>host shell</nav>
          <PortalOutlet portal={failing('products', productsLoad)} />
        </div>
      );

      await waitFor(() => expect(productsLoad).toHaveBeenCalledTimes(1));
      expect(await screen.findByText(UNAVAILABLE)).toBeInTheDocument();
      expect(screen.getByText('host shell')).toBeInTheDocument();
    });

    it('D: mounts the Angular custom element after a failed React remote', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const customers: PortalEntry = {
        name: 'customers',
        kind: 'custom-element',
        routePrefixes: ['/customers'],
        load: async () => 'synkro-customers-portal',
      };
      const { container, rerender } = render(<PortalOutlet portal={failing('sales')} />);
      expect(await screen.findByText(UNAVAILABLE)).toBeInTheDocument();

      rerender(<PortalOutlet portal={customers} />);

      await waitFor(() => expect(container.querySelector('synkro-customers-portal')).not.toBeNull());
      expect(screen.queryByText(UNAVAILABLE)).not.toBeInTheDocument();
    });

    it('E: keeps a mounted portal, and its state, while the same entry is rendered again', async () => {
      const user = userEvent.setup();
      const Counter = () => {
        const [count, setCount] = useState(0);
        return <button onClick={() => setCount(count + 1)}>{`count ${count}`}</button>;
      };
      const load = vi.fn(async () => ({ default: Counter }));
      const products: PortalEntry = { name: 'products', kind: 'module-federation', routePrefixes: ['/products'], load };
      const { rerender } = render(<PortalOutlet portal={products} />);
      await user.click(await screen.findByText('count 0'));

      rerender(<PortalOutlet portal={products} />);

      expect(screen.getByText('count 1')).toBeInTheDocument();
      expect(load).toHaveBeenCalledTimes(1);
    });

    it('F: ignores a late rejection or resolution from an abandoned loader', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      let rejectSales!: (error: Error) => void;
      let resolveCustomers!: (tag: string) => void;
      const sales = failing(
        'sales',
        vi.fn(() => new Promise<never>((_, reject) => (rejectSales = reject)))
      );
      const customers: PortalEntry = {
        name: 'customers',
        kind: 'custom-element',
        routePrefixes: ['/customers'],
        load: () => new Promise<string>((resolve) => (resolveCustomers = resolve)),
      };
      const { rerender, container } = render(<PortalOutlet portal={sales} />);
      expect(screen.getByText('Cargando módulo…')).toBeInTheDocument();

      rerender(<PortalOutlet portal={available('products')} />);
      expect(await screen.findByText('products app')).toBeInTheDocument();
      await act(async () => rejectSales(new Error('late failure')));

      expect(screen.getByText('products app')).toBeInTheDocument();
      expect(screen.queryByText(UNAVAILABLE)).not.toBeInTheDocument();

      rerender(<PortalOutlet portal={customers} />);
      rerender(<PortalOutlet portal={available('products')} />);
      await act(async () => resolveCustomers('synkro-customers-portal'));
      expect(screen.getByText('products app')).toBeInTheDocument();
      expect(container.querySelector('synkro-customers-portal')).toBeNull();
    });
  });
});
