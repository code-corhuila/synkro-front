import { useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { getSession, subscribeSession } from '../core/auth/session';
import { copy } from './copy';
import { defaultPathFor } from './navigation';
import './NotFound.css';

// design-system.md, "Error handling": a nonexistent route shows a 404 screen
// with a link back to the user's default module. Rendered inside the Shell,
// so the menu stays.
export function NotFound() {
  const session = useSyncExternalStore(subscribeSession, getSession);

  return (
    <section className="not-found">
      <h1>{copy.notFound.title}</h1>
      <p>{copy.notFound.message}</p>
      <Link to={defaultPathFor(session?.role)} className="not-found__link">
        {copy.notFound.backToHome}
      </Link>
    </section>
  );
}
