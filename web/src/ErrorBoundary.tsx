import React from 'react'

/**
 * Root error boundary (rm-514).
 *
 * Without this, any render-time exception in any view unmounts the whole SPA
 * (blank document, no recovery path). The fallback deliberately renders NO
 * error detail — no message, no stack, no URLs, no repo/run identifiers — only
 * a short deterministic digest that an operator can correlate with the console
 * entry this component logs. That keeps single-operator diagnostics available
 * while guaranteeing a crash screen can never leak internals.
 */

// djb2-style string hash: deterministic, synchronous, dependency-free. 32-bit
// avalanche is plenty for an 8-hex-char correlation tag.
function digestFor(message: string, stack: string | undefined): string {
  const input = `${message}\n${stack ?? ''}`
  let hash = 5381
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 33) ^ input.charCodeAt(index)
    hash = hash >>> 0
  }
  return `err-${hash.toString(16).padStart(8, '0')}`
}

type ErrorBoundaryProps = {
  children: React.ReactNode
}

type ErrorBoundaryState = {
  digest: string | null
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = {digest: null}

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    return {digest: digestFor(message, stack)}
  }

  override componentDidCatch(error: unknown): void {
    // Operator-side diagnostics only; the DOM fallback never shows error text.
    console.error(`[ErrorBoundary] ${this.state.digest ?? 'err-unknown'}`, error)
  }

  override render(): React.ReactNode {
    const {digest} = this.state
    if (digest !== null) {
      return (
        <div
          role="alert"
          style={{
            display: 'grid',
            placeItems: 'center',
            minHeight: '100vh',
            padding: '1.5rem',
            background: 'var(--background, #0b0f14)',
            color: 'var(--text, #e6edf3)',
            fontFamily: 'var(--font-sans, system-ui, sans-serif)',
          }}
        >
          <div style={{maxWidth: '28rem', textAlign: 'center'}}>
            <h1 style={{fontSize: '1.25rem', margin: '0 0 0.75rem'}}>
              Something went wrong
            </h1>
            <p style={{margin: '0 0 1rem', lineHeight: 1.5}}>
              The dashboard view crashed. A reload usually recovers it; the tag
              below identifies the crash in the browser console.
            </p>
            <code
              style={{
                display: 'inline-block',
                margin: '0 0 1rem',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.375rem',
                background: 'rgba(255, 255, 255, 0.08)',
                fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                fontSize: '0.875rem',
              }}
            >
              {digest}
            </code>
            <div>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: 'inherit',
                  cursor: 'pointer',
                }}
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
