/**
 * Service worker tests — KILL-SWITCH contract + always-safe push fallback.
 *
 * The SW was deliberately reduced to a kill switch (see sw.ts header): it
 * exists to remove the previous PWA shell from every client — on activate it
 * purges all caches, unregisters itself, and reloads open windows. Those
 * build-output tests still pin THAT contract.
 *
 * rm-1454 (option a), restored 2026-10-16 per
 * docs/plans/2026-07-08-001-feat-operator-push-notifications-dashboard-plan.md
 * (Key Technical Decisions: the SW `push` handler "must always render a
 * generic safe notification for any push that arrives", including
 * `event.data === null` / undecodable payloads; neutral click routing —
 * close + focus an existing window client else open '/'): the SW additionally
 * carries an ALWAYS-SAFE push fallback with ZERO payload trust. Display text
 * is compile-time constants; `event.data` is never read, so nothing a push
 * service or gateway sends can reach the notification surface. The dashboard
 * flag gates the consent UI, not this handler; the fallback only displays
 * while a registration exists (the kill switch unregisters on activate).
 *
 * Two layers:
 * A. build-output contract (requires a prior `pnpm build:web`): the BUILT
 *    sw.js carries the listeners + pinned constants, never reads payload
 *    data, and keeps the kill-switch contract with no routing.
 * B. source behavior (no build needed): sw.ts is imported under a stubbed
 *    ServiceWorkerGlobalScope; synthetic push/notificationclick events pin
 *    the observable behavior, including hostile-payload distrust.
 */

import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {beforeAll, describe, expect, it, vi} from 'vitest'

// Resolve relative to the web/ root (vitest.config.ts sets root: 'web').
const SW_PATH = resolve(__dirname, '../dist/sw.js')

// Pinned safe-copy constants — MUST stay byte-identical to web/src/sw.ts
// (rm-1454 option (a): generic, gateway-independent display text; the pinned
// copy is deliberately duplicated here so a silent copy change fails a test).
export const NOTIFICATION_TITLE = 'Fro Bot dashboard'
export const NOTIFICATION_BODY = 'New dashboard activity. Open the dashboard to review.'
export const NOTIFICATION_TAG = 'fro-bot-dashboard-activity'

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
// Layer B harness — stubbed ServiceWorkerGlobalScope
// ---------------------------------------------------------------------------
// sw.ts binds its listeners to the runtime `self` at module scope. Importing
// the module under vi.stubGlobal('self', fake) captures those listeners so
// synthetic events can drive them without a browser or a build.

type SwListener = (event: never) => void

interface ShownNotification {
  title: unknown
  options: unknown
}

interface FakeWindowClient {
  url: string
  focus?: () => void
  navigate?: (url: string) => Promise<undefined>
}

function createScopeHarness() {
  const listeners = new Map<string, SwListener[]>()
  const shown: ShownNotification[] = []
  const focused: string[] = []
  const opened: string[] = []
  const scope = {
    // Consumed (and dropped) by sw.ts's manifest token line.
    __WB_MANIFEST: [{revision: 'test', url: '/'}],
    skipWaiting: () => Promise.resolve(),
    addEventListener: (type: string, listener: SwListener) => {
      const list = listeners.get(type) ?? []
      list.push(listener)
      listeners.set(type, list)
    },
    registration: {
      unregister: () => Promise.resolve(true),
      showNotification: (title: unknown, options: unknown) => {
        shown.push({title, options})
        return Promise.resolve()
      },
    },
    clients: {
      matchAll: () => Promise.resolve(windowClients),
      openWindow: (url: string) => {
        opened.push(url)
        return Promise.resolve(undefined)
      },
    },
  }
  let windowClients: FakeWindowClient[] = []
  return {
    scope,
    listeners,
    shown,
    focused,
    opened,
    setWindowClients(clients: FakeWindowClient[]) {
      windowClients = clients
    },
  }
}

const harness = createScopeHarness()

beforeAll(async () => {
  vi.stubGlobal('self', harness.scope)
  await import('./sw')
})

/** Fire a synthetic push event; returns the promises passed to waitUntil. */
function firePush(data?: {json(): unknown; text(): string}): Array<Promise<unknown>> {
  const waited: Array<Promise<unknown>> = []
  for (const listener of harness.listeners.get('push') ?? []) {
    listener({
      data,
      waitUntil: (promise: Promise<unknown>) => {
        waited.push(promise)
      },
    } as never)
  }
  return waited
}

/** Fire a synthetic notificationclick event. */
function fireNotificationClick(): {closeCount(): number; waited: Array<Promise<unknown>>} {
  const waited: Array<Promise<unknown>> = []
  let closes = 0
  for (const listener of harness.listeners.get('notificationclick') ?? []) {
    listener({
      notification: {
        close: () => {
          closes += 1
        },
      },
      action: '',
      waitUntil: (promise: Promise<unknown>) => {
        waited.push(promise)
      },
    } as never)
  }
  return {closeCount: () => closes, waited}
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
    expect(content).not.toMatch(/addEventListener\([`'"]fetch[`'"]/)
  })

  it('GUARD: the always-safe push fallback is PRESENT — push + notificationclick listeners (rm-1454 option (a))', () => {
    const content = readSW()
    expect(content).toMatch(/addEventListener\([`'"]push[`'"]/)
    expect(content).toMatch(/addEventListener\([`'"]notificationclick[`'"]/)
    expect(content).toContain('showNotification')
    // The pinned safe-copy constants ship verbatim in the artifact.
    expect(content).toContain(NOTIFICATION_TITLE)
    expect(content).toContain(NOTIFICATION_BODY)
    expect(content).toContain(NOTIFICATION_TAG)
    // Neutral click routing semantics (plan: matchAll type window + includeUncontrolled).
    expect(content).toContain('includeUncontrolled')
  })

  it('GUARD: zero payload trust — the built SW never reads event.data (rm-1454)', () => {
    const content = readSW()
    expect(content).not.toMatch(/\.data\b/)
    // Retired surfaces stay absent.
    expect(content).not.toMatch(/pushsubscriptionchange/)
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

describe('sw.ts behavior — always-safe push fallback (source module under a stubbed scope)', () => {
  it('registers a push listener', () => {
    expect(harness.listeners.get('push')).toBeDefined()
  })

  it('registers a notificationclick listener', () => {
    expect(harness.listeners.get('notificationclick')).toBeDefined()
  })

  it('push ALWAYS shows the constant notification — hostile payload fields never reach the surface', async () => {
    harness.shown.length = 0
    const hostile = {
      title: '<script>alert(1)</script>',
      body: 'Visit https://evil.example/<img src=x onerror=alert(1)> NOW',
      type: 'approval',
      failureLabel: 'javascript:alert(1)',
      url: 'javascript:alert(1)',
    }
    const waited = firePush({json: () => hostile, text: () => JSON.stringify(hostile)})
    await Promise.all(waited)

    expect(harness.shown).toHaveLength(1)
    const shown = harness.shown[0]
    expect(shown?.title).toBe(NOTIFICATION_TITLE)
    const serialized = JSON.stringify(shown)
    for (const marker of ['<script>', 'evil.example', 'onerror', 'javascript:']) {
      expect(serialized).not.toContain(marker)
    }
  })

  it('push shows the same constant notification when the payload is null / absent (plan: event.data === null)', async () => {
    harness.shown.length = 0
    const waited = firePush(undefined)
    await Promise.all(waited)

    expect(harness.shown).toHaveLength(1)
    expect(harness.shown[0]?.title).toBe(NOTIFICATION_TITLE)
  })

  it('push shows the same constant notification when the payload is undecodable (data.json() throws)', async () => {
    harness.shown.length = 0
    const undecodable = {
      json(): unknown {
        throw new Error('undecodable')
      },
      text(): string {
        throw new Error('undecodable')
      },
    }
    const waited = firePush(undecodable)
    await Promise.all(waited)

    expect(harness.shown).toHaveLength(1)
    expect(harness.shown[0]?.title).toBe(NOTIFICATION_TITLE)
  })

  it('the shown options carry the constant body + tag verbatim — never payload free-text', async () => {
    harness.shown.length = 0
    const waited = firePush({json: () => ({body: 'hostile body', tag: 'hostile-tag'}), text: () => ''})
    await Promise.all(waited)

    const options = harness.shown[0]?.options as {body?: string; tag?: string}
    expect(options.body).toBe(NOTIFICATION_BODY)
    expect(options.tag).toBe(NOTIFICATION_TAG)
    expect(JSON.stringify(options)).not.toContain('hostile')
  })

  it('notificationclick closes the notification, focuses an existing window client, and does NOT open a new one', async () => {
    harness.focused.length = 0
    harness.opened.length = 0
    harness.setWindowClients([{url: 'https://dashboard.example/', focus: () => harness.focused.push('https://dashboard.example/')}])
    const fired = fireNotificationClick()
    await Promise.all(fired.waited)

    expect(fired.closeCount()).toBe(1)
    expect(harness.focused).toEqual(['https://dashboard.example/'])
    expect(harness.opened).toEqual([])
  })

  it('notificationclick with NO window client opens "/" (neutral landing)', async () => {
    harness.focused.length = 0
    harness.opened.length = 0
    harness.setWindowClients([])
    const fired = fireNotificationClick()
    await Promise.all(fired.waited)

    expect(fired.closeCount()).toBe(1)
    expect(harness.opened).toEqual(['/'])
    expect(harness.focused).toEqual([])
  })

  it('notificationclick focuses the FIRST window client when several exist', async () => {
    harness.focused.length = 0
    harness.opened.length = 0
    harness.setWindowClients([
      {url: 'https://dashboard.example/first', focus: () => harness.focused.push('https://dashboard.example/first')},
      {url: 'https://dashboard.example/second', focus: () => harness.focused.push('https://dashboard.example/second')},
    ])
    const fired = fireNotificationClick()
    await Promise.all(fired.waited)

    expect(harness.focused).toEqual(['https://dashboard.example/first'])
    expect(harness.opened).toEqual([])
  })
})
