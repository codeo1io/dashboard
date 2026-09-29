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
}

export function useBoundedPoll<T>(config: BoundedPollConfig<T>): {poll: (isInitial?: boolean) => Promise<void>} {
  // Latest-ref pattern: views re-render on every onResult (state changes), so
  // the callbacks must never re-run the wiring effects below.
  const configRef = useRef(config)
  configRef.current = config

  const isFetchingRef = useRef(false)
  /** rm-155/rm-251: the in-flight request's controller, aborted on unmount. */
  const activeAbortRef = useRef<AbortController | null>(null)

  const poll = useCallback(async (isInitial = false) => {
    if (isFetchingRef.current) return
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
    if (cfg.refetchOnVisibility === true) {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    const intervalId = setInterval(() => {
      void poll(false)
    }, cfg.intervalMs)

    return () => {
      if (cfg.refetchOnFocus !== false) {
        window.removeEventListener('focus', handleFocus)
      }
      if (cfg.refetchOnVisibility === true) {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
      clearInterval(intervalId)
    }
  }, [poll])

  return {poll}
}
