import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { copy } from '../../layout/copy';
import { Button } from '../../shared/ui/Button';
import { signInWithDevToken } from './session';
import './DevSignIn.css';

const ERROR_ID = 'dev-token-error';

// Development sign-in: paste a token, get a session. It is only registered
// when VITE_DEV_SIGN_IN is "true"; production builds do not contain it.
export function DevSignIn() {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard';

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const ok = signInWithDevToken(value.trim());
    if (!ok) {
      setError(copy.signIn.invalidToken);
      return;
    }
    setError(null);
    navigate(from, { replace: true });
  }

  return (
    <main className="sign-in">
      <form className="sign-in__card" onSubmit={handleSubmit}>
        <h1 className="heading heading--page">{copy.signIn.title}</h1>
        <p className="sign-in__notice">{copy.signIn.devOnly}</p>
        <label htmlFor="dev-token" className="field__label">
          {copy.signIn.tokenLabel}
        </label>
        <input
          id="dev-token"
          className="field__input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? ERROR_ID : undefined}
        />
        {error && (
          <p id={ERROR_ID} role="alert" className="field__error">
            {error}
          </p>
        )}
        <Button type="submit">{copy.signIn.submit}</Button>
      </form>
    </main>
  );
}
