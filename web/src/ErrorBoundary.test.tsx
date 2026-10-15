import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {render, screen, fireEvent, cleanup} from '@testing-library/react'
import {ErrorBoundary, errorDigest} from './ErrorBoundary.tsx'

const SECRET = 'secret-run-id-9f31 private-repo-name https://internal.example/run/42'

function Bomb(): never {
  throw new Error(SECRET)
}

describe('ErrorBoundary (rm-514)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders children untouched when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>healthy view</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('healthy view')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('pins a throwing view to the fallback with a digest and no sensitive detail', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('Something went wrong')
    expect(alert.textContent).toMatch(/Reference code: [0-9a-f]{8}/)
    // Sensitivity pin: the raw error message (run id, repo name, URL) must not reach the DOM.
    expect(alert.textContent).not.toContain('secret-run-id-9f31')
    expect(alert.textContent).not.toContain('private-repo-name')
    expect(alert.textContent).not.toContain('internal.example')
    // The console path announces via the boundary tag and logs the digest, never the raw message.
    // (React's own internal uncaught-error report is framework behavior, outside the boundary's control.)
    const calls = vi.mocked(console.error).mock.calls
    const boundaryCalls = calls.filter(call => call.some(arg => String(arg).includes('[ErrorBoundary]')))
    expect(boundaryCalls.length).toBeGreaterThan(0)
    const joined = boundaryCalls.map(call => call.map(String).join(' '))
    expect(joined.some(text => text.includes(errorDigest(new Error(SECRET))))).toBe(true)
    expect(joined.some(text => text.includes('secret-run-id-9f31'))).toBe(false)
  })

  it('digests deterministically to 8 lowercase hex chars', () => {
    expect(errorDigest(new Error('boom'))).toMatch(/^[0-9a-f]{8}$/)
    expect(errorDigest(new Error('boom'))).toBe(errorDigest(new Error('boom')))
    expect(errorDigest(new Error('boom'))).not.toBe(errorDigest(new Error('boom2')))
    expect(errorDigest('plain string')).toMatch(/^[0-9a-f]{8}$/)
  })

  it('wires the reload affordance to window.location.reload', () => {
    const reload = vi.fn()
    vi.stubGlobal('location', {...window.location, reload})
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    fireEvent.click(screen.getByRole('button', {name: /reload dashboard/i}))
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
