import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ButtonLink } from './ButtonLink';

function Where() {
  return <output aria-label="where">{useLocation().pathname}</output>;
}

describe('ButtonLink', () => {
  it('is a real link carrying the shared button classes', () => {
    render(<MemoryRouter><ButtonLink to="/dashboard" variant="secondary">Ir al inicio</ButtonLink></MemoryRouter>);
    const link = screen.getByRole('link', { name: 'Ir al inicio' });

    expect(link).toHaveAttribute('href', '/dashboard');
    expect(link).toHaveClass('button', 'button--secondary');
  });

  it('defaults to primary and merges a caller class', () => {
    render(<MemoryRouter><ButtonLink to="/x" className="extra">Ir</ButtonLink></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'Ir' })).toHaveClass('button', 'button--primary', 'extra');
  });

  it('navigates without a document load and is reachable and activatable by keyboard', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ButtonLink to="/dashboard">Ir</ButtonLink>
        <Routes><Route path="*" element={<Where />} /></Routes>
      </MemoryRouter>
    );
    await user.tab();

    expect(screen.getByRole('link', { name: 'Ir' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByLabelText('where')).toHaveTextContent('/dashboard');
  });
});
