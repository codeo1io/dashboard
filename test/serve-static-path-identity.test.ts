/**
 * serveStatic %-path middleware-identity tests (GHSA-5r4p-p66f-jhc7).
 *
 * The advisory: hono < 4.13.11 / @hono/node-server < 2.1.3 serveStatic
 * double-decodes the request path, so a crafted request could be ROUTED as
 * one path and SERVED as another — skipping middleware mounted on the static
 * prefix. This suite pins the post-fix property at the app boundary: a
 * percent-encoded separator (or an encoded dot) must never produce a
 * different serving/middleware identity than the decoded path.
 *
 * Covers (src/server.ts mounts):
 * - control identity: /static/operator-stream.js is served byte-exact through
 *   the global middleware chain (CSP header present)
 * - single-encoded separator: /static%2Foperator-stream.js must not reach any
 *   static mount (404, no asset bytes)
 * - double-encoded separator: /static%252Foperator-stream.js must not be
 *   double-decoded into the asset (404, no asset bytes)
 * - encoded traversal: /static/%2e%2e/%2e%2e/package.json must not escape the
 *   static root (404, no package.json bytes)
 * - middleware-skip observable: /manifest%2Ewebmanifest must not be served by
 *   decoding to the literal /manifest.webmanifest mount (which would bypass
 *   the content-type middleware) — while the control path keeps the
 *   application/manifest+json content type
 */
import type {GitHubOAuthClient} from '../src/auth/oauth.ts'
import {Buffer} from 'node:buffer'
import process from 'node:process'
import {readFile} from 'node:fs/promises'
import {afterEach, describe, expect, it} from 'vitest'
import {buildDashboardApp} from '../src/server.ts'
import {SessionManager} from '../src/session.ts'

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

async function buildTestApp() {
  // operatorUiEnabled=true mounts the full static surface: the three exact
  // /static/operator-*.js mounts, the /static/* catch-all, /assets/*, /icon-*,
  // /manifest.webmanifest, /sw.js, /registerSW.js.
  return buildDashboardApp({
    operatorLogin: TEST_OPERATOR,
    cookieKey: TEST_KEY,
    oauthClient: makeFakeOAuthClient(),
    fetchUserLogin: async (_token: string) => TEST_OPERATOR,
    getSnapshot: () => ({repos: [], staleBanner: false, driftCount: 0, enumerationIncomplete: null, refreshedAt: null, refreshDurationMs: null, refreshDegraded: false}),
    operatorUiEnabled: true,
  })
}

describe('serveStatic %-path middleware identity (GHSA-5r4p-p66f-jhc7)', () => {
  afterEach(() => {
    process.chdir(process.cwd())
  })

  it('control: plain /static/operator-stream.js is served byte-exact with the global middleware identity', async () => {
    const app = await buildTestApp()
    const res = await app.request('/static/operator-stream.js')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-security-policy')).not.toBeNull()
    const expected = await readFile('public/operator-stream.js', 'utf8')
    expect(await res.text()).toBe(expected)
  })

  it('single-encoded separator /static%2Foperator-stream.js does not reach a static mount', async () => {
    const app = await buildTestApp()
    const res = await app.request('/static%2Foperator-stream.js')
    expect(res.status).toBe(404)
    const expected = await readFile('public/operator-stream.js', 'utf8')
    expect(await res.text()).not.toContain(expected.slice(0, 80))
  })

  it('double-encoded separator /static%252Foperator-stream.js is not double-decoded into the asset', async () => {
    const app = await buildTestApp()
    const res = await app.request('/static%252Foperator-stream.js')
    expect(res.status).toBe(404)
    const expected = await readFile('public/operator-stream.js', 'utf8')
    expect(await res.text()).not.toContain(expected.slice(0, 80))
  })

  it('encoded traversal /static/%2e%2e/%2e%2e/package.json does not escape the static root', async () => {
    const app = await buildTestApp()
    const res = await app.request('/static/%2e%2e/%2e%2e/package.json')
    expect(res.status).toBe(404)
    expect(await res.text()).not.toContain('"name"')
  })

  it('control: plain /manifest.webmanifest is served as application/manifest+json', async () => {
    const app = await buildTestApp()
    const res = await app.request('/manifest.webmanifest')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/manifest+json')
  })

  it('encoded dot /manifest%2Ewebmanifest is not served by decoding to the literal mount (middleware-skip guard)', async () => {
    const app = await buildTestApp()
    const res = await app.request('/manifest%2Ewebmanifest')
    expect(res.status).toBe(404)
    expect(res.headers.get('content-type')).not.toContain('application/manifest+json')
    expect(await res.text()).not.toContain('webmanifest')
  })
})
