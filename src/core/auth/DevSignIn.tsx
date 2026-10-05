import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signInWithDevToken } from './session';

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
      setError('That does not look like a valid development token.');
      return;
    }
    setError(null);
    navigate(from, { replace: true });
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="dev-token">Development token</label>
      <input id="dev-token" value={value} onChange={(e) => setValue(e.target.value)} />
      {error && <p role="alert">{error}</p>}
      <button type="submit">Sign in</button>
    </form>
  );
}
