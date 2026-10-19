#!/usr/bin/env node
/**
 * rm-2063 — operator session kill-switch tool.
 *
 * Revokes (or inspects) dashboard operator session ids in the durable
 * revocation record the server consults on every authenticated request
 * (src/session.ts FileSessionRevocationStore). This is deliberately an
 * operator-box CLI, NOT an HTTP surface: the dashboard stays read-only by
 * construction — there is no server-side write path to revoke a session.
 *
 * Record file: `DASHBOARD_SESSION_REVOCATIONS_FILE` env override, default
 * `/data/session-revocations.json` (same directory as the cookie key).
 *
 * Usage:
 *   node scripts/session-revoke.ts <jti> [--login LOGIN] [--expires-at EPOCH]
 *        [--file PATH] [--json]
 *     Record the session id as revoked. `<jti>` is the 32-hex `jti` inside the
 *     signed session-cookie payload (see docs/runbooks/session-kill-switch.md
 *     for how to read it from browser devtools). `--login` is an audit label;
 *     `--expires-at` the cookie's own `exp` (epoch seconds) so a later
 *     `--prune` can drop the entry once the cookie would have expired anyway.
 *
 *   node scripts/session-revoke.ts --list [--file PATH] [--json]
 *     Print the current records (one per line, or JSON with --json).
 *
 *   node scripts/session-revoke.ts --prune [--file PATH] [--json]
 *     Drop records whose `expiresAt` is in the past (entries with a null
 *     `expiresAt` are kept — unknown expiry is conservative-keep).
 *
 * Exit codes:
 *   0  success (including "already revoked" and no-op prune)
 *   1  the record file exists but is corrupt/mis-shaped — the tool REFUSES to
 *      touch it (a broken record must never be silently rewritten; the server
 *      is meanwhile failing closed and denying every session)
 *   2  usage error (bad/missing jti, unknown flag)
 *
 * The write is atomic (temp file + rename) so the server never observes a
 * half-written record; its mtime/size cache picks the change up without a
 * restart. To kill ALL outstanding sessions instead of one, rotate the cookie
 * key — the nuke-all procedure in docs/runbooks/session-kill-switch.md.
 */
import {mkdirSync, readFileSync, renameSync, writeFileSync} from 'node:fs'
import {dirname} from 'node:path'
import process from 'node:process'
import {pathToFileURL} from 'node:url'
import {
  isSessionId,
  parseSessionRevocations,
  serializeSessionRevocations,
  SESSION_REVOCATIONS_FILE_ENV,
  type SessionRevocationRecord,
} from '../src/session.ts'

const DEFAULT_RECORD_FILE = '/data/session-revocations.json'

export interface RevokeOptions {
  /** Record file path (defaults to env / DEFAULT_RECORD_FILE). */
  file?: string
  /** Audit label for who the revoked cookie belonged to. */
  login?: string
  /** Cookie `exp` (epoch seconds) — enables later pruning. */
  expiresAt?: number
  /** Epoch seconds stamped as revokedAt (default: now). */
  now?: number
}

export type RevokeResult =
  | {status: 'revoked'; record: SessionRevocationRecord; total: number}
  | {status: 'already-present'; record: SessionRevocationRecord; total: number}

/** Reads and validates the record file. Missing file = zero records. Corrupt = throws. */
export function readSessionRevocations(file: string): SessionRevocationRecord[] {
  let raw: string
  try {
    raw = readFileSync(file, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(`session revocation record ${file} is corrupt/mis-shaped (not valid JSON); refusing to touch it`)
  }
  const records = parseSessionRevocations(parsed)
  if (records === null) {
    throw new Error(`session revocation record ${file} is corrupt/mis-shaped; refusing to touch it`)
  }
  return records
}

/** Atomically writes the record file (temp + rename, parent dirs created). */
export function writeSessionRevocations(file: string, records: readonly SessionRevocationRecord[]): void {
  const dir = dirname(file)
  mkdirSync(dir, {recursive: true})
  const tmp = `${file}.tmp`
  writeFileSync(tmp, serializeSessionRevocations(records))
  renameSync(tmp, file)
}

/**
 * Records `jti` as revoked. Idempotent: an already-present id is reported and
 * the file is left untouched. Expired records are pruned opportunistically on
 * the same write (they can no longer match any valid cookie).
 */
export function revokeSession(jti: string, opts: RevokeOptions = {}): RevokeResult {
  if (!isSessionId(jti)) {
    throw new Error(`invalid session id: expected 32 lowercase hex chars (the cookie payload's jti), got ${JSON.stringify(jti)}`)
  }
  const file = opts.file ?? process.env[SESSION_REVOCATIONS_FILE_ENV] ?? DEFAULT_RECORD_FILE
  const now = opts.now ?? Math.floor(Date.now() / 1000)
  const records = readSessionRevocations(file).filter(record => !isExpired(record, now))

  const existing = records.find(record => record.jti === jti)
  if (existing !== undefined) {
    return {status: 'already-present', record: existing, total: records.length}
  }

  const record: SessionRevocationRecord = {
    jti,
    login: opts.login ?? '',
    revokedAt: now,
    expiresAt: opts.expiresAt ?? null,
  }
  const next = [...records, record]
  writeSessionRevocations(file, next)
  return {status: 'revoked', record, total: next.length}
}

/** Lists the current records (throws on a corrupt file, never silently green). */
export function listSessionRevocations(opts: {file?: string} = {}): SessionRevocationRecord[] {
  const file = opts.file ?? process.env[SESSION_REVOCATIONS_FILE_ENV] ?? DEFAULT_RECORD_FILE
  return readSessionRevocations(file)
}

export interface PruneResult {
  pruned: number
  kept: number
  changed: boolean
}

/** Drops records whose `expiresAt` has passed; null expiry is conservative-keep. */
export function pruneSessionRevocations(opts: {file?: string; now?: number} = {}): PruneResult {
  const file = opts.file ?? process.env[SESSION_REVOCATIONS_FILE_ENV] ?? DEFAULT_RECORD_FILE
  const now = opts.now ?? Math.floor(Date.now() / 1000)
  const records = readSessionRevocations(file)
  const kept = records.filter(record => !isExpired(record, now))
  const changed = kept.length !== records.length
  if (changed) {
    writeSessionRevocations(file, kept)
  }
  return {pruned: records.length - kept.length, kept: kept.length, changed}
}

function isExpired(record: SessionRevocationRecord, now: number): boolean {
  return record.expiresAt !== null && record.expiresAt <= now
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

export interface CliArgs {
  jti?: string
  login?: string
  expiresAt?: number
  file?: string
  list: boolean
  prune: boolean
  json: boolean
}

/** Parses CLI arguments. Returns null + writes usage on a bad invocation. */
export function parseCliArgs(argv: readonly string[]): CliArgs | null {
  const args: CliArgs = {list: false, prune: false, json: false}
  const positional: string[] = []
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? ''
    switch (arg) {
      case '--list':
        args.list = true
        break
      case '--prune':
        args.prune = true
        break
      case '--json':
        args.json = true
        break
      case '--login':
      case '--expires-at':
      case '--file': {
        const value = argv[i + 1]
        if (value === undefined || value.startsWith('--')) return null
        if (arg === '--login') args.login = value
        else if (arg === '--expires-at') {
          const parsed = Number(value)
          if (!Number.isFinite(parsed) || parsed <= 0) return null
          args.expiresAt = Math.floor(parsed)
        } else args.file = value
        i += 1
        break
      }
      default:
        if (arg.startsWith('--')) return null
        positional.push(arg)
    }
  }
  if (positional.length > 1) return null
  if (positional.length === 1) args.jti = positional[0]
  if (args.jti === undefined && !args.list && !args.prune) return null
  if (args.jti !== undefined && (args.list || args.prune)) return null
  return args
}

function usage(out: (line: string) => void): void {
  out('usage: node scripts/session-revoke.ts <jti> [--login LOGIN] [--expires-at EPOCH] [--file PATH] [--json]')
  out('       node scripts/session-revoke.ts --list [--file PATH] [--json]')
  out('       node scripts/session-revoke.ts --prune [--file PATH] [--json]')
  out('see docs/runbooks/session-kill-switch.md for the full kill-switch procedure')
}

export function main(argv: readonly string[]): number {
  const args = parseCliArgs(argv)
  if (args === null) {
    usage(line => process.stderr.write(`${line}\n`))
    return 2
  }

  try {
    if (args.list) {
      const records = listSessionRevocations({file: args.file})
      if (args.json) {
        process.stdout.write(`${JSON.stringify(records, null, 2)}\n`)
      } else {
        for (const record of records) {
          const exp = record.expiresAt === null ? 'never' : new Date(record.expiresAt * 1000).toISOString()
          process.stdout.write(
            `${record.jti}  login=${record.login || '?'}  revokedAt=${new Date(record.revokedAt * 1000).toISOString()}  expiresAt=${exp}\n`,
          )
        }
        process.stderr.write(`${records.length} record(s)\n`)
      }
      return 0
    }

    if (args.prune) {
      const result = pruneSessionRevocations({file: args.file})
      process.stdout.write(
        args.json ? `${JSON.stringify(result)}\n` : `pruned ${result.pruned}, kept ${result.kept} (file ${result.changed ? 'rewritten' : 'unchanged'})\n`,
      )
      return 0
    }

    const result = revokeSession(args.jti as string, {
      file: args.file,
      login: args.login,
      expiresAt: args.expiresAt,
    })
    if (args.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
    } else {
      process.stdout.write(
        result.status === 'revoked'
          ? `revoked session ${result.record.jti} (${result.total} record(s) total) — the running server picks it up without a restart\n`
          : `session ${result.record.jti} was already revoked (file untouched)\n`,
      )
    }
    return 0
  } catch (error) {
    // Corrupt record: refused write (exit 1). Anything else is a usage/IO error (exit 2).
    const message = error instanceof Error ? error.message : String(error)
    const corrupt = message.includes('corrupt/mis-shaped')
    process.stderr.write(`session-revoke: ${message}\n`)
    if (corrupt) {
      process.stderr.write('the server is failing closed (denying every session) until this file is fixed or removed\n')
      return 1
    }
    return 2
  }
}

// Entry-point check per the rm-702 comparator pattern (pathToFileURL vs a
// raw string compare — robust to how the runner invoked the file).
function isMainEntryPoint(metaUrl: string, argv1: string | undefined): boolean {
  if (argv1 === undefined || argv1 === '') return false
  try {
    return pathToFileURL(argv1).href === metaUrl
  } catch {
    return false
  }
}

if (isMainEntryPoint(import.meta.url, process.argv[1])) {
  process.exit(main(process.argv.slice(2)))
}
