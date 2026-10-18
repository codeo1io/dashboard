import {randomUUID} from 'node:crypto'
import {mkdirSync} from 'node:fs'
import {dirname} from 'node:path'
import {DatabaseSync} from 'node:sqlite'
import {logger} from '../logger.ts'
/**
 * `node:sqlite`-backed persistence for the operator listener channel.
 *
 * See docs/contracts/operator-listener-channel.md — retention policy (500 rows
 * / 30 days) and idempotency (dedupeKey upsert) are enforced here.
 */
import {parseLinks, type IngestMessage, type ListenerLink, type ListenerMessage, type MessagesResponse} from './contract.ts'

export interface ListenerStore {
  insert: (input: IngestMessage) => {id: string; receivedAt: string}
  list: (opts: {unreadOnly?: boolean; limit?: number}) => MessagesResponse
  ack: (id: string) => {acked: boolean; readAt: string | null}
  ackAll: () => number
  prune: () => void
  close: () => void
}

/** Raw row shape as read back from `node:sqlite`. */
interface MessageRow {
  id: string
  source: string
  kind: string
  severity: string
  title: string
  body: string
  links: string
  dedupe_key: string | null
  created_at: string
  received_at: string
  read_at: string | null
}

const RETENTION_MAX_ROWS = 500
const RETENTION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const DEFAULT_LIST_LIMIT = 100
const MIN_LIST_LIMIT = 1
const MAX_LIST_LIMIT = 200

/**
 * rm-187: the `links` cell is the only free-form JSON the store persists, and
 * it is read back with a bare `JSON.parse` — a corrupt cell (hand-edit,
 * torn write, schema drift from an older format) would throw inside
 * `rowToMessage` and 500 the whole messages endpoint for one bad row. The
 * twin in src/github/snapshot-store.ts landed guarded; this closes the gap:
 * a corrupt cell degrades to "no links" with every other field intact, and
 * every degraded read logs once so silent data loss cannot recur (the
 * endpoint stays 200 with the healthy rows).
 */
function parseLinksCell(raw: string, id: string): readonly ListenerLink[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('not a JSON array')
    // rm-187 follow-up (2026-10-10): the array CONTENTS used to flow through a
    // bare cast (`[1,2,3]` served as ListenerLink[]). Reuse the ingest-side
    // canonical validator so a persisted cell is accepted exactly when the
    // same shape would have been accepted at ingest — a wrong-shaped element
    // degrades the whole cell to empty links, other fields intact.
    const validated = parseLinks(parsed)
    if (!validated.success) throw new Error(validated.error.message)
    return validated.data
  } catch (error) {
    // rm-187 (run a31293fd, logger routing): the degraded-read warning is an
    // operator-visible reliability signal — it rides the structured logger
    // (context redaction + rm-260 stderr routing), not a bare console.warn.
    logger.warning('listener store: degraded links cell on message read', {
      id,
      reason: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}

// rm-187 (run a31293fd): runtime allowlists for the enum cells. The `as`
// casts below trusted the DB union — a corrupt out-of-union cell (hand-edit,
// torn write, schema drift) would flow an unknown string straight into the
// client DTO. Both cells now degrade to a safe in-union value and log once
// per degraded read (same pattern as the links cell); the raw value is
// never echoed into the log.
const LISTENER_SOURCES: ReadonlySet<string> = new Set<ListenerMessage['source']>(['infra', 'agent'])
const LISTENER_SEVERITIES: ReadonlySet<string> = new Set<ListenerMessage['severity']>([
  'info',
  'warning',
  'critical',
])
const DEGRADED_SOURCE: ListenerMessage['source'] = 'infra'
const DEGRADED_SEVERITY: ListenerMessage['severity'] = 'info'

function rowToMessage(row: MessageRow): ListenerMessage {
  const sourceOk = typeof row.source === 'string' && LISTENER_SOURCES.has(row.source)
  const severityOk = typeof row.severity === 'string' && LISTENER_SEVERITIES.has(row.severity)
  if (!sourceOk) {
    logger.warning('listener store: degraded source cell on message read', {id: row.id})
  }
  if (!severityOk) {
    logger.warning('listener store: degraded severity cell on message read', {id: row.id})
  }
  return {
    id: row.id,
    source: sourceOk ? (row.source as ListenerMessage['source']) : DEGRADED_SOURCE,
    kind: row.kind,
    severity: severityOk ? (row.severity as ListenerMessage['severity']) : DEGRADED_SEVERITY,
    title: row.title,
    body: row.body,
    links: parseLinksCell(row.links, row.id),
    dedupeKey: row.dedupe_key,
    createdAt: row.created_at,
    receivedAt: row.received_at,
    read: row.read_at !== null,
  }
}

export function createListenerStore(dbPath: string): ListenerStore {
  if (dbPath !== ':memory:') {
    mkdirSync(dirname(dbPath), {recursive: true})
  }

  const db = new DatabaseSync(dbPath)

  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      kind TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      links TEXT NOT NULL,
      dedupe_key TEXT NULL,
      created_at TEXT NOT NULL,
      received_at TEXT NOT NULL,
      read_at TEXT NULL
    )
  `)
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_source_dedupe
      ON messages(source, dedupe_key)
      WHERE dedupe_key IS NOT NULL
  `)

  const findByDedupeStmt = db.prepare('SELECT id FROM messages WHERE source = ? AND dedupe_key = ?')
  const insertStmt = db.prepare(`
    INSERT INTO messages (id, source, kind, severity, title, body, links, dedupe_key, created_at, received_at, read_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
  `)
  const updateByIdStmt = db.prepare(`
    UPDATE messages
    SET kind = ?, severity = ?, title = ?, body = ?, links = ?, created_at = ?, received_at = ?, read_at = messages.read_at
    WHERE id = ?
  `)
  const selectAllStmt = db.prepare('SELECT * FROM messages ORDER BY received_at DESC LIMIT ?')
  const selectUnreadStmt = db.prepare('SELECT * FROM messages WHERE read_at IS NULL ORDER BY received_at DESC LIMIT ?')
  const countUnreadStmt = db.prepare('SELECT COUNT(*) as n FROM messages WHERE read_at IS NULL')
  const selectByIdStmt = db.prepare('SELECT id, read_at FROM messages WHERE id = ?')
  const ackStmt = db.prepare('UPDATE messages SET read_at = ? WHERE id = ? AND read_at IS NULL')
  const ackAllStmt = db.prepare('UPDATE messages SET read_at = ? WHERE read_at IS NULL')
  const pruneCountStmt = db.prepare('SELECT COUNT(*) as n FROM messages')
  const pruneOverflowStmt = db.prepare(`
    DELETE FROM messages WHERE id IN (
      SELECT id FROM messages ORDER BY received_at DESC LIMIT -1 OFFSET ?
    )
  `)
  const pruneAgeStmt = db.prepare('DELETE FROM messages WHERE received_at < ?')

  // rm-244-class visibility: cumulative count of messages evicted by the
  // retention policy since the store was created. In-memory by design — it
  // reports "how much history the current process dropped", not a durable
  // total (a restart resets it, which is honest: the new process has pruned
  // nothing). Surfaced through list() so the messages DTO can tell the
  // operator the list is a truncated view.
  let prunedTotal = 0

  function insert(input: IngestMessage): {id: string; receivedAt: string} {
    const receivedAt = new Date().toISOString()
    const linksJson = JSON.stringify(input.links)

    if (input.dedupeKey !== null) {
      const existing = findByDedupeStmt.get(input.source, input.dedupeKey) as unknown as {id: string} | undefined
      if (existing !== undefined) {
        // rm-169: replay (dedupe hit) refreshes content but PRESERVES read_at —
        // a redelivered webhook must not silently un-ack an operator-read
        // message. The SQL sets read_at = messages.read_at (no-op on itself).
        updateByIdStmt.run(
          input.kind,
          input.severity,
          input.title,
          input.body,
          linksJson,
          input.createdAt,
          receivedAt,
          existing.id,
        )
        prune()
        return {id: existing.id, receivedAt}
      }
    }

    const id = randomUUID()
    insertStmt.run(
      id,
      input.source,
      input.kind,
      input.severity,
      input.title,
      input.body,
      linksJson,
      input.dedupeKey,
      input.createdAt,
      receivedAt,
    )
    prune()
    return {id, receivedAt}
  }

  function list(opts: {unreadOnly?: boolean; limit?: number}): MessagesResponse {
    const rawLimit = opts.limit ?? DEFAULT_LIST_LIMIT
    const limit = Math.min(MAX_LIST_LIMIT, Math.max(MIN_LIST_LIMIT, rawLimit))

    const rows =
      opts.unreadOnly === true
        ? (selectUnreadStmt.all(limit) as unknown as MessageRow[])
        : (selectAllStmt.all(limit) as unknown as MessageRow[])

    const unreadCountRow = countUnreadStmt.get() as unknown as {n: number}

    return {
      messages: rows.map(rowToMessage),
      unreadCount: unreadCountRow.n,
      prunedCount: prunedTotal,
    }
  }

  function ack(id: string): {acked: boolean; readAt: string | null} {
    const existing = selectByIdStmt.get(id) as unknown as {id: string; read_at: string | null} | undefined
    if (existing === undefined) return {acked: false, readAt: null}
    if (existing.read_at !== null) return {acked: true, readAt: existing.read_at}
    const readAt = new Date().toISOString()
    ackStmt.run(readAt, id)
    return {acked: true, readAt}
  }

  function ackAll(): number {
    const result = ackAllStmt.run(new Date().toISOString())
    return Number(result.changes)
  }

  function prune(): void {
    const totalRow = pruneCountStmt.get() as unknown as {n: number}
    if (totalRow.n > RETENTION_MAX_ROWS) {
      const overflowResult = pruneOverflowStmt.run(RETENTION_MAX_ROWS)
      prunedTotal += Number(overflowResult.changes)
    }
    const cutoff = new Date(Date.now() - RETENTION_MAX_AGE_MS).toISOString()
    const ageResult = pruneAgeStmt.run(cutoff)
    prunedTotal += Number(ageResult.changes)
  }

  function close(): void {
    db.close()
  }

  return {insert, list, ack, ackAll, prune, close}
}
