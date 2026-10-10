import { Component, type ReactNode } from 'react';
import './RemoteBoundary.css';

interface Props {
  load: () => Promise<unknown>;
  portalName: string;
  children: (loaded: unknown) => ReactNode;
}

interface State {
  status: 'loading' | 'loaded' | 'error';
  value: unknown;
  thrownError: Error | null;
}

class RemoteBoundaryInner extends Component<Props, State> {
  state: State = { status: 'loading', value: null, thrownError: null };

  componentDidMount() {
    this.props
      .load()
      .then((value) => this.setState({ status: 'loaded', value }))
      .catch((error: unknown) =>
        this.setState({
          status: 'error',
          // A rejection is not guaranteed to be an Error (or truthy at all);
          // normalized so render() always has something to throw.
          thrownError: error instanceof Error ? error : new Error(String(error)),
        })
      );
  }

  render() {
    if (this.state.status === 'error' && this.state.thrownError) {
      // Re-thrown here so a parent error boundary (below) can catch it via
      // componentDidCatch/getDerivedStateFromError — this is what lets a
      // failed dynamic import() become a caught render error.
      throw this.state.thrownError;
    }
    if (this.state.status === 'loaded') {
      return this.props.children(this.state.value);
    }
    return null; // loading — a spinner can be added without changing this contract
  }
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
      return <p role="status" className="portal-notice">{this.props.portalName} is not available right now.</p>;
    }
    return (
      <RemoteBoundaryInner load={this.props.load} portalName={this.props.portalName}>
        {this.props.children}
      </RemoteBoundaryInner>
    );
  }
}
