/**
 * rm-2063 — scripts/session-revoke.ts (operator session kill-switch tool).
 *
 * Function-level coverage of the record lifecycle (revoke/list/prune), the
 * atomic-write discipline, the corrupt-record refusal, and the CLI parser —
 * plus the end-to-end seam: a revoke via the tool is what the server-side
 * FileSessionRevocationStore reads to deny the session.
 */
import {Buffer} from 'node:buffer'
import {existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import process from 'node:process'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {
  listSessionRevocations,
  main,
  parseCliArgs,
  pruneSessionRevocations,
  revokeSession,
} from '../scripts/session-revoke.ts'
import {FileSessionRevocationStore, serializeSessionRevocations, SessionManager} from '../src/session.ts'

const KEY = Buffer.from('revoke-script-test-key-ABCDEFGHIJKLMN', 'utf8') // 32 bytes
const JTI_A = 'a'.repeat(32)
const JTI_B = 'b'.repeat(32)

/** Silence CLI output (and keep a handle for assertion) inside main() tests. */
function silence(): void {
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
}

let scratchDir: string
let file: string

beforeEach(() => {
  scratchDir = mkdtempSync(join(tmpdir(), 'session-revoke-'))
  file = join(scratchDir, 'revocations.json')
})

afterEach(() => {
  rmSync(scratchDir, {recursive: true, force: true})
  vi.restoreAllMocks()
})

describe('revokeSession', () => {
  it('records a revocation with audit fields and keeps it readable', () => {
    const result = revokeSession(JTI_A, {file, login: 'octocat', now: 1_789_000_000, expiresAt: 1_789_100_000})
    expect(result.status).toBe('revoked')
    expect(result.record).toEqual({jti: JTI_A, login: 'octocat', revokedAt: 1_789_000_000, expiresAt: 1_789_100_000})
    expect(result.total).toBe(1)

    const records = listSessionRevocations({file})
    expect(records).toHaveLength(1)
    expect(records[0]?.jti).toBe(JTI_A)
  })

  it('is idempotent: an already-revoked id leaves the file untouched', () => {
    revokeSession(JTI_A, {file, login: 'octocat', now: 100})
    const before = readFileSync(file, 'utf8')
    const mtimeBefore = statSync(file).mtimeMs

    const result = revokeSession(JTI_A, {file, login: 'someone-else', now: 200})
    expect(result.status).toBe('already-present')
    expect(result.record.login).toBe('octocat')
    expect(readFileSync(file, 'utf8')).toBe(before)
    expect(statSync(file).mtimeMs).toBe(mtimeBefore)
  })

  it('rejects ids that are not the exact minted shape', () => {
    for (const bad of ['', 'abc', 'A'.repeat(32), 'a'.repeat(31), 'a'.repeat(33)]) {
      expect(() => revokeSession(bad, {file})).toThrow(/invalid session id/)
    }
    expect(existsSync(file)).toBe(false) // no record created on rejection
  })

  it('creates the parent directory on first-ever revoke', () => {
    const nested = join(scratchDir, 'nested', 'dir', 'revocations.json')
    revokeSession(JTI_A, {file: nested})
    expect(existsSync(nested)).toBe(true)
  })

  it('prunes expired entries opportunistically while appending', () => {
    writeFileSync(
      file,
      serializeSessionRevocations([{jti: JTI_B, login: '', revokedAt: 1, expiresAt: 1_000}]),
    )
    const result = revokeSession(JTI_A, {file, now: 2_000})
    expect(result.status).toBe('revoked')
    expect(result.total).toBe(1) // expired JTI_B dropped, JTI_A is the only record
    expect(listSessionRevocations({file}).map(record => record.jti)).toEqual([JTI_A])
  })

  it('REFUSES to touch a corrupt record file (never silently rewrite a broken record)', () => {
    writeFileSync(file, '{"version":1,"revocations":[truncated')
    const before = readFileSync(file, 'utf8')
    expect(() => revokeSession(JTI_A, {file})).toThrow(/corrupt\/mis-shaped/)
    expect(readFileSync(file, 'utf8')).toBe(before)
  })
})

describe('pruneSessionRevocations', () => {
  it('drops only entries past their expiresAt; null expiry is conservative-keep', () => {
    writeFileSync(
      file,
      serializeSessionRevocations([
        {jti: JTI_A, login: '', revokedAt: 1, expiresAt: 1_000},
        {jti: JTI_B, login: '', revokedAt: 1, expiresAt: null},
      ]),
    )
    const result = pruneSessionRevocations({file, now: 1_500})
    expect(result).toEqual({pruned: 1, kept: 1, changed: true})
    expect(listSessionRevocations({file}).map(record => record.jti)).toEqual([JTI_B])
  })

  it('is a no-op (no rewrite) when nothing is expired', () => {
    writeFileSync(file, serializeSessionRevocations([{jti: JTI_A, login: '', revokedAt: 1, expiresAt: null}]))
    const before = readFileSync(file, 'utf8')
    const result = pruneSessionRevocations({file, now: 1_000})
    expect(result.changed).toBe(false)
    expect(readFileSync(file, 'utf8')).toBe(before)
  })

  it('throws on a corrupt record rather than green-washing it', () => {
    writeFileSync(file, 'not json')
    expect(() => pruneSessionRevocations({file})).toThrow(/corrupt\/mis-shaped/)
  })
})

describe('end-to-end seam: tool write → server-side denial', () => {
  it('a cookie revoked via the tool is denied by a SessionManager reading the same file', () => {
    const sm = new SessionManager(KEY, new FileSessionRevocationStore(file))
    const cookie = sm.sign('octocat')
    const jti = sm.verify(cookie)?.jti as string
    expect(sm.verify(cookie)).not.toBeNull()

    const result = revokeSession(jti, {file, login: 'octocat', expiresAt: Math.floor(Date.now() / 1000) + 60})
    expect(result.status).toBe('revoked')
    expect(sm.verify(cookie)).toBeNull()
  })
})

describe('parseCliArgs', () => {
  it('parses a targeted revoke with all options', () => {
    const args = parseCliArgs([JTI_A, '--login', 'octocat', '--expires-at', '1234567890', '--file', '/x/y.json', '--json'])
    expect(args).toEqual({
      jti: JTI_A,
      login: 'octocat',
      expiresAt: 1_234_567_890,
      file: '/x/y.json',
      list: false,
      prune: false,
      json: true,
    })
  })

  it('parses --list / --prune modes and flags standalone flags in any order', () => {
    expect(parseCliArgs(['--list', '--json'])).toMatchObject({list: true, prune: false, json: true})
    expect(parseCliArgs(['--prune'])).toMatchObject({list: false, prune: true, json: false})
    expect(parseCliArgs(['--json', JTI_A])?.jti).toBe(JTI_A)
  })

  it('returns null for ambiguous or malformed invocations', () => {
    expect(parseCliArgs([])).toBeNull() // no action
    expect(parseCliArgs([JTI_A, '--list'])).toBeNull() // jti + list conflict
    expect(parseCliArgs([JTI_A, JTI_B])).toBeNull() // two positionals
    expect(parseCliArgs(['--bogus'])).toBeNull() // unknown flag
    expect(parseCliArgs(['--login'])).toBeNull() // missing value
    expect(parseCliArgs(['--expires-at', 'abc'])).toBeNull() // non-numeric epoch
    expect(parseCliArgs([JTI_A, '--file', '--json'])).toBeNull() // flag-as-value
  })
})

describe('main (CLI)', () => {
  it('exits 0 on revoke and is idempotent on re-run', () => {
    silence()
    expect(main([JTI_A, '--file', file])).toBe(0)
    expect(listSessionRevocations({file})).toHaveLength(1)
    expect(main([JTI_A, '--file', file])).toBe(0)
    expect(listSessionRevocations({file})).toHaveLength(1)
  })

  it('exits 0 on --list and --prune', () => {
    silence()
    expect(main(['--list', '--file', file])).toBe(0)
    writeFileSync(file, serializeSessionRevocations([{jti: JTI_A, login: '', revokedAt: 1, expiresAt: 1}]))
    expect(main(['--prune', '--file', file])).toBe(0)
    expect(listSessionRevocations({file})).toHaveLength(0)
  })

  it('exits 2 on usage errors', () => {
    silence()
    expect(main([])).toBe(2)
    expect(main(['not-a-jti', '--file', file])).toBe(2)
    expect(existsSync(file)).toBe(false)
  })

  it('exits 1 on a corrupt record (refused write) with the fail-closed hint', () => {
    silence()
    writeFileSync(file, 'not json')
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    expect(main([JTI_A, '--file', file])).toBe(1)
    expect(String(stderr.mock.calls.at(-1)?.[0])).toContain('failing closed')
    expect(readFileSync(file, 'utf8')).toBe('not json')
  })
})
