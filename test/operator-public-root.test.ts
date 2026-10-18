/**
 * rm-1490: the operator runtime asset root must resolve independently of the
 * process CWD. Every consumer used to hardcode './public' (join + serveStatic
 * root), which resolves against process.cwd() — starting the server from any
 * directory other than the repo root silently 404'd /static/operator-*.js
 * while the rest of the app served fine, and the ETag middleware's statSync
 * catch no-op'd on the same moved root.
 *
 * Pins:
 * - resolveOperatorPublicRoot() is absolute and anchored at the repo's
 *   public/ directory (module-anchored, not CWD-anchored).
 * - DASHBOARD_PUBLIC_ROOT overrides it (mirrors the DASHBOARD_WEB_DIST
 *   convention; README env table documents the name).
 * - Functional regression pin: /static/operator-stream.js serves 200 with an
 *   ETag while the process CWD is a non-repo directory — the pre-rm-1490
 *   CWD-relative './public' root 404s from there.
 */
import type {GitHubOAuthClient} from '../src/auth/oauth.ts'
import {Buffer} from 'node:buffer'
import {tmpdir} from 'node:os'
import {isAbsolute, resolve} from 'node:path'
import process from 'node:process'
import {fileURLToPath} from 'node:url'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {buildDashboardApp, resolveOperatorPublicRoot} from '../src/server.ts'

const TEST_KEY = Buffer.from('testkey-ABCDEFGHIJKLMNOPQRSTUV12', 'utf8') // 32 bytes
const TEST_OPERATOR = 'octocat'

function makeFakeOAuthClient(): GitHubOAuthClient {
  return {
    createAuthorizationURL: (state: string, _scopes: string[]) =>
      new URL(`https://github.com/login/oauth/authorize?state=${state}`),
    validateAuthorizationCode: async (_code: string) => ({
      accessToken: () => 'fake-access-token',
    }),
  }
}

describe('resolveOperatorPublicRoot (rm-1490)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('anchors at the module directory (absolute repo public/), not the process CWD', () => {
    const root = resolveOperatorPublicRoot()
    expect(isAbsolute(root)).toBe(true)
    // This test file lives at <repo>/test/ — the server module at <repo>/src/.
    // Equal only when the root is derived from module location, never cwd.
    const repoPublic = resolve(fileURLToPath(new URL('..', import.meta.url)), 'public')
    expect(root).toBe(repoPublic)
  })

  it('honors the documented DASHBOARD_PUBLIC_ROOT override (DASHBOARD_WEB_DIST convention)', () => {
    vi.stubEnv('DASHBOARD_PUBLIC_ROOT', '/tmp/elsewhere-public')
    expect(resolveOperatorPublicRoot()).toBe('/tmp/elsewhere-public')
    vi.stubEnv('DASHBOARD_PUBLIC_ROOT', '')
    // House env convention: the override is consulted with ?? — an explicitly
    // empty value does not fall through to the anchor (same as WEB_DIST).
    expect(resolveOperatorPublicRoot()).toBe('')
  })
})

describe('operator runtime assets — CWD independence (rm-1490)', () => {
  it('serves /static/operator-stream.js 200 with an ETag from a non-repo-root CWD', async () => {
    const originalCwd = process.cwd()
    // A directory that certainly has no ./public — the pre-rm-1490 relative
    // root 404s from here; the module-anchored root must not.
    process.chdir(tmpdir())
    try {
      const app = await buildDashboardApp({
        operatorLogin: TEST_OPERATOR,
        cookieKey: TEST_KEY,
        oauthClient: makeFakeOAuthClient(),
        fetchUserLogin: async (_token: string) => TEST_OPERATOR,
        getSnapshot: () => ({
          repos: [],
          staleBanner: false,
          driftCount: 0,
          enumerationIncomplete: 0,
          refreshedAt: null,
          refreshDurationMs: null,
          refreshDegraded: false,
        }),
        operatorUiEnabled: false,
      })
      // /static/operator-*.js is public pre-auth (isPublicPath) and mounted
      // unconditionally — no session cookie needed.
      const res = await app.request('/static/operator-stream.js')
      expect(res.status).toBe(200)
      // The ETag middleware's statSync must also resolve on the anchored root
      // (rm-478 sha256-hex etag shape).
      expect(res.headers.get('etag')).toMatch(/^"[0-9a-f]{32}"$/)
    } finally {
      process.chdir(originalCwd)
    }
  })
})
