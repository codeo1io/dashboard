import {useEffect, useState, useCallback} from 'react'
import {AppShell} from './shell/AppShell.tsx'
import {Operator} from './views/Operator.tsx'
import {ListenerChannel} from './views/Listener.tsx'
import {fetchListenerMessages} from './api/listener.ts'
import type {OperatorState} from './operator/state.ts'

interface FixtureState {
  readonly fixtureMode: true
  readonly fixtureEndpointBase: string
  readonly fixtureSessionId: string
}

// Listener-poll status — see the poll loop below. Surfaced via a
// screen-reader-only status node that renders ONLY on failure, so the
// healthy-state DOM (and the Playwright visual baselines) stay unchanged.
type ListenerPollStatus = 'ok' | 'auth' | 'unavailable'

const POLL_BASE_MS = 30_000
const POLL_MAX_BACKOFF_MS = 300_000

export default function App() {
  const [operatorState, setOperatorState] = useState<OperatorState>('ready')
  const [fixtureState, setFixtureState] = useState<FixtureState | null>(null)
  const [fixtureDetectionSettled, setFixtureDetectionSettled] = useState(!import.meta.env.DEV)
  
  const [currentView, setCurrentView] = useState<'operator' | 'listener'>('operator')
  const [unreadCount, setUnreadCount] = useState(0)
  // Listener-poll status — the minimal surfacing for poll outcomes the unread
  // badge cannot express. 'ok' renders nothing (default DOM unchanged, so
  // visual baselines stay valid); failure states render a screen-reader-only
  // status node (see the JSX below).
  const [listenerPollStatus, setListenerPollStatus] =
    useState<ListenerPollStatus>('ok')

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

  // Poll the listener unread count for the nav badge. Response classes are
  // handled explicitly — nothing is silently swallowed (2026-09-26, cycle
  // batch B1):
  // - ok            → update the badge, reset backoff, keep the 30s cadence
  // - 'auth'        → 401/403: the operator session expired — surface + STOP
  //                   (cannot self-recover; the operator reloads to
  //                   re-authenticate)
  // - 'unavailable' → 404/410: the listener surface is not mounted on this
  //                   deployment — surface + STOP (polling would 404 forever)
  // - transient ('network' | 'timeout' | 'contract-drift') → keep the last
  //                   good badge value and back off exponentially, capped at
  //                   POLL_MAX_BACKOFF_MS — the failure is visible in
  //                   behavior (slower polling), never as a badge reset.
  const pollUnreadCount = useCallback(async (): Promise<
    'ok' | 'auth' | 'unavailable' | 'transient'
  > => {
    const res = await fetchListenerMessages({ limit: 1, unreadOnly: true })
    if (res.ok) {
      setUnreadCount(res.data.unreadCount)
      setListenerPollStatus('ok')
      return 'ok'
    }
    if (res.reason === 'auth') {
      setListenerPollStatus('auth')
      return 'auth'
    }
    if (res.reason === 'unavailable') {
      setListenerPollStatus('unavailable')
      return 'unavailable'
    }
    // Transient: keep the last good unreadCount (no reset to zero) and let
    // the loop's backoff stretch the next attempt.
    return 'transient'
  }, [])

  useEffect(() => {
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let transientFailures = 0

    const schedule = (delayMs: number) => {
      timer = setTimeout(() => {
        void tick()
      }, delayMs)
    }

    const tick = async () => {
      const outcome = await pollUnreadCount()
      if (stopped) return
      if (outcome === 'auth' || outcome === 'unavailable') {
        // Permanent stop — a stopped poller never restarts on its own, and a
        // focus event must not resurrect it: 'auth' recovers only via an
        // operator reload, 'unavailable' only via a server-side change.
        return
      }
      if (outcome === 'ok') {
        transientFailures = 0
        schedule(POLL_BASE_MS)
      } else {
        transientFailures += 1
        schedule(Math.min(POLL_BASE_MS * 2 ** transientFailures, POLL_MAX_BACKOFF_MS))
      }
    }

    void tick()

    const handleFocus = () => {
      if (stopped) return
      // Poll immediately on focus (fresh badge when the tab returns) unless
      // a tick is already in flight — that tick reschedules on completion.
      if (timer !== undefined) {
        clearTimeout(timer)
        void tick()
      }
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      stopped = true
      if (timer !== undefined) clearTimeout(timer)
      window.removeEventListener('focus', handleFocus)
    }
  }, [pollUnreadCount])

  return (
    <AppShell
      pushEndpointBase={fixtureState ? `${fixtureState.fixtureEndpointBase}/push` : undefined}
      pushConfigReady={fixtureDetectionSettled}
      pushFixtureSessionId={fixtureState?.fixtureSessionId}
      currentView={currentView}
      onNavigate={setCurrentView}
      listenerUnreadCount={unreadCount}
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
      
      {currentView === 'listener' && (
        <ListenerChannel />
      )}

      {listenerPollStatus !== 'ok' && (
        <p data-testid="listener-poll-status" role="status" style={{position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0}}>
          {listenerPollStatus === 'auth'
            ? 'Listener sign-in expired — reload to re-authenticate.'
            : 'Listener channel is not available on this deployment.'}
        </p>
      )}
    </AppShell>
  )
}
