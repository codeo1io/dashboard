/**
 * ErrorBoundary tests (rm-417).
 *
 * Pins the root-boundary contract: a throwing child must degrade to the
 * honest read-only fallback (message + reload affordance) instead of a white
 * screen, and must not take the test process down with it.
 */

import {fireEvent, render, screen} from '@testing-library/react'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {ReactNode} from 'react'
import {ErrorBoundary} from './ErrorBoundary.tsx'

function ThrowingChild(): ReactNode {
  throw new Error('kaboom: malformed DTO field')
}

function HealthyChild(): ReactNode {
  return <p>healthy view</p>
}

describe('ErrorBoundary (rm-417)', () => {
  let consoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // React logs boundary catches via console.error; keep test output clean
    // without asserting on it (componentDidCatch logging is best-effort).
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleError.mockRestore()
  })

  it('renders children unchanged when nothing throws', () => {
    render(
      <ErrorBoundary>
        <HealthyChild />
      </ErrorBoundary>,
    )
    expect(screen.getByText('healthy view')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('degrades to the fallback (not a white screen) when a child throws during render', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('The dashboard hit an unexpected error')).toBeInTheDocument()
    // The honest part: the underlying error message is shown, not swallowed.
    expect(screen.getByText(/kaboom: malformed DTO field/)).toBeInTheDocument()
  })

  it('offers a working reload affordance (injectable recovery action)', () => {
    const onReload = vi.fn()
    render(
      <ErrorBoundary onReload={onReload}>
        <ThrowingChild />
      </ErrorBoundary>,
    )
    fireEvent.click(screen.getByRole('button', {name: 'Reload the dashboard'}))
    expect(onReload).toHaveBeenCalledTimes(1)
  })

  it('states the read-only posture in the degraded copy', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    )
    // The dashboard cannot have modified anything — say so plainly.
    expect(screen.getByText(/read-only/i)).toBeInTheDocument()
  })
})
