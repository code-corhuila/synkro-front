import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createThemeController } from '../../theme/themePreference';
import { ThemeSelector } from './ThemeSelector';

function controller() {
  const store = new Map<string, string>();
  const win = {
    document,
    matchMedia: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) },
  } as unknown as Window;
  const theme = createThemeController(win);
  theme.start();
  return theme;
}

describe('ThemeSelector', () => {
  it('is a named group with the three options, System selected by default', () => {
    render(<ThemeSelector controller={controller()} />);

    expect(screen.getByRole('radiogroup', { name: 'Tema' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Claro' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Oscuro' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Sistema' })).toBeChecked();
  });

  it('applies a choice made with the mouse', async () => {
    const theme = controller();
    render(<ThemeSelector controller={theme} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Oscuro' }));

    expect(screen.getByRole('radio', { name: 'Oscuro' })).toBeChecked();
    expect(theme.preference()).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('is operable with the keyboard: Tab into the group, arrows change the option', async () => {
    const theme = controller();
    render(<ThemeSelector controller={theme} />);
    await userEvent.tab();
    expect(screen.getByRole('radio', { name: 'Sistema' })).toHaveFocus();

    await userEvent.keyboard('{ArrowLeft}');
    expect(theme.preference()).toBe('dark');
    expect(screen.getByRole('radio', { name: 'Oscuro' })).toHaveFocus();
  });

  it('reflects a change made elsewhere (second selector on the page)', async () => {
    const theme = controller();
    render(
      <>
        <ThemeSelector controller={theme} />
        <ThemeSelector controller={theme} />
      </>
    );
    await userEvent.click(screen.getAllByRole('radio', { name: 'Claro' })[0]);

    expect(screen.getAllByRole('radio', { name: 'Claro' })[1]).toBeChecked();
  });
});
