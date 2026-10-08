import {render, screen} from '@testing-library/react'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {ErrorBoundary} from './ErrorBoundary.tsx'

/** Always throws during render, with attacker-influenced-looking detail. */
function Bomb({message}: {readonly message: string}): never {
  throw new Error(message)
}

describe('ErrorBoundary (rm-514)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders children untouched when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>dashboard content</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('dashboard content')).toBeInTheDocument()
    expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument()
  })

  it('a render throw swaps the whole client for the minimal fallback: digest + reload, never the message', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Bomb message="secret-run-1234 https://internal.example/api/runs/99 repo-name" />
      </ErrorBoundary>,
    )
    const fallback = screen.getByTestId('error-boundary-fallback')
    expect(fallback).toBeInTheDocument()
    expect(fallback.getAttribute('role')).toBe('alert')
    // The digest is a stable, non-sensitive correlation id.
    expect(screen.getByText(/Error digest: [0-9a-f]{8}/)).toBeInTheDocument()
    expect(screen.getByText('Reload dashboard')).toBeInTheDocument()
    // Sensitive detail must not reach the DOM: not the thrown message text,
    // not the component stack (React appends it to the same Error object).
    expect(screen.queryByText(/secret-run-1234/)).not.toBeInTheDocument()
    expect(document.body.textContent).not.toContain('https://internal.example')
    expect(document.body.textContent).not.toContain('repo-name')
    expect(document.body.textContent).not.toContain('at Bomb')
    // The full error still reaches the console (componentDidCatch) for
    // debugging — the boundary hides detail from the screen, not from the log.
    expect(consoleSpy).toHaveBeenCalled()
  })

  it('isolates the blast radius: healthy siblings rendered before the throw are replaced, not partially kept', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <p>healthy sibling</p>
        <Bomb message="boom" />
      </ErrorBoundary>,
    )
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument()
    expect(screen.queryByText('healthy sibling')).not.toBeInTheDocument()
  })
})
