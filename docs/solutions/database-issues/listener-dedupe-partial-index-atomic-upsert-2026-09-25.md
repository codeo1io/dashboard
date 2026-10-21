---
title: A check-then-insert dedupe pair races under concurrent duplicate ingest — collapse it into one INSERT ... ON CONFLICT against the partial UNIQUE index
date: 2026-09-25
category: database-issues
module: dashboard
problem_type: database_issue
component: data_model
severity: medium
symptoms:
  - "Two concurrent listener ingests carrying the same (source, dedupe_key) both miss the existence SELECT, both INSERT, and the loser fails on idx_messages_source_dedupe (SQLITE_CONSTRAINT_UNIQUE) surfaced as an HTTP 500 to the webhook caller"
  - "Hazard, not an observed single-process failure: the old insert() ran as a synchronous node:sqlite pair on one event loop, so in-process interleaving was impossible — the constraint-500 becomes live for a second process sharing the DB file (or a future async driver) racing the same (source, dedupe_key)"
root_cause: concurrency
resolution_type: code_fix
framework_version: "node:sqlite (SQLite 3.53.3, Node 24)"
related_components:
  - src/listener/store.ts
  - test/listener-store.test.ts
tags: [sqlite, node-sqlite, upsert, on-conflict, partial-index, dedupe, listener, ingest, concurrency]
---

## Problem

The listener store's ingest path deduplicated with a two-statement
check-then-insert pair: `SELECT id ... WHERE source = ? AND dedupe_key = ?`
first, then either `UPDATE` by that id or a fresh `INSERT`. The schema already
guarantees uniqueness via a **partial** UNIQUE index:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_source_dedupe
  ON messages (source, dedupe_key)
  WHERE dedupe_key IS NOT NULL
```

Two concurrent ingests of the same webhook (GitHub retries, parallel
deliveries) can both run the SELECT before either commits the INSERT. Both
miss, both insert, and the index makes exactly one of them fail with
`SQLITE_CONSTRAINT_UNIQUE` — a 500 that single-threaded tests never
reproduce. Classic TOCTOU: the SELECT is not the arbiter, the index is,
so the write path should ask the index directly.

## Solution

Collapse the pair into ONE statement — an upsert whose conflict target IS the
partial index (`src/listener/store.ts`):

```sql
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
```

Three semantics make this correct, not just atomic:

1. **The conflict target repeats the partial index predicate** —
   `ON CONFLICT (source, dedupe_key) WHERE dedupe_key IS NOT NULL`. Rows with
   a NULL `dedupe_key` never match the partial index, so they always insert
   fresh (verified: two NULL-key rows both persist). Getting the predicate
   wrong here silently changes dedupe semantics for the NULL-key population.
2. **Ack preservation rides a self-referential no-op** —
   `read_at = messages.read_at` keeps an already-acknowledged message read
   through a replay (rm-169's invariant) instead of resetting it. The excluded
   row carries `read_at = NULL`; a naive `read_at = excluded.read_at` would
   un-ack on every duplicate.
3. **`RETURNING id` gives the surviving row's id** for both arms, so callers
   keep one code path whether the row inserted or updated.

## Verification

- Empirical probe against `node:sqlite`'s bundled SQLite (3.53.3) BEFORE
  wiring tests: create the partial index, upsert a dupe (returns existing id,
  body refreshed, `read_at` preserved), insert two NULL-key rows (both
  persist). Engine-specific ON CONFLICT/partial-index support is exactly the
  kind of thing to prove with a 20-line probe script, not to assume from
  SQLite docs version tables.
- `test/listener-store.test.ts` locks the semantics: duplicate ingest is
  idempotent (one row, no throw, stays `read` when previously acked) and
  NULL-key rows both persist. Pre-existing rm-169 ack tests stayed green on
  the rewrite.
- Focused battery 37/37, then the conductor's authoritative GitHub-hosted
  validation: all 9 checks (incl. the full vitest suite) green on the batch
  snapshot (ephemeral validation PR, 2026-09-25).

## Prevention

- **Never pair an existence SELECT with an INSERT when a UNIQUE index already
  enforces the constraint.** The index is the arbiter; make the write path a
  single statement against it (`INSERT ... ON CONFLICT ... RETURNING`) so the
  race window cannot exist. Check-then-insert only "works" single-threaded.
- When the arbiter index is partial, **repeat its predicate in the conflict
  target**, and lock the NULL-key (non-dedupe) population with a test so a
  future refactor cannot quietly start conflating them.
- Preserve acknowledged state through replays explicitly
  (`read_at = messages.read_at`), and keep the test that proves it — see
  [`best-practices/lock-invariant-claims-with-tests-2026-09-21.md`](../best-practices/lock-invariant-claims-with-tests-2026-09-21.md).
