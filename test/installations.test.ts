/**
 * Test suite for src/github/installations.ts
 *
 * Tests the pure transform logic via dependency injection — no network calls.
 * Covers: happy path, edge cases, error paths, and security invariants.
 */

import type {InstallationRecord, InstallationsClient, RepoRecord} from '../src/github/installations.ts'

import {beforeEach, describe, expect, it, vi} from 'vitest'
import {
  CORE_READ_PERMISSIONS,
  createInstallationRepoListFn,
  enumerateRepos,
  FetchInstallationsError,
  FULL_READ_PERMISSIONS,
  InstallationTokenCache,
  mintReadOnlyToken,
  OPTIONAL_READ_PERMISSIONS,
} from '../src/github/installations.ts'
import {isErr, isOk} from '../src/result.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRepo(overrides: Partial<RepoRecord> = {}): RepoRecord {
  return {
    node_id: 'MDEwOlJlcG9zaXRvcnkx',
    database_id: 186915400,
    owner: 'fro-bot',
    name: 'agent',
    full_name: 'fro-bot/agent',
    installation_id: 1,
    ...overrides,
  }
}

function makeInstall(id: number, account = 'fro-bot'): InstallationRecord {
  return {id, account}
}

/**
 * rm-170: only permission-shaped (HTTP 403) mint failures justify the
 * core-scope fallback — a transient/network error rethrows so it can never
 * silently mint + cache a reduced-scope token. Shapes the error like
 * Octokit's RequestError (status field).
 */
const permissionError = (message: string) => Object.assign(new Error(message), {status: 403})

function makeClient(overrides: Partial<InstallationsClient> = {}): InstallationsClient {
  return {
    listInstallations: vi.fn().mockResolvedValue([]),
    mintInstallationToken: vi.fn().mockResolvedValue({token: 'ghs_fake_token', expiresAt: null}),
    listInstallationRepos: vi.fn().mockResolvedValue([]),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe('enumerateRepos — happy path', () => {
  it('unions repos from 2 installations, dedupes overlapping node_id', async () => {
    const sharedRepo = makeRepo({node_id: 'SHARED', full_name: 'fro-bot/shared'})
    const repoA = makeRepo({node_id: 'REPO_A', full_name: 'fro-bot/agent'})
    const repoB = makeRepo({node_id: 'REPO_B', full_name: 'fro-bot/dashboard'})

    const client = makeClient({
      listInstallations: vi.fn().mockResolvedValue([makeInstall(1), makeInstall(2)]),
      mintInstallationToken: vi.fn().mockResolvedValue({token: 'ghs_fake_token', expiresAt: null}),
      listInstallationRepos: vi
        .fn()
        // install 1 has sharedRepo + repoA
        .mockResolvedValueOnce([sharedRepo, repoA])
        // install 2 has sharedRepo (duplicate) + repoB
        .mockResolvedValueOnce([sharedRepo, repoB]),
    })

    const result = await enumerateRepos(client)

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return

    const {repos} = result.data
    // 3 unique repos (sharedRepo deduped)
    expect(repos).toHaveLength(3)
    const nodeIds = repos.map(r => r.node_id)
    expect(nodeIds).toContain('SHARED')
    expect(nodeIds).toContain('REPO_A')
    expect(nodeIds).toContain('REPO_B')
    // SHARED appears exactly once
    expect(nodeIds.filter(id => id === 'SHARED')).toHaveLength(1)
  })

  it('returns both installations in the result', async () => {
    const client = makeClient({
      listInstallations: vi.fn().mockResolvedValue([makeInstall(10, 'org-a'), makeInstall(20, 'org-b')]),
      listInstallationRepos: vi.fn().mockResolvedValue([makeRepo()]),
    })

    const result = await enumerateRepos(client)
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return

    expect(result.data.installations).toHaveLength(2)
    expect(result.data.installations[0]?.id).toBe(10)
    expect(result.data.installations[1]?.id).toBe(20)
  })
})

// ---------------------------------------------------------------------------
// Pagination: listInstallations fetches all pages
// ---------------------------------------------------------------------------

describe('buildInstallationsClient — listInstallations pagination', () => {
  it('accumulates installations across multiple pages (>100 total)', async () => {
    const {buildInstallationsClient} = await import('../src/github/installations.ts')

    // Page 1: 100 installations (full page → must fetch page 2)
    const page1 = Array.from({length: 100}, (_, i) => ({
      id: i + 1,
      account: {login: `org-${i + 1}`},
    }))
    // Page 2: 3 installations (partial page → stop)
    const page2 = Array.from({length: 3}, (_, i) => ({
      id: 200 + i + 1,
      account: {login: `org-extra-${i + 1}`},
    }))

    const requestFn = vi.fn()
      .mockResolvedValueOnce({data: page1})
      .mockResolvedValueOnce({data: page2})

    const fakeAppClient = {
      octokit: {request: requestFn},
      mintInstallationToken: vi.fn(),
    }

    const client = buildInstallationsClient(fakeAppClient as unknown as Parameters<typeof buildInstallationsClient>[0])
    const installations = await client.listInstallations()

    // All 103 installations must be present
    expect(installations).toHaveLength(103)

    // Page 2 must have been requested
    expect(requestFn).toHaveBeenCalledTimes(2)
    const secondCall = requestFn.mock.calls[1]
    expect(secondCall?.[1]).toMatchObject({per_page: 100, page: 2})

    // Spot-check: first and last installations
    expect(installations[0]?.id).toBe(1)
    expect(installations[0]?.account).toBe('org-1')
    expect(installations[102]?.id).toBe(203)
    expect(installations[102]?.account).toBe('org-extra-3')
  })

  it('stops after a single page when fewer than 100 installations returned', async () => {
    const {buildInstallationsClient} = await import('../src/github/installations.ts')

    const page1 = Array.from({length: 5}, (_, i) => ({
      id: i + 1,
      account: {login: `org-${i + 1}`},
    }))

    const requestFn = vi.fn().mockResolvedValueOnce({data: page1})

    const fakeAppClient = {
      octokit: {request: requestFn},
      mintInstallationToken: vi.fn(),
    }

    const client = buildInstallationsClient(fakeAppClient as unknown as Parameters<typeof buildInstallationsClient>[0])
    const installations = await client.listInstallations()

    expect(installations).toHaveLength(5)
    // Only one page request
    expect(requestFn).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// Security: database_id captured from REST id field
// ---------------------------------------------------------------------------

describe('security — database_id captured from REST id field', () => {
  it('enumerated repos carry database_id from the REST id field', async () => {
    const repoWithDbId = makeRepo({
      node_id: 'R_kgDOJ_bMaQ',
      database_id: 123456789,
      owner: 'fro-bot',
      name: 'agent',
      full_name: 'fro-bot/agent',
    })

    const client = makeClient({
      listInstallations: vi.fn().mockResolvedValue([makeInstall(1)]),
      listInstallationRepos: vi.fn().mockResolvedValue([repoWithDbId]),
    })

    const result = await enumerateRepos(client)

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return

    const {repos} = result.data
    expect(repos).toHaveLength(1)
    // database_id must be present and match the REST id field value
    expect(repos[0]?.database_id).toBe(123456789)
    expect(repos[0]?.node_id).toBe('R_kgDOJ_bMaQ')
  })

  it('database_id is preserved across deduplication (first-seen wins)', async () => {
    const repoInstall1 = makeRepo({node_id: 'SHARED', database_id: 111, full_name: 'fro-bot/shared'})
    const repoInstall2 = makeRepo({node_id: 'SHARED', database_id: 111, full_name: 'fro-bot/shared'})

    const client = makeClient({
      listInstallations: vi.fn().mockResolvedValue([makeInstall(1), makeInstall(2)]),
      mintInstallationToken: vi.fn().mockResolvedValue({token: 'ghs_fake_token', expiresAt: null}),
      listInstallationRepos: vi
        .fn()
        .mockResolvedValueOnce([repoInstall1])
        .mockResolvedValueOnce([repoInstall2]),
    })

    const result = await enumerateRepos(client)

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return

    const {repos} = result.data
    expect(repos).toHaveLength(1)
    expect(repos[0]?.database_id).toBe(111)
  })
})

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('enumerateRepos — edge cases', () => {
  it('returns empty repos for 0 installations without crashing', async () => {
    const client = makeClient({
      listInstallations: vi.fn().mockResolvedValue([]),
    })

    const result = await enumerateRepos(client)

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.data.repos).toHaveLength(0)
    expect(result.data.installations).toHaveLength(0)
  })

  it('installation with 0 accessible repos contributes nothing', async () => {
    const client = makeClient({
      listInstallations: vi.fn().mockResolvedValue([makeInstall(1)]),
      listInstallationRepos: vi.fn().mockResolvedValue([]),
    })

    const result = await enumerateRepos(client)

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.data.repos).toHaveLength(0)
  })

  it('skips an installation whose token mint fails, continues with others', async () => {
    const repoB = makeRepo({node_id: 'REPO_B', full_name: 'fro-bot/dashboard'})

    const client = makeClient({
      listInstallations: vi.fn().mockResolvedValue([makeInstall(1), makeInstall(2)]),
      mintInstallationToken: vi
        .fn()
        // install 1: full permissions fail, core-only also fails → skip
        .mockRejectedValueOnce(new Error('scope not registered'))
        .mockRejectedValueOnce(new Error('scope not registered'))
        // install 2: succeeds
        .mockResolvedValueOnce({token: 'ghs_install2_token', expiresAt: null}),
      listInstallationRepos: vi.fn().mockResolvedValue([repoB]),
    })

    const result = await enumerateRepos(client)

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    // Only install 2's repos
    expect(result.data.repos).toHaveLength(1)
    expect(result.data.repos[0]?.node_id).toBe('REPO_B')
  })
})

// ---------------------------------------------------------------------------
// Error path
// ---------------------------------------------------------------------------

describe('enumerateRepos — error path', () => {
  it('returns err(FetchInstallationsError) when listInstallations rejects', async () => {
    const client = makeClient({
      listInstallations: vi.fn().mockRejectedValue(new Error('network timeout')),
    })

    const result = await enumerateRepos(client)

    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.error).toBeInstanceOf(FetchInstallationsError)
    expect(result.error.message).toContain('network timeout')
  })

  it('does not throw — always returns a Result', async () => {
    const client = makeClient({
      listInstallations: vi.fn().mockRejectedValue(new Error('boom')),
    })

    // Must not throw
    await expect(enumerateRepos(client)).resolves.toBeDefined()
    const result = await enumerateRepos(client)
    expect(isErr(result)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Security: PEM redaction
// ---------------------------------------------------------------------------

describe('security — PEM redaction', () => {
  it('safeErrorMessage strips PEM blocks from error messages', async () => {
    const {safeErrorMessage} = await import('../src/github/app-client.ts')

    const fakePem = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Z3VS5JJcds3xHn/ygWep4PAtEsHAAAAAAAAAAAAAAAAAA==
-----END RSA PRIVATE KEY-----`

    const error = new Error(`Auth failed: ${fakePem}`)
    const safe = safeErrorMessage(error)

    expect(safe).not.toContain('BEGIN RSA PRIVATE KEY')
    expect(safe).not.toContain('MIIEowIBAAKCAQEA')
    expect(safe).toContain('[REDACTED]')
  })

  it('safeErrorMessage strips JWT-shaped strings from error messages', async () => {
    const {safeErrorMessage} = await import('../src/github/app-client.ts')

    const fakeJwt = 'eyJhbGciOiJSUzI1NiJ9.eyJpc3MiOiIxMjM0NTYifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
    const error = new Error(`Token rejected: ${fakeJwt}`)
    const safe = safeErrorMessage(error)

    expect(safe).not.toContain('eyJhbGciOiJSUzI1NiJ9')
    expect(safe).toContain('[REDACTED]')
  })

  it('FetchInstallationsError message does not contain PEM key bytes when listInstallations fails with a PEM in the error', async () => {
    const fakePem = `-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0Z3VS5JJcds3xHn\n-----END RSA PRIVATE KEY-----`
    const client = makeClient({
      listInstallations: vi.fn().mockRejectedValue(new Error(`Auth failed: ${fakePem}`)),
    })

    const result = await enumerateRepos(client)

    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.error.message).not.toContain('BEGIN RSA PRIVATE KEY')
    expect(result.error.message).not.toContain('MIIEowIBAAKCAQEA')
    expect(result.error.message).toContain('[REDACTED]')
  })
})

// ---------------------------------------------------------------------------
// Security: read-only permissions invariant
// ---------------------------------------------------------------------------

describe('security — read-only permissions invariant', () => {
  it('CORE_READ_PERMISSIONS contains only "read" values', () => {
    for (const [key, value] of Object.entries(CORE_READ_PERMISSIONS)) {
      expect(value).toBe('read')
      // Must not contain write or admin
      expect(value).not.toBe('write')
      expect(value).not.toBe('admin')
      // Sanity: key is a non-empty string
      expect(key.length).toBeGreaterThan(0)
    }
  })

  it('FULL_READ_PERMISSIONS contains only "read" values (no write/admin scopes)', () => {
    for (const [key, value] of Object.entries(FULL_READ_PERMISSIONS)) {
      expect(value).toBe('read')
      expect(value).not.toBe('write')
      expect(value).not.toBe('admin')
      expect(key.length).toBeGreaterThan(0)
    }
  })

  it('every mintInstallationToken call passes a permissions object with only "read" values', async () => {
    const mintFn = vi.fn().mockResolvedValue({token: 'ghs_token', expiresAt: null})

    // Use IDs not used in any other test to avoid token cache hits
    const client = makeClient({
      listInstallations: vi.fn().mockResolvedValue([makeInstall(501), makeInstall(502)]),
      mintInstallationToken: mintFn,
      listInstallationRepos: vi.fn().mockResolvedValue([makeRepo()]),
    })

    await enumerateRepos(client)

    // mintFn should have been called for each installation
    expect(mintFn).toHaveBeenCalled()

    for (const call of mintFn.mock.calls) {
      const permissions = call[1] as Record<string, string>
      expect(permissions).toBeDefined()
      for (const [key, value] of Object.entries(permissions)) {
        expect(value).toBe('read')
        expect(value).not.toBe('write')
        expect(value).not.toBe('admin')
        expect(key.length).toBeGreaterThan(0)
      }
    }
  })

  it('CORE_READ_PERMISSIONS includes the required scopes', () => {
    expect(CORE_READ_PERMISSIONS).toHaveProperty('pull_requests', 'read')
    expect(CORE_READ_PERMISSIONS).toHaveProperty('checks', 'read')
    expect(CORE_READ_PERMISSIONS).toHaveProperty('issues', 'read')
    expect(CORE_READ_PERMISSIONS).toHaveProperty('contents', 'read')
    expect(CORE_READ_PERMISSIONS).toHaveProperty('metadata', 'read')
  })

  it('OPTIONAL_READ_PERMISSIONS includes security_events and vulnerability_alerts', () => {
    expect(OPTIONAL_READ_PERMISSIONS).toHaveProperty('security_events', 'read')
    expect(OPTIONAL_READ_PERMISSIONS).toHaveProperty('vulnerability_alerts', 'read')
  })
})

// ---------------------------------------------------------------------------
// Security: optional-scope graceful degradation
// ---------------------------------------------------------------------------

describe('security — optional-scope graceful degradation', () => {
  beforeEach(() => {
    // Clear module-level token cache between tests by using fresh mocks
  })

  it('retries with core-only permissions when full-permissions mint fails', async () => {
    const mintFn = vi
      .fn()
      // First call (full permissions) fails — permission-shaped (rm-170)
      .mockRejectedValueOnce(permissionError('Resource not accessible by integration'))
      // Second call (core-only) succeeds
      .mockResolvedValueOnce({token: 'ghs_core_only_token', expiresAt: null})

    const token = await mintReadOnlyToken(99, mintFn)

    expect(token).toBe('ghs_core_only_token')
    expect(mintFn).toHaveBeenCalledTimes(2)

    // First call: full permissions
    const firstCallPerms = mintFn.mock.calls[0]?.[1] as Record<string, string>
    expect(firstCallPerms).toMatchObject(FULL_READ_PERMISSIONS)
    expect(firstCallPerms).toHaveProperty('security_events', 'read')
    expect(firstCallPerms).toHaveProperty('vulnerability_alerts', 'read')

    // Second call: core-only permissions (no optional scopes)
    const secondCallPerms = mintFn.mock.calls[1]?.[1] as Record<string, string>
    expect(secondCallPerms).toMatchObject(CORE_READ_PERMISSIONS)
    expect(secondCallPerms).not.toHaveProperty('security_events')
    expect(secondCallPerms).not.toHaveProperty('vulnerability_alerts')
  })

  it('succeeds with full permissions on first try when App has all scopes', async () => {
    const mintFn = vi.fn().mockResolvedValueOnce({token: 'ghs_full_token', expiresAt: null})

    const token = await mintReadOnlyToken(100, mintFn)

    expect(token).toBe('ghs_full_token')
    expect(mintFn).toHaveBeenCalledTimes(1)

    const callPerms = mintFn.mock.calls[0]?.[1] as Record<string, string>
    expect(callPerms).toMatchObject(FULL_READ_PERMISSIONS)
  })

  it('throws when both full and core-only mint attempts fail', async () => {
    const mintFn = vi
      .fn()
      .mockRejectedValueOnce(permissionError('full scope fail'))
      .mockRejectedValueOnce(new Error('core scope fail'))

    await expect(mintReadOnlyToken(101, mintFn)).rejects.toThrow('core scope fail')
    expect(mintFn).toHaveBeenCalledTimes(2)
  })

  it('enumerateRepos succeeds with core-only token when optional scopes unavailable', async () => {
    const repoA = makeRepo({node_id: 'REPO_A'})

    const mintFn = vi
      .fn()
      // Full permissions fail — the App-permission shape (rm-170)
      .mockRejectedValueOnce(permissionError('security_events not registered'))
      // Core-only succeeds
      .mockResolvedValueOnce({token: 'ghs_core_token', expiresAt: null})

    const client = makeClient({
      listInstallations: vi.fn().mockResolvedValue([makeInstall(200)]),
      mintInstallationToken: mintFn,
      listInstallationRepos: vi.fn().mockResolvedValue([repoA]),
    })

    const result = await enumerateRepos(client)

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.data.repos).toHaveLength(1)
    expect(result.data.repos[0]?.node_id).toBe('REPO_A')

    // Verify the second mint call used core-only permissions
    const secondCallPerms = mintFn.mock.calls[1]?.[1] as Record<string, string>
    expect(secondCallPerms).not.toHaveProperty('security_events')
    expect(secondCallPerms).not.toHaveProperty('vulnerability_alerts')
    // All values must still be 'read'
    for (const value of Object.values(secondCallPerms)) {
      expect(value).toBe('read')
    }
  })
})

// ---------------------------------------------------------------------------
// Security: token-shaped secrets must not leak from error log paths
// ---------------------------------------------------------------------------

describe('security — token-shaped secrets redacted in error log paths', () => {
  it('enumerateRepos: ghs_ token in listInstallations error is redacted in logs', async () => {
    const fakeToken = 'ghs_FAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKE'
    const client = makeClient({
      listInstallations: vi.fn().mockRejectedValue(
        new Error(`Authorization: token ${fakeToken} rejected`),
      ),
    })

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      const result = await enumerateRepos(client)

      // Must return err, not throw
      expect(isErr(result)).toBe(true)
      if (!isErr(result)) return
      expect(result.error).toBeInstanceOf(FetchInstallationsError)

      // The raw token must NOT appear in any log output
      const allOutput = (warnSpy.mock.calls.flat() as unknown[])
        .concat(errorSpy.mock.calls.flat() as unknown[])
        .map(String)
        .join(' ')
      expect(allOutput).not.toContain(fakeToken)
      expect(allOutput).toContain('[REDACTED]')
    } finally {
      warnSpy.mockRestore()
      errorSpy.mockRestore()
    }
  })

  it('enumerateRepos: github_pat_ token in listInstallations error is redacted in logs', async () => {
    const fakeToken = 'github_pat_FAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKE'
    const client = makeClient({
      listInstallations: vi.fn().mockRejectedValue(
        new Error(`Auth failed with token: ${fakeToken}`),
      ),
    })

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      const result = await enumerateRepos(client)

      expect(isErr(result)).toBe(true)
      if (!isErr(result)) return
      expect(result.error).toBeInstanceOf(FetchInstallationsError)

      const allOutput = (warnSpy.mock.calls.flat() as unknown[])
        .concat(errorSpy.mock.calls.flat() as unknown[])
        .map(String)
        .join(' ')
      expect(allOutput).not.toContain(fakeToken)
      expect(allOutput).toContain('[REDACTED]')
    } finally {
      warnSpy.mockRestore()
      errorSpy.mockRestore()
    }
  })

  it('mintReadOnlyToken: ghs_ token in mint error is redacted in warning log', async () => {
    const fakeToken = 'ghs_FAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKE'
    // Full-permissions mint fails with a token in the error, core-only succeeds
    const mintFn = vi
      .fn()
      .mockRejectedValueOnce(permissionError(`Token ${fakeToken} has insufficient scope`))
      .mockResolvedValueOnce({token: 'ghs_core_only_token', expiresAt: null})

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      // Use an installationId not used in other tests to avoid cache hits
      const token = await mintReadOnlyToken(9001, mintFn)
      expect(token).toBe('ghs_core_only_token')

      // The raw token from the error must NOT appear in any log output
      const allOutput = (warnSpy.mock.calls.flat() as unknown[])
        .concat(errorSpy.mock.calls.flat() as unknown[])
        .map(String)
        .join(' ')
      expect(allOutput).not.toContain(fakeToken)
      expect(allOutput).toContain('[REDACTED]')
    } finally {
      warnSpy.mockRestore()
      errorSpy.mockRestore()
    }
  })

  it('enumerateRepos: long opaque bearer token in mint error is redacted in warning log', async () => {
    // 40+ char opaque token (e.g. OAuth bearer)
    const fakeToken = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'
    const client = makeClient({
      listInstallations: vi.fn().mockResolvedValue([makeInstall(9002)]),
      mintInstallationToken: vi
        .fn()
        // Full permissions fail with opaque token in error
        .mockRejectedValueOnce(new Error(`Bearer ${fakeToken} rejected`))
        // Core-only also fails → installation skipped
        .mockRejectedValueOnce(new Error('core scope also failed')),
      listInstallationRepos: vi.fn().mockResolvedValue([]),
    })

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      const result = await enumerateRepos(client)

      // enumerateRepos succeeds (returns ok with empty repos — install was skipped)
      expect(isOk(result)).toBe(true)

      // The raw token must NOT appear in any log output
      const allOutput = (warnSpy.mock.calls.flat() as unknown[])
        .concat(errorSpy.mock.calls.flat() as unknown[])
        .map(String)
        .join(' ')
      expect(allOutput).not.toContain(fakeToken)
      expect(allOutput).toContain('[REDACTED]')
    } finally {
      warnSpy.mockRestore()
      errorSpy.mockRestore()
    }
  })
})

// ---------------------------------------------------------------------------
// rm-185: cached token honors the API-provided expiresAt (no 55-min guess)
// ---------------------------------------------------------------------------

describe('rm-185 — cached token honors the API-provided expiresAt', () => {
  it('short expiresAt (5 min) expires the cache at the real boundary, not 55 min', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-24T00:00:00Z'))
    const INSTALL_ID = 9101
    try {
      const mintFn = vi
        .fn()
        .mockResolvedValueOnce({token: 'short-lived-token', expiresAt: new Date('2026-09-24T00:05:00Z')})
        .mockResolvedValueOnce({token: 'second-mint', expiresAt: null})

      expect(await mintReadOnlyToken(INSTALL_ID, mintFn)).toBe('short-lived-token')
      // Still cached immediately after mint.
      expect(await mintReadOnlyToken(INSTALL_ID, mintFn)).toBe('short-lived-token')
      expect(mintFn).toHaveBeenCalledTimes(1)

      // 5m30s after mint: past the real 5-min expiry (beyond the 60s refresh
      // buffer). A 55-min guess would still be cached here — the real
      // boundary MUST trigger a re-mint.
      vi.setSystemTime(new Date('2026-09-24T00:05:30Z'))
      expect(await mintReadOnlyToken(INSTALL_ID, mintFn)).toBe('second-mint')
      expect(mintFn).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('far-future expiresAt (8 h) is capped at the 55-min historical ceiling', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-24T00:00:00Z'))
    const INSTALL_ID = 9102
    try {
      const mintFn = vi
        .fn()
        .mockResolvedValueOnce({token: 'far-future-token', expiresAt: new Date('2026-09-24T08:00:00Z')})
        .mockResolvedValueOnce({token: 'capped-refresh', expiresAt: null})

      expect(await mintReadOnlyToken(INSTALL_ID, mintFn)).toBe('far-future-token')

      // 56m30s after mint: beyond the 55-min cap (+ buffer) despite the 8 h
      // API expiry — the cap preserves the pre-rm-185 refresh cadence.
      vi.setSystemTime(new Date('2026-09-24T00:56:30Z'))
      expect(await mintReadOnlyToken(INSTALL_ID, mintFn)).toBe('capped-refresh')
      expect(mintFn).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })
})

// Security: rm-170 — transient mint errors must never degrade the scope set
// ---------------------------------------------------------------------------

describe('security — rm-170: transient mint errors never degrade scope', () => {
  it('rethrows a status-less (network/transient) mint error instead of retrying core-only', async () => {
    const mintFn = vi.fn().mockRejectedValue(new Error('socket hang up'))

    await expect(mintReadOnlyToken(2101, mintFn)).rejects.toThrow('socket hang up')
    // No second mint attempt — a transient error must not silently mint a
    // reduced-scope token (which would then be cached for the TTL).
    expect(mintFn).toHaveBeenCalledTimes(1)
    const callPerms = mintFn.mock.calls[0]?.[1] as Record<string, string>
    expect(callPerms).toMatchObject(FULL_READ_PERMISSIONS)
  })

  it('rethrows a 5xx mint error instead of retrying core-only', async () => {
    const mintFn = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('server error'), {status: 500}))

    await expect(mintReadOnlyToken(2102, mintFn)).rejects.toThrow('server error')
    expect(mintFn).toHaveBeenCalledTimes(1)
  })

  it('rethrows a 429 (rate-limit) mint error instead of retrying core-only', async () => {
    const mintFn = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('secondary rate limit'), {status: 429}))

    await expect(mintReadOnlyToken(2103, mintFn)).rejects.toThrow('secondary rate limit')
    expect(mintFn).toHaveBeenCalledTimes(1)
  })

  it('rethrows a rate-limit-shaped 403 (x-ratelimit-remaining: 0) instead of retrying core-only (review F1)', async () => {
    // GitHub primary rate-limit exhaustion answers 403, not 429 — the status
    // alone must NOT classify as permission-shaped.
    const mintFn = vi.fn().mockRejectedValue(Object.assign(
      new Error('API rate limit exceeded'),
      {status: 403, response: {headers: {'x-ratelimit-remaining': '0'}}},
    ))

    await expect(mintReadOnlyToken(2105, mintFn)).rejects.toThrow('API rate limit exceeded')
    expect(mintFn).toHaveBeenCalledTimes(1)
  })

  it('rethrows a secondary-rate-limit 403 (retry-after header) instead of retrying core-only (review F1)', async () => {
    const mintFn = vi.fn().mockRejectedValue(Object.assign(
      new Error('You have exceeded a secondary rate limit'),
      {status: 403, response: {headers: {'retry-after': '60'}}},
    ))

    await expect(mintReadOnlyToken(2106, mintFn)).rejects.toThrow('secondary rate limit')
    expect(mintFn).toHaveBeenCalledTimes(1)
  })

  it('falls back core-only even when a 403 carries unrelated headers (not rate-limit-shaped)', async () => {
    const mintFn = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(
        new Error('Resource not accessible by integration'),
        {status: 403, response: {headers: {'x-github-request-id': 'ABCD:1234'}}},
      ))
      .mockResolvedValueOnce({token: 'ghs_core_token', expiresAt: null})

    await expect(mintReadOnlyToken(2107, mintFn)).resolves.toBe('ghs_core_token')
    expect(mintFn).toHaveBeenCalledTimes(2)
  })

  it('falls back to core-only ONLY for 403-shaped (permission) mint errors', async () => {
    const mintFn = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('Resource not accessible by integration'), {status: 403}))
      .mockResolvedValueOnce({token: 'ghs_core_token', expiresAt: null})

    await expect(mintReadOnlyToken(2104, mintFn)).resolves.toBe('ghs_core_token')
    expect(mintFn).toHaveBeenCalledTimes(2)
  })

  it('enumerateRepos records a transient-mint installation in failedInstallationIds (fail-visible)', async () => {
    const repoB = makeRepo({node_id: 'REPO_B'})

    const client = makeClient({
      listInstallations: vi.fn().mockResolvedValue([makeInstall(31, 'good-org'), makeInstall(32, 'flaky-org')]),
      mintInstallationToken: vi
        .fn()
        // Good install mints fine
        .mockResolvedValueOnce({token: 'ghs_good_token', expiresAt: null})
        // Flaky install fails transiently (no status)
        .mockRejectedValueOnce(new Error('ETIMEDOUT')),
      listInstallationRepos: vi.fn().mockResolvedValue([repoB]),
    })

    const result = await enumerateRepos(client)

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    // The reachable repo is served — but the partial union is REPORTED, not hidden
    expect(result.data.repos).toHaveLength(1)
    expect(result.data.repos[0]?.node_id).toBe('REPO_B')
    expect(result.data.failedInstallationIds).toEqual([32])
  })

  it('enumerateRepos records a repo-listing failure in failedInstallationIds', async () => {
    const client = makeClient({
      listInstallations: vi.fn().mockResolvedValue([makeInstall(41, 'org')]),
      mintInstallationToken: vi.fn().mockResolvedValue({token: 'ghs_token', expiresAt: null}),
      listInstallationRepos: vi.fn().mockRejectedValue(new Error('boom')),
    })

    const result = await enumerateRepos(client)

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.data.repos).toHaveLength(0)
    expect(result.data.failedInstallationIds).toEqual([41])
  })
})

// ---------------------------------------------------------------------------
// rm-221 — token cache scoping, eviction, injectable clock
// ---------------------------------------------------------------------------

describe('rm-221 — InstallationTokenCache (per-instance, injectable clock, eviction)', () => {
  it('expiry honored via the injected clock (no Date.now() capture)', () => {
    let now = 1_000
    const cache = new InstallationTokenCache(() => now)
    // 50-min expiry − 1-min refresh buffer ⇒ fresh through t0+49min.
    cache.set(9001, 'ghs_a', new Date(1_000 + 50 * 60_000))
    expect(cache.get(9001)).toBe('ghs_a')

    now = 1_000 + 48 * 60_000
    expect(cache.get(9001)).toBe('ghs_a')
    now = 1_000 + 49 * 60_000 // boundary: now >= expiresAt − 60s ⇒ stale
    expect(cache.get(9001)).toBeNull()
    // Expired entry is dropped, not just skipped.
    expect(cache.get(9001)).toBeNull()
  })

  it('evict() drops a single installation; evictExcept() drops only unretained ids and reports them', () => {
    const cache = new InstallationTokenCache(() => 0)
    cache.set(1, 'ghs_1', null)
    cache.set(2, 'ghs_2', null)
    cache.set(3, 'ghs_3', null)

    cache.evict(2)
    expect(cache.get(2)).toBeNull()
    expect(cache.get(1)).toBe('ghs_1')

    const evicted = cache.evictExcept([1])
    expect(evicted).toEqual([3])
    expect(cache.get(1)).toBe('ghs_1')
    expect(cache.get(3)).toBeNull()
  })

  it('enumerateRepos evicts cached tokens for installations the App no longer reports', async () => {
    // Unique ids: the module-default cache is shared across this test file.
    const mint = vi.fn(async () => ({token: 'ghs_evict', expiresAt: null}))
    const clientFor = (ids: number[]): InstallationsClient =>
      makeClient({
        listInstallations: vi.fn().mockResolvedValue(ids.map(id => makeInstall(id))),
        mintInstallationToken: mint,
        listInstallationRepos: vi.fn().mockResolvedValue([]),
      })

    await enumerateRepos(clientFor([9001, 9002])) // mints + caches both
    expect(mint).toHaveBeenCalledTimes(2)
    await enumerateRepos(clientFor([9001])) // 9002 removed → swept
    expect(mint).toHaveBeenCalledTimes(2)
    // 9002 returns: its token was evicted, so it mints again; 9001's cached
    // token still serves — exactly one new mint.
    await enumerateRepos(clientFor([9001, 9002]))
    expect(mint).toHaveBeenCalledTimes(3)
  })

  it('an empty (successful) installation list evicts every cached token', async () => {
    const mint = vi.fn(async () => ({token: 'ghs_empty', expiresAt: null}))
    const clientFor = (ids: number[]): InstallationsClient =>
      makeClient({
        listInstallations: vi.fn().mockResolvedValue(ids.map(id => makeInstall(id))),
        mintInstallationToken: mint,
        listInstallationRepos: vi.fn().mockResolvedValue([]),
      })

    await enumerateRepos(clientFor([9003, 9004]))
    expect(mint).toHaveBeenCalledTimes(2)
    await enumerateRepos(clientFor([])) // zero installations → sweep everything
    await enumerateRepos(clientFor([9003]))
    expect(mint).toHaveBeenCalledTimes(3) // 9003 re-minted; nothing else remains
  })
})

// ---------------------------------------------------------------------------
// rm-221 + rm-162 — repo-list transport: throttle/retry plugins + If-None-Match
// ---------------------------------------------------------------------------

const repoPage = (repos: {id: number; node_id: string; owner: string; name: string}[]) => ({
  total_count: repos.length,
  repositories: repos.map(r => ({
    id: r.id,
    node_id: r.node_id,
    owner: {login: r.owner},
    name: r.name,
    full_name: `${r.owner}/${r.name}`,
  })),
})

describe('rm-221 — repo-list transport carries throttle + retry plugins', () => {
  it('retries a transient 500 through the plugin chain, then succeeds', {timeout: 30_000}, async () => {
    let calls = 0
    const fetchMock = vi.fn(async () => {
      calls += 1
      if (calls === 1) return new Response('boom', {status: 500})
      return Response.json(repoPage([{id: 1, node_id: 'NODE_T1', owner: 'org', name: 'retried'}]))
    })
    const list = createInstallationRepoListFn({fetch: fetchMock as unknown as typeof fetch})

    const repos = await list('ghs_tok', 1)
    expect(repos).toHaveLength(1)
    expect(repos[0]?.node_id).toBe('NODE_T1')
    // The 500 was retried by @octokit/plugin-retry — the caller saw one
    // clean result, not the transient failure.
    expect(calls).toBe(2)
  })

  it('retries a primary rate limit (403 x-ratelimit-remaining: 0) via the throttling plugin', {timeout: 30_000}, async () => {
    let calls = 0
    const fetchMock = vi.fn(async () => {
      calls += 1
      if (calls === 1) {
        return new Response('rate limit', {
          status: 403,
          headers: {
            'x-ratelimit-limit': '100',
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': '0',
            'retry-after': '0',
          },
        })
      }
      return Response.json(repoPage([{id: 2, node_id: 'NODE_T2', owner: 'org', name: 'throttled'}]))
    })
    const list = createInstallationRepoListFn({fetch: fetchMock as unknown as typeof fetch})

    const repos = await list('ghs_tok', 1)
    expect(repos).toHaveLength(1)
    expect(calls).toBe(2)
  })
})

describe('rm-162 — repo-list pagination honors If-None-Match / 304 Not Modified', () => {
  it('second call sends the stored ETag and reuses cached items on 304', async () => {
    const seenHeaders: Record<string, string>[] = []
    let calls = 0
    const fetchMock = vi.fn(async (_url: unknown, init?: {headers?: Record<string, string>}) => {
      calls += 1
      const headers = (init?.headers ?? {})
      seenHeaders.push(headers)
      if (calls === 1) {
        return new Response(JSON.stringify(repoPage([{id: 1, node_id: 'NODE_E1', owner: 'org', name: 'etagged'}])), {
          status: 200,
          headers: {'content-type': 'application/json', etag: '"v1"'},
        })
      }
      // Unchanged: GitHub answers 304 with no body — free against the
      // primary rate limit.
      return new Response(null, {status: 304, headers: {etag: '"v1"'}})
    })
    const list = createInstallationRepoListFn({fetch: fetchMock as unknown as typeof fetch})

    const first = await list('ghs_tok', 1)
    expect(first).toHaveLength(1)

    const second = await list('ghs_tok', 1)
    expect(second).toEqual(first)
    expect(calls).toBe(2)
    // The conditional header rode the second request (case per undici).
    const secondHeaders = Object.fromEntries(
      Object.entries(seenHeaders[1] ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
    )
    expect(secondHeaders['if-none-match']).toBe('"v1"')
  })

  it('a 200 refresh replaces the cached page (etag rotation observed on the wire)', async () => {
    const etagsOnWire: (string | undefined)[] = []
    let calls = 0
    const fetchMock = vi.fn(async (_url: unknown, init?: {headers?: Record<string, string>}) => {
      calls += 1
      const headers = (init?.headers ?? {})
      const flat = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
      etagsOnWire.push(flat['if-none-match'])
      if (calls === 1) {
        return new Response(JSON.stringify(repoPage([{id: 1, node_id: 'NODE_R1', owner: 'org', name: 'before'}])), {
          status: 200,
          headers: {'content-type': 'application/json', etag: '"a"'},
        })
      }
      if (calls === 2) {
        return new Response(null, {status: 304, headers: {etag: '"a"'}})
      }
      return new Response(JSON.stringify(repoPage([{id: 1, node_id: 'NODE_R2', owner: 'org', name: 'after'}])), {
        status: 200,
        headers: {'content-type': 'application/json', etag: '"b"'},
      })
    })
    const list = createInstallationRepoListFn({fetch: fetchMock as unknown as typeof fetch})

    await list('ghs_tok', 1) // 200 "a"
    await list('ghs_tok', 1) // 304
    const third = await list('ghs_tok', 1) // 200 "b" — content changed
    expect(third[0]?.node_id).toBe('NODE_R2')
    expect(etagsOnWire).toEqual([undefined, '"a"', '"a"'])
  })

  it('cache is scoped per installation — sibling installations never share pages', async () => {
    const callsPerToken = new Map<string, {n: number; etags: (string | undefined)[]}>()
    const fetchMock = vi.fn(async (_url: unknown, init?: {headers?: Record<string, string>} & {headers2?: unknown}) => {
      const auth = String((init)?.headers?.authorization ?? '')
      const entry = callsPerToken.get(auth) ?? {n: 0, etags: []}
      const flat = Object.fromEntries(
        Object.entries((init?.headers ?? {})).map(([k, v]) => [k.toLowerCase(), v]),
      )
      entry.etags.push(flat['if-none-match'])
      entry.n += 1
      callsPerToken.set(auth, entry)
      return new Response(JSON.stringify(repoPage([{id: entry.n, node_id: `NODE_${auth}_${entry.n}`, owner: 'org', name: 'x'}])), {
        status: 200,
        headers: {'content-type': 'application/json', etag: `"${auth}-${entry.n}"`},
      })
    })
    const list = createInstallationRepoListFn({fetch: fetchMock as unknown as typeof fetch})

    await list('ghs_A', 10)
    await list('ghs_B', 20) // different installation: no If-None-Match from A's page
    const bEtags = callsPerToken.get('token ghs_B')?.etags
    expect(bEtags).toEqual([undefined])
    expect(callsPerToken.get('token ghs_B')?.n).toBe(1)
  })
})
