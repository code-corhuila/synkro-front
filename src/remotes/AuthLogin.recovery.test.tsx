import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthLogin } from './AuthLogin';
import { RequireAuth } from '../core/auth/RequireAuth';
import { getSession, setSession } from '../core/auth/session';
import { authentication } from '../core/http/api';

const Form = () => <h1>Formulario remoto de credenciales</h1>;
const form = () => screen.queryAllByRole('heading', { name: 'Formulario remoto de credenciales' });

function Where() {
  return <span data-testid="ubicación">{useLocation().pathname}</span>;
}

function renderLogin(load: () => Promise<unknown>) {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Where />
      <Routes>
        <Route path="/login" element={<AuthLogin load={load} />} />
        <Route path="/dashboard" element={<RequireAuth><h1>Panel protegido</h1></RequireAuth>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  setSession(null);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('healthy login', () => {
  it('shows only the form: no recovery controls under a working login', async () => {
    renderLogin(async () => ({ default: Form }));

    expect(await screen.findByRole('heading', { name: 'Formulario remoto de credenciales' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByText('Volver a cargar el acceso')).toBeNull();
    expect(screen.queryByText('Ir al inicio')).toBeNull();
  });

  it('shows no recovery controls while the remote is still loading', () => {
    renderLogin(() => new Promise(() => {}));

    expect(screen.getByRole('status')).toHaveTextContent('Cargando módulo…');
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('remote outage', () => {
  it('puts the retry and the home link inside one recovery panel, with the shared button styles', async () => {
    renderLogin(() => Promise.reject(new Error('auth remote down')));
    const panel = (await screen.findByText('No pudimos cargar el acceso.')).closest('.portal-notice') as HTMLElement;

    expect(panel).not.toBeNull();
    const retry = within(panel).getByRole('button', { name: 'Reintentar acceso' });
    const home = within(panel).getByRole('link', { name: 'Ir al inicio' });
    expect(retry).toHaveClass('button', 'button--primary');
    expect(home).toHaveClass('button', 'button--secondary');
    expect(retry.parentElement).toBe(home.parentElement);
    expect(retry.parentElement).toHaveClass('portal-notice__actions');
    // Nothing is left outside the panel.
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('recovers exactly one working form with a single retry', async () => {
    const user = userEvent.setup();
    const load = vi.fn().mockRejectedValueOnce(new Error('auth remote down')).mockResolvedValue({ default: Form });
    renderLogin(load);
    await user.click(await screen.findByRole('button', { name: 'Reintentar acceso' }));

    expect(await screen.findByRole('heading', { name: 'Formulario remoto de credenciales' })).toBeInTheDocument();
    expect(form()).toHaveLength(1);
    expect(load).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('No pudimos cargar el acceso.')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('keeps the retry available when the first retry fails too', async () => {
    const user = userEvent.setup();
    const load = vi.fn().mockRejectedValueOnce(new Error('down')).mockRejectedValueOnce(new Error('still down')).mockResolvedValue({ default: Form });
    renderLogin(load);
    await user.click(await screen.findByRole('button', { name: 'Reintentar acceso' }));
    await user.click(await screen.findByRole('button', { name: 'Reintentar acceso' }));

    expect(await screen.findByRole('heading', { name: 'Formulario remoto de credenciales' })).toBeInTheDocument();
    expect(form()).toHaveLength(1);
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('is reachable by keyboard in reading order: theme selector, retry, then home', async () => {
    const user = userEvent.setup();
    renderLogin(() => Promise.reject(new Error('down')));
    await screen.findByText('No pudimos cargar el acceso.');
    await user.tab();
    expect(screen.getByRole('radio', { name: 'Sistema' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Reintentar acceso' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveFocus();
  });
});

describe('"Ir al inicio" respects the guards', () => {
  it('signed out: ends on /login, shows no protected content and keeps the session empty', async () => {
    const user = userEvent.setup();
    const logout = vi.spyOn(authentication, 'logout');
    renderLogin(() => Promise.reject(new Error('down')));
    await user.click(await screen.findByRole('link', { name: 'Ir al inicio' }));

    expect(screen.getByTestId("ubicación")).toHaveTextContent('/login');
    expect(screen.queryByRole('heading', { name: 'Panel protegido' })).toBeNull();
    expect(getSession()).toBeNull();
    expect(logout).not.toHaveBeenCalled();
  });

  it('does not loop: the visitor can still retry after going "home"', async () => {
    const user = userEvent.setup();
    const load = vi.fn().mockRejectedValueOnce(new Error('down')).mockRejectedValueOnce(new Error('down')).mockResolvedValue({ default: Form });
    renderLogin(load);
    await user.click(await screen.findByRole('link', { name: 'Ir al inicio' }));
    await user.click(await screen.findByRole('button', { name: 'Reintentar acceso' }));

    expect(await screen.findByRole('heading', { name: 'Formulario remoto de credenciales' })).toBeInTheDocument();
    expect(screen.getByTestId("ubicación")).toHaveTextContent('/login');
  });

  it('a session that appears while the panel is shown is kept and leaves the login for the dashboard', async () => {
    const logout = vi.spyOn(authentication, 'logout');
    renderLogin(() => Promise.reject(new Error('down')));
    await screen.findByText('No pudimos cargar el acceso.');
    act(() => setSession({ token: 't', sub: 'alice', role: 'ADMIN' }));

    expect(await screen.findByRole('heading', { name: 'Panel protegido' })).toBeInTheDocument();
    expect(getSession()?.sub).toBe('alice');
    expect(logout).not.toHaveBeenCalled();
  });
});

describe('indeterminate recovery notice', () => {
  it('is announced inside the same styled notice, not as a bare paragraph', async () => {
    vi.spyOn(authentication, 'state').mockReturnValue('indeterminate');
    renderLogin(async () => ({ default: Form }));
    const alert = await screen.findByRole('alert');

    expect(alert).toHaveTextContent('No pudimos recuperar la sesión. Inicia sesión de nuevo.');
    expect(alert).toHaveClass('portal-notice');
  });
});
