/**
 * `node:sqlite`-backed persistence for the operator listener channel.
 *
 * See docs/contracts/operator-listener-channel.md — retention policy (500 rows
 * / 30 days) and idempotency (dedupeKey upsert) are enforced here.
 */
import type {IngestMessage, ListenerLink, ListenerMessage, MessagesResponse} from './contract.ts'
import {randomUUID} from 'node:crypto'
import {mkdirSync} from 'node:fs'
import {dirname} from 'node:path'
import {DatabaseSync} from 'node:sqlite'

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

function rowToMessage(row: MessageRow): ListenerMessage {
  return {
    id: row.id,
    source: row.source as ListenerMessage['source'],
    kind: row.kind,
    severity: row.severity as ListenerMessage['severity'],
    title: row.title,
    body: row.body,
    links: JSON.parse(row.links) as readonly ListenerLink[],
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

  // rm-227: one atomic statement replaces the old check-then-insert pair.
  // That pair was TOCTOU-unsound against the partial UNIQUE index
  // idx_messages_source_dedupe: two ingests with the same (source, dedupe_key)
  // racing the SELECT-then-INSERT would see the loser die on
  // SQLITE_CONSTRAINT_UNIQUE and surface a 500 to the webhook caller. Under
  // the current single-process deployment (node:sqlite is synchronous, no
  // await between the two statements) the interleaving is a hazard, not an
  // observed race — it becomes live for a second process sharing the DB file
  // or a future async driver. ON CONFLICT against the partial index (the
  // conflict target repeats its WHERE clause) makes duplicate delivery
  // idempotent by construction regardless; rows with a NULL dedupe_key never
  // match the partial index and always insert fresh.
  const upsertStmt = db.prepare(`
    INSERT INTO messages (id, source, kind, severity, title, body, links, dedupe_key, created_at, received_at, read_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    ON CONFLICT (source, dedupe_key) WHERE dedupe_key IS NOT NULL
    DO UPDATE SET
      kind = excluded.kind,
      severity = excluded.severity,
      title = excluded.title,
      body = excluded.body,
      links = excluded.links,
      created_at = excluded.created_at,
      received_at = excluded.received_at,
      read_at = messages.read_at
    RETURNING id
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

  function insert(input: IngestMessage): {id: string; receivedAt: string} {
    const receivedAt = new Date().toISOString()
    const linksJson = JSON.stringify(input.links)

    // rm-169: a replay (dedupe hit) refreshes content but PRESERVES read_at —
    // a redelivered webhook must not silently un-ack an operator-read message.
    // The DO UPDATE arm sets read_at = messages.read_at (a no-op on the row
    // itself), so ack state survives redelivery exactly as before.
    const row = upsertStmt.get(
      randomUUID(),
      input.source,
      input.kind,
      input.severity,
      input.title,
      input.body,
      linksJson,
      input.dedupeKey,
      input.createdAt,
      receivedAt,
    ) as unknown as {id: string}

    prune()
    return {id: row.id, receivedAt}
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
      pruneOverflowStmt.run(RETENTION_MAX_ROWS)
    }
    const cutoff = new Date(Date.now() - RETENTION_MAX_AGE_MS).toISOString()
    pruneAgeStmt.run(cutoff)
  }

  function close(): void {
    db.close()
  }

  return {insert, list, ack, ackAll, prune, close}
}
