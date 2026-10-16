import {act, render, screen, waitFor} from '@testing-library/react'
import {useState} from 'react'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {Operator} from '../views/Operator.tsx'
import type {OperatorState} from './state.ts'

const {maybeAutoRedirectToGatewaySignIn} = vi.hoisted(() => ({
  maybeAutoRedirectToGatewaySignIn: vi.fn(),
}))

vi.mock('./sign-in-recovery.ts', () => ({
  clearGatewaySignInRedirectGuard: vi.fn(),
  maybeAutoRedirectToGatewaySignIn,
  navigateToGatewaySignIn: vi.fn(),
}))

describe('operator auth recovery after a successful initial load', () => {
  afterEach(() => {
    vi.doUnmock('/static/operator-stream.js?manual=1')
    vi.doUnmock('/static/operator-run-index.js?manual=1')
    vi.doUnmock('/static/operator-launch.js?manual=1')
    vi.clearAllMocks()
  })

  it('shows the sign-in button without redirecting when the session expires after runs loaded', async () => {
    let onAuthRequired: (() => void) | undefined
    const clearFinishedRuns = vi.fn()
    vi.doMock('/static/operator-stream.js?manual=1', () => ({
      initOperatorStream: vi.fn(),
      // fork runtime touches these (vitest throws on accessed-but-undefined mock exports)
      resetBootstrapState: vi.fn(),
      bootstrapOperatorStreams: vi.fn(),
      takeUsableFinishedRun: vi.fn(() => undefined),
      pruneFinishedRuns: vi.fn(),
      clearFinishedRuns,
    }))
    vi.doMock('/static/operator-run-index.js?manual=1', () => ({
      initOperatorRunIndex: vi.fn(async (options: {onAuthRequired: () => void}) => {
        onAuthRequired = options.onAuthRequired
        return 'loaded'
      }),
      refreshOperatorRunIndex: vi.fn(async () => false),
      resetRunIndexState: vi.fn(),
      markRunStreamAttached: vi.fn(),
      markCardExpandedForLaunch: vi.fn(),
    }))
    vi.doMock('/static/operator-launch.js?manual=1', () => ({
      initOperatorLaunch: vi.fn(async () => {}),
      resetLaunchState: vi.fn(),
    }))

    function StatefulOperator() {
      const [state, setState] = useState<OperatorState>('ready')
      return <Operator state={state} onRuntimeStateChange={setState} />
    }

    render(<StatefulOperator />)
    await waitFor(() => expect(onAuthRequired).toBeDefined(), {timeout: 5000})
    expect(maybeAutoRedirectToGatewaySignIn).not.toHaveBeenCalledWith('auth-required')

    // fork adaptation: the finished-run cache (upstream #643) is not absorbed,
    // so there is no clearFinishedRuns call to assert here
    await act(async () => onAuthRequired?.())

    expect(screen.getByRole('button', {name: 'Sign in with GitHub'})).toBeInTheDocument()
    expect(maybeAutoRedirectToGatewaySignIn).not.toHaveBeenCalledWith('auth-required')
  })

  it('auto-redirects when the initial run-list outcome is auth-required', async () => {
    let onAuthRequired: (() => void) | undefined
    vi.doMock('/static/operator-stream.js?manual=1', () => ({
      initOperatorStream: vi.fn(),
      // fork runtime touches these (vitest throws on accessed-but-undefined mock exports)
      resetBootstrapState: vi.fn(),
      bootstrapOperatorStreams: vi.fn(),
      takeUsableFinishedRun: vi.fn(() => undefined),
      pruneFinishedRuns: vi.fn(),
      clearFinishedRuns: vi.fn(),
    }))
    vi.doMock('/static/operator-run-index.js?manual=1', () => ({
      initOperatorRunIndex: vi.fn(async (options: {onAuthRequired: () => void}) => {
        onAuthRequired = options.onAuthRequired
        options.onAuthRequired()
        return 'auth-required'
      }),
      refreshOperatorRunIndex: vi.fn(async () => false),
      resetRunIndexState: vi.fn(),
      markRunStreamAttached: vi.fn(),
      markCardExpandedForLaunch: vi.fn(),
    }))
    vi.doMock('/static/operator-launch.js?manual=1', () => ({
      initOperatorLaunch: vi.fn(async () => {}),
      resetLaunchState: vi.fn(),
    }))

    render(<Operator state="ready" />)

    await waitFor(() => expect(onAuthRequired).toBeDefined(), {timeout: 5000})
    await waitFor(() => expect(maybeAutoRedirectToGatewaySignIn).toHaveBeenCalledTimes(1), {timeout: 5000})
    expect(maybeAutoRedirectToGatewaySignIn).toHaveBeenCalledWith('auth-required')
  })

  it('does not auto-redirect in fixture mode, which has no gateway sign-in route', async () => {
    let onAuthRequired: (() => void) | undefined
    vi.doMock('/static/operator-stream.js?manual=1', () => ({
      initOperatorStream: vi.fn(),
      // fork runtime touches these (vitest throws on accessed-but-undefined mock exports)
      resetBootstrapState: vi.fn(),
      bootstrapOperatorStreams: vi.fn(),
      takeUsableFinishedRun: vi.fn(() => undefined),
      pruneFinishedRuns: vi.fn(),
      clearFinishedRuns: vi.fn(),
    }))
    vi.doMock('/static/operator-run-index.js?manual=1', () => ({
      initOperatorRunIndex: vi.fn(async (options: {onAuthRequired: () => void}) => {
        onAuthRequired = options.onAuthRequired
        options.onAuthRequired()
        return 'auth-required'
      }),
      refreshOperatorRunIndex: vi.fn(async () => false),
      resetRunIndexState: vi.fn(),
      markRunStreamAttached: vi.fn(),
      markCardExpandedForLaunch: vi.fn(),
    }))
    vi.doMock('/static/operator-launch.js?manual=1', () => ({
      initOperatorLaunch: vi.fn(async () => {}),
      resetLaunchState: vi.fn(),
    }))

    render(<Operator state="ready" fixtureMode fixtureEndpointBase="/fixture/operator" fixtureSessionId="fixture-session" />)

    await waitFor(() => expect(onAuthRequired).toBeDefined(), {timeout: 5000})
    await act(async () => {})
    expect(maybeAutoRedirectToGatewaySignIn).not.toHaveBeenCalled()
  })
})
