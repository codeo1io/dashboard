import type {Logger} from './logger.ts'

/**
 * Graceful shutdown wiring (rm-178).
 *
 * Under the Dockerfile CMD, node runs as PID 1: the kernel applies no default
 * signal dispositions to PID 1, so an unhandled SIGTERM is silently dropped and
 * `docker stop` escalates to SIGKILL after its timeout — the server's existing
 * 'close' listener (which stops the aggregator) never fires. This module gives
 * the dashboard an explicit, bounded drain: stop accepting connections, stop
 * the aggregator, close idle keep-alive sockets, then exit 0. A forced-exit
 * timer bounds the drain so a wedged connection cannot block termination.
 */
import process from 'node:process'

/** Structural subset of the node server surface this module needs. */
export interface GracefulServer {
  close: (callback?: (error?: Error) => void) => void
  closeAllConnections?: () => void
}

export interface GracefulShutdownOptions {
  server: GracefulServer
  logger: Logger
  /** Drain deadline before a forced exit (default 10s). */
  timeoutMs?: number
  /** Stop hook (e.g. aggregator stop); must be idempotent. */
  stop?: () => void
  /** Exit seam for tests; defaults to process.exit. */
  exit?: (code: number) => void
  /** Signal registration target; defaults to process. */
  target?: {
    once: (signal: string, listener: () => void) => unknown
    removeListener: (signal: string, listener: () => void) => unknown
  }
  signals?: readonly string[]
}

export interface GracefulShutdown {
  trigger: (signal: string) => void
  dispose: () => void
}

export function createGracefulShutdown(options: GracefulShutdownOptions): GracefulShutdown {
  const timeoutMs = options.timeoutMs ?? 10_000
  const exit = options.exit ?? ((code: number) => {
    process.exit(code)
  })
  let shuttingDown = false

  function trigger(signal: string): void {
    if (shuttingDown) return
    shuttingDown = true
    options.logger.info('Graceful shutdown initiated', {signal})
    const forceTimer = setTimeout(() => {
      options.logger.error('Graceful shutdown timed out; forcing exit', {
        signal,
        timeoutMs: String(timeoutMs),
      })
      exit(1)
    }, timeoutMs)
    forceTimer.unref()
    try {
      options.stop?.()
    } catch (error) {
      options.logger.warning('Stop hook failed during shutdown', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
    options.server.closeAllConnections?.()
    options.server.close(error => {
      clearTimeout(forceTimer)
      if (error !== undefined) {
        options.logger.error('Server close failed after shutdown signal', {
          signal,
          error: error instanceof Error ? error.message : String(error),
        })
        exit(1)
        return
      }
      options.logger.info('Graceful shutdown complete', {signal})
      exit(0)
    })
  }

  return {trigger, dispose: () => {}}
}

/**
 * Install createGracefulShutdown signal handlers (SIGTERM + SIGINT by default)
 * on the target (process in production). Returns the shutdown handle plus a
 * dispose() that unregisters the listeners (used by tests to avoid leaks).
 */
export function installGracefulShutdown(options: GracefulShutdownOptions): GracefulShutdown {
  const shutdown = createGracefulShutdown(options)
  const signals = options.signals ?? ['SIGTERM', 'SIGINT']
  const target = options.target ?? process
  const registered: (readonly [string, () => void])[] = []
  for (const signal of signals) {
    const listener = () => shutdown.trigger(signal)
    target.once(signal, listener)
    registered.push([signal, listener] as const)
  }
  return {
    trigger: shutdown.trigger,
    dispose: () => {
      for (const [signal, listener] of registered) target.removeListener(signal, listener)
    },
  }
}
