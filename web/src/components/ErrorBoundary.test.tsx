import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Component, type ReactNode } from 'react'

import { ErrorBoundary, errorDigest } from './ErrorBoundary.tsx'

/**
 * rm-514: the top-level boundary degrades a render crash to a pinned
 * fallback instead of unmounting the tree to a blank page.
 *
 * Pinned contract:
 * - A thrown render shows the fallback (role=alert) with a stable 8-hex
 *   digest and a reload affordance; children disappear.
 * - The digest is DETERMINISTIC (same error → same digest) and
 *   DISTINGUISHING (different errors → different digests).
 * - The rendered DOM carries ONLY the digest — the message/stack never
 *   reach the DOM (console gets the full detail via componentDidCatch).
 * - A boundary that never crashes renders children untouched.
 */

function Bombs({message}: {message: string}): ReactNode {
  throw new Error(message)
}

function Safe({label}: {label: string}): ReactNode {
  return <p data-testid="safe-child">{label}</p>
}

describe('ErrorBoundary (rm-514)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('a render crash shows the fallback with role=alert and stays on it across re-renders', () => {
    const {rerender} = render(
      <ErrorBoundary>
        <Bombs message="kaboom" />
      </ErrorBoundary>,
    )
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    rerender(
      <ErrorBoundary>
        <Bombs message="kaboom" />
      </ErrorBoundary>,
    )
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument()
  })

  it('the fallback shows an 8-hex crash digest and a reload affordance', () => {
    render(
      <ErrorBoundary>
        <Bombs message="specific crash text" />
      </ErrorBoundary>,
    )
    const fallback = screen.getByTestId('error-boundary-fallback')
    expect(fallback.textContent).toMatch(/crash digest [0-9a-f]{8}/)
    expect(screen.getByRole('button', {name: /reload/i})).toBeInTheDocument()
  })

  it('the DOM carries ONLY the digest — the error message and stack never render', () => {
    render(
      <ErrorBoundary>
        <Bombs message="SECRET-TOKEN-IN-MESSAGE" />
      </ErrorBoundary>,
    )
    expect(screen.getByTestId('error-boundary-fallback').textContent).not.toContain('SECRET-TOKEN-IN-MESSAGE')
  })

  it('componentDidCatch logs the digest + full error + component stack to the console', () => {
    render(
      <ErrorBoundary>
        <Bombs message="logged detail" />
      </ErrorBoundary>,
    )
    const calls = vi.mocked(console.error).mock.calls
    const boundaryCall = calls.find(call => String(call[0]).includes('[ErrorBoundary]'))
    expect(boundaryCall).toBeDefined()
    const payload = boundaryCall?.[1] as {digest: string; error: Error; componentStack: string}
    expect(payload.digest).toMatch(/^[0-9a-f]{8}$/)
    expect(payload.error.message).toBe('logged detail')
    expect(payload.componentStack).toContain('Bombs')
  })

  it('errorDigest is deterministic for the same error and distinguishing across errors', () => {
    const first = new Error('alpha failure')
    const firstAgain = new Error('alpha failure')
    const second = new Error('beta failure')
    const nonError = {weird: 'object'}

    expect(errorDigest(first)).toBe(errorDigest(firstAgain))
    expect(errorDigest(first)).toMatch(/^[0-9a-f]{8}$/)
    expect(errorDigest(first)).not.toBe(errorDigest(second))
    expect(errorDigest(nonError)).toMatch(/^[0-9a-f]{8}$/)
    expect(errorDigest(undefined)).toMatch(/^[0-9a-f]{8}$/)
  })

  it('a nested class component survives inside a non-crashing boundary', () => {
    class Inner extends Component<{children: ReactNode}> {
      override render(): ReactNode {
        return this.props.children
      }
    }
    render(
      <ErrorBoundary>
        <Inner>
          <Safe label="nested fine" />
        </Inner>
      </ErrorBoundary>,
    )
    expect(screen.getByTestId('safe-child')).toHaveTextContent('nested fine')
    expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument()
  })
})
