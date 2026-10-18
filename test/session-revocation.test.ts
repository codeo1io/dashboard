/**
 * rm-2063 — operator session kill-switch: revocable dashboard cookies.
 *
 * Covers the acceptance matrix red-first:
 * - a revoked session id is rejected mid-TTL (no waiting for exp)
 * - the record survives a restart (new manager + new store, same file)
 * - a running server picks up an operator-side record write without a restart
 * - key rotation still invalidates outstanding cookies (the nuke-all half)
 * - fail-closed: corrupt-but-present record denies ALL sessions; absent file
 *   is an empty denylist (not an error)
 * - the /api/monitoring middleware seam rejects revoked cookies end-to-end
 */
import type {AggregatorSnapshot} from '../src/github/aggregator.ts'
import {Buffer} from 'node:buffer'
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import process from 'node:process'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {revokeSession} from '../scripts/session-revoke.ts'
import {buildDashboardApp} from '../src/server.ts'
import {
  FileSessionRevocationStore,
  isSessionId,
  loadSessionRevocationStore,
  serializeSessionRevocations,
  SESSION_REVOCATIONS_FILE_ENV,
  SessionManager,
  type SessionRevocationStore,
} from '../src/session.ts'

const KEY = Buffer.from('revocation-test-key-ABCDEFGHIJKLMNOP', 'utf8') // 32 bytes
const OTHER_KEY = Buffer.from('rotated-key-ABCDEFGHIJKLMNOPQRSTUV', 'utf8') // 32 bytes

let scratchDir: string

beforeEach(() => {
  scratchDir = mkdtempSync(join(tmpdir(), 'session-revocation-'))
})

afterEach(() => {
  rmSync(scratchDir, {recursive: true, force: true})
  delete process.env[SESSION_REVOCATIONS_FILE_ENV]
})

describe('rm-2063 revoked-mid-TTL rejection', () => {
  it('verify accepts a fresh cookie, then rejects it the moment its id is revoked', () => {
    const file = join(scratchDir, 'revocations.json')
    const store = new FileSessionRevocationStore(file)
    const sm = new SessionManager(KEY, store)
    const cookie = sm.sign('alice')
    const jti = sm.verify(cookie)?.jti
    expect(jti).toBeDefined()
    expect(sm.verify(cookie)).not.toBeNull()

    revokeSession(jti as string, {file, login: 'alice'})
    expect(sm.verify(cookie)).toBeNull()
  })

  it('revokes only the targeted session id — sibling cookies from other signings stay valid', () => {
    const file = join(scratchDir, 'revocations.json')
    const sm = new SessionManager(KEY, new FileSessionRevocationStore(file))
    const victim = sm.sign('alice')
    const survivor = sm.sign('alice')
    const victimJti = sm.verify(victim)?.jti as string

    revokeSession(victimJti, {file, login: 'alice'})
    expect(sm.verify(victim)).toBeNull()
    expect(sm.verify(survivor)?.login).toBe('alice')
  })
})

describe('rm-2063 durability across restarts and live pickup', () => {
  it('a fresh manager + store on the same file still rejects the revoked session (restart persistence)', () => {
    const file = join(scratchDir, 'revocations.json')
    const before = new SessionManager(KEY, new FileSessionRevocationStore(file))
    const cookie = before.sign('alice')
    const jti = before.verify(cookie)?.jti as string
    revokeSession(jti, {file, login: 'alice'})

    // "Restart": nothing survives but the file on disk.
    const after = new SessionManager(KEY, new FileSessionRevocationStore(file))
    expect(after.verify(cookie)).toBeNull()
  })

  it('a long-lived store picks up an operator-side record write without restart (mtime/size cache)', () => {
    const file = join(scratchDir, 'revocations.json')
    const store = new FileSessionRevocationStore(file)
    const sm = new SessionManager(KEY, store)
    const cookie = sm.sign('alice')
    const jti = sm.verify(cookie)?.jti as string
    expect(sm.verify(cookie)).not.toBeNull()

    // Operator writes the record out-of-band (exactly what scripts/session-revoke.ts does).
    writeFileSync(
      file,
      serializeSessionRevocations([{jti, login: 'alice', revokedAt: 1_789_000_000, expiresAt: null}]),
    )
    expect(sm.verify(cookie)).toBeNull()
  })

  it('removing the record file clears the denylist (revocations are re-recordable)', () => {
    const file = join(scratchDir, 'revocations.json')
    const sm = new SessionManager(KEY, new FileSessionRevocationStore(file))
    const cookie = sm.sign('alice')
    const jti = sm.verify(cookie)?.jti as string
    revokeSession(jti, {file})
    expect(sm.verify(cookie)).toBeNull()

    rmSync(file)
    expect(sm.verify(cookie)?.login).toBe('alice')
  })
})

describe('rm-2063 fail-closed record states', () => {
  it('absent record file = empty denylist (not an error, nothing revoked)', () => {
    const sm = new SessionManager(KEY, new FileSessionRevocationStore(join(scratchDir, 'absent.json')))
    expect(sm.verify(sm.sign('alice'))?.login).toBe('alice')
  })

  it('corrupt JSON record denies ALL sessions (poisoned until fixed or removed)', () => {
    const file = join(scratchDir, 'revocations.json')
    writeFileSync(file, '{"version":1,"revocations":[truncated')
    const sm = new SessionManager(KEY, new FileSessionRevocationStore(file))
    expect(sm.verify(sm.sign('alice'))).toBeNull()
    expect(sm.verify(sm.sign('bob'))).toBeNull()
  })

  it('mis-shaped record (wrong version / non-array revocations) denies ALL sessions', () => {
    for (const bad of ['{}', '{"version":2,"revocations":[]}', '{"version":1,"revocations":{}}', '[]']) {
      const file = join(scratchDir, `bad-${JSON.stringify(bad).length}.json`)
      writeFileSync(file, bad)
      const sm = new SessionManager(KEY, new FileSessionRevocationStore(file))
      expect(sm.verify(sm.sign('alice'))).toBeNull()
    }
  })

  it('a record entry with a malformed session id poisons the whole record (strict shape)', () => {
    const file = join(scratchDir, 'revocations.json')
    writeFileSync(file, '{"version":1,"revocations":[{"jti":"not-a-session-id","login":"alice","revokedAt":1,"expiresAt":null}]}')
    const sm = new SessionManager(KEY, new FileSessionRevocationStore(file))
    expect(sm.verify(sm.sign('alice'))).toBeNull()
  })

  it('poisoning clears as soon as a well-formed file replaces the corrupt one', () => {
    const file = join(scratchDir, 'revocations.json')
    const store = new FileSessionRevocationStore(file)
    const sm = new SessionManager(KEY, store)
    writeFileSync(file, 'not json at all')
    expect(sm.verify(sm.sign('alice'))).toBeNull()

    writeFileSync(file, serializeSessionRevocations([]))
    expect(sm.verify(sm.sign('alice'))?.login).toBe('alice')
  })
})

describe('rm-2063 key rotation (nuke-all) interaction', () => {
  it('rotation invalidates outstanding cookies regardless of the denylist — the stronger lever still wins', () => {
    const file = join(scratchDir, 'revocations.json')
    const before = new SessionManager(KEY, new FileSessionRevocationStore(file))
    const cookie = before.sign('alice')

    const rotated = new SessionManager(OTHER_KEY, new FileSessionRevocationStore(file))
    expect(rotated.verify(cookie)).toBeNull()
  })
})

describe('rm-2063 /api/monitoring middleware seam', () => {
  const snapshot: AggregatorSnapshot = {
    repos: [],
    staleBanner: false,
    driftCount: 0,
    enumerationIncomplete: null,
    refreshedAt: null,
    refreshDurationMs: null,
    refreshDegraded: false,
  }

  async function buildApp(store: SessionRevocationStore) {
    return buildDashboardApp({
      operatorLogin: 'octocat',
      cookieKey: KEY,
      getSnapshot: () => snapshot,
      sessionRevocations: store,
    })
  }

  it('a valid cookie is served, the same cookie with its id revoked is denied', async () => {
    const file = join(scratchDir, 'revocations.json')
    const store = new FileSessionRevocationStore(file)
    const app = await buildApp(store)
    const sm = new SessionManager(KEY)
    const cookie = sm.sign('octocat')
    const headers = {cookie: `session=${cookie}`}

    const ok = await app.request('/api/monitoring', {headers})
    expect(ok.status).toBe(200)

    revokeSession(sm.verify(cookie)?.jti as string, {file, login: 'octocat'})
    const denied = await app.request('/api/monitoring', {headers})
    expect([302, 303, 401]).toContain(denied.status)
    if (denied.status === 302 || denied.status === 303) {
      expect(denied.headers.get('location')).toContain('/auth/login')
    }
  })

  it('a deny-all store (poisoned-record equivalent) refuses every session cookie', async () => {
    const app = await buildApp({isRevoked: () => true})
    const cookie = new SessionManager(KEY).sign('octocat')
    const res = await app.request('/api/monitoring', {headers: {cookie: `session=${cookie}`}})
    expect([302, 303, 401]).toContain(res.status)
  })
})

describe('loadSessionRevocationStore env override', () => {
  it('honors DASHBOARD_SESSION_REVOCATIONS_FILE', () => {
    const file = join(scratchDir, 'env.json')
    process.env[SESSION_REVOCATIONS_FILE_ENV] = file
    const store = loadSessionRevocationStore()
    expect(store).toBeInstanceOf(FileSessionRevocationStore)

    const sm = new SessionManager(KEY, store)
    const cookie = sm.sign('alice')
    revokeSession(sm.verify(cookie)?.jti as string, {file})
    expect(sm.verify(cookie)).toBeNull()
  })
})

describe('isSessionId shape guard', () => {
  it('accepts exactly 32 lowercase hex chars, rejects everything else', () => {
    expect(isSessionId('a'.repeat(32))).toBe(true)
    expect(isSessionId('0123456789abcdef'.repeat(2))).toBe(true)
    expect(isSessionId('A'.repeat(32))).toBe(false) // uppercase
    expect(isSessionId('a'.repeat(31))).toBe(false)
    expect(isSessionId('a'.repeat(33))).toBe(false)
    expect(isSessionId('g'.repeat(32))).toBe(false)
    expect(isSessionId('')).toBe(false)
    expect(isSessionId(42)).toBe(false)
    expect(isSessionId(null)).toBe(false)
  })
})
