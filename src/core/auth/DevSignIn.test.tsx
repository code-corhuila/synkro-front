import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DevSignIn } from './DevSignIn';
import { getSession, setSession } from './session';

describe('DevSignIn', () => {
  beforeEach(() => setSession(null));

  it('rejects a pasted value that is not a decodable JWT, with no session created', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<DevSignIn />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText(/token de desarrollo/i), 'not-a-jwt');
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Ese token de desarrollo no es válido.');
    expect(getSession()).toBeNull();
  });
});
