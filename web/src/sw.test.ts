/**
 * Service worker tests — PUSH-ONLY contract (rm-249; build-output
 * assertions, require a prior `pnpm build:web`).
 *
 * History: the SW was first the rm-128 kill switch that removed the old PWA
 * shell (purge caches, unregister, reload clients), then rm-249 rebuilt it as
 * the persistent push-only substrate — the self-unregister stranded
 * `navigator.serviceWorker.ready`, which is why `web/src/push/subscribe.ts`
 * could only ever terminate at 'sw-not-ready'. These tests pin the CURRENT
 * contract; the retired kill-switch behaviors (unregister-self,
 * reload-clients) are guarded as ABSENT.
 *
 * What must remain true in the built artifact:
 * - the precache manifest is injected (self.__WB_MANIFEST substituted) so the
 *   SW is a valid injectManifest product, but it stays inert — never
 *   precacheAndRoute'd (the joint rm-138 PWA-precache decision stays open);
 * - the activate-stage legacy cache purge survives from the kill-switch
 *   mission (idempotent: this worker writes no caches);
 * - the push channel is PRESENT: `push`, `notificationclick`, and
 *   `pushsubscriptionchange` listeners with `showNotification`, exactly the
 *   substrate the opt-in flow (subscribe.ts) and the rm-600 reconcile sweep
 *   build on;
 * - there is NO fetch routing of any kind — the worker never intercepts
 *   network traffic (the push client's `fetch()` CALLS are network requests,
 *   not a fetch event handler).
 */

import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

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

  it('GUARD: activate purges ALL caches — caches.keys() then delete per key', () => {
    const content = readSW()
    expect(content).toMatch(/caches\.keys/)
    expect(content).toMatch(/caches\.delete/)
    // No cache name filtering: every key is deleted.
    expect(content).not.toMatch(/cacheName/)
  })

  it('GUARD: SW stays registered — self-unregister must be ABSENT (persistent push substrate)', () => {
    const content = readSW()
    // rm-249: the kill-switch unregister stranded serviceWorker.ready (the
    // 'sw-not-ready' terminal in subscribe.ts). A push worker must persist.
    // Bare token: the minifier aliases receivers, so exact-property forms
    // like `registration.unregister` do not survive bundling.
    expect(content).not.toContain('unregister')
  })

  it('GUARD: notificationclick focuses an open window or opens one (matchAll + openWindow, no reload)', () => {
    const content = readSW()
    // The kill-switch reloaded clients to recover the old precached-shell
    // escape; with no fetch handler there is no such escape, so the click
    // path only focuses/opens instead of navigating existing clients.
    expect(content).toMatch(/matchAll/)
    expect(content).toMatch(/openWindow/)
    expect(content).not.toMatch(/\bnavigate\b/)
  })

  it('GUARD: install triggers skipWaiting so the kill switch activates promptly', () => {
    const content = readSW()
    expect(content).toMatch(/skipWaiting/)
  })

  it('GUARD: no precache routing — precacheAndRoute must be ABSENT', () => {
    const content = readSW()
    expect(content).not.toContain('precacheAndRoute')
  })

  it('GUARD: no fetch routing — router/NetworkOnly/navigation handlers must be ABSENT', () => {
    const content = readSW()
    expect(content).not.toContain('NetworkOnly')
    expect(content).not.toContain('NavigationRoute')
    expect(content).not.toContain('createHandlerBoundToURL')
    expect(content).not.toMatch(/addEventListener\(`?fetch/)
  })

  it('GUARD: push/notification handlers are PRESENT (rm-249 push-only substrate)', () => {
    const content = readSW()
    // Inverted from the kill-switch contract: the push channel is the point
    // of this worker now. The rotation handler is the SW-owned first line of
    // defense that the page-scope rm-600 sweep cannot replace (no page open).
    expect(content).toMatch(/notificationclick/)
    expect(content).toMatch(/pushsubscriptionchange/)
    expect(content).toContain('showNotification')
  })

  it('REGRESSION: the old SPA-shell restore paths stay gone', () => {
    const content = readSW()
    // The old SW hid the server auth redirect behind a precached app shell.
    expect(content).not.toContain('X-From-Cache')
    expect(content).not.toContain('X-Cached-At')
    expect(content).not.toContain('/api/monitoring')
  })
})
