import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  readonly children: ReactNode
}

interface ErrorBoundaryState {
  readonly error: Error | null
}

/**
 * rm-514: stable, non-cryptographic digest of the caught error, so an
 * operator can correlate the fallback with the browser console without the
 * fallback itself carrying message text (which could echo server URLs, run
 * ids or repo names).
 */
function errorDigest(error: Error): string {
  const raw = `${error.name}: ${error.message}`
  let hash = 0
  for (let i = 0; i < raw.length; i += 1) {
    hash = (Math.imul(31, hash) + raw.charCodeAt(i)) | 0
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * rm-514: last-resort boundary around the whole client tree (see main.tsx).
 * A view that throws during render used to unmount the SPA to a blank page
 * with only a console trace; this boundary keeps the failure legible — a
 * minimal fallback with an error digest (no message text, no component
 * stack) and a reload affordance. The full error + component stack still
 * reaches the browser console via componentDidCatch for debugging.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {error: null}

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {error}
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] uncaught client render error', error, info.componentStack)
  }

  override render(): ReactNode {
    if (this.state.error !== null) {
      return (
        <div data-testid="error-boundary-fallback" role="alert" className="operator-warning-panel">
          <p>Something went wrong displaying the dashboard.</p>
          <p>Error digest: {errorDigest(this.state.error)}</p>
          <button type="button" onClick={() => window.location.reload()}>Reload dashboard</button>
        </div>
      )
    }
    return this.props.children
  }
}
