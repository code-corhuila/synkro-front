import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('defaults to type "button", so it never submits a form by accident', () => {
    render(<Button>Guardar</Button>);

    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveAttribute('type', 'button');
  });

  it('can be a submit button', () => {
    render(<Button type="submit">Ingresar</Button>);

    expect(screen.getByRole('button', { name: 'Ingresar' })).toHaveAttribute('type', 'submit');
  });

  it('is the primary variant unless told otherwise', () => {
    render(<Button>Guardar</Button>);

    expect(screen.getByRole('button')).toHaveClass('button', 'button--primary');
  });

  it('can be the secondary variant', () => {
    render(<Button variant="secondary">Cancelar</Button>);

    expect(screen.getByRole('button')).toHaveClass('button', 'button--secondary');
    expect(screen.getByRole('button')).not.toHaveClass('button--primary');
  });

  it('keeps a class and any attribute the caller passes', () => {
    render(
      <Button className="extra" aria-label="Cerrar" data-testid="close">
        x
      </Button>
    );

    expect(screen.getByTestId('close')).toHaveClass('button', 'extra');
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
  });

  it('calls its handler on a click', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Guardar</Button>);

    await userEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does nothing when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Guardar
      </Button>
    );

    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });
});
