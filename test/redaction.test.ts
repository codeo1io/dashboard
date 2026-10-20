import {describe, expect, it} from 'vitest'
import {
  DEFAULT_SENSITIVE_FIELDS,
  redactSensitiveFields,
  sanitizeErrorMessage,
} from '../src/logger.ts'

/**
 * rm-1505 (2026-10-18, repository-maintenance cycle:2 run 5723bb0a): pin the
 * logger's redaction ladder. `sanitizeErrorMessage` is defence-in-depth for
 * error text before it reaches a log sink — PEM blocks, JWT-shaped strings,
 * GitHub token prefixes (gho_/ghs_/ghp_/ghu_/github_pat_), and 40+ character
 * bearer-looking opaque tokens. `redactSensitiveFields` masks string values
 * under sensitive NAMES, recursively. Neither had a dedicated unit: the suites
 * that observe redaction do so through full-app log output, so a ladder
 * regression (a loosened pattern, a dropped prefix) would surface only as a
 * partial leak in integration, not as a named failure.
 */

describe('sanitizeErrorMessage — secret ladder (rm-1505)', () => {
  it('strips PEM blocks', () => {
    const pem = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA7characterS\n-----END RSA PRIVATE KEY-----'
    const out = sanitizeErrorMessage(`auth failed loading key ${pem} for installation 123`)
    expect(out).not.toContain('MIIEowIBAAKCAQEA')
    expect(out).toContain('[REDACTED]')
    expect(out).toContain('auth failed loading key')
    expect(out).toContain('for installation 123')
  })

  it('strips JWT-shaped strings (three base64url segments)', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJVadQssw5c'
    const out = sanitizeErrorMessage(`session rejected token ${jwt} at refresh`)
    expect(out).not.toContain('eyJhbGciOiJIUzI1NiJ9')
    expect(out).toContain('[REDACTED]')
    expect(out).toContain('session rejected token')
    expect(out).toContain('at refresh')
  })

  it.each(['gho', 'ghs', 'ghp', 'ghu'] as const)('strips %s_ prefixed tokens', prefix => {
    const token = `${prefix}_${'a'.repeat(36)}`
    const out = sanitizeErrorMessage(`bearer ${token} expired`)
    expect(out).not.toContain(token)
    expect(out).toContain('[REDACTED]')
    expect(out).toContain('expired')
  })

  it('strips github_pat_ fine-grained tokens (case-insensitive)', () => {
    const token = `github_pat_${'B'.repeat(22)}_${'c'.repeat(59)}`
    const out = sanitizeErrorMessage(`exchange failed for ${token.toUpperCase()}`)
    expect(out).not.toContain('GITHUB_PAT_')
    expect(out).toContain('[REDACTED]')
  })

  it('strips 40+ character bearer-looking opaque tokens', () => {
    const opaque = 'x'.repeat(43)
    const out = sanitizeErrorMessage(`upstream said 401 with token ${opaque} in flight`)
    expect(out).not.toContain(opaque)
    expect(out).toContain('[REDACTED]')
  })

  it('leaves benign error text verbatim — including run ids, SHAs, and paths', () => {
    const benign =
      'run 5723bb0a4d4d48f0bcf9b34d90d7675e at commit 3d3c42e5 failed: ' +
      'GET /work/projects/dashboard/src/routes/auth.ts → 500'
    expect(sanitizeErrorMessage(benign)).toBe(benign)
  })

  it('over-redacts long hyphenated identifiers AND full 40-hex SHAs (conservative by design)', () => {
    // A 40+ char [\w-] run IS redacted even when it is not a secret — a full
    // git SHA (exactly 40 hex) is caught by the same rung. The ladder trades
    // false positives for false negatives: short SHAs and 32-hex run ids
    // survive (previous test), long opaque strings do not. This test documents
    // that tradeoff so a future "tightening" that lets real tokens through
    // has to reckon with it explicitly.
    const longIdentifier = 'a-very-long-hyphenated-branch-name-component'
    expect(sanitizeErrorMessage(`branch ${longIdentifier} diverged`)).toContain('[REDACTED]')
    const fullSha = '3d3c42e5aac5ba805825da76410c181273ba90b1'
    expect(sanitizeErrorMessage(`at commit ${fullSha} failed`)).toContain('[REDACTED]')
  })
})

describe('redactSensitiveFields — sensitive-name masking (rm-1505)', () => {
  it('masks string values of sensitive-named fields at the top level', () => {
    const context = {repo: 'dashboard', token: 'gho_abcdefabcdefabcdefabcdef', count: 3}
    const out = redactSensitiveFields(context)
    expect(out).toEqual({repo: 'dashboard', token: '[REDACTED]', count: 3})
  })

  it('walks nested objects and arrays, masking at every depth', () => {
    const context = {
      installation: {id: 42, privateKey: '-----BEGIN-----'},
      clients: [{name: 'oauth', accessToken: `ghs_${'z'.repeat(40)}`}],
    }
    const out = redactSensitiveFields(context)
    expect(out).toEqual({
      installation: {id: 42, privateKey: '[REDACTED]'},
      clients: [{name: 'oauth', accessToken: '[REDACTED]'}],
    })
  })

  it('walks (does not mask) non-string sensitive values', () => {
    const context = {auth: {expiresIn: 3600, scopes: ['read']}, key: null}
    const out = redactSensitiveFields(context)
    expect(out).toEqual(context)
  })

  it('does not mutate the input context', () => {
    const context = {token: 'gho_secretvalue1234'}
    redactSensitiveFields(context)
    expect(context.token).toBe('gho_secretvalue1234')
  })

  it('custom patterns override the default set', () => {
    const out = redactSensitiveFields({shibboleth: 'keep-me', token: 'keep-me-too'}, ['shibboleth'])
    expect(out).toEqual({shibboleth: '[REDACTED]', token: 'keep-me-too'})
  })

  it('the default pattern list keeps the core sensitive-name families', () => {
    for (const expected of ['token', 'password', 'secret', 'key', 'auth', 'credential', 'bearer', 'apikey']) {
      expect(DEFAULT_SENSITIVE_FIELDS).toContain(expected)
    }
  })

  it('scalar inputs pass through untouched', () => {
    expect(redactSensitiveFields('token')).toBe('token')
    expect(redactSensitiveFields(7)).toBe(7)
    expect(redactSensitiveFields(null)).toBeNull()
  })
})
