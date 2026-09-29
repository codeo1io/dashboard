import {useEffect, useState, useCallback, useRef} from 'react'
import {AppShell} from './shell/AppShell.tsx'
import {Operator} from './views/Operator.tsx'
import {ListenerChannel} from './views/Listener.tsx'
import {Monitoring} from './views/Monitoring.tsx'
import {fetchListenerMessages} from './api/listener.ts'
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
  
  const [currentView, setCurrentView] = useState<'operator' | 'listener' | 'monitoring'>('operator')
  const [unreadCount, setUnreadCount] = useState(0)
  /** rm-155: first failure reason of the current outage — surfaced once, cleared on recovery. */
  const [unreadPollError, setUnreadPollError] = useState<string | null>(null)
  /** rm-208: epoch ms of the last successful poll — drives the stale-badge marking (aria + title). */
  const [lastGoodAt, setLastGoodAt] = useState<number | null>(null)
  /** rm-208: true once a poll returned 401 — stops the poll loop, clears the badge, drives the sign-in affordance. */
  const [authExpired, setAuthExpired] = useState(false)
  /** rm-208: a ≥2-failure streak — the rendered unread count may be stale. */
  const [badgeStale, setBadgeStale] = useState(false)
  /** rm-155: in-flight guard — never overlap polls. */
  const unreadPollInFlightRef = useRef(false)
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

  const pollUnreadCount = useCallback(async () => {
    // rm-155: in-flight guard + hidden-tab pause (the visibilitychange listener
    // below resumes polling with an immediate poll when the tab returns).
    if (unreadPollInFlightRef.current) return
    if (document.hidden) return
    unreadPollInFlightRef.current = true

    const abortController = new AbortController()
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    try {
      // rm-155: race the fetch against a wall-clock timeout so a hung
      // transport can never wedge the guard (mirrors Listener.tsx).
      const res = await Promise.race([
        fetchListenerMessages({ limit: 1, unreadOnly: true, abortSignal: abortController.signal }),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            abortController.abort()
            reject(new Error('unread poll timed out'))
          }, UNREAD_POLL_TIMEOUT_MS)
        }),
      ]).catch((): FetchListenerResult => ({ ok: false, reason: 'timeout' }))

      if (res.ok) {
        consecutiveFailuresRef.current = 0
        setUnreadCount(res.data.unreadCount)
        setUnreadPollError(null) // silent recovery
        setLastGoodAt(Date.now())
        setBadgeStale(false)
        syncAppBadge(res.data.unreadCount)
      } else {
        // rm-273/rm-208: 401 is session expiry, not transport — stop the loop
        // (the wiring effect below tears down the interval and listeners when
        // authExpired flips), clear the platform badge, and let the shell
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
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId)
      unreadPollInFlightRef.current = false
    }
  }, [])

  useEffect(() => {
    // rm-208: a 401 means the session is gone — polling can only ever return
    // 401 again, so stop the loop entirely (cleanup below clears the interval
    // and the focus/visibility listeners). Recovery is a fresh sign-in, which
    // is a full-page navigation that remounts the app.
    if (authExpired) return

    void pollUnreadCount()
    const intervalId = setInterval(() => void pollUnreadCount(), UNREAD_POLL_INTERVAL_MS)

    const handleFocus = () => void pollUnreadCount()
    window.addEventListener('focus', handleFocus)

    // rm-155: resume with an immediate poll when the tab becomes visible again.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void pollUnreadCount()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [pollUnreadCount, authExpired])

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

      {currentView === 'listener' && (
        <ListenerChannel />
      )}
    </AppShell>
  )
}
