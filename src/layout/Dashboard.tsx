import { createElement, useSyncExternalStore, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { getSession, subscribeSession } from '../core/auth/session';
import { RemoteBoundary } from '../core/errors/RemoteBoundary';
import { loadSalesSummary as defaultLoadSalesSummary } from '../remotes/salesSummary';
import { copy } from './copy';
import { dashboardLinksFor } from './dashboardLinks';
import { canAccess } from './navigation';
import './Dashboard.css';

// The signed-in landing page. The Host owns the links (from the access matrix);
// the sales figures are the Sales portal's module, so the Host never duplicates
// their rules. Nothing here is a number the APIs do not expose.
export function Dashboard({ loadSalesSummary = defaultLoadSalesSummary }: { loadSalesSummary?: () => Promise<unknown> }) {
  const session = useSyncExternalStore(subscribeSession, getSession);
  const links = dashboardLinksFor(session?.role);
  const showSales = canAccess(session?.role, '/sales');

  return (
    <>
      <h1 className="heading heading--page">{copy.dashboard.title}</h1>
      <p>{copy.dashboard.signedInAs(session?.sub ?? '')}</p>
      {links.length > 0 && (
        <nav aria-label={copy.dashboard.shortcutsLabel} className="dashboard-links">
          <ul>
            {links.map((link) => (
              <li key={link.path}>
                <Link to={link.path} className="dashboard-link">
                  <span className="dashboard-link__label">{link.label}</span>
                  <span className="dashboard-link__description">{link.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {showSales && (
        <section aria-labelledby="dashboard-summary-title" className="dashboard-summary">
          <h2 id="dashboard-summary-title" className="heading heading--section">{copy.dashboard.summaryTitle}</h2>
          <RemoteBoundary load={loadSalesSummary} portalName="sales-summary" unavailableMessage={copy.dashboard.summaryUnavailable}>
            {(loaded) => createElement((loaded as { default: ComponentType }).default)}
          </RemoteBoundary>
        </section>
      )}
    </>
  );
}
