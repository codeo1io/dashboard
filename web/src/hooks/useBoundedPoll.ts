import { useCallback, useEffect, useRef } from 'react'

/**
 * rm-251: shared bounded-poll hook — the rm-155 Listener.tsx lifecycle,
 * extracted so every polling view gets it by construction instead of by
 * copy-paste (Monitoring.tsx wedged permanently precisely because its copy
 * predated the pattern: no timeout race, no unmount abort, latch released
 * only on the settled path).
 *
 * Contract with the fetcher: it must be Result-style and must NOT reject
 * (catch internally and return a failure result, like web/src/api/listener.ts
 * and web/src/api/monitoring.ts). Any rejection that still escapes —
 * including the wall-clock timeout race below — is delivered to onResult as
 * `timeoutResult`, mirroring the proven rm-155 shape.
 */
export interface BoundedPollConfig<T> {
  /** Result-style fetch; receives the per-call abort signal. Must not reject. */
  readonly fetcher: (abortSignal: AbortSignal) => Promise<T>
  /** Hard ceiling on one poll in ms. The race alone releases the latch even against a transport that never settles and ignores the signal; the abort additionally cancels the request when honored. */
  readonly timeoutMs: number
  /** Interval between background polls in ms. */
  readonly intervalMs: number
  /** Result delivered to onResult when the fetch loses the timeout race. */
  readonly timeoutResult: T
  /** View callback for every settled result (success or failure). */
  readonly onResult: (result: T) => void
  /** Optional callback when the initial poll starts (e.g. flip to a loading state). */
  readonly onInitialStart?: () => void
  /** Refetch on window focus. Default: true. */
  readonly refetchOnFocus?: boolean
  /** Refetch on document visibility returning to 'visible'. Default: false. */
  readonly refetchOnVisibility?: boolean
  /**
   * rm-479: skip polls entirely while `document.hidden` and resume with an
   * immediate poll when the tab becomes visible again (implies the
   * visibilitychange listener — no need to also set refetchOnVisibility).
   * Default: false (Monitoring/Listener semantics: keep polling in hidden
   * tabs; their data must be fresh the instant the operator returns).
   */
  readonly pauseWhenHidden?: boolean
  /**
   * rm-208/rm-479: kill switch for the whole loop — while `false`, no poll is
   * issued from ANY trigger (initial mount, interval tick, focus, visibility).
   * Read live via the latest-ref pattern, so a view can stop polling on a
   * terminal condition (e.g. a 401 that only a fresh sign-in — a full-page
   * navigation and remount — can clear) without re-registering timers or
   * listeners; the still-ticking interval becomes a no-op. Default: true.
   */
  readonly enabled?: boolean
}

/**
 * rm-479 config contract: `intervalMs`, `refetchOnFocus` and
 * `refetchOnVisibility` are captured when the hook MOUNTS — the wiring effect
 * runs once, on purpose (latest-ref views re-render on every result and must
 * never re-register timers/listeners). Pass module constants; a config value
 * changed on a later render has no effect until the view remounts.
 * `pauseWhenHidden` is read live on every poll via the latest-ref pattern
 * (a changed value takes effect on the next tick), though the
 * visibility-listener wiring it feeds is mount-frozen. `enabled` is likewise
 * read live on every poll and gates every trigger. `timeoutMs`,
 * `timeoutResult` and the callbacks are read live via the latest-ref pattern
 * and MAY change per render. Pinned by web/src/hooks/useBoundedPoll.test.ts.
 */

export function useBoundedPoll<T>(config: BoundedPollConfig<T>): {poll: (isInitial?: boolean) => Promise<void>} {
  // Latest-ref pattern: views re-render on every onResult (state changes), so
  // the callbacks must never re-run the wiring effects below.
  const configRef = useRef(config)
  configRef.current = config

  const isFetchingRef = useRef(false)
  /** rm-155/rm-251: the in-flight request's controller, aborted on unmount. */
  const activeAbortRef = useRef<AbortController | null>(null)

  const poll = useCallback(async (isInitial = false) => {
    // rm-208: live-read kill switch — a disabled loop issues no fetch from any
    // trigger (initial, interval, focus, visibility), mirroring the teardown
    // the hand-rolled rm-155 wiring did on auth expiry.
    if (configRef.current.enabled === false) return
    if (isFetchingRef.current) return
    // rm-479: hidden-tab pause — when enabled, a background tab polls nothing;
    // the visibilitychange listener below resumes with an immediate poll.
    if (configRef.current.pauseWhenHidden === true && document.hidden) return
    isFetchingRef.current = true

    if (isInitial && configRef.current.onInitialStart !== undefined) {
      configRef.current.onInitialStart()
    }

    const abortController = new AbortController()
    activeAbortRef.current = abortController
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    try {
      // Race the fetch against a wall-clock timeout AND abort the controller
      // when it fires (rm-155 semantics, preserved verbatim).
      const result = await Promise.race([
        configRef.current.fetcher(abortController.signal),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            abortController.abort()
            reject(new Error('bounded poll timed out'))
          }, configRef.current.timeoutMs)
        }),
      ]).catch((): T => configRef.current.timeoutResult)

      configRef.current.onResult(result)
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId)
      activeAbortRef.current = null
      isFetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    void poll(true)
    // rm-155/rm-251: cancel the in-flight request when the view unmounts.
    return () => {
      activeAbortRef.current?.abort()
    }
  }, [poll])

  useEffect(() => {
    const cfg = configRef.current
    const handleFocus = () => {
      void poll(false)
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void poll(false)
      }
    }

    if (cfg.refetchOnFocus !== false) {
      window.addEventListener('focus', handleFocus)
    }
    // rm-479: pauseWhenHidden implies the resume listener (refetchOnVisibility
    // remains the standalone opt-in for views that poll hidden tabs).
    if (cfg.refetchOnVisibility === true || cfg.pauseWhenHidden === true) {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    const intervalId = setInterval(() => {
      void poll(false)
    }, cfg.intervalMs)

    return () => {
      if (cfg.refetchOnFocus !== false) {
        window.removeEventListener('focus', handleFocus)
      }
      if (cfg.refetchOnVisibility === true || cfg.pauseWhenHidden === true) {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
      clearInterval(intervalId)
    }
  }, [poll])

  return {poll}
}
