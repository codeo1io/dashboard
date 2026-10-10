/**
 * Boot-time snapshot persistence (rm-198).
 *
 * The aggregator's `lastGoodSnapshot` is an in-memory closure variable — a
 * process restart starts from an empty board until the first refresh lands.
 * This module implements the optional `SnapshotStore` seam declared on
 * `AggregatorDeps`: `persist()` writes the latest snapshot best-effort, and
 * the aggregator consults `load()` exactly once at factory time to bridge
 * the cold-start window with the last known data (forced stale, original
 * `refreshedAt` preserved so consumers can read its age).
 *
 * Fail-open by design: the store must NEVER break the refresh path.
 * - `load()`: missing/unreadable/corrupt/oversize/malformed file → `null`
 *   (empty boot, exactly the pre-bridge contract).
 * - `persist()`: any error is logged and swallowed; refresh continues.
 * - Size-bounded: files above {@link MAX_SNAPSHOT_BYTES} are neither written
 *   nor loaded (stat-checked before the read, so an oversized file is never
 *   buffered into memory — the in-memory byte bound stays as the second
 *   guard), so a runaway snapshot can't fill the disk.
 *
 * Atomicity: persist writes to `<path>.tmp` then renames over the target, so
 * a crash mid-write can never leave a truncated file that the next boot
 * would load as garbage.
 */

import type {AggregatorSnapshot, SnapshotStore} from './aggregator.ts'
import {Buffer} from 'node:buffer'
import {readFileSync, renameSync, statSync, writeFileSync} from 'node:fs'
import {logger} from '../logger.ts'

/** 1 MiB — snapshots are repo-count * row-size bounded well under this. */
const MAX_SNAPSHOT_BYTES = 1_048_576

/**
 * Measures UTF-8 bytes, not UTF-16 code units (rm-701): `String.length`
 * judges CJK/astral-heavy snapshots up to 2x lighter than the byte cap
 * enforced here. Mirrors the listener contract's helper of the same name.
 */
function utf8ByteLength(value: string): number {
  return Buffer.byteLength(value, 'utf8')
}

function logPersistProblem(message: string, path: string, error: unknown): void {
  logger.warning(message, {
    path,
    error: error instanceof Error ? error.message : String(error),
  })
}

/**
 * Shallow shape validation for untrusted on-disk data. Checks the
 * AggregatorSnapshot top level and the per-repo identity/status keys the
 * board renders — anything malformed fails open to `null` rather than
 * crashing or rendering garbage. This is deliberately shallow: the file is
 * operator-owned local state, not a hostile input surface.
 */
function isValidSnapshotShape(value: unknown): value is AggregatorSnapshot {
  if (typeof value !== 'object' || value === null) return false
  const snapshot = value as Record<string, unknown>
  if (!Array.isArray(snapshot.repos)) return false
  if (typeof snapshot.staleBanner !== 'boolean') return false
  if (typeof snapshot.driftCount !== 'number') return false
  if (snapshot.enumerationIncomplete !== null && typeof snapshot.enumerationIncomplete !== 'number') {
    return false
  }
  if (snapshot.refreshedAt !== null && typeof snapshot.refreshedAt !== 'number') return false
  // rm-156 fields (merged 2026-09-26): a cache persisted before the watchdog
  // fields existed fails validation and is ignored (fail-open empty boot —
  // the next refresh re-persists with the fields).
  if (snapshot.refreshDurationMs !== null && typeof snapshot.refreshDurationMs !== 'number') return false
  if (typeof snapshot.refreshDegraded !== 'boolean') return false
  for (const repo of snapshot.repos) {
    if (typeof repo !== 'object' || repo === null) return false
    const row = repo as Record<string, unknown>
    if (
      typeof row.node_id !== 'string' ||
      typeof row.owner !== 'string' ||
      typeof row.name !== 'string' ||
      typeof row.full_name !== 'string' ||
      typeof row.discovery_channel !== 'string' ||
      typeof row.status !== 'object' ||
      row.status === null
    ) {
      return false
    }
    // rm-117 review fix (independent_review 5d6fd3f, medium): every new
    // repo-status field must ride this row check too — the row-level twin
    // of the rm-156 pattern above. A cache persisted before the
    // openCodeScanningAlerts widening otherwise loads verbatim, the DTO
    // copies the absent field as undefined, and the client's strict parse
    // turns the whole /api/monitoring payload into a contract-drift board
    // for the entire cold-start bridge window instead of the documented
    // empty boot (which the next refresh re-persists with the field).
    const status = row.status as Record<string, unknown>
    if (status.openCodeScanningAlerts !== null && typeof status.openCodeScanningAlerts !== 'number') {
      return false
    }
  }
  return true
}

/**
 * File-backed SnapshotStore. Returns `undefined` when `path` is unset/blank —
 * the default, which keeps the pre-bridge in-memory-only behavior. Wire the
 * path via the `DASHBOARD_SNAPSHOT_CACHE` env (read in `buildSnapshotProvider`,
 * src/server.ts — the injected-deps override wins for tests).
 */
export function createFileSnapshotStore(path: string | undefined): SnapshotStore | undefined {
  const resolved = path?.trim()
  if (resolved === undefined || resolved === '') return undefined
  return {
    load(): AggregatorSnapshot | null {
      let raw: string
      try {
        // Size-bound BEFORE the read (rm-759): a tampered/oversized file is
        // rejected by stat and never buffered into memory. The in-memory
        // byte bound below stays as the second guard against a writer that
        // grows the file between stat and read.
        const size = statSync(resolved).size
        if (size > MAX_SNAPSHOT_BYTES) {
          logPersistProblem('Snapshot cache exceeds size bound; ignoring (fail-open)', resolved, {
            bytes: size,
          })
          return null
        }
        raw = readFileSync(resolved, 'utf8')
      } catch {
        // Missing/unreadable — normal on first boot; stay quiet + fail open.
        return null
      }
      if (utf8ByteLength(raw) > MAX_SNAPSHOT_BYTES) {
        logPersistProblem('Snapshot cache exceeds size bound; ignoring (fail-open)', resolved, {
          bytes: utf8ByteLength(raw),
        })
        return null
      }
      try {
        const parsed: unknown = JSON.parse(raw)
        if (!isValidSnapshotShape(parsed)) {
          logger.warning('Snapshot cache failed shape validation; ignoring (fail-open)', {path: resolved})
          return null
        }
        return parsed
      } catch (error) {
        logPersistProblem('Snapshot cache is not valid JSON; ignoring (fail-open)', resolved, error)
        return null
      }
    },
    persist(snapshot: AggregatorSnapshot): void {
      let serialized: string
      try {
        serialized = JSON.stringify(snapshot)
      } catch (error) {
        logPersistProblem('Snapshot serialization failed; skipping persist', resolved, error)
        return
      }
      if (utf8ByteLength(serialized) > MAX_SNAPSHOT_BYTES) {
        logger.warning('Snapshot exceeds size bound; not persisted', {path: resolved, bytes: utf8ByteLength(serialized)})
        return
      }
      try {
        const tmp = `${resolved}.tmp`
        writeFileSync(tmp, serialized, 'utf8')
        renameSync(tmp, resolved)
      } catch (error) {
        logPersistProblem('Snapshot persist failed; continuing in-memory only', resolved, error)
      }
    },
  }
}
