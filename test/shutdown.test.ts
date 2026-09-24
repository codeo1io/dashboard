import type {GracefulServer} from '../src/shutdown.ts'
import {EventEmitter} from 'node:events'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {createGracefulShutdown, installGracefulShutdown} from '../src/shutdown.ts'

// rm-178: PID-1 graceful shutdown — drain, stop hook, bounded forced exit.

function makeLogger() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  }
}

function makeServer(overrides: {closeImpl?: (callback?: (error?: Error) => void) => void} = {}) {
  const close = vi.fn(overrides.closeImpl ?? ((callback?: (error?: Error) => void) => {
    callback?.()
  }))
  const closeAllConnections = vi.fn()
  const server: GracefulServer = {close, closeAllConnections}
  return {server, close, closeAllConnections}
}

describe('createGracefulShutdown (rm-178)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('drains: stop hook, closeAllConnections, server.close, exit 0', () => {
    const {server, close, closeAllConnections} = makeServer()
    const stop = vi.fn()
    const exit = vi.fn()

    const shutdown = createGracefulShutdown({server, logger: makeLogger(), stop, exit, timeoutMs: 10_000})
    shutdown.trigger('SIGTERM')

    expect(stop).toHaveBeenCalledTimes(1)
    expect(closeAllConnections).toHaveBeenCalledTimes(1)
    expect(close).toHaveBeenCalledTimes(1)
    expect(exit).toHaveBeenCalledTimes(1)
    expect(exit).toHaveBeenCalledWith(0)
  })

  it('a second trigger is a no-op (double-signal safety)', () => {
    const {server, close} = makeServer()
    const exit = vi.fn()
    const shutdown = createGracefulShutdown({server, logger: makeLogger(), exit, timeoutMs: 10_000})

    shutdown.trigger('SIGTERM')
    shutdown.trigger('SIGINT')

    expect(close).toHaveBeenCalledTimes(1)
    expect(exit).toHaveBeenCalledTimes(1)
  })

  it('server.close error → exit 1', () => {
    const {server} = makeServer({
      closeImpl: callback => {
        callback?.(new Error('socket leaked'))
      },
    })
    const exit = vi.fn()

    createGracefulShutdown({server, logger: makeLogger(), exit, timeoutMs: 10_000}).trigger('SIGTERM')

    expect(exit).toHaveBeenCalledTimes(1)
    expect(exit).toHaveBeenCalledWith(1)
  })

  it('drain deadline: forced exit(1) after timeoutMs when close never completes', async () => {
    vi.useFakeTimers()
    const {server} = makeServer({closeImpl: () => {}}) // never calls back
    const exit = vi.fn()

    createGracefulShutdown({server, logger: makeLogger(), exit, timeoutMs: 10_000}).trigger('SIGTERM')

    expect(exit).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(exit).toHaveBeenCalledTimes(1)
    expect(exit).toHaveBeenCalledWith(1)
  })
})

describe('installGracefulShutdown (rm-178)', () => {
  it('wires once-handlers for SIGTERM and SIGINT on the target', () => {
    const {server} = makeServer()
    const target = new EventEmitter()
    const exit = vi.fn()

    const handle = installGracefulShutdown({
      server,
      logger: makeLogger(),
      exit,
      target,
      timeoutMs: 10_000,
    })

    target.emit('SIGTERM')
    expect(exit).toHaveBeenCalledWith(0)

    handle.dispose()
    exit.mockClear()
    target.emit('SIGTERM')
    target.emit('SIGINT')
    expect(exit).not.toHaveBeenCalled()

    // SIGINT is wired on a fresh handle too.
    const {server: server2} = makeServer()
    const exit2 = vi.fn()
    const handle2 = installGracefulShutdown({
      server: server2,
      logger: makeLogger(),
      exit: exit2,
      target,
      timeoutMs: 10_000,
    })
    target.emit('SIGINT')
    expect(exit2).toHaveBeenCalledWith(0)
    handle2.dispose()
  })
})
