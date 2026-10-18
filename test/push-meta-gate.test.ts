import type {GitHubOAuthClient} from '../src/auth/oauth.ts'
import {Buffer} from 'node:buffer'
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'

import {describe, expect, it} from 'vitest'
import {readServedPushHandlerPresence} from '../src/served-push-capability.ts'
import {buildDashboardApp} from '../src/server.ts'
import {SessionManager} from '../src/session.ts'

/**
 * Push deploy-trap gate (rm-249 rider, run 61448784a089; marker made
 * quote-agnostic at the 2026-10-18 integrate of that run).
 *
 * `DASHBOARD_OPERATOR_PUSH_ENABLED` alone must NEVER manufacture the push
 * consent surface: against a served sw.js with no push handler, a flag-only
 * gate renders a consent card whose every opt-in can only fail
 * ('sw-not-ready'). The meta is injected only when the flag is on AND the
 * SERVED `<webDistRoot>/sw.js` registers a push event handler — fail-closed
 * by artifact truth. When a push-capable SW ships, the marker appears in the
 * built sw.js and the gate opens with no code change (that self-opening
 * fired at the 2026.10.43 upstream adoption, whose built sw.js registers
 * the push handlers with BACKTICK string literals — the exact form
 * web/src/sw.test.ts pins in the built artifact — so the marker must accept
 * every quote style, not just the hand-written single/double forms).
 *
 * Matrix under test (flag × served sw.js × explicit override):
 *   flag on  + sw.js with handler    → meta injected
 *   flag on  + sw.js without handler → NO meta (still 200, shell intact)
 *   flag on  + sw.js missing         → NO meta (fail closed)
 *   flag on  + explicit false        → NO meta (test seam honored)
 *   flag off + sw.js with handler    → NO meta (flag still required)
 */

const TEST_KEY = Buffer.from('testkey-ABCDEFGHIJKLMNOPQRSTUV12', 'utf8') // 32 bytes
const TEST_OPERATOR = 'octocat'

const INDEX_HTML =
  '<!doctype html><html><head><title>t</title></head><body><div id="root"></div></body></html>'
const SW_WITH_HANDLER = "self.addEventListener('push', () => {})\n"
const SW_WITHOUT_HANDLER = "self.addEventListener('message', () => {})\n"

function makeSessionCookie(): string {
  return new SessionManager(TEST_KEY).sign(TEST_OPERATOR)
}

function makeFakeOAuthClient(): GitHubOAuthClient {
  return {
    createAuthorizationURL: (state: string) =>
      new URL(`https://github.com/login/oauth/authorize?state=${state}`),
    validateAuthorizationCode: async () => ({accessToken: () => 'fake-access-token'}),
  }
}

async function buildApp(opts: {
  pushNotificationsEnabled: boolean
  webDistRoot: string
  servedPushHandlerPresent?: boolean
}) {
  return buildDashboardApp({
    operatorLogin: TEST_OPERATOR,
    cookieKey: TEST_KEY,
    oauthClient: makeFakeOAuthClient(),
    fetchUserLogin: async () => TEST_OPERATOR,
    getSnapshot: () => ({
      repos: [],
      staleBanner: false,
      driftCount: 0,
      enumerationIncomplete: null,
      refreshedAt: null,
      refreshDurationMs: null,
      refreshDegraded: false,
    }),
    operatorUiEnabled: true,
    pushNotificationsEnabled: opts.pushNotificationsEnabled,
    webDistRoot: opts.webDistRoot,
    servedPushHandlerPresent: opts.servedPushHandlerPresent,
  })
}

async function authedGet(app: Awaited<ReturnType<typeof buildApp>>): Promise<Response> {
  return app.request('/', {headers: {cookie: `session=${makeSessionCookie()}`}})
}

function makeDist(swJs: string | null): string {
  const dir = mkdtempSync(`${tmpdir()}/push-meta-gate-`)
  writeFileSync(`${dir}/index.html`, INDEX_HTML)
  if (swJs !== null) writeFileSync(`${dir}/sw.js`, swJs)
  return dir
}

describe('readServedPushHandlerPresence (unit)', () => {
  it('detects the push handler marker in every quote style, including the emitted backtick build form', () => {
    const single = makeDist("self.addEventListener('push', () => {})\n")
    const double = makeDist('self.addEventListener("push", () => {})\n')
    // The Vite PWA injectManifest build emits backtick string literals — the
    // form web/src/sw.test.ts pins in the built artifact (2026.10.43 SW).
    // A quote-limited marker would false-negative THIS estate's artifact and
    // keep the restored push channel gated off — the exact regression this
    // case pins (minified shape included: no space, arrow body).
    const backtick = makeDist('self.addEventListener(`push`,e=>{})\n')
    try {
      expect(readServedPushHandlerPresence(single)).toBe(true)
      expect(readServedPushHandlerPresence(double)).toBe(true)
      expect(readServedPushHandlerPresence(backtick)).toBe(true)
    } finally {
      rmSync(single, {recursive: true, force: true})
      rmSync(double, {recursive: true, force: true})
      rmSync(backtick, {recursive: true, force: true})
    }
  })

  it('fail-closed: sw.js without a push handler, or missing/unreadable sw.js, reports no capability', () => {
    const withoutHandler = makeDist(SW_WITHOUT_HANDLER)
    const subscriptionChangeOnly = makeDist("self.addEventListener('pushsubscriptionchange', () => {})\n")
    const missing = makeDist(null)
    try {
      expect(readServedPushHandlerPresence(withoutHandler)).toBe(false)
      // 'pushsubscriptionchange' alone is NOT a push handler — the marker
      // must not prefix-match the longer event name.
      expect(readServedPushHandlerPresence(subscriptionChangeOnly)).toBe(false)
      expect(readServedPushHandlerPresence(missing)).toBe(false)
      expect(readServedPushHandlerPresence(`${missing}/does-not-exist`)).toBe(false)
    } finally {
      rmSync(withoutHandler, {recursive: true, force: true})
      rmSync(subscriptionChangeOnly, {recursive: true, force: true})
      rmSync(missing, {recursive: true, force: true})
    }
  })
})

describe('push deploy-trap gate (flag × served sw.js matrix)', () => {
  it('flag on + served sw.js WITH handler → meta injected', async () => {
    const dir = makeDist(SW_WITH_HANDLER)
    try {
      const app = await buildApp({pushNotificationsEnabled: true, webDistRoot: dir})
      const res = await authedGet(app)
      expect(res.status).toBe(200)
      const body = await res.text()
      expect(body).toContain('<meta name="push-enabled" content="true">')
      expect(body).toContain('<div id="root">')
    } finally {
      rmSync(dir, {recursive: true, force: true})
    }
  })

  it('flag on + served sw.js WITHOUT handler → NO meta; shell still served intact (deploy-trap guard)', async () => {
    const dir = makeDist(SW_WITHOUT_HANDLER)
    try {
      const app = await buildApp({pushNotificationsEnabled: true, webDistRoot: dir})
      const res = await authedGet(app)
      expect(res.status).toBe(200)
      const body = await res.text()
      expect(body).not.toContain('push-enabled')
      expect(body).toContain('<div id="root">')
      expect(body).toContain('</html>')
    } finally {
      rmSync(dir, {recursive: true, force: true})
    }
  })

  it('flag on + sw.js MISSING → NO meta (fail closed on unreadable artifact)', async () => {
    const dir = makeDist(null)
    try {
      const app = await buildApp({pushNotificationsEnabled: true, webDistRoot: dir})
      const res = await authedGet(app)
      expect(res.status).toBe(200)
      expect(await res.text()).not.toContain('push-enabled')
    } finally {
      rmSync(dir, {recursive: true, force: true})
    }
  })

  it('flag on + explicit servedPushHandlerPresent:false override → NO meta (test seam honored)', async () => {
    const dir = makeDist(SW_WITH_HANDLER)
    try {
      const app = await buildApp({
        pushNotificationsEnabled: true,
        webDistRoot: dir,
        servedPushHandlerPresent: false,
      })
      const res = await authedGet(app)
      expect(res.status).toBe(200)
      expect(await res.text()).not.toContain('push-enabled')
    } finally {
      rmSync(dir, {recursive: true, force: true})
    }
  })

  it('flag off + served sw.js WITH handler → NO meta (flag remains required)', async () => {
    const dir = makeDist(SW_WITH_HANDLER)
    try {
      const app = await buildApp({pushNotificationsEnabled: false, webDistRoot: dir})
      const res = await authedGet(app)
      expect(res.status).toBe(200)
      expect(await res.text()).not.toContain('push-enabled')
    } finally {
      rmSync(dir, {recursive: true, force: true})
    }
  })
})
