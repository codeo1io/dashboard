import type {IngestMessage} from '../src/listener/contract.ts'
import {mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {DatabaseSync} from 'node:sqlite'
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

describe('listener store links-cell degradation (rm-187)', () => {
  it('a corrupt links cell degrades that row to empty links instead of throwing, and the degradation is logged', () => {
    // File-backed so the sqlite surface can be corrupted in place the way an
    // operator edit / schema drift / truncated write would.
    const dir = mkdtempSync(join(tmpdir(), 'listener-store-rm187-'))
    const dbPath = join(dir, 'messages.db')
    const store = createListenerStore(dbPath)
    const healthy = store.insert(makeMessage({
      title: 'healthy row',
      links: [{label: 'run', url: 'https://example.test/run/1'}],
    }))
    const trailingGarbage = store.insert(makeMessage({title: 'trailing garbage row', dedupeKey: 'bad-1'}))
    const emptyCell = store.insert(makeMessage({title: 'empty cell row', dedupeKey: 'bad-2'}))
    const nullLiteral = store.insert(makeMessage({title: 'null literal row', dedupeKey: 'bad-3'}))
    const nonArray = store.insert(makeMessage({title: 'non-array row', dedupeKey: 'bad-4'}))
    store.close()

    const db = new DatabaseSync(dbPath)
    const corrupt = db.prepare('UPDATE messages SET links = ? WHERE id = ?')
    corrupt.run('{"label": "x"} trailing garbage', trailingGarbage.id)
    corrupt.run('', emptyCell.id)
    corrupt.run('null', nullLiteral.id)
    corrupt.run('{"label": "not", "url": "an array"}', nonArray.id)
    db.close()

    const reopened = createListenerStore(dbPath)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      let listed: ReturnType<ListenerStore['list']> | undefined
      expect(() => {
        listed = reopened.list({})
      }).not.toThrow()
      if (listed === undefined) throw new Error('list() returned undefined')

      expect(listed.messages).toHaveLength(5)
      const byTitle = new Map(listed.messages.map(m => [m.title, m]))
      expect(byTitle.get('healthy row')?.id).toBe(healthy.id)
      expect(byTitle.get('healthy row')?.links).toEqual([{label: 'run', url: 'https://example.test/run/1'}])
      for (const title of ['trailing garbage row', 'empty cell row', 'null literal row', 'non-array row']) {
        expect(byTitle.get(title)?.links).toEqual([])
      }

      const degraded = warn.mock.calls.map(c => String(c[0])).filter(w => w.includes('corrupt links cell degraded'))
      expect(degraded).toHaveLength(4)
      for (const w of degraded) expect(w).toContain('rm-187')
    } finally {
      warn.mockRestore()
      reopened.close()
    }
  })
})
