/**
 * Graceful shutdown (rm-171, cycle-13 B4).
 *
 * The container runs `node src/server.ts` as PID 1 — SIGTERM/SIGINT have no
 * default dispositions, so without handlers the process dies instantly and
 * in-flight requests + the listener SQLite store are dropped. These tests pin
 * the contract of installShutdownHandlers: signal registration, drain order,
 * bounded force-exit, second-signal force exit, and error tolerance.
 */

import {describe, expect, it, vi} from 'vitest'
import {installShutdownHandlers} from '../src/shutdown.ts'

/** Capture registered signal listeners keyed by signal name. */
function makeFakeProcess() {
  const listeners = new Map<string, () => void>()
  const on = vi.fn((signal: string, listener: () => void) => {
    listeners.set(signal, listener)
  })
  const fire = (signal: string) => {
    const listener = listeners.get(signal)
    if (listener === undefined) throw new Error(`no listener for ${signal}`)
    listener()
  }
  return {
    on,
    fire,
    get registered() {
      return [...listeners.keys()]
    },
  }
}

interface Harness {
  readonly fire: (signal: string) => void
  readonly closeServer: ReturnType<typeof vi.fn>
  readonly stopAggregator: ReturnType<typeof vi.fn>
  readonly closeListenerStore: ReturnType<typeof vi.fn>
  readonly closeIdleConnections: ReturnType<typeof vi.fn>
  readonly closeAllConnections: ReturnType<typeof vi.fn>
  readonly exit: ReturnType<typeof vi.fn>
  readonly deadline: {fire: () => void}
  readonly log: ReturnType<typeof vi.fn>
}

/** Build injectable deps with recorded fakes and a manual force-exit deadline. */
function makeHarness(
  overrides: {stopAggregatorThrows?: boolean; closeIdleThrows?: boolean; closeAllThrows?: boolean} = {},
): Harness {
  const fakeProcess = makeFakeProcess()
  const closeServer = vi.fn()
  const stopAggregator = vi.fn(() => {
    if (overrides.stopAggregatorThrows) throw new Error('interval leak')
  })
  const closeListenerStore = vi.fn()
  const closeIdleConnections = vi.fn(() => {
    if (overrides.closeIdleThrows) throw new Error('idle socket destroy failed')
  })
  const closeAllConnections = vi.fn(() => {
    if (overrides.closeAllThrows) throw new Error('socket destroy failed')
  })
  const exit = vi.fn()
  const log = vi.fn()
  let deadlineFn: (() => void) | undefined
  const setTimeoutFn = vi.fn((fn: () => void) => {
    deadlineFn = fn
    return 1
  })

  installShutdownHandlers({
    on: fakeProcess.on,
    closeServer,
    stopAggregator,
    closeListenerStore,
    closeIdleConnections,
    closeAllConnections,
    setTimeoutFn,
    exit,
    log,
  })

  return {
    fire: fakeProcess.fire,
    closeServer,
    stopAggregator,
    closeListenerStore,
    closeIdleConnections,
    closeAllConnections,
    exit,
    deadline: {fire: () => deadlineFn?.()},
    log,
  }
}

describe('installShutdownHandlers', () => {
  it('registers handlers for SIGTERM and SIGINT', () => {
    const fakeProcess = makeFakeProcess()
    const signals = installShutdownHandlers({
      on: fakeProcess.on,
      closeServer: vi.fn(),
      setTimeoutFn: vi.fn(),
      exit: vi.fn(),
      log: vi.fn(),
    })

    expect(signals).toEqual(['SIGTERM', 'SIGINT'])
    expect(fakeProcess.registered).toEqual(['SIGTERM', 'SIGINT'])
  })

  it('SIGTERM drains in order: aggregator → listener store → server close → exit(0)', () => {
    const h = makeHarness()

    h.fire('SIGTERM')

    expect(h.stopAggregator).toHaveBeenCalledTimes(1)
    expect(h.closeListenerStore).toHaveBeenCalledTimes(1)
    expect(h.closeServer).toHaveBeenCalledTimes(1)

    // Drain not yet complete: the exit callback only fires after server close
    expect(h.exit).not.toHaveBeenCalled()

    // Server drained cleanly
    const callback = h.closeServer.mock.calls[0]?.[0] as (err?: unknown) => void
    callback(undefined)

    expect(h.exit).toHaveBeenCalledTimes(1)
    expect(h.exit).toHaveBeenCalledWith(0)
  })

  it('SIGINT behaves identically', () => {
    const h = makeHarness()

    h.fire('SIGINT')
    ;(h.closeServer.mock.calls[0]?.[0] as (err?: unknown) => void)(undefined)

    expect(h.exit).toHaveBeenCalledWith(0)
  })

  it('second signal during drain forces exit(1) immediately', () => {
    const h = makeHarness()

    h.fire('SIGTERM')
    // Drain hangs (server never closes) — operator hits Ctrl-C again
    h.fire('SIGINT')

    expect(h.exit).toHaveBeenCalledTimes(1)
    expect(h.exit).toHaveBeenCalledWith(1)
    // And the cleanup steps did not re-run
    expect(h.stopAggregator).toHaveBeenCalledTimes(1)
  })

  it('server close with an error exits non-zero', () => {
    const h = makeHarness()

    h.fire('SIGTERM')
    ;(h.closeServer.mock.calls[0]?.[0] as (err?: unknown) => void)(new Error('hung socket'))

    expect(h.exit).toHaveBeenCalledWith(1)
  })

  it('exits(1) at the force-exit deadline even if the drain hangs', () => {
    const h = makeHarness()

    h.fire('SIGTERM')
    // Drain never completes; the bounded deadline fires instead
    h.deadline.fire()

    expect(h.exit).toHaveBeenCalledTimes(1)
    expect(h.exit).toHaveBeenCalledWith(1)
  })

  it('a cleanup step throwing does not abort the drain', () => {
    const h = makeHarness({stopAggregatorThrows: true})

    h.fire('SIGTERM')
    ;(h.closeServer.mock.calls[0]?.[0] as (err?: unknown) => void)(undefined)

    // The store close and server close still ran; exit is clean
    expect(h.closeListenerStore).toHaveBeenCalledTimes(1)
    expect(h.closeServer).toHaveBeenCalledTimes(1)
    expect(h.exit).toHaveBeenCalledWith(0)
    // The cleanup failure was logged, not thrown
    expect(h.log).toHaveBeenCalledWith(
      'Failed to stop aggregator during shutdown',
      expect.objectContaining({error: 'Error: interval leak'}),
    )
  })

  it('drain completion cancels the force-exit deadline', () => {
    const h = makeHarness()

    h.fire('SIGTERM')
    ;(h.closeServer.mock.calls[0]?.[0] as (err?: unknown) => void)(undefined)

    // Firing the (cancelled) deadline late must NOT force a second exit —
    // the module clears the timer, so a stale fire is the only way to check.
    h.deadline.fire()

    // exit stays at the single clean call from the drained path
    expect(h.exit).toHaveBeenCalledTimes(1)
    expect(h.exit).toHaveBeenCalledWith(0)
  })

  // -------------------------------------------------------------------------
  // rm-171 — socket drain: idle keep-alives must not ride the deadline
  // -------------------------------------------------------------------------

  it('rm-171: destroys idle connections once the drain begins (quiet stop no longer rides the deadline)', () => {
    const h = makeHarness()

    h.fire('SIGTERM')

    // closeServer was invoked (close began) and idle sockets were destroyed
    // exactly once, before the drain could settle — this is what lets a
    // quiet stop with live keep-alive poll sockets complete immediately.
    expect(h.closeServer).toHaveBeenCalledTimes(1)
    expect(h.closeIdleConnections).toHaveBeenCalledTimes(1)
    // ALL sockets are NOT destroyed on the happy path — in-flight requests
    // keep their sockets so close() can wait for them by design.
    expect(h.closeAllConnections).not.toHaveBeenCalled()

    // The drain still completes cleanly once in-flight work settles
    ;(h.closeServer.mock.calls[0]?.[0] as (err?: unknown) => void)(undefined)
    expect(h.exit).toHaveBeenCalledWith(0)
  })

  it('rm-171: destroys ALL remaining sockets at the force-exit deadline, before exit(1)', () => {
    const h = makeHarness()

    h.fire('SIGTERM')
    // Drain hangs — a long-lived proxied SSE stream never self-completes
    h.deadline.fire()

    expect(h.closeAllConnections).toHaveBeenCalledTimes(1)
    // The deadline path destroys sockets BEFORE exiting, so the forced exit
    // leaves no dangling handles.
    const closeAllIndex = h.closeAllConnections.mock.invocationCallOrder[0] ?? -1
    const exitIndex = h.exit.mock.invocationCallOrder[0] ?? -1
    expect(closeAllIndex).toBeGreaterThan(0)
    expect(exitIndex).toBeGreaterThan(0)
    expect(closeAllIndex).toBeLessThan(exitIndex)
    expect(h.exit).toHaveBeenCalledWith(1)
  })

  it('rm-171: socket-close APIs throwing never blocks the drain or the forced exit', () => {
    const h = makeHarness({closeIdleThrows: true, closeAllThrows: true})

    h.fire('SIGTERM')

    // The idle-destroy failure was logged and the drain proceeded
    expect(h.log).toHaveBeenCalledWith(
      'Failed to close idle connections during shutdown',
      expect.objectContaining({error: 'Error: idle socket destroy failed'}),
    )
    expect(h.closeServer).toHaveBeenCalledTimes(1)
    expect(h.exit).not.toHaveBeenCalled()

    // Deadline path: closeAllConnections throws but exit(1) still happens
    h.deadline.fire()
    expect(h.log).toHaveBeenCalledWith(
      'Failed to close all connections at drain deadline',
      expect.objectContaining({error: 'Error: socket destroy failed'}),
    )
    expect(h.exit).toHaveBeenCalledTimes(1)
    expect(h.exit).toHaveBeenCalledWith(1)
  })
})
