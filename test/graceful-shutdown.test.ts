import type {Logger} from '../src/logger.ts'
import {describe, expect, it} from 'vitest'
import {registerGracefulShutdown} from '../src/server.ts'

interface FakeSignalTarget {
  handlers: Map<string, (() => void)[]>
  exits: number[]
  on: (signal: string, listener: () => void) => void
  removeListener: (signal: string, listener: () => void) => void
  exit: (code: number) => void
  fire: (signal: string) => void
}

function makeFakeTarget(): FakeSignalTarget {
  const handlers = new Map<string, (() => void)[]>()
  const exits: number[] = []
  return {
    handlers,
    exits,
    on(signal, listener) {
      const list = handlers.get(signal) ?? []
      list.push(listener)
      handlers.set(signal, list)
    },
    removeListener(signal, listener) {
      const list = handlers.get(signal) ?? []
      const next = list.filter(l => l !== listener)
      handlers.set(signal, next)
    },
    exit(code) {
      exits.push(code)
    },
    fire(signal) {
      for (const listener of [...(handlers.get(signal) ?? [])]) {
        listener()
      }
    },
  }
}

function makeFakeLog(): {log: Logger; messages: [string, string][]} {
  const messages: [string, string][] = []
  const record = (level: string) => (message: string) => {
    messages.push([level, message])
  }
  return {
    messages,
    log: {
      debug: record('debug'),
      info: record('info'),
      warning: record('warning'),
      error: record('error'),
    },
  }
}

const drain = async (ms: number): Promise<void> =>
  new Promise(resolve => {
    setTimeout(resolve, ms)
  })

describe('registerGracefulShutdown (rm-157 graceful shutdown wiring)', () => {
  it('registers SIGTERM and SIGINT handlers and its disposer unregisters both', () => {
    const target = makeFakeTarget()
    const dispose = registerGracefulShutdown({
      server: {close: () => undefined},
      signalTarget: target,
      log: makeFakeLog().log,
    })
    expect(target.handlers.get('SIGTERM')).toHaveLength(1)
    expect(target.handlers.get('SIGINT')).toHaveLength(1)

    dispose()
    expect(target.handlers.get('SIGTERM')).toHaveLength(0)
    expect(target.handlers.get('SIGINT')).toHaveLength(0)
  })

  it('drains the server, tears down aggregator + listener store, and exits 0 on SIGTERM', async () => {
    const target = makeFakeTarget()
    const {log, messages} = makeFakeLog()
    const calls: string[] = []
    const dispose = registerGracefulShutdown({
      server: {
        close(callback) {
          calls.push('server.close')
          // Simulate open sockets draining shortly after close() is called.
          setTimeout(() => {
            callback?.()
          }, 5)
        },
      },
      stopAggregator: () => {
        calls.push('stopAggregator')
      },
      listenerStore: {
        close() {
          calls.push('store.close')
        },
      },
      signalTarget: target,
      log,
    })

    target.fire('SIGTERM')
    // Teardown of collaborators happens synchronously in the handler.
    expect(calls).toEqual(['server.close', 'stopAggregator', 'store.close'])

    await drain(15)
    expect(calls).toEqual(['server.close', 'stopAggregator', 'store.close'])
    expect(target.exits).toEqual([0])
    // Handlers unregistered after a completed shutdown; no re-entry.
    expect(target.handlers.get('SIGTERM')).toHaveLength(0)
    expect(target.handlers.get('SIGINT')).toHaveLength(0)
    expect(messages.some(([level, message]) => level === 'info' && message.includes('Shutdown complete'))).toBe(true)

    dispose()
  })

  it('forces exit 0 when the drain timeout expires with connections still open', async () => {
    const target = makeFakeTarget()
    const {log, messages} = makeFakeLog()
    // close() never invokes its callback — simulate a stuck keep-alive socket.
    registerGracefulShutdown({
      server: {close: () => undefined},
      signalTarget: target,
      log,
      drainTimeoutMs: 15,
    })

    target.fire('SIGINT')
    expect(target.exits).toEqual([])
    await drain(40)
    expect(target.exits).toEqual([0])
    expect(
      messages.some(([level, message]) => level === 'warning' && message.includes('drain timeout')),
    ).toBe(true)
  })

  it('exits immediately on a second signal while a shutdown is already draining', async () => {
    const target = makeFakeTarget()
    const {log} = makeFakeLog()
    registerGracefulShutdown({
      server: {close: () => undefined}, // never drains
      signalTarget: target,
      log,
      drainTimeoutMs: 1_000,
    })

    target.fire('SIGTERM')
    expect(target.exits).toEqual([])
    target.fire('SIGTERM')
    expect(target.exits).toEqual([0])
    await drain(10)
    expect(target.exits).toEqual([0])
  })

  it('still exits 0 when collaborator teardown throws', async () => {
    const target = makeFakeTarget()
    const {log, messages} = makeFakeLog()
    registerGracefulShutdown({
      server: {
        close(callback) {
          callback?.()
        },
      },
      stopAggregator: () => {
        throw new Error('aggregator stop exploded')
      },
      listenerStore: {
        close() {
          throw new Error('store close exploded')
        },
      },
      signalTarget: target,
      log,
    })

    target.fire('SIGTERM')
    await drain(5)
    expect(target.exits).toEqual([0])
    const warnings = messages.filter(([level]) => level === 'warning').map(([, message]) => message)
    expect(warnings.some(message => message.includes('Aggregator stop failed'))).toBe(true)
    expect(warnings.some(message => message.includes('Listener store close failed'))).toBe(true)
  })
})
