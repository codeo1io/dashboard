/**
 * Service worker tests — KILL-SWITCH contract (build-output assertions,
 * require a prior `pnpm build:web`).
 *
 * The SW was deliberately reduced to a kill switch (see sw.ts header): it
 * exists to remove the previous PWA shell from every client — on activate it
 * purges all caches, unregisters itself, and reloads open windows. These
 * tests pin THAT contract. The old full-PWA guard suite (NetworkOnly routes,
 * NavigationRoute denylists, push handlers, PURGE_RUNTIME) tested behavior
 * that no longer ships and was removed with the PWA shell.
 *
 * What must remain true in the built artifact:
 * - the precache manifest is injected (self.__WB_MANIFEST substituted) so the
 *   SW is a valid injectManifest product, but it is consumed and dropped,
 *   never precacheAndRoute'd;
 * - the activate handler unconditionally purges ALL caches and unregisters;
 * - open windows are reloaded so clients recover the server-side auth
 *   redirect the old precached shell was hiding.
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

describe('sw.js build output (kill-switch SW)', () => {
  it('exists and is non-empty', () => {
    const content = readSW()
    expect(content.length).toBeGreaterThan(100)
  })

  it('has self.__WB_MANIFEST substituted (raw token must not survive)', () => {
    const content = readSW()
    // After injectManifest substitution the token is replaced with an array
    // literal; the raw token appearing would mean workbox never processed it.
    expect(content).not.toContain('self.__WB_MANIFEST')
    // rm-138 strip: the injected precache manifest is deliberately EMPTY —
    // vite.config.ts sets globPatterns: [] because the kill-switch never
    // precaches. The substitution must be the empty array literal (compiled
    // output reads `;[],` — global decl, empty manifest, first listener),
    // never a list of hashed entries and never the raw token.
    expect(content).toMatch(/;\[\],/)
    expect(content).not.toMatch(/\[\{"revision":/)
  })

  it('GUARD: activate purges ALL caches — caches.keys() then delete per key', () => {
    const content = readSW()
    expect(content).toMatch(/caches\.keys/)
    expect(content).toMatch(/caches\.delete/)
    // No cache name filtering: every key is deleted.
    expect(content).not.toMatch(/cacheName/)
  })

  it('GUARD: SW unregisters itself on activate', () => {
    const content = readSW()
    expect(content).toMatch(/registration\.unregister/)
  })

  it('GUARD: open windows are reloaded (clients.matchAll + navigate)', () => {
    const content = readSW()
    expect(content).toMatch(/clients\.matchAll/)
    expect(content).toMatch(/navigate/)
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

  it('GUARD: push/notification handlers are ABSENT (push channel retired with the PWA shell)', () => {
    const content = readSW()
    expect(content).not.toMatch(/notificationclick/)
    expect(content).not.toMatch(/pushsubscriptionchange/)
    expect(content).not.toContain('showNotification')
    expect(content).not.toContain('PURGE_RUNTIME')
  })

  it('REGRESSION: the old SPA-shell restore paths stay gone', () => {
    const content = readSW()
    // The old SW hid the server auth redirect behind a precached app shell.
    expect(content).not.toContain('X-From-Cache')
    expect(content).not.toContain('X-Cached-At')
    expect(content).not.toContain('/api/monitoring')
  })
})
