import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, type InitialEntry } from 'react-router-dom';
import { DevSignIn } from './DevSignIn';
import { getSession, setSession } from './session';

// An unsigned token for the test: the dev sign-in only decodes it.
function fakeJwt(payload: Record<string, unknown>) {
  const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'none' })}.${encode(payload)}.`;
}

function renderAt(entry: InitialEntry = '/login') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/login" element={<DevSignIn />} />
        <Route path="/products" element={<div>products screen</div>} />
        <Route path="/dashboard" element={<div>dashboard screen</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('DevSignIn', () => {
  beforeEach(() => setSession(null));

  it('rejects a pasted value that is not a decodable JWT, with no session created', async () => {
    renderAt();

    await userEvent.type(screen.getByLabelText(/token de desarrollo/i), 'not-a-jwt');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Ese token de desarrollo no es válido.');
    expect(getSession()).toBeNull();
  });

  describe('the screen', () => {
    it('labels the field and names the submit button', () => {
      renderAt();

      expect(screen.getByLabelText('Token de desarrollo')).toBeInstanceOf(HTMLInputElement);
      expect(screen.getByRole('button', { name: 'Ingresar' })).toHaveAttribute('type', 'submit');
    });

    it('has a page title and says it only exists in development builds', () => {
      renderAt();

      expect(screen.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeInTheDocument();
      expect(screen.getByText('Esta pantalla solo existe en compilaciones de desarrollo.')).toBeInTheDocument();
    });

    it('is a card centred on the page, with the shared primary button', () => {
      renderAt();

      expect(screen.getByRole('main')).toHaveClass('sign-in');
      expect(screen.getByLabelText('Token de desarrollo').closest('form')).toHaveClass('sign-in__card');
      expect(screen.getByRole('button', { name: 'Ingresar' })).toHaveClass('button', 'button--primary');
    });

    it('uses the field classes for the label and the input', () => {
      renderAt();

      expect(screen.getByText('Token de desarrollo')).toHaveClass('field__label');
      expect(screen.getByLabelText('Token de desarrollo')).toHaveClass('field__input');
    });
  });

  describe('a rejected token', () => {
    it('marks the field invalid and ties the alert to it', async () => {
      renderAt();
      const input = screen.getByLabelText('Token de desarrollo');
      expect(input).not.toHaveAttribute('aria-invalid', 'true');

      await userEvent.type(input, 'not-a-jwt');
      await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('field__error');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', alert.id);
    });

    it('takes the error away once a valid token is accepted', async () => {
      renderAt();
      await userEvent.type(screen.getByLabelText('Token de desarrollo'), 'not-a-jwt');
      await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
      expect(screen.getByRole('alert')).toBeInTheDocument();

      await userEvent.clear(screen.getByLabelText('Token de desarrollo'));
      await userEvent.type(screen.getByLabelText('Token de desarrollo'), fakeJwt({ sub: 'alice', roles: ['ADMIN'] }));
      await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('a valid token', () => {
    it('starts the session and returns to the route the visitor asked for', async () => {
      renderAt({ pathname: '/login', state: { from: { pathname: '/products' } } });

      await userEvent.type(screen.getByLabelText('Token de desarrollo'), fakeJwt({ sub: 'alice', roles: ['INVENTORY'] }));
      await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

      expect(await screen.findByText('products screen')).toBeInTheDocument();
      expect(getSession()).toMatchObject({ sub: 'alice', role: 'INVENTORY' });
    });

    it('goes to the dashboard when no route was asked for', async () => {
      renderAt();

      await userEvent.type(screen.getByLabelText('Token de desarrollo'), fakeJwt({ sub: 'alice', roles: ['ADMIN'] }));
      await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

      expect(await screen.findByText('dashboard screen')).toBeInTheDocument();
    });
  });
});
