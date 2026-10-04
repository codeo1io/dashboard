import {Component, type ErrorInfo, type ReactNode} from 'react'

/**
 * rm-514 (2026-10-04): single top-level error boundary. Without one, a render
 * crash in ANY view (a view-level edge the suites missed — malformed state, a
 * thrown hook) unmounts the whole React tree: the operator gets a blank page,
 * indistinguishable from a network outage, and the SPA silently stops
 * polling. With one, the crash degrades to this pinned fallback instead —
 * fail-visible, with a reload affordance.
 *
 * Security posture: the DOM shows ONLY a crash digest (stable 8-hex FNV-1a
 * over the error's name+message+stack). The full detail goes to the browser
 * console via componentDidCatch — a digest is enough to correlate a report
 * with the console entry, and rendered error text can carry URLs, tokens, or
 * response bodies this app deliberately never displays.
 */
export function errorDigest(error: unknown): string {
  // Hash name + message ONLY (not the stack): the digest must be stable for
  // the same failure regardless of where it was constructed — stacks differ
  // by throw site and the correlation target (the console line) carries the
  // full error anyway.
  const raw = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  // FNV-1a, 32-bit — dependency-free and stable across renders/sessions.
  let hash = 0x811c9dc5
  for (let index = 0; index < raw.length; index++) {
    hash ^= raw.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

interface ErrorBoundaryProps {
  readonly children: ReactNode
}

interface ErrorBoundaryState {
  readonly digest: string | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {digest: null}

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {digest: errorDigest(error)}
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    // Digest is the rendered handle; full detail (message + component stack)
    // stays in the operator's console — it never reaches the DOM.
    console.error('[ErrorBoundary] render crashed', {
      digest: errorDigest(error),
      error,
      componentStack: info.componentStack,
    })
  }

  override render(): ReactNode {
    if (this.state.digest !== null) {
      return (
        <div data-testid="error-boundary-fallback" className="operator-empty-state" role="alert">
          <div className="operator-empty-icon" aria-hidden="true" style={{opacity: 0.2}}>
            ⚠
          </div>
          <p className="operator-empty-title">The dashboard view crashed</p>
          <p className="operator-empty-desc">
            Something failed while rendering (crash digest {this.state.digest}). The digest identifies this crash in
            the browser console — no further detail is shown here on purpose.
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
