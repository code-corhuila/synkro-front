import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <main>
      <h1>Page not found</h1>
      <p>
        There is nothing at this address. <Link to="/dashboard">Go to the dashboard</Link>
      </p>
    </main>
  );
}
