import { Component, useEffect, useState, type ReactNode } from 'react';
import { copy } from '../../layout/copy';
import { Button } from '../../shared/ui/Button';
import './RemoteBoundary.css';

interface Props {
  load: () => Promise<unknown>;
  portalName: string;
  children: (loaded: unknown) => ReactNode;
  // What the failure notice says and offers. The defaults are the generic
  // "module unavailable" notice; the login passes its own words and a way home.
  unavailableMessage?: string;
  retryLabel?: string;
  // Extra controls beside the retry, in the same row of the same panel.
  actions?: ReactNode;
  // The login-sized panel that stands in for the form.
  variant?: 'access';
}

type Load = { status: 'loading' } | { status: 'loaded'; value: unknown } | { status: 'error'; error: Error };

// Runs the portal's load and renders what it gives. A failed load is re-thrown
// during render, which is what lets the boundary below catch a failed dynamic
// import() as a render error and show the unavailable notice.
function PortalLoader({ load, children }: Pick<Props, 'load' | 'children'>) {
  const [result, setResult] = useState<Load>({ status: 'loading' });

  useEffect(() => {
    let current = true;
    load().then(
      (value) => current && setResult({ status: 'loaded', value }),
      (error: unknown) =>
        // A rejection is not guaranteed to be an Error (or truthy at all);
        // normalized so render always has something to throw.
        current && setResult({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) })
    );
    return () => {
      current = false;
    };
  }, [load]);

  if (result.status === 'error') throw result.error;
  if (result.status === 'loaded') return children(result.value);
  return (
    <p role="status" className="portal-loading">
      {copy.portal.loading}
    </p>
  );
}

interface BoundaryState {
  hasError: boolean;
}

export class RemoteBoundary extends Component<Props, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error(`Portal "${this.props.portalName}" failed to load:`, error);
  }

  render() {
    if (this.state.hasError) {
      const { unavailableMessage = copy.portal.unavailable, retryLabel = copy.portal.retry, actions, variant } = this.props;
      return (
        <div className={variant ? `portal-notice portal-notice--${variant}` : 'portal-notice'}>
          <p role="status">{unavailableMessage}</p>
          <div className="portal-notice__actions">
            <Button onClick={() => this.setState({ hasError: false })}>{retryLabel}</Button>
            {actions}
          </div>
        </div>
      );
    }
    return <PortalLoader load={this.props.load}>{this.props.children}</PortalLoader>;
  }
}
