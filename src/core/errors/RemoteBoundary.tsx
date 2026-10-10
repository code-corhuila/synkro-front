import { Component, useEffect, useState, type ReactNode } from 'react';
import { copy } from '../../layout/copy';
import './RemoteBoundary.css';

interface Props {
  load: () => Promise<unknown>;
  portalName: string;
  children: (loaded: unknown) => ReactNode;
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
      return <p role="status" className="portal-notice">{copy.portal.unavailable}</p>;
    }
    return <PortalLoader load={this.props.load}>{this.props.children}</PortalLoader>;
  }
}
