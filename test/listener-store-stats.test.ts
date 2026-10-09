import type {IngestMessage} from '../src/listener/contract.ts'
import {mkdtempSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'
import {createListenerStore, type ListenerStore} from '../src/listener/store.ts'

function msg(n: number): IngestMessage {
  return {
    source: 'agent',
    kind: 'run-event',
    severity: 'info',
    title: `title ${n}`,
    body: `body ${n}`,
    links: [],
    dedupeKey: null,
    createdAt: `2026-10-09T00:00:0${n}.000Z`,
  }
}

describe('rm-107: listener store stats (depth/age signal)', () => {
  const stores: ListenerStore[] = []
  const dirs: string[] = []

  function freshStore(): ListenerStore {
    const dir = mkdtempSync(join(tmpdir(), 'listener-stats-'))
    dirs.push(dir)
    const store = createListenerStore(join(dir, 'store.db'))
    stores.push(store)
    return store
  }

  afterEach(() => {
    for (const store of stores.splice(0)) store.close()
    for (const dir of dirs.splice(0)) rmSync(dir, {recursive: true, force: true})
  })

  it('reports zero rows and null oldest on an empty store', () => {
    const store = freshStore()
    const stats = store.stats()
    expect(stats.rows).toBe(0)
    expect(stats.oldestReceivedAt).toBeNull()
    expect(stats.unread).toBe(0)
    // retention caps ride the same signal so the operator sees depth AND limit
    expect(stats.maxRows).toBeGreaterThan(0)
    expect(stats.maxAgeMs).toBeGreaterThan(0)
  })

  it('reports rows, oldest received_at (server-stamped), and unread after inserts', () => {
    const store = freshStore()
    const first = store.insert(msg(1))
    store.insert(msg(2))
    const stats = store.stats()
    expect(stats.rows).toBe(2)
    expect(stats.unread).toBe(2)
    expect(stats.oldestReceivedAt).toBe(first.receivedAt)
  })

  it('unread falls as messages are acked; rows and oldest stay stable', () => {
    const store = freshStore()
    const first = store.insert(msg(1))
    store.insert(msg(2))
    store.ack(first.id)
    const stats = store.stats()
    expect(stats.rows).toBe(2)
    expect(stats.unread).toBe(1)
    expect(stats.oldestReceivedAt).toBe(first.receivedAt)
  })

  it('prune keeps fresh rows intact (age cutoff is now-30d; insert-time stamps are current)', () => {
    const store = freshStore()
    const first = store.insert(msg(1))
    store.insert(msg(2))
    store.prune()
    const stats = store.stats()
    expect(stats.rows).toBe(2)
    expect(stats.unread).toBe(2)
    expect(stats.oldestReceivedAt).toBe(first.receivedAt)
  })
})
