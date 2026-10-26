import {Component, type ErrorInfo, type ReactNode} from 'react'

/** rm-514: deterministic, dependency-free digest (FNV-1a 32-bit) shown instead of raw error text. */
export function errorDigest(error: unknown): string {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  let hash = 0x811c9dc5
  for (let index = 0; index < message.length; index += 1) {
    hash ^= message.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  digest: string | null
}

/**
 * rm-514: root render-time failure boundary. Any view exception below this
 * component replaces the whole tree with a minimal fallback instead of a
 * blank white screen. The fallback intentionally carries NO message, stack,
 * server URL, run id, or repo name — the operator correlates via the digest
 * in the browser console (also digest-only, never raw error text).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {digest: null}

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {digest: errorDigest(error)}
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    // Digest + component stack only: the raw message can name private repos
    // or carry server URLs, so it must never reach console aggregators.
    console.error('[ErrorBoundary] render-time failure', errorDigest(error), info.componentStack)
  }

  override render(): ReactNode {
    const {digest} = this.state
    if (digest === null) {
      return this.props.children
    }
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6" role="alert">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p>
          The dashboard view failed to render. Reference code: <code>{digest}</code>.
        </p>
        <button
          className="rounded border border-current px-4 py-2"
          onClick={() => {
            window.location.reload()
          }}
          type="button"
        >
          Reload dashboard
        </button>
      </main>
    )
  }
}
