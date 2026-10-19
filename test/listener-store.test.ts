import type {IngestMessage} from '../src/listener/contract.ts'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createListenerStore, type ListenerStore} from '../src/listener/store.ts'

function makeMessage(overrides: Partial<IngestMessage> = {}): IngestMessage {
  return {
    source: 'infra',
    kind: 'deploy-health',
    severity: 'warning',
    title: 'Autoheal restarted gateway',
    body: 'gateway health probe failed 3x; container restarted and recovered.',
    links: [],
    dedupeKey: null,
    createdAt: '2026-07-11T12:00:00Z',
    ...overrides,
  }
}

describe('listener store', () => {
  let store: ListenerStore

  beforeEach(() => {
    store = createListenerStore(':memory:')
  })

  it('insert then list returns the message, read=false, unreadCount reflects it', () => {
    const {id, receivedAt} = store.insert(makeMessage())
    const {messages, unreadCount} = store.list({})

    expect(messages).toHaveLength(1)
    expect(messages[0]?.id).toBe(id)
    expect(messages[0]?.receivedAt).toBe(receivedAt)
    expect(messages[0]?.read).toBe(false)
    expect(messages[0]?.title).toBe('Autoheal restarted gateway')
    expect(unreadCount).toBe(1)
  })

  it('dedupe: two inserts same (source,dedupeKey) upsert to one row, id preserved, stays read (rm-169)', () => {
    // rm-169: a replay (redelivered webhook with the same dedupe key)
    // refreshes content but must NOT un-ack an operator-read message. This
    // expectation intentionally flipped from "reset to unread" in cycle 11 —
    // see ROADMAP rm-169 / assess finding F8.
    const first = store.insert(makeMessage({dedupeKey: 'deploy-health-2026-07-11', title: 'First'}))
    store.ack(first.id)
    expect(store.list({}).unreadCount).toBe(0)

    const second = store.insert(
      makeMessage({dedupeKey: 'deploy-health-2026-07-11', title: 'Second', body: 'updated body content here'}),
    )

    expect(second.id).toBe(first.id)

    const {messages} = store.list({})
    expect(messages).toHaveLength(1)
    expect(messages[0]?.title).toBe('Second')
    expect(messages[0]?.body).toBe('updated body content here')
    // Acked BEFORE the replay → stays acked; the replay did not resurrect it
    expect(messages[0]?.read).toBe(true)
    expect(store.list({}).unreadCount).toBe(0)
  })

  it('rm-169: replay of an UNREAD message keeps it unread (no accidental ack)', () => {
    const first = store.insert(makeMessage({dedupeKey: 'replay-unread', title: 'First'}))
    expect(store.list({}).unreadCount).toBe(1)

    const second = store.insert(makeMessage({dedupeKey: 'replay-unread', title: 'Second'}))

    expect(second.id).toBe(first.id)
    const {messages, unreadCount} = store.list({})
    expect(messages).toHaveLength(1)
    expect(messages[0]?.title).toBe('Second')
    expect(messages[0]?.read).toBe(false)
    expect(unreadCount).toBe(1)
  })

  it('different dedupeKey or source creates a separate row', () => {
    store.insert(makeMessage({dedupeKey: 'key-a'}))
    store.insert(makeMessage({dedupeKey: 'key-b'}))
    store.insert(makeMessage({source: 'agent', dedupeKey: 'key-a'}))

    const {messages} = store.list({limit: 200})
    expect(messages).toHaveLength(3)
  })

  it('ack marks read; unreadCount drops; ack unknown id → not acked', () => {
    const {id} = store.insert(makeMessage())
    expect(store.list({}).unreadCount).toBe(1)

    const result = store.ack(id)
    expect(result.acked).toBe(true)
    expect(result.readAt).not.toBeNull()
    expect(store.list({}).unreadCount).toBe(0)

    const unknown = store.ack('does-not-exist')
    expect(unknown.acked).toBe(false)
  })

  it('ackAll marks all read, returns count', () => {
    store.insert(makeMessage({dedupeKey: 'a'}))
    store.insert(makeMessage({dedupeKey: 'b'}))
    store.insert(makeMessage({dedupeKey: 'c'}))

    const acked = store.ackAll()
    expect(acked).toBe(3)
    expect(store.list({}).unreadCount).toBe(0)

    // Idempotent — second call has nothing left to ack.
    expect(store.ackAll()).toBe(0)
  })

  it('unreadOnly filters to unread messages only', () => {
    const {id: readId} = store.insert(makeMessage({dedupeKey: 'read-one'}))
    store.insert(makeMessage({dedupeKey: 'unread-one'}))
    store.ack(readId)

    const {messages} = store.list({unreadOnly: true})
    expect(messages).toHaveLength(1)
    expect(messages[0]?.read).toBe(false)
  })

  it('retention: insert >500 rows caps stored rows at 500 newest', () => {
    for (let i = 0; i < 510; i++) {
      store.insert(makeMessage({dedupeKey: `retain-${i}`, title: `msg-${i}`}))
    }
    const {messages} = store.list({limit: 200})
    // list() clamps to 200 max; verify by unreadCount, which is unfiltered by limit.
    expect(store.list({}).unreadCount).toBeLessThanOrEqual(500)
    expect(messages.length).toBeLessThanOrEqual(200)
  })

  it('rm-244: prunedCount starts at 0 and counts retention evictions in the messages DTO', () => {
    // Fresh store: nothing pruned yet.
    expect(store.list({}).prunedCount).toBe(0)

    // Overflow eviction: 505 inserts → 5 pruned, and the count surfaces.
    for (let i = 0; i < 505; i++) {
      store.insert(makeMessage({dedupeKey: `prune-${i}`, title: `msg-${i}`}))
    }
    const afterOverflow = store.list({})
    expect(afterOverflow.prunedCount).toBe(5)
    expect(afterOverflow.unreadCount).toBeLessThanOrEqual(500)

    // Cumulative: another overflow eviction adds to the same counter.
    for (let i = 0; i < 10; i++) {
      store.insert(makeMessage({dedupeKey: `prune2-${i}`, title: `msg2-${i}`}))
    }
    const afterSecond = store.list({})
    expect(afterSecond.prunedCount).toBeGreaterThan(5)
  })

  it('rm-244: age-based eviction also counts toward prunedCount', () => {
    // received_at is stamped at insert time and prune() runs on every insert,
    // so age eviction needs a clock jump: insert at T0, advance past the 30d
    // retention window, then insert again — the age prune deletes + counts.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-01T00:00:00Z'))
    store.insert(makeMessage({dedupeKey: 'ancient', title: 'ancient message'}))

    vi.setSystemTime(new Date('2026-09-25T00:00:00Z'))
    store.insert(makeMessage({dedupeKey: 'fresh', title: 'fresh message'}))
    const {messages, prunedCount} = store.list({})
    vi.useRealTimers()

    expect(messages.map(m => m.title)).toEqual(['fresh message'])
    expect(prunedCount).toBe(1)
  })

  it('close does not throw', () => {
    expect(() => store.close()).not.toThrow()
  })
})
