import { Component, type ReactNode } from 'react';
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="fatal-error">
        <h1>SkySafe couldn’t open this view.</h1>
        <p>
          Reload the page to try again. No flight permission can be determined
          while data is unavailable.
        </p>
        <button
          className="button primary"
          onClick={() => window.location.reload()}
        >
          Reload SkySafe
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
