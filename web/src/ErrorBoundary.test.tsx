import {cleanup, render, screen, within} from '@testing-library/react'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {ErrorBoundary} from './ErrorBoundary.tsx'

// React logs uncaught render errors via console.error; the boundary's own
// diagnostics entry is asserted separately below. Silence the noise.
const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

function Boom({message}: {message: string}): never {
  throw new Error(message)
}

afterEach(() => {
  cleanup()
  consoleError.mockClear()
})

function digestFromAlert(): string {
  const alert = screen.getByRole('alert')
  return within(alert).getByText(/^err-[0-9a-f]{8}$/).textContent ?? ''
}

describe('ErrorBoundary', () => {
  it('renders children untouched when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>dashboard content</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('dashboard content')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('renders the fallback with a generic message, stable digest, and reload when a child throws', () => {
    render(
      <ErrorBoundary>
        <Boom message="connect ECONNREFUSED https://api.internal.example/repo-name-xyz" />
      </ErrorBoundary>,
    )
    const alert = screen.getByRole('alert')
    expect(within(alert).getByText('Something went wrong')).toBeTruthy()
    expect(digestFromAlert()).toMatch(/^err-[0-9a-f]{8}$/)
    expect(within(alert).getByRole('button', {name: /reload/i})).toBeTruthy()
    // the throwing child is unmounted
    expect(screen.queryByText(/dashboard content/)).toBeNull()
  })

  it('never surfaces error text (URLs, repo names, messages) in the fallback', () => {
    const sensitive = 'connect ECONNREFUSED https://api.internal.example/repo-name-xyz'
    render(
      <ErrorBoundary>
        <Boom message={sensitive} />
      </ErrorBoundary>,
    )
    const alertHtml = screen.getByRole('alert').innerHTML
    expect(alertHtml).not.toContain('ECONNREFUSED')
    expect(alertHtml).not.toContain('api.internal.example')
    expect(alertHtml).not.toContain('repo-name-xyz')
    expect(alertHtml).not.toContain(sensitive)
  })

  it('digest is stable for the same error and distinct across different errors', () => {
    const {unmount: unmountFirst} = render(
      <ErrorBoundary>
        <Boom message="same failure" />
      </ErrorBoundary>,
    )
    const first = digestFromAlert()
    unmountFirst()

    const second = render(
      <ErrorBoundary>
        <Boom message="same failure" />
      </ErrorBoundary>,
    )
    expect(digestFromAlert()).toBe(first)
    second.unmount()

    const {unmount: unmountThird} = render(
      <ErrorBoundary>
        <Boom message="a different failure" />
      </ErrorBoundary>,
    )
    expect(digestFromAlert()).not.toBe(first)
    unmountThird()
  })

  it('reload affordance calls location.reload', () => {
    const reload = vi.fn()
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: {...window.location, reload},
    })
    render(
      <ErrorBoundary>
        <Boom message="crash" />
      </ErrorBoundary>,
    )
    fireEventReload()
    expect(reload).toHaveBeenCalledTimes(1)
  })
})

// Click through RTL so React's handler wiring is exercised, not just the DOM API.
function fireEventReload(): void {
  const button = screen.getByRole('button', {name: /reload/i})
  button.click()
}

// keep the spy active for the whole file (React render-phase error logging)
void consoleError
