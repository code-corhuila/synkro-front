import { THEME_PREFERENCES, theme, useThemePreference, type ThemeController, type ThemePreference } from '../../theme/themePreference';
import './ThemeSelector.css';

const LABELS: Record<ThemePreference, string> = { light: 'Claro', dark: 'Oscuro', system: 'Sistema' };

// One selector, shared by the login and the signed-in header. Native radios in
// a named group give the selected state and arrow-key handling for free.
export function ThemeSelector({ controller = theme }: { controller?: ThemeController }) {
  const preference = useThemePreference(controller);

  return (
    <div role="radiogroup" aria-label="Tema" className="theme-selector">
      <span className="theme-selector__label" aria-hidden="true">Tema</span>
      {THEME_PREFERENCES.map((option) => (
        <label key={option} className="theme-selector__option">
          <input
            type="radio"
            name="synkro-theme"
            value={option}
            checked={preference === option}
            onChange={() => controller.set(option)}
          />
          <span>{LABELS[option]}</span>
        </label>
      ))}
    </div>
  );
}
