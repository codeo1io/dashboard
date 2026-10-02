/**
 * ErrorBoundary — root render-fallback for the SPA (rm-417).
 *
 * Before this boundary, ANY throw during React rendering unmounted the tree
 * and left a white screen: no message, no recovery path. The dashboard is a
 * single-operator read-only surface, so the honest degraded state is exactly
 * what this fallback renders — say the interface failed, show the error
 * message, and offer a manual reload. No retry logic, no data-layer changes,
 * no new dependencies (error boundaries require a class component; there is
 * no hook equivalent).
 *
 * Mounted in main.tsx directly under <React.StrictMode>, wrapping <App />.
 */

import {Component, type ErrorInfo, type ReactNode} from 'react'

export interface ErrorBoundaryProps {
  readonly children: ReactNode
  /**
   * Recovery affordance. Injectable for tests; defaults to a full page
   * reload (the only sound recovery when the render tree is broken).
   */
  readonly onReload?: () => void
}

export interface ErrorBoundaryState {
  readonly error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {error: null}

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {error}
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Best-effort diagnostics through the standard sink; never rethrow here.
    console.error('[dashboard] unhandled render error caught by root boundary', error, info.componentStack)
  }

  override render(): ReactNode {
    const {error} = this.state
    if (error === null) {
      return this.props.children
    }
    const reload = this.props.onReload ?? defaultReload
    return (
      <main role="alert" className="operator-panel" style={{maxWidth: '36rem', margin: '4rem auto'}}>
        <h1 style={{color: 'var(--color-text)', fontSize: 'var(--text-h4)', marginBottom: 'var(--space-3)'}}>
          The dashboard hit an unexpected error
        </h1>
        <p style={{color: 'var(--color-text-muted)', fontSize: 'var(--text-body)', marginBottom: 'var(--space-4)'}}>
          Rendering stopped before the interface could draw. Nothing was changed on disk — this
          dashboard is read-only. Reloading restores the last known-good interface; if the error
          repeats, check the server logs.
        </p>
        <p
          style={{
            color: 'var(--color-text-subtle)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-body-sm)',
            overflowWrap: 'anywhere',
            marginBottom: 'var(--space-4)',
          }}
        >
          {error.message || String(error)}
        </p>
        <button type="button" onClick={reload} className="operator-primary-action" style={{cursor: 'pointer'}}>
          Reload the dashboard
        </button>
      </main>
    )
  }
}

function defaultReload(): void {
  window.location.reload()
}
