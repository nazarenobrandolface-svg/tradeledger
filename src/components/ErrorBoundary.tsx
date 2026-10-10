import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  info: { componentStack?: string | null } | null;
}

function isRecoverableNavigation(error: Error): boolean {
  // React Router / lazy-load hiccups that resolve on reload
  return /ChunkLoadError|Loading chunk|dynamically imported module|Failed to fetch dynamically imported module/i.test(
    error.message
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    this.setState({ info });
    console.error('Uncaught error caught by ErrorBoundary:', error, info?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ error: null, info: null });
  };

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    const recoverable = isRecoverableNavigation(error);

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-lg rounded-card border border-border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-loss/10">
              <span className="text-lg" role="img" aria-label="error">
                ⚠️
              </span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                {recoverable ? 'Something failed to load' : 'Something went wrong'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {recoverable
                  ? 'A module could not be loaded. This is usually temporary.'
                  : 'An unexpected error crashed this part of the app.'}
              </p>
            </div>
          </div>

          <div className="mb-4 rounded-md border border-border bg-muted/50 p-3">
            <p className="font-mono text-xs break-words text-foreground">{error.message || String(error)}</p>
          </div>

          {import.meta.env.DEV && info?.componentStack && (
            <details className="mb-4">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                Technical details
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded-md border border-border bg-muted/50 p-2 text-[10px] leading-relaxed text-muted-foreground">
                {error.stack}
                {info.componentStack}
              </pre>
            </details>
          )}

          <div className="flex gap-2">
            <button
              onClick={this.handleReload}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Reload
            </button>
            {import.meta.env.DEV && (
              <button
                onClick={this.handleReset}
                className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
