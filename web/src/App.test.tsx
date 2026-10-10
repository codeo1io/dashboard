import {render, screen, waitFor, act} from '@testing-library/react'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import App, {REPROBE_TIMEOUT_MS, UNREAD_POLL_INTERVAL_MS} from './App.tsx'

// jsdom doesn't implement matchMedia — stub it (same pattern as AppShell.test.tsx)
function stubMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

describe('App', () => {
  beforeEach(async () => {
    stubMatchMedia()
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    // In dev builds, fixture detection must settle before the runtime mounts.
    // Stub fetchFixtureSession to resolve null immediately so tests that check
    // ready-state DOM don't have to wait for a real async fetch.
    const fixtureLoader = await import('./operator/fixture-runtime-loader.ts')
    vi.spyOn(fixtureLoader, 'fetchFixtureSession').mockResolvedValue(null)
    const runtimeModule = await import('./operator/runtime.ts')
    vi.spyOn(runtimeModule, 'createOperatorRuntime').mockImplementation(() => ({
      isMounted: true,
      cleanup: vi.fn(),
    }))
    // App polls the listener unread count on mount + interval for the nav badge.
    // Stub it so the operator-runtime assertions don't race an unmocked fetch.
    const listenerApi = await import('./api/listener.ts')
    vi.spyOn(listenerApi, 'fetchListenerMessages').mockResolvedValue({
      ok: true,
      data: {messages: [], unreadCount: 0, prunedCount: 0, droppedCount: 0},
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the brand name', () => {
    render(<App />)
    // AppShell renders "Fro Bot" as the brand mark text
    expect(screen.getByText('Fro Bot')).toBeInTheDocument()
  })

  it('mounts without throwing', () => {
    expect(() => render(<App />)).not.toThrow()
  })

  it('renders AppShell nav', () => {
    render(<App />)
    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    expect(screen.getByTestId('app-nav')).toBeInTheDocument()
  })

  it('renders Operator view inside AppShell', () => {
    render(<App />)
    // Operator shell renders an h1 heading — not a monitoring loading state.
    // Use level:1 because ready state also renders h2 section headings.
    expect(screen.getByRole('heading', {level: 1})).toBeInTheDocument()
  })

  // ── Regression: monitoring surface renders only on nav, never by default ───
  // (rm-192's drill-down view landed at the 7cf68fea integrate — App mounts it
  // lazily behind the third nav button ('Repos'); the default render must stay
  // free of monitoring artifacts so the operator shell remains the landing view.)

  it('does not render monitoring loading state by default', () => {
    render(<App />)
    expect(document.querySelector('[data-testid="monitoring-loading"]')).toBeNull()
  })

  it('does not render monitoring view by default (it renders on nav, rm-192)', () => {
    render(<App />)
    expect(document.querySelector('[data-testid="monitoring-view"]')).toBeNull()
  })

  it('does not render monitoring dashboard title by default', () => {
    render(<App />)
    expect(screen.queryByText(/repository status/i)).not.toBeInTheDocument()
  })

  // ── Regression: operator runtime shell mounts by default ──────────────────

  it('renders operator runtime shell by default (not indefinite connecting state)', async () => {
    const {act} = await import('react')
    await act(async () => { render(<App />) })
    // The assembled app must enter ready state so the runtime DOM skeleton is present.
    // Detection settles (null session) then operatorState='ready' takes effect.
    // All three elements are inside operator-content which only renders in ready state.
    await waitFor(() => {
      expect(document.querySelector('#launch-form')).not.toBeNull()
      expect(document.querySelector('#repo-picker-container')).not.toBeNull()
      expect(document.querySelector('[data-role="run-index-list"]')).not.toBeNull()
    })
  })

  it('does not render indefinite connecting state as primary UI', async () => {
    const {act} = await import('react')
    await act(async () => { render(<App />) })
    // "Connecting…" / "Establishing operator session." must not be the only visible state.
    // If the runtime shell is present, the connecting copy is superseded.
    // Wait for both operator-content and launch-form to appear after detection settles.
    await waitFor(() => {
      expect(document.querySelector('[data-testid="operator-content"]')).not.toBeNull()
      expect(document.querySelector('#launch-form')).not.toBeNull()
    })
  })

  // ── Regression: SW prompts remain reachable ────────────────────────────────

  it('ReloadPrompt is mounted (SW update affordance survives shell swap)', () => {
    render(<App />)
    // ReloadPrompt renders null when needRefresh is false (the default in tests),
    // but it must be mounted so the SW registration hook runs.
    // We verify AppShell is present (which always mounts ReloadPrompt).
    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
  })
  // rm-155/rm-158: unread-poll hygiene — surface failures once, keep polling,
  // badge follows the count, and hidden tabs pause the poll.
  describe('unread poll hygiene (rm-155/rm-158)', () => {
    function stubBadgeApis() {
      const setAppBadge = vi.fn().mockResolvedValue(undefined)
      const clearAppBadge = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(Navigator.prototype, 'setAppBadge', {value: setAppBadge, configurable: true})
      Object.defineProperty(Navigator.prototype, 'clearAppBadge', {value: clearAppBadge, configurable: true})
      return {setAppBadge, clearAppBadge}
    }

    function stubHidden(hidden: boolean) {
      Object.defineProperty(document, 'hidden', {value: hidden, configurable: true, writable: true})
      Object.defineProperty(document, 'visibilityState', {value: hidden ? 'hidden' : 'visible', configurable: true, writable: true})
    }

    // rm-866: the focus re-probe family below drives the clock with fake
    // timers; restoring here (not only inside each test) keeps a mid-test
    // failure from leaking the fake clock into the rest of the file.
    // vi.useRealTimers() is a no-op when real timers are already installed.
    afterEach(() => {
      vi.useRealTimers()
    })

    it('sets the app badge from the unread count and clears it at zero', async () => {
      const {setAppBadge, clearAppBadge} = stubBadgeApis()
      const listenerApi = await import('./api/listener.ts')
      const spy = vi.mocked(listenerApi.fetchListenerMessages)
      spy.mockResolvedValue({ok: true, data: {messages: [], unreadCount: 3, prunedCount: 0, droppedCount: 0}})

      render(<App />)
      await waitFor(() => expect(setAppBadge).toHaveBeenCalledWith(3))

      spy.mockResolvedValue({ok: true, data: {messages: [], unreadCount: 0, prunedCount: 0, droppedCount: 0}})
      stubHidden(false)
      act(() => { window.dispatchEvent(new Event('focus')) })
      await waitFor(() => expect(clearAppBadge).toHaveBeenCalled())
    })

    it('surfaces the unread poll failure once and recovers silently', async () => {
      stubBadgeApis()
      const listenerApi = await import('./api/listener.ts')
      const spy = vi.mocked(listenerApi.fetchListenerMessages)
      spy.mockResolvedValue({ok: false, reason: 'network'})

      render(<App />)
      await waitFor(() => expect(screen.getByTestId('unread-poll-error')).toBeInTheDocument())

      // Recovery: a successful poll clears the error without any user action.
      spy.mockResolvedValue({ok: true, data: {messages: [], unreadCount: 0, prunedCount: 0, droppedCount: 0}})
      act(() => { window.dispatchEvent(new Event('focus')) })
      await waitFor(() => expect(screen.queryByTestId('unread-poll-error')).not.toBeInTheDocument())
    })

    it('rm-208: a 401 renders the sign-in affordance, clears the platform badge, and STOPS the poll loop', async () => {
      const {clearAppBadge} = stubBadgeApis()
      const listenerApi = await import('./api/listener.ts')
      const spy = vi.mocked(listenerApi.fetchListenerMessages)
      spy.mockResolvedValue({ok: false, reason: 'unauthenticated'})

      // rm-866: fake timers — the mount poll and every settle below advance
      // on the driven clock, so no assertion races the wall clock under
      // full-suite load (this family's flake, assess 9d18c80b).
      vi.useFakeTimers()
      render(<App />)
      await act(async () => { await vi.advanceTimersByTimeAsync(0) })
      expect(screen.getByTestId('unread-auth-expired')).toBeInTheDocument()
      // Session expiry clears the platform badge (a count nobody is refreshing
      // must not linger on the dock).
      expect(clearAppBadge).toHaveBeenCalled()

      // The loop is torn down: the interval and the visibility handler may
      // not fire further polls (they could only ever 401 again). rm-487
      // narrows the freeze to the loop itself — a FOCUS event now fires
      // exactly one bounded session re-probe (cross-tab re-login recovery),
      // which here also 401s and leaves the expired state standing. rm-866:
      // advancing past a full poll interval is now deterministic — the old
      // 50ms real-clock sleep only sampled the first instant.
      spy.mockClear()
      document.dispatchEvent(new Event('visibilitychange'))
      await act(async () => { await vi.advanceTimersByTimeAsync(UNREAD_POLL_INTERVAL_MS + 1000) })
      expect(spy.mock.calls.length).toBe(0)

      act(() => { window.dispatchEvent(new Event('focus')) })
      // rm-866: the re-probe fires synchronously with the event (the listener
      // was attached by the already-flushed effect) — assert the call count
      // directly instead of wall-clock waitFor racing it.
      expect(spy.mock.calls.length).toBe(1)
      await act(async () => { await vi.advanceTimersByTimeAsync(25) })
      expect(spy.mock.calls.length).toBe(1) // the re-probe, and nothing else
      expect(screen.getByTestId('unread-auth-expired')).toBeInTheDocument()
      // The network-stale indicator is NOT the story here — sign-in is.
      expect(screen.queryByTestId('unread-poll-error')).not.toBeInTheDocument()
    })

    it('rm-487: a focus re-probe after cross-tab re-login recovers the session, feeds the result half, and re-arms the loop', async () => {
      const {setAppBadge} = stubBadgeApis()
      const listenerApi = await import('./api/listener.ts')
      const spy = vi.mocked(listenerApi.fetchListenerMessages)
      spy.mockResolvedValueOnce({ok: false, reason: 'unauthenticated'})
      spy.mockResolvedValue({ok: true, data: {messages: [], unreadCount: 4, prunedCount: 0, droppedCount: 0}})

      // rm-866: fake timers — see the rm-208 dormancy test above.
      vi.useFakeTimers()
      render(<App />)
      // rm-866 (fake timers) subsumes rm-651's pending-effect flush: the
      // act+advance flush guarantees the focus-listener attach before any
      // dispatch below, on the driven clock rather than the wall clock.
      await act(async () => { await vi.advanceTimersByTimeAsync(0) })
      expect(screen.getByTestId('unread-auth-expired')).toBeInTheDocument()

      // Re-login happened in another tab; focusing this one re-probes once.
      act(() => { window.dispatchEvent(new Event('focus')) })
      expect(spy.mock.calls.length).toBe(2) // the mount poll, then the probe
      // rm-866: deterministic settle — the old waitFor raced the probe's
      // resolve against the suite's load; now the clock flushes it.
      await act(async () => { await vi.advanceTimersByTimeAsync(25) })
      expect(screen.queryByTestId('unread-auth-expired')).not.toBeInTheDocument()
      // The fresh count flows through the result half without remount.
      expect(screen.getByTestId('unread-badge')).toHaveTextContent('4')
      expect(setAppBadge).toHaveBeenCalledWith(4)

      // The loop is re-armed: the hook's own focus poll flows again, and the
      // interval issues its first post-recovery poll on the driven clock
      // (rm-866: both now deterministic).
      spy.mockClear()
      act(() => { window.dispatchEvent(new Event('focus')) })
      expect(spy.mock.calls.length).toBe(1)
      await act(async () => { await vi.advanceTimersByTimeAsync(25) })
      expect(spy.mock.calls.length).toBe(1) // one focus, one poll — no dupes
      await act(async () => { await vi.advanceTimersByTimeAsync(UNREAD_POLL_INTERVAL_MS) })
      expect(spy.mock.calls.length).toBe(2) // the re-armed interval tick
    })

    it('rm-487: a failed focus re-probe stays fail-closed and retries on the next focus', async () => {
      stubBadgeApis()
      const listenerApi = await import('./api/listener.ts')
      const spy = vi.mocked(listenerApi.fetchListenerMessages)
      spy.mockResolvedValueOnce({ok: false, reason: 'unauthenticated'})
      spy.mockResolvedValue({ok: false, reason: 'network'})

      // rm-866: fake timers — this is the test whose call-count waitFor
      // flaked under full-suite load (assess 9d18c80b, run#1: 2 of 1203).
      // The count is now asserted synchronously at dispatch and settled on
      // the driven clock.
      vi.useFakeTimers()
      render(<App />)
      // rm-866 (fake timers) subsumes rm-651's pending-effect flush: the
      // state flip settles inside the act+advance flush, so the focus
      // listener's passive effect is guaranteed attached before the dispatch
      // below (rm-651's race class cannot recur on the driven clock).
      await act(async () => { await vi.advanceTimersByTimeAsync(0) })
      expect(screen.getByTestId('unread-auth-expired')).toBeInTheDocument()
      spy.mockClear()

      // Each focus probes exactly once; failures latch nothing (a network
      // failure is not evidence the session is still alive — or dead).
      act(() => { window.dispatchEvent(new Event('focus')) })
      expect(spy.mock.calls.length).toBe(1)
      await act(async () => { await vi.advanceTimersByTimeAsync(25) })
      expect(screen.getByTestId('unread-auth-expired')).toBeInTheDocument()
      expect(spy.mock.calls.length).toBe(1)

      // The retry affordance is the next focus itself.
      act(() => { window.dispatchEvent(new Event('focus')) })
      expect(spy.mock.calls.length).toBe(2)
      await act(async () => { await vi.advanceTimersByTimeAsync(25) })
      expect(spy.mock.calls.length).toBe(2)
      expect(screen.getByTestId('unread-auth-expired')).toBeInTheDocument()

      // And the loop stays dead through it all: a full interval of driven
      // time fires no further poll (rm-866: deterministic, not sampled).
      await act(async () => { await vi.advanceTimersByTimeAsync(UNREAD_POLL_INTERVAL_MS) })
      expect(spy.mock.calls.length).toBe(2)
    })

    it('rm-208: a two-failure streak marks the rendered badge stale (aria + title with the last-good timestamp)', async () => {
      stubBadgeApis()
      const listenerApi = await import('./api/listener.ts')
      const spy = vi.mocked(listenerApi.fetchListenerMessages)
      spy.mockResolvedValueOnce({ok: true, data: {messages: [], unreadCount: 5, prunedCount: 0, droppedCount: 0}})

      render(<App />)
      await waitFor(() => expect(screen.getByTestId('unread-badge')).toHaveTextContent('5'))

      spy.mockResolvedValue({ok: false, reason: 'network'})
      // rm-651 (2026-10-09): flush pending passive effects before dispatching
      // so the hook's focus-poll attach cannot race the dispatch.
      await act(async () => {})
      // Failure 1: outage indicator only, badge not yet marked stale.
      act(() => { window.dispatchEvent(new Event('focus')) })
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 25)) })
      expect(screen.getByTestId('unread-badge').getAttribute('title')).toBeNull()

      // Failure 2 (>= UNREAD_POLL_FAILURES_BEFORE_BADGE_CLEAR): the rendered
      // count is now suspect — mark it stale with the last-good timestamp.
      act(() => { window.dispatchEvent(new Event('focus')) })
      await waitFor(() => {
        const badge = screen.getByTestId('unread-badge')
        expect(badge.getAttribute('title')).toMatch(/stale/i)
        expect(badge.getAttribute('aria-label')).toMatch(/stale/i)
      })
    })

    it('skips polling while the tab is hidden and resumes on visibilitychange', async () => {
      stubBadgeApis()
      stubHidden(true)
      const listenerApi = await import('./api/listener.ts')
      const spy = vi.mocked(listenerApi.fetchListenerMessages)

      render(<App />)
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 25)) })
      expect(spy.mock.calls.length).toBe(0)

      stubHidden(false)
      act(() => { document.dispatchEvent(new Event('visibilitychange')) })
      await waitFor(() => expect(spy.mock.calls.length).toBeGreaterThanOrEqual(1))
    })
  })
})

describe('App — runtime state wiring', () => {
  beforeEach(async () => {
    stubMatchMedia()
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    // Settle fixture detection immediately so runtime mounts in ready state.
    const fixtureLoader = await import('./operator/fixture-runtime-loader.ts')
    vi.spyOn(fixtureLoader, 'fetchFixtureSession').mockResolvedValue(null)
    // App polls the listener unread count on mount + interval for the nav badge.
    // Stub it so the operator-runtime assertions don't race an unmocked fetch.
    const listenerApi = await import('./api/listener.ts')
    vi.spyOn(listenerApi, 'fetchListenerMessages').mockResolvedValue({
      ok: true,
      data: {messages: [], unreadCount: 0, prunedCount: 0, droppedCount: 0},
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('runtime reporting unavailable transitions shell to unavailable state', async () => {
    const {act, waitFor: wf} = await import('@testing-library/react')
    const runtimeModule = await import('./operator/runtime.ts')

    let capturedOnStateChange: ((state: import('./operator/state.ts').OperatorState) => void) | undefined

    const createSpy = vi.spyOn(runtimeModule, 'createOperatorRuntime')
    createSpy.mockImplementation((opts) => {
      capturedOnStateChange = opts.onStateChange
      return {isMounted: true, cleanup: vi.fn()}
    })

    await act(async () => { render(<App />) })

    // Wait for detection to settle and runtime to mount
    await wf(() => { expect(createSpy).toHaveBeenCalled() })

    // Simulate runtime reporting unavailable
    await act(async () => {
      capturedOnStateChange?.('unavailable')
    })

    // Shell should now show unavailable state (service unavailable headline)
    expect(screen.getByText(/service unavailable/i)).toBeInTheDocument()

    createSpy.mockRestore()
  })

  it('App passes onRuntimeStateChange to Operator', async () => {
    const {act, waitFor: wf} = await import('@testing-library/react')
    const runtimeModule = await import('./operator/runtime.ts')

    const createSpy = vi.spyOn(runtimeModule, 'createOperatorRuntime')
    createSpy.mockImplementation(() => ({isMounted: true, cleanup: vi.fn()}))

    await act(async () => { render(<App />) })

    // Wait for detection to settle and runtime to mount
    await wf(() => {
      // createOperatorRuntime should have been called (Operator is in ready state and wired)
      expect(createSpy).toHaveBeenCalled()
    })
    const callOpts = createSpy.mock.calls[0]?.[0]
    expect(typeof callOpts?.onStateChange).toBe('function')

    createSpy.mockRestore()
  })
})

describe('App — fixture mode detection', () => {
  beforeEach(() => {
    stubMatchMedia()
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('does NOT render fixture-mode indicator in non-fixture mode (default)', () => {
    render(<App />)
    expect(document.querySelector('[data-testid="fixture-mode-indicator"]')).toBeNull()
  })

  it('Operator renders fixture-mode indicator when fixtureMode prop is true', async () => {
    const {Operator} = await import('./views/Operator.tsx')
    render(<Operator state="ready" fixtureMode={true} fixtureEndpointBase="/__fixture/operator" fixtureSessionId="fixture-session-0001" />)
    expect(document.querySelector('[data-testid="fixture-mode-indicator"]')).not.toBeNull()
  })

  it('Operator does NOT render fixture-mode indicator when fixtureMode is not set', async () => {
    const {Operator} = await import('./views/Operator.tsx')
    render(<Operator state="ready" />)
    expect(document.querySelector('[data-testid="fixture-mode-indicator"]')).toBeNull()
  })

  it('App renders fixture-mode indicator when fixture session fetch succeeds in dev env', async () => {
    const {act, waitFor} = await import('@testing-library/react')

    // Mock createOperatorRuntime to prevent real dynamic imports
    const runtimeModule = await import('./operator/runtime.ts')
    const createSpy = vi.spyOn(runtimeModule, 'createOperatorRuntime')
    createSpy.mockImplementation(() => ({isMounted: true, cleanup: vi.fn()}))

    // Mock fetchFixtureSession to return a valid session
    const fixtureLoader = await import('./operator/fixture-runtime-loader.ts')
    const fetchSpy = vi.spyOn(fixtureLoader, 'fetchFixtureSession').mockResolvedValue({
      fixtureMode: true,
      fixtureSessionId: 'fixture-session-0001',
    })

    await act(async () => {
      render(<App />)
    })

    // Wait for the async fixture detection to complete and re-render
    await waitFor(() => {
      expect(document.querySelector('[data-testid="fixture-mode-indicator"]')).not.toBeNull()
    })

    fetchSpy.mockRestore()
    createSpy.mockRestore()
  })
})

// ── Fixture detection race fix ─────────────────────────────────────────────
// These tests verify that in dev builds, createOperatorRuntime is NOT called
// before fixture detection settles, preventing the race where the non-fixture
// runtime starts with /operator endpoints before /__fixture/operator is known.

describe('App — fixture detection race: runtime must not mount before detection settles', () => {
  beforeEach(() => {
    stubMatchMedia()
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('createOperatorRuntime is NOT called before fixture detection resolves (dev build)', async () => {
    const {act} = await import('react')

    const runtimeModule = await import('./operator/runtime.ts')
    const createSpy = vi.spyOn(runtimeModule, 'createOperatorRuntime')
    createSpy.mockImplementation(() => ({isMounted: true, cleanup: vi.fn()}))

    // fetchFixtureSession that never resolves during this test
    const fixtureLoader = await import('./operator/fixture-runtime-loader.ts')
    let resolveFixture!: (v: null) => void
    const pendingFixture = new Promise<null>(resolve => { resolveFixture = resolve })
    const fetchSpy = vi.spyOn(fixtureLoader, 'fetchFixtureSession').mockReturnValue(pendingFixture)

    await act(async () => {
      render(<App />)
    })

    // Detection is still pending — runtime must NOT have been called yet
    expect(createSpy).not.toHaveBeenCalled()

    // Resolve detection so cleanup is clean (wrapped in act to avoid act() warning)
    const {act: actWrap} = await import('@testing-library/react')
    await actWrap(async () => { resolveFixture(null) })

    fetchSpy.mockRestore()
    createSpy.mockRestore()
  })

  it('createOperatorRuntime receives fixture endpoint base when fixture session resolves', async () => {
    const {act, waitFor} = await import('@testing-library/react')

    const runtimeModule = await import('./operator/runtime.ts')
    const createSpy = vi.spyOn(runtimeModule, 'createOperatorRuntime')
    createSpy.mockImplementation(() => ({isMounted: true, cleanup: vi.fn()}))

    const fixtureLoader = await import('./operator/fixture-runtime-loader.ts')
    const fetchSpy = vi.spyOn(fixtureLoader, 'fetchFixtureSession').mockResolvedValue({
      fixtureMode: true,
      fixtureSessionId: 'fixture-session-0001',
    })

    await act(async () => {
      render(<App />)
    })

    // Wait for detection to settle and runtime to mount
    await waitFor(() => {
      expect(createSpy).toHaveBeenCalled()
    })

    // Runtime must have been called with the fixture endpoint base
    const callOpts = createSpy.mock.calls[0]?.[0]
    expect(callOpts?.fixtureMode).toBe(true)
    expect(callOpts?.fixtureEndpointBase).toBe('/__fixture/operator')

    // Page must show fixture indicator
    expect(document.querySelector('[data-testid="fixture-mode-indicator"]')).not.toBeNull()

    fetchSpy.mockRestore()
    createSpy.mockRestore()
  })

  it('createOperatorRuntime mounts normally (no fixture props) when fixture session returns null', async () => {
    const {act, waitFor} = await import('@testing-library/react')

    const runtimeModule = await import('./operator/runtime.ts')
    const createSpy = vi.spyOn(runtimeModule, 'createOperatorRuntime')
    createSpy.mockImplementation(() => ({isMounted: true, cleanup: vi.fn()}))

    const fixtureLoader = await import('./operator/fixture-runtime-loader.ts')
    const fetchSpy = vi.spyOn(fixtureLoader, 'fetchFixtureSession').mockResolvedValue(null)

    await act(async () => {
      render(<App />)
    })

    // Wait for detection to settle and runtime to mount
    await waitFor(() => {
      expect(createSpy).toHaveBeenCalled()
    })

    // Runtime must have been called without fixture props
    const callOpts = createSpy.mock.calls[0]?.[0]
    expect(callOpts?.fixtureMode).toBeFalsy()
    expect(callOpts?.fixtureEndpointBase).toBeUndefined()

    // No fixture indicator
    expect(document.querySelector('[data-testid="fixture-mode-indicator"]')).toBeNull()

    fetchSpy.mockRestore()
    createSpy.mockRestore()
  })

  // ── rm-421a: unread-count poll in-flight guard ───────────────────────

  it('drops focus-triggered polls while one is already in flight', async () => {
    // The mount poll never resolves while we fire focus events — without the
    // in-flight guard each focus event would stack another fetch.
    const listenerApi = await import('./api/listener.ts')
    const fetchSpy = vi.spyOn(listenerApi, 'fetchListenerMessages')
    let resolvePoll: (v: {
      ok: true
      data: {messages: never[]; unreadCount: number; prunedCount: number; droppedCount: number}
    }) => void = () => {}
    fetchSpy.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolvePoll = resolve
        }),
    )

    render(<App />)
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))

    window.dispatchEvent(new Event('focus'))
    window.dispatchEvent(new Event('focus'))
    window.dispatchEvent(new Event('focus'))
    await waitFor(() => expect(document.documentElement).toBeTruthy())
    expect(fetchSpy).toHaveBeenCalledTimes(1) // still the mount poll only

    resolvePoll({ok: true, data: {messages: [], unreadCount: 0, prunedCount: 0, droppedCount: 0}})
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1)) // settle

    window.dispatchEvent(new Event('focus'))
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2)) // guard released
  })
})

// ── rm-606: fixture-session fetch must be time-bounded ─────────────────────
// The loader fetch previously had NO AbortSignal — a hung dev fixture server
// wedged fixture detection (and therefore app mount) indefinitely. These
// tests exercise the REAL loader (not the spies used above) with a stubbed
// global fetch.

describe('fetchFixtureSession time bound (rm-606)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('a hanging fixture endpoint aborts after the timeout and resolves null (fail-closed, no hang)', async () => {
    // Never resolves on its own; rejects on abort exactly like the real
    // fetch — which is what proves the loader actually PASSES the signal.
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string | URL | Request, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
          }),
      ),
    )
    const {fetchFixtureSession} = await import('./operator/fixture-runtime-loader.ts')

    const startedAt = Date.now()
    const result = await fetchFixtureSession(50) // production default is 10_000
    const elapsed = Date.now() - startedAt

    expect(result).toBeNull() // fail-closed to non-fixture runtime
    expect(elapsed).toBeLessThan(5_000) // bounded well under any test timeout
  })

  it('success path is unaffected by the bound: a fast fixture endpoint still resolves the session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({fixtureMode: true, fixtureSessionId: 'fixture-session-0001'}),
          {status: 200, headers: {'content-type': 'application/json'}},
        ),
      ),
    )
    const {fetchFixtureSession} = await import('./operator/fixture-runtime-loader.ts')

    const result = await fetchFixtureSession(5_000)

    expect(result?.fixtureMode).toBe(true)
    expect(result?.fixtureSessionId).toBe('fixture-session-0001')
  })
})

// ── rm-784 (folded into rm-866, run 8cecf1d7 cycle:1): the focus re-probe
// fetch must be time-bounded ──────────────────────────────────────────────
// The re-probe previously carried NO bound — a transport that never settled
// consumed the focus's single-shot probe forever. This exercises the REAL
// fetchListenerMessages through App's focus wiring with a stubbed global
// fetch (the rm-606 shape), driven on the fake clock.

// The rm-784 test shims AbortSignal.timeout onto the faked clock (see its
// body for why); the spy is restored by vi.restoreAllMocks in afterEach.

describe('focus re-probe fetch bound (rm-784, via rm-866)', () => {
  beforeEach(async () => {
    stubMatchMedia()
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    // Settle fixture detection without a fetch, and keep the operator runtime
    // inert — only the listener fetch path is under test here.
    const fixtureLoader = await import('./operator/fixture-runtime-loader.ts')
    vi.spyOn(fixtureLoader, 'fetchFixtureSession').mockResolvedValue(null)
    const runtimeModule = await import('./operator/runtime.ts')
    vi.spyOn(runtimeModule, 'createOperatorRuntime').mockImplementation(() => ({
      isMounted: true,
      cleanup: vi.fn(),
    }))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('a hanging re-probe aborts at the bound, latches nothing, and the next focus retries', async () => {
    vi.useFakeTimers()
    // jsdom's AbortSignal.timeout (AbortSignal-impl.js: globalObject.setTimeout)
    // schedules OUTSIDE the timers vitest fakes, so the driven clock cannot
    // fire the real static. Shim it with the same contract — abort at the
    // bound with a TimeoutError DOMException, scheduled on the faked globals
    // — while the wiring under test (bound value, signal forwarding, abort
    // settle, fail-closed, retry) stays fully real. rm-606's tests cover the
    // real static's own behavior under real timers.
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(ms => {
      const controller = new AbortController()
      setTimeout(() => controller.abort(new DOMException('The operation timed out.', 'TimeoutError')), ms)
      return controller.signal
    })
    const probes: {url: string; signal: AbortSignal | null}[] = []
    vi.stubGlobal('fetch', vi.fn((url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url)
      if (!urlStr.includes('/api/listener/messages')) {
        // Anything else that fetches at mount must not hang the test.
        return Promise.resolve(new Response(null, {status: 404}))
      }
      probes.push({url: urlStr, signal: init?.signal ?? null})
      if (probes.length === 1) {
        // The mount poll: the session is expired.
        return Promise.resolve(new Response(null, {status: 401}))
      }
      // Every later listener fetch (the focus re-probe): never resolves on
      // its own, rejects on abort exactly like the real fetch — which is
      // what proves the re-probe actually PASSES the bounded signal.
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
      })
    }))

    render(<App />)
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(screen.getByTestId('unread-auth-expired')).toBeInTheDocument()

    // Focus fires the probe; its fetch carries a signal and hangs.
    act(() => { window.dispatchEvent(new Event('focus')) })
    const probe = probes[1]
    expect(probe?.url).toContain('/api/listener/messages')
    expect(probe?.signal).toBeInstanceOf(AbortSignal)

    // Inside the bound: nothing has settled — the probe is still in flight
    // and the expired state stands.
    await act(async () => { await vi.advanceTimersByTimeAsync(REPROBE_TIMEOUT_MS - 1) })
    expect(probe?.signal?.aborted).toBe(false)
    expect(screen.getByTestId('unread-auth-expired')).toBeInTheDocument()

    // At the bound the signal fires, the hanging fetch rejects, and the
    // probe resolves failed — NOTHING latches: expired stands, the loop
    // stays down. fetchListenerMessages maps the abort to a failed Result,
    // so no rejection escapes either.
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(probe?.signal?.aborted).toBe(true)
    expect(screen.getByTestId('unread-auth-expired')).toBeInTheDocument()

    // Fail-closed is not a latch: the very next focus probes again
    // (single-shot-per-focus stands — the bound owns only the hang case).
    act(() => { window.dispatchEvent(new Event('focus')) })
    expect(probes.length).toBe(3)
  })
})
