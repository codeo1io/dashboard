import {useEffect, useState, useCallback, useRef} from 'react'
import {AppShell} from './shell/AppShell.tsx'
import {Operator} from './views/Operator.tsx'
import {ListenerChannel} from './views/Listener.tsx'
import {Monitoring} from './views/Monitoring.tsx'
import {Security} from './views/Security.tsx'
import {fetchListenerMessages} from './api/listener.ts'
import {useBoundedPoll} from './hooks/useBoundedPoll.ts'
import type {OperatorState} from './operator/state.ts'

/** rm-155: poll cadence for the unread badge count. */
const UNREAD_POLL_INTERVAL_MS = 30000
/** rm-155: hard ceiling on a single poll — releases the in-flight guard even if the transport never settles. */
const UNREAD_POLL_TIMEOUT_MS = 15000
/** rm-158: consecutive poll failures before the app badge is cleared (a stale badge must not lie). */
const UNREAD_POLL_FAILURES_BEFORE_BADGE_CLEAR = 2

type FetchListenerResult = Awaited<ReturnType<typeof fetchListenerMessages>>

type BadgeCapableNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}

/** rm-158: mirror the unread count into the platform app badge (W3C Badging API, best-effort). */
function syncAppBadge(count: number): void {
  const nav = navigator as BadgeCapableNavigator
  try {
    if (count > 0) {
      nav.setAppBadge?.(count).catch(() => {})
    } else {
      nav.clearAppBadge?.().catch(() => {})
    }
  } catch {
    // Badge APIs are best-effort decoration — never fail the poll on them.
  }
}

/** rm-158: clear the badge after repeated poll failures so it cannot show stale counts. */
function clearAppBadgeBestEffort(): void {
  const nav = navigator as BadgeCapableNavigator
  try {
    nav.clearAppBadge?.().catch(() => {})
  } catch {
    // ignore
  }
}

interface FixtureState {
  readonly fixtureMode: true
  readonly fixtureEndpointBase: string
  readonly fixtureSessionId: string
}

export default function App() {
  const [operatorState, setOperatorState] = useState<OperatorState>('ready')
  const [fixtureState, setFixtureState] = useState<FixtureState | null>(null)
  const [fixtureDetectionSettled, setFixtureDetectionSettled] = useState(!import.meta.env.DEV)
  
  const [currentView, setCurrentView] = useState<'operator' | 'listener' | 'monitoring' | 'security'>('operator')
  const [unreadCount, setUnreadCount] = useState(0)
  /** rm-155: first failure reason of the current outage — surfaced once, cleared on recovery. */
  const [unreadPollError, setUnreadPollError] = useState<string | null>(null)
  /** rm-208: epoch ms of the last successful poll — drives the stale-badge marking (aria + title). */
  const [lastGoodAt, setLastGoodAt] = useState<number | null>(null)
  /** rm-208: true once a poll returned 401 — stops the poll loop, clears the badge, drives the sign-in affordance. */
  const [authExpired, setAuthExpired] = useState(false)
  /** rm-208: a ≥2-failure streak — the rendered unread count may be stale. */
  const [badgeStale, setBadgeStale] = useState(false)
  /** rm-158: consecutive poll failures (reset on success). */
  const consecutiveFailuresRef = useRef(0)

  useEffect(() => {
    if (!import.meta.env.DEV) return

    let cancelled = false
    void (async () => {
      const {fetchFixtureSession, FIXTURE_OPERATOR_PREFIX} = await import('./operator/fixture-runtime-loader.ts')
      const session = await fetchFixtureSession()
      if (cancelled) return
      if (session !== null) {
        setFixtureState({
          fixtureMode: true,
          fixtureEndpointBase: FIXTURE_OPERATOR_PREFIX as string,
          fixtureSessionId: session.fixtureSessionId,
        })
      }
      setFixtureDetectionSettled(true)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  /** rm-479: result half of the unread-badge poll — everything except the
   *  lifecycle (timeout race, in-flight guard, unmount abort, cadence) now
   *  lives in the shared useBoundedPoll hook (rm-251); this was the last
   *  hand-rolled copy of the rm-155 pattern in the tree. */
  const handleUnreadResult = useCallback((res: FetchListenerResult): void => {
    if (res.ok) {
      consecutiveFailuresRef.current = 0
      setUnreadCount(res.data.unreadCount)
      setUnreadPollError(null) // silent recovery
      setLastGoodAt(Date.now())
      setBadgeStale(false)
      syncAppBadge(res.data.unreadCount)
    } else {
      // rm-273/rm-208: 401 is session expiry, not transport — stop the loop
      // (`enabled: !authExpired` below makes every later interval, focus and
      // visibility poll a no-op), clear the platform badge, and let the shell
      // render the sign-in affordance instead of blaming the network.
      if (res.reason === 'unauthenticated') {
        setAuthExpired(true)
        clearAppBadgeBestEffort()
        return
      }
      consecutiveFailuresRef.current += 1
      // Surface the first failure of an outage once; keep it until recovery.
      setUnreadPollError(prev => prev ?? res.reason)
      if (consecutiveFailuresRef.current >= UNREAD_POLL_FAILURES_BEFORE_BADGE_CLEAR) {
        clearAppBadgeBestEffort()
        // rm-208: mark the rendered badge stale too (aria + title with the
        // last-good timestamp) instead of freezing the count silently.
        setBadgeStale(true)
      }
    }
  }, [])

  // rm-208: a 401 means the session is gone — polling can only ever return
  // 401 again, so stop the loop entirely (the hook's live-read `enabled` gate
  // makes the interval, focus and visibility polls no-ops once authExpired
  // flips). Recovery is a fresh sign-in, which is a full-page navigation
  // that remounts the app.
  useBoundedPoll<FetchListenerResult>({
    fetcher: abortSignal => fetchListenerMessages({limit: 1, unreadOnly: true, abortSignal}),
    timeoutMs: UNREAD_POLL_TIMEOUT_MS,
    intervalMs: UNREAD_POLL_INTERVAL_MS,
    timeoutResult: {ok: false, reason: 'timeout'},
    onResult: handleUnreadResult,
    // Preserves this shell's pre-existing semantics: a hidden tab polls
    // nothing, and returning to visible resumes with an immediate poll.
    pauseWhenHidden: true,
    enabled: !authExpired,
  })

  return (
    <AppShell
      pushEndpointBase={fixtureState ? `${fixtureState.fixtureEndpointBase}/push` : undefined}
      pushConfigReady={fixtureDetectionSettled}
      pushFixtureSessionId={fixtureState?.fixtureSessionId}
      currentView={currentView}
      onNavigate={setCurrentView}
      listenerUnreadCount={unreadCount}
      listenerUnreadError={unreadPollError}
      listenerUnreadStaleSince={badgeStale ? lastGoodAt : null}
      listenerUnreadAuthExpired={authExpired}
    >
      <div style={{ display: currentView === 'operator' ? 'block' : 'none' }}>
        <Operator
          state={fixtureDetectionSettled ? operatorState : 'loading'}
          onRuntimeStateChange={setOperatorState}
          fixtureMode={fixtureState?.fixtureMode}
          fixtureEndpointBase={fixtureState?.fixtureEndpointBase}
          fixtureSessionId={fixtureState?.fixtureSessionId}
        />
      </div>
      
      {currentView === 'monitoring' && (
        <Monitoring />
      )}

      {currentView === 'security' && (
        <Security />
      )}

      {currentView === 'listener' && (
        <ListenerChannel />
      )}
    </AppShell>
  )
}
