import {render, screen} from '@testing-library/react'
import {describe, expect, it, vi, afterEach} from 'vitest'
import {ErrorBoundary} from './ErrorBoundary.tsx'

/**
 * rm-593: render-crash isolation tests.
 *
 * Deliberately a standalone file that never references localStorage and never
 * mounts App/AppShell — those suites are the known red class under the
 * current Node 26 + jsdom 29 environment (per-file `window.localStorage`
 * usage; see the rm-548/rm-591 ledger entries), and this batch ships
 * env-cure-free. The "shell/nav survive" acceptance clause is asserted
 * structurally: the boundary wraps ONLY the view router inside AppShell
 * (web/src/App.tsx), and here a shell/nav sibling rendered outside the
 * boundary must survive a crash inside it.
 */

function ThrowingLeaf(): never {
  throw new Error('leaf view exploded')
}

describe('ErrorBoundary (rm-593)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('a thrown leaf renders the fallback with a reload action while the surrounding shell survives', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <div>
        <nav aria-label="Primary">shell-nav-marker</nav>
        <main>
          <ErrorBoundary>
            <ThrowingLeaf />
          </ErrorBoundary>
        </main>
      </div>,
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('View failed to render')
    expect(alert).toHaveTextContent('leaf view exploded')
    expect(screen.getByRole('button', {name: /reload dashboard/i})).toBeInTheDocument()
    // The shell/nav outside the boundary survive the view crash.
    expect(screen.getByRole('navigation', {name: 'Primary'})).toHaveTextContent('shell-nav-marker')
  })

  it('reports the error through the console contract (console.error carries the boundary report)', () => {
    // React itself also console.errors the caught render error (its own
    // "The above error occurred in…" report); the assertion pins OUR call's
    // exact shape rather than the total call count, which is framework-owned.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <ThrowingLeaf />
      </ErrorBoundary>,
    )
    expect(errorSpy).toHaveBeenCalledWith(
      '[ErrorBoundary] view render failed',
      expect.any(Error),
      expect.anything(),
    )
  })

  it('renders children untouched when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>healthy view</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('healthy view')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
