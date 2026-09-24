/**
 * Graceful shutdown (rm-171).
 *
 * The container runs `node src/server.ts` as PID 1, so there are no default
 * signal dispositions: without handlers, SIGTERM/SIGINT kill the process
 * immediately and in-flight requests + the listener store are dropped. This
 * module installs the handlers that turn a signal into an orderly drain:
 *
 *   1. stop accepting new connections (`server.close`)
 *   2. stop the aggregator interval (the existing 'close' listener wiring)
 *   3. close the listener SQLite store
 *   4. exit — with a bounded force-exit timer so a hung connection can never
 *      wedge shutdown past the deadline (container managers SIGKILL at ~10s).
 *
 * Everything is injectable for tests (signals via `on`, timers, exit, log).
 */

import process from 'node:process'

export interface ShutdownDeps {
  /** Node-style signal registration (defaults to process.on). */
  readonly on?: (signal: string, listener: () => void) => unknown
  /** Stop accepting connections; invokes its callback once drained. */
  readonly closeServer: (callback: (err?: unknown) => void) => void
  /** Cancel the aggregator refresh interval, if any. */
  readonly stopAggregator?: () => void
  /** Close the listener SQLite store, if any. */
  readonly closeListenerStore?: () => void
  /** Upper bound on graceful drain before forced exit (ms). */
  readonly forceExitAfterMs?: number
  /** Timer injection for tests. */
  readonly setTimeoutFn?: (fn: () => void, ms: number) => unknown
  /** Exit injection for tests. */
  readonly exit?: (code: number) => unknown
  /** Log injection for tests; receives structured lines only. */
  readonly log?: (message: string, context?: Record<string, unknown>) => void
}

/**
 * Install SIGTERM/SIGINT handlers. Returns the list of signals now handled.
 * Idempotent at the process level: the second signal forces a plain exit(1)
 * so a stuck drain can always be interrupted.
 */
export function installShutdownHandlers(deps: ShutdownDeps): readonly string[] {
  const {
    on = (signal, listener) => process.on(signal, listener),
    closeServer,
    stopAggregator,
    closeListenerStore,
    forceExitAfterMs = 10_000,
    setTimeoutFn = (fn, ms) => setTimeout(fn, ms),
    exit = code => process.exit(code),
    log = (message, context) => console.warn(message, context ?? ''),
  } = deps

  const signals = ['SIGTERM', 'SIGINT'] as const
  let shutdownStarted = false

  function shutdown(signal: string): void {
    if (shutdownStarted) {
      // Second signal during drain: give up gracefully-worded force exit.
      log('Shutdown already in progress; forcing exit', {signal})
      exit(1)
      return
    }
    shutdownStarted = true
    let settled = false

    log('Received shutdown signal; draining', {signal, forceExitAfterMs})

    // Bounded drain: whatever hangs (keep-alive connection, store close),
    // the process still exits before the runtime manager SIGKILLs it.
    // The settled guard makes a late deadline fire a no-op even when timers
    // are injected/faked (where clearTimeout cannot reach the captured fn).
    const timer = setTimeoutFn(() => {
      if (settled) return
      log('Graceful drain deadline exceeded; forcing exit', {signal, forceExitAfterMs})
      exit(1)
    }, forceExitAfterMs)

    // Best-effort cleanup order: interval first (no new data churn), then the
    // store, then connections. Errors in any step are logged, never thrown —
    // shutdown must always proceed.
    try {
      stopAggregator?.()
    } catch (error) {
      log('Failed to stop aggregator during shutdown', {error: String(error)})
    }
    try {
      closeListenerStore?.()
    } catch (error) {
      log('Failed to close listener store during shutdown', {error: String(error)})
    }

    closeServer(err => {
      settled = true
      clearTimeout(timer as ReturnType<typeof setTimeout>)
      if (err !== undefined) {
        log('Server closed with error', {error: String(err)})
        exit(1)
        return
      }
      log('Shutdown complete', {signal})
      exit(0)
    })
  }

  for (const signal of signals) {
    on(signal, () => shutdown(signal))
  }
  return signals
}
