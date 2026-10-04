import {Component, type ErrorInfo, type ReactNode} from 'react'

interface ErrorBoundaryProps {
  readonly children: ReactNode
}

interface ErrorBoundaryState {
  readonly error: Error | null
}

/**
 * rm-593: top-level render-crash isolation for the dashboard views.
 *
 * Before this boundary existed, a thrown render error (a contract-drift DTO
 * shape, a null deref in a future view) bubbled to the React root and left
 * the operator a blank screen with console-only evidence. `App` mounts this
 * boundary around the view router (inside `AppShell`), so the crash is
 * isolated to the content area while the shell and navigation survive, the
 * fallback is operator-readable, and a reload action recovers without
 * developer tooling.
 *
 * Console contract: the error and its component stack go to `console.error`
 * — mirroring React's own uncaught-error logging — and nothing else is
 * logged (the operator streams' no-leak discipline forbids logging app
 * data; this surface only ever sees the error object itself).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {error: null}

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {error}
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] view render failed', error, errorInfo.componentStack)
  }

  override render(): ReactNode {
    if (this.state.error !== null) {
      return (
        <section className="operator-panel" role="alert" aria-live="polite" data-testid="error-boundary">
          <h2 className="operator-section-heading">View failed to render</h2>
          <p style={{marginBottom: 'var(--space-3)'}}>
            A dashboard view crashed while rendering. The rest of the dashboard is still
            available — reload to try again.
          </p>
          {this.state.error.message.trim() !== '' && (
            <p style={{fontFamily: 'var(--font-mono, monospace)', marginBottom: 'var(--space-3)'}}>
              {this.state.error.message}
            </p>
          )}
          <button type="button" onClick={() => window.location.reload()}>
            Reload dashboard
          </button>
        </section>
      )
    }
    return this.props.children
  }
}
