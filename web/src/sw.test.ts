/**
 * Service worker tests — PUSH-ONLY SW contract (rm-249 / rm-1420).
 *
 * The SW was a kill switch from dfa3f80 until rm-1420: it existed only to
 * remove the old PWA shell (purge caches, unregister, reload windows). The
 * push-truth batch evolves it into a minimal push-only worker: it renders
 * Fro Bot push notifications via the pure `buildNotification` mapping and
 * focuses the dashboard on click. The dfa3f80 interception doctrine is
 * preserved — NO fetch handler, NO precache, NO navigation route — so the
 * server-side auth redirect (/ -> /operator/auth/...) stays visible to
 * unauthenticated browsers.
 *
 * Two layers:
 *
 * 1. Module-scope behavior (no build required): `sw.ts` is imported against
 *    a mocked ServiceWorkerGlobalScope and gateway-shaped fixture pushes are
 *    dispatched through the REGISTERED listener — the rm-1420(d) end-to-end
 *    proof that a real gateway payload produces a real shown notification.
 *    Green units on the payload builder alone do not close that acceptance.
 * 2. Build-output assertions (require a prior `pnpm build:web`): pin what
 *    the shipped `web/dist/sw.js` must and must not contain.
 */

import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {beforeAll, beforeEach, describe, expect, it, vi} from 'vitest'

// Resolve relative to the web/ root (vitest.config.ts sets root: 'web').
const SW_PATH = resolve(__dirname, '../dist/sw.js')

function readSW(): string {
  try {
    return readFileSync(SW_PATH, 'utf-8')
  } catch {
    throw new Error(
      `web/dist/sw.js not found. Run 'pnpm build:web' before running tests.\n` +
        `Expected path: ${SW_PATH}`,
    )
  }
}

// ---------------------------------------------------------------------------
// Layer 1: module behavior in a mocked ServiceWorkerGlobalScope
// ---------------------------------------------------------------------------

interface SwScopeFixture {
  readonly shown: ReturnType<typeof vi.fn>
  readonly claim: ReturnType<typeof vi.fn>
  readonly matchAll: ReturnType<typeof vi.fn>
  readonly openWindow: ReturnType<typeof vi.fn>
  readonly skipWaiting: ReturnType<typeof vi.fn>
}

let scope: SwScopeFixture

/** Dispatch a synthetic SW-scoped event on `self` with listener-facing props. */
function dispatchSwEvent(type: string, props: Record<string, unknown>): void {
  const event = Object.assign(new Event(type), props)
  self.dispatchEvent(event)
}

/** A gateway-shaped push payload exactly as the wire delivers it (#615). */
function pushEventWith(text: string): {data: {text(): string}; waitUntil: ReturnType<typeof vi.fn>} {
  return {data: {text: () => text}, waitUntil: vi.fn()}
}

beforeAll(async () => {
  scope = {
    shown: vi.fn().mockResolvedValue(undefined),
    claim: vi.fn().mockResolvedValue(undefined),
    matchAll: vi.fn().mockResolvedValue([]),
    openWindow: vi.fn().mockResolvedValue(undefined),
    skipWaiting: vi.fn().mockResolvedValue(undefined),
  }
  // `self` is the jsdom window in this environment; sw.ts reads its SW
  // collaborators (registration/clients/skipWaiting) off `self` at dispatch
  // time, so stubbing the globals here installs the mocked scope.
  vi.stubGlobal('registration', {showNotification: scope.shown})
  vi.stubGlobal('clients', {
    claim: scope.claim,
    matchAll: scope.matchAll,
    openWindow: scope.openWindow,
  })
  vi.stubGlobal('skipWaiting', scope.skipWaiting)
  await import('./sw.ts')
})

beforeEach(() => {
  for (const fn of [scope.shown, scope.claim, scope.matchAll, scope.openWindow, scope.skipWaiting]) {
    fn.mockClear()
  }
  scope.matchAll.mockResolvedValue([])
})

describe('sw.ts in a mocked ServiceWorkerGlobalScope (rm-1420d end-to-end proof)', () => {
  it('a gateway-shaped approval push shows the fixed "Approval needed" card', () => {
    const event = pushEventWith(
      JSON.stringify({title: 'i18n.key.title', body: 'i18n.key.body', data: {type: 'approval', route: '/'}}),
    )
    dispatchSwEvent('push', event)

    expect(event.waitUntil).toHaveBeenCalledTimes(1)
    expect(event.waitUntil.mock.calls[0]?.[0]).toBeInstanceOf(Promise)
    expect(scope.shown).toHaveBeenCalledTimes(1)
    expect(scope.shown).toHaveBeenCalledWith(
      'Approval needed',
      expect.objectContaining({
        title: 'Approval needed',
        body: 'A run is waiting for your approval.',
        data: {type: 'approval', route: '/'},
      }),
    )
  })

  it('a gateway-shaped run_failed push with an allowlisted label shows that label’s reason text', () => {
    // Main-line doctrine (PR 676 / release 2026.10.25 absorb): the label is
    // allowlisted AND mapped to fixed humanized reason copy — the raw label
    // string itself is never rendered.
    dispatchSwEvent(
      'push',
      pushEventWith(
        JSON.stringify({title: 't', body: 'b', data: {type: 'run_failed', failureLabel: 'stream-ended'}}),
      ),
    )

    expect(scope.shown).toHaveBeenCalledWith(
      'Run failed',
      expect.objectContaining({body: 'A run failed: stream ended early.'}),
    )
  })

  it('an unrecognized event kind degrades to the generic card — the gateway title/body is never rendered', () => {
    // Main-line doctrine: unlike the rm-1420 draft, the shipped mapping
    // renders only fixed dashboard copy on every path; payload title/body
    // are discarded even for kinds the dashboard does not recognize.
    dispatchSwEvent(
      'push',
      pushEventWith(JSON.stringify({title: 'Real title', body: 'Real body', data: {type: 'future-kind'}})),
    )

    expect(scope.shown).toHaveBeenCalledWith(
      'Fro Bot',
      expect.objectContaining({body: 'You have a new notification.', data: {type: 'unknown', route: '/'}}),
    )
    expect(scope.shown).not.toHaveBeenCalledWith('Real title', expect.anything())
  })

  it('an undecodable push (invalid JSON / null data) degrades to the generic card', () => {
    dispatchSwEvent('push', pushEventWith('not json at all'))
    expect(scope.shown).toHaveBeenCalledWith(
      'Fro Bot',
      expect.objectContaining({body: 'You have a new notification.'}),
    )

    scope.shown.mockClear()
    dispatchSwEvent('push', {data: null, waitUntil: vi.fn()})
    expect(scope.shown).toHaveBeenCalledWith(
      'Fro Bot',
      expect.objectContaining({body: 'You have a new notification.'}),
    )
  })

  it('a notification click focuses an open dashboard window instead of opening a new one', async () => {
    const focus = vi.fn().mockResolvedValue(undefined)
    scope.matchAll.mockResolvedValue([
      {url: 'https://elsewhere.example/page', focus: vi.fn()},
      {url: 'http://localhost:5173/', focus},
    ])

    dispatchSwEvent('notificationclick', {notification: {close: vi.fn()}, waitUntil: vi.fn()})

    // The click handler awaits matchAll before focusing — settle it.
    await vi.waitFor(() => expect(focus).toHaveBeenCalledTimes(1))
    expect(scope.openWindow).not.toHaveBeenCalled()
  })

  it('a notification click with no dashboard window opens the dashboard root', async () => {
    scope.matchAll.mockResolvedValue([{url: 'https://elsewhere.example/page', focus: vi.fn()}])

    const waitUntil = vi.fn()
    dispatchSwEvent('notificationclick', {notification: {close: vi.fn()}, waitUntil})

    await vi.waitFor(() => expect(scope.openWindow).toHaveBeenCalledWith('/'))
    expect(waitUntil).toHaveBeenCalledTimes(1)
  })

  it('the dev-aid MOCK_SYNTHETIC_PUSH message runs the same builder as a real push', () => {
    dispatchSwEvent('message', {
      data: {type: 'MOCK_SYNTHETIC_PUSH', payload: {title: 'Fro Bot', body: 'Synthetic approval request (dev aid).', data: {type: 'approval', route: '/'}}},
    })

    expect(scope.shown).toHaveBeenCalledWith(
      'Approval needed',
      expect.objectContaining({body: 'A run is waiting for your approval.'}),
    )
  })

  it('a message that is not the dev aid is ignored', () => {
    dispatchSwEvent('message', {data: {type: 'something-else'}})
    dispatchSwEvent('message', {data: 'string'})
    expect(scope.shown).not.toHaveBeenCalled()
  })

  it('install skips waiting and activate claims clients (no unregister, no reload)', () => {
    dispatchSwEvent('install', {})
    expect(scope.skipWaiting).toHaveBeenCalledTimes(1)

    const waitUntil = vi.fn()
    dispatchSwEvent('activate', {waitUntil})
    expect(scope.claim).toHaveBeenCalledTimes(1)
    expect(waitUntil.mock.calls[0]?.[0]).toBeInstanceOf(Promise)
  })
})

// ---------------------------------------------------------------------------
// Layer 2: shipped build output
// ---------------------------------------------------------------------------

describe('sw.js build output (push-only SW)', () => {
  it('exists and is non-empty', () => {
    const content = readSW()
    expect(content.length).toBeGreaterThan(100)
  })

  it('has self.__WB_MANIFEST substituted (raw token must not survive)', () => {
    const content = readSW()
    // After injectManifest substitution the token is replaced with an array
    // literal; the raw token appearing would mean workbox never processed it.
    expect(content).not.toContain('self.__WB_MANIFEST')
    // The injected precache manifest is present as an array literal...
    expect(content).toMatch(/\[\{"revision":/)
  })

  it('GUARD: a push listener is registered and renders via showNotification', () => {
    const content = readSW()
    expect(content).toMatch(/addEventListener\((["'`])push\1/)
    expect(content).toContain('showNotification')
    expect(content).toMatch(/notificationclick/)
  })

  it('GUARD: install skips waiting and activate claims clients', () => {
    const content = readSW()
    expect(content).toMatch(/skipWaiting/)
    expect(content).toMatch(/clients\.claim\(\)/)
  })

  it('GUARD: no fetch routing — router/NetworkOnly/navigation handlers must be ABSENT', () => {
    const content = readSW()
    expect(content).not.toContain('NetworkOnly')
    expect(content).not.toContain('NavigationRoute')
    expect(content).not.toContain('createHandlerBoundToURL')
    expect(content).not.toMatch(/addEventListener\((["'`])fetch\1/)
  })

  it('GUARD: no precache routing — precacheAndRoute must be ABSENT', () => {
    const content = readSW()
    expect(content).not.toContain('precacheAndRoute')
  })

  it('GUARD: the kill-switch is gone — no unregister, no cache purge, no window reload', () => {
    const content = readSW()
    // rm-1420: purge-then-serve. The worker no longer unregisters itself,
    // never touches CacheStorage (this worker owns no caches), and no longer
    // reloads open windows via client.navigate.
    expect(content).not.toMatch(/unregister/)
    expect(content).not.toMatch(/caches\./)
    expect(content).not.toMatch(/\.navigate\(/)
  })

  it('GUARD: no pushsubscriptionchange handler (subscription lifecycle is server-reconciled)', () => {
    const content = readSW()
    expect(content).not.toMatch(/pushsubscriptionchange/)
  })

  it('REGRESSION: the old SPA-shell restore paths stay gone', () => {
    const content = readSW()
    // The old SW hid the server auth redirect behind a precached app shell.
    expect(content).not.toContain('X-From-Cache')
    expect(content).not.toContain('X-Cached-At')
    expect(content).not.toContain('/api/monitoring')
  })
})
