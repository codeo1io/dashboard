import process from 'node:process'
import {describe, expect, it} from 'vitest'
import {toBootCookieKeyFailure, validateProductionBootEnv} from '../src/server.ts'

// rm-876 (repository-maintenance ffe96544 cycle:1 run 4c0ec7a58ade
// implement 426ceb05): production boot-time OAuth-credential validation. A
// deployment missing the operator GitHub OAuth env used to boot green and
// fail only at the operator's first sign-in — buildDashboardApp still
// coalesces to '' by design (tests and dev boots construct the app without
// OAuth env; the lazy seam stays), so the fail-fast lives at the production
// serve seam: createDashboardServer calls validateProductionBootEnv before
// wiring anything, with a NODE_ENV=development|test carve-out for boots
// where the credentials are intentionally absent.

describe('rm-876 validateProductionBootEnv (OAuth fast-fail)', () => {
  it('fails fast naming both missing vars when neither OAuth credential is set', () => {
    expect(() => validateProductionBootEnv({})).toThrow(
      /dashboard boot failed: DASHBOARD_OAUTH_CLIENT_ID and DASHBOARD_OAUTH_CLIENT_SECRET are not set/,
    )
  })

  it('names only the missing client id when the secret is present', () => {
    const boom = (): void =>
      validateProductionBootEnv({DASHBOARD_OAUTH_CLIENT_SECRET: 'gh_oauth_secret'})
    expect(boom).toThrow(/DASHBOARD_OAUTH_CLIENT_ID is not set/)
    expect(boom).not.toThrow(/DASHBOARD_OAUTH_CLIENT_SECRET/)
  })

  it('names only the missing client secret when the id is present', () => {
    const boom = (): void =>
      validateProductionBootEnv({DASHBOARD_OAUTH_CLIENT_ID: 'Iv1.client'})
    expect(boom).toThrow(/DASHBOARD_OAUTH_CLIENT_SECRET is not set/)
    expect(boom).not.toThrow(/DASHBOARD_OAUTH_CLIENT_ID is/)
  })

  it('treats whitespace-only credentials as missing (fail-closed on padded empties)', () => {
    expect(() =>
      validateProductionBootEnv({
        DASHBOARD_OAUTH_CLIENT_ID: '  ',
        DASHBOARD_OAUTH_CLIENT_SECRET: '\t',
      }),
    ).toThrow(/DASHBOARD_OAUTH_CLIENT_ID and DASHBOARD_OAUTH_CLIENT_SECRET are not set/)
  })

  it('happy path: both credentials set with an unset NODE_ENV (production-like) boot cleanly', () => {
    expect(() =>
      validateProductionBootEnv({
        DASHBOARD_OAUTH_CLIENT_ID: 'Iv1.client',
        DASHBOARD_OAUTH_CLIENT_SECRET: 'gh_oauth_secret',
      }),
    ).not.toThrow()
  })

  it('NODE_ENV=development keeps the lazy dev boot (credentials intentionally absent)', () => {
    expect(() => validateProductionBootEnv({NODE_ENV: 'development'})).not.toThrow()
  })

  it('NODE_ENV=test keeps the lazy test boot (credentials intentionally absent)', () => {
    expect(() => validateProductionBootEnv({NODE_ENV: 'test'})).not.toThrow()
  })

  it('the failure copy is actionable: it names the runbook and the lazy-mode escape hatch', () => {
    const boom = (): void => validateProductionBootEnv({})
    expect(boom).toThrow(/README/)
    expect(boom).toThrow(/NODE_ENV=development or NODE_ENV=test/)
  })
})

describe('rm-876 toBootCookieKeyFailure (cookie-key boot copy)', () => {
  const keyFileMiss = Object.assign(
    new Error("ENOENT: no such file or directory, open '/data/cookie.key'"),
    {code: 'ENOENT'},
  )

  it('translates a missing key file into an actionable message naming both env vars and the attempted path', () => {
    const previous = process.env.DASHBOARD_COOKIE_KEY_FILE
    process.env.DASHBOARD_COOKIE_KEY_FILE = '/tmp/absent-cookie-key-for-rm-876'
    try {
      const message = toBootCookieKeyFailure(keyFileMiss).message
      expect(message).toContain('dashboard boot failed')
      expect(message).toContain('DASHBOARD_COOKIE_KEY')
      expect(message).toContain('DASHBOARD_COOKIE_KEY_FILE')
      expect(message).toContain('/tmp/absent-cookie-key-for-rm-876')
    } finally {
      if (previous === undefined) delete process.env.DASHBOARD_COOKIE_KEY_FILE
      else process.env.DASHBOARD_COOKIE_KEY_FILE = previous
    }
  })

  it('passes decode and length failures through untouched (loadCookieKey already names their remediation)', () => {
    const decode = new Error(
      'DASHBOARD_COOKIE_KEY decoded to 16 bytes; need at least 32 — generate with: openssl rand -hex 32',
    )
    expect(toBootCookieKeyFailure(decode)).toBe(decode)
  })
})
