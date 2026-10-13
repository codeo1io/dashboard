/**
 * Minimal push-only service worker (rm-249 / rm-1420).
 *
 * The previous SW intercepted same-origin navigations and served a precached
 * app shell, hiding the server-side auth redirect (/ -> /operator/auth/...)
 * from unauthenticated browsers. That interception was severed deliberately
 * (dfa3f80): this worker registers NO fetch handler, NO precache, and NO
 * navigation route. It exists solely to render Fro Bot push notifications
 * (via the pure, leak-disciplined `buildNotification` mapping) and to focus
 * the dashboard on click. The subscribe flow registers it on explicit
 * operator opt-in (`ensurePushServiceWorker` in `push/subscribe.ts`); the
 * dashboard registers no worker at boot.
 *
 * Typing note: this file executes in the ServiceWorkerGlobalScope, but
 * web/tsconfig.json compiles the app against DOM (where `self` is a Window)
 * because TypeScript cannot combine the DOM and WebWorker libs in one
 * program. The local interfaces below declare the minimal service-worker
 * surface this file touches; `swScope` is the real global at runtime.
 */

import {buildNotification} from './push/sw-notification.ts'

/** Service-worker lifecycle event (MDN: ExtendableEvent). */
interface SwExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void
}

/** Push event: `data` exposes the raw payload as text. */
interface SwPushEvent extends Event {
  waitUntil(promise: Promise<unknown>): void
  data: {text(): string} | null
}

/** Notification click event: carries the shown notification. */
interface SwNotificationClickEvent extends Event {
  waitUntil(promise: Promise<unknown>): void
  notification: {close(): void}
}

/** Dev-aid / probe message event. */
interface SwMessageEvent extends Event {
  data: unknown
}

/** Minimal Clients surface used below (claim + matchAll + openWindow). */
interface SwClients {
  claim(): Promise<unknown>
  matchAll(options?: {type?: 'window'; includeUncontrolled?: boolean}): Promise<Array<{url: string; focus(): Promise<unknown>}>>
  openWindow(url: string): Promise<unknown>
}

/** Minimal ServiceWorkerGlobalScope surface used by this file. */
interface SwGlobalScope {
  /** Injection point consumed by vite-plugin-pwa at build time. */
  __WB_MANIFEST: unknown
  skipWaiting(): Promise<void>
  registration: {showNotification(title: string, options?: {body?: string; data?: unknown}): Promise<void>}
  clients: SwClients
  addEventListener(type: 'install' | 'activate', listener: (event: SwExtendableEvent) => void): void
  addEventListener(type: 'push', listener: (event: SwPushEvent) => void): void
  addEventListener(type: 'notificationclick', listener: (event: SwNotificationClickEvent) => void): void
  addEventListener(type: 'message', listener: (event: SwMessageEvent) => void): void
}

// The runtime global. `swScope` is a typed alias for the real `self`, whose
// DOM-typed declaration cannot see the service-worker scope members.
const swScope = self as unknown as SwGlobalScope

// The literal token below MUST stay verbatim: workbox's injectManifest step
// rewrites `self.__WB_MANIFEST` in swDest at build time. It is erased from
// the runtime output, so it never executes.
void [(self as unknown as SwGlobalScope).__WB_MANIFEST]

swScope.addEventListener('install', () => {
  // Nothing to precompute for a push-only worker; take over promptly so a
  // same-session opt-in subscribe flow can reach this worker.
  void swScope.skipWaiting()
})

swScope.addEventListener('activate', (event: SwExtendableEvent) => {
  // Claim lets navigator.serviceWorker.controller resolve in the session
  // that registered the worker (the dev-aid postMessage path needs it).
  // No caches exist in this worker, so there is nothing to clean up.
  event.waitUntil(swScope.clients.claim())
})

swScope.addEventListener('push', (event: SwPushEvent) => {
  // The raw payload may be anything (empty push, invalid JSON, oversized
  // blob). Parse defensively: buildNotification is total and never throws —
  // it degrades every undecodable input (including the un-parsed text
  // string) to the generic card, so a parse failure is never fatal.
  const raw = event.data === null ? null : event.data.text()
  let payload: unknown = raw
  if (typeof raw === 'string' && raw.trim() !== '') {
    try {
      payload = JSON.parse(raw)
    } catch {
      payload = raw
    }
  }
  const notification = buildNotification(payload)
  event.waitUntil(swScope.registration.showNotification(notification.title, notification))
})

swScope.addEventListener('notificationclick', (event: SwNotificationClickEvent) => {
  event.notification.close()
  // Click-through always targets the dashboard root — never a
  // payload-supplied route (see sw-notification.ts).
  event.waitUntil(
    (async () => {
      const windows = await swScope.clients.matchAll({type: 'window', includeUncontrolled: true})
      const dashboard = windows.find((client) => new URL(client.url).pathname === '/')
      if (dashboard !== undefined) {
        await dashboard.focus()
        return
      }
      await swScope.clients.openWindow('/')
    })(),
  )
})

swScope.addEventListener('message', (event: SwMessageEvent) => {
  const data = event.data
  if (typeof data !== 'object' || data === null) return
  const record = data as Record<PropertyKey, unknown>
  if (record.type !== 'MOCK_SYNTHETIC_PUSH') return
  // Dev aid (Notifications view, enabled only with dev overlay permissions):
  // the synthetic payload runs through the SAME builder as a real push, so
  // the fixture path is the shipped path.
  const notification = buildNotification(record.payload)
  void swScope.registration.showNotification(notification.title, notification)
})
