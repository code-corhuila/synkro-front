import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../app/App';
import { Dashboard } from './Dashboard';
import { setSession } from '../core/auth/session';

const Summary = () => <section aria-label="Resumen simulado">datos del portal de Ventas</section>;
const loaded = () => vi.fn(async () => ({ default: Summary }));
const renderDashboard = (load = loaded()) => {
  render(<MemoryRouter><Dashboard loadSalesSummary={load} /></MemoryRouter>);
  return load;
};
const hrefs = () => within(screen.getByRole('navigation', { name: 'Accesos del panel' })).getAllByRole('link').map((link) => link.getAttribute('href'));

describe('dashboard copy', () => {
  beforeEach(() => setSession({ token: 't', sub: 'alice', role: 'ADMIN' }));
  afterEach(cleanup);

  it('is in Spanish', () => {
    window.history.pushState({}, '', '/dashboard');
    render(<App />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Panel');
    expect(screen.getByText('Sesión iniciada como alice.')).toBeInTheDocument();
  });
});

describe('dashboard', () => {
  afterEach(cleanup);

  it('gives ADMIN useful links and the Sales summary', async () => {
    setSession({ token: 't', sub: 'alice', role: 'ADMIN' });
    renderDashboard();

    expect(hrefs()).toEqual([
      '/customers', '/products', '/stock-alerts', '/sales', '/sales/reports/daily', '/sales/reports/monthly', '/sales/reports/top-products',
    ]);
    expect(await screen.findByLabelText('Resumen simulado')).toBeInTheDocument();
  });

  it('gives SALESPERSON their links and the summary', async () => {
    setSession({ token: 't', sub: 'vera', role: 'SALESPERSON' });
    renderDashboard();

    expect(hrefs()).toEqual(['/customers', '/stock', '/sales', '/sales/reports/daily', '/sales/reports/monthly', '/sales/reports/top-products']);
    expect(await screen.findByLabelText('Resumen simulado')).toBeInTheDocument();
  });

  it('keeps INVENTORY out of sales: no links and the Sales module is never requested', () => {
    setSession({ token: 't', sub: 'ivan', role: 'INVENTORY' });
    const load = renderDashboard();

    expect(hrefs()).toEqual(['/products', '/stock-alerts']);
    expect(screen.queryByRole('heading', { name: 'Resumen de ventas' })).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });

  it('keeps the links when the Sales module fails and recovers it with a styled retry', async () => {
    const user = userEvent.setup();
    setSession({ token: 't', sub: 'alice', role: 'ADMIN' });
    const load = vi.fn().mockRejectedValueOnce(new Error('sales remote down')).mockResolvedValue({ default: Summary });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderDashboard(load);

    expect(await screen.findByText('El resumen de ventas no está disponible en este momento.')).toBeInTheDocument();
    expect(hrefs()).toHaveLength(7);
    const retry = screen.getByRole('button', { name: 'Reintentar módulo' });
    expect(retry).toHaveClass('button', 'button--primary');
    await user.click(retry);

    expect(await screen.findByLabelText('Resumen simulado')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('shows no invented metric: only the session line and the links', () => {
    setSession({ token: 't', sub: 'ivan', role: 'INVENTORY' });
    renderDashboard();

    expect(document.body.textContent ?? '').not.toMatch(/\$|COP|beneficio|ganancia|usuarios activos|total de/i);
  });

  it('names the signed-in user', () => {
    setSession({ token: 't', sub: 'vera', role: 'SALESPERSON' });
    renderDashboard();

    expect(screen.getByText('Sesión iniciada como vera.')).toBeInTheDocument();
  });
});
