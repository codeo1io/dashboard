/**
 * KILL-SWITCH service worker + always-safe push fallback.
 *
 * The previous SW intercepted same-origin navigations and served a precached
 * app shell, hiding the server-side auth redirect (/ -> /operator/auth/...)
 * from unauthenticated browsers — the app rendered with no login path.
 * This deployment no longer uses PWA offline behavior: on activate this SW
 * purges all caches, unregisters itself, and reloads open windows.
 *
 * rm-1454 (option a) — always-safe push fallback (restored 2026-10-16):
 * docs/plans/2026-07-08-001-feat-operator-push-notifications-dashboard-plan.md
 * (Key Technical Decisions) mandates that the SW `push` handler is never an
 * inert no-op — a subscription minted during a prior enablement survives a
 * flag flip, so ANY push that arrives while a registration exists must render
 * a GENERIC, CONSTANT-copy notification, including payloads that are null or
 * undecodable (silence makes browsers revoke the subscription). Zero payload
 * trust: `event.data` is never read, so no gateway or push-service input can
 * reach the notification surface. The dashboard flag gates the consent UI,
 * not this handler; the fallback only displays while a registration exists
 * (the kill switch unregisters on activate). `notificationclick` routes
 * neutrally: close, focus an existing window client, else open the origin
 * root — never action-bearing state.
 *
 * Typing note: this file executes in the ServiceWorkerGlobalScope, but
 * web/tsconfig.json compiles the app against DOM (where `self` is a Window)
 * because TypeScript cannot combine the DOM and WebWorker libs in one
 * program. The local interfaces below declare the minimal service-worker
 * surface this file touches; `swScope` is the real global at runtime.
 */

/** Service-worker activation lifecycle event (MDN: ExtendableEvent). */
interface SwExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void
}

/**
 * Push message event (MDN: PushEvent). `data` is declared for documentation
 * only — the rm-1454 fallback NEVER reads it (zero payload trust).
 */
interface SwPushEvent extends SwExtendableEvent {
  readonly data?: unknown
}

/** Notification interaction event (MDN: NotificationEvent). */
interface SwNotificationEvent extends SwExtendableEvent {
  notification: {close(): void}
  action: string
}

/** Minimal window-client surface (clients.matchAll result rows). */
interface SwWindowClient {
  url: string
  navigate(url: string): Promise<undefined>
  focus(): Promise<unknown>
}

/** Minimal Clients surface used below (matchAll + openWindow). */
interface SwClients {
  matchAll(options?: {type?: 'window'; includeUncontrolled?: boolean}): Promise<SwWindowClient[]>
  openWindow(url: string): Promise<unknown>
}

/** Minimal ServiceWorkerGlobalScope surface used by this file. */
interface SwGlobalScope {
  /** Injection point consumed by vite-plugin-pwa at build time. */
  __WB_MANIFEST: unknown
  skipWaiting(): Promise<void>
  registration: {
    unregister(): Promise<boolean>
    showNotification(title: string, options?: {body?: string; tag?: string}): Promise<void>
  }
  clients: SwClients
  addEventListener(type: 'install' | 'activate', listener: (event: SwExtendableEvent) => void): void
  addEventListener(type: 'push', listener: (event: SwPushEvent) => void): void
  addEventListener(type: 'notificationclick', listener: (event: SwNotificationEvent) => void): void
}

// The runtime global. `swScope` is a typed alias for the real `self`, whose
// DOM-typed declaration cannot see the service-worker scope members.
const swScope = self as unknown as SwGlobalScope

// Pinned safe copy (rm-1454 option (a)). Generic and gateway-independent on
// purpose: gateway v0.122.3 pushes carry no run IDs (upstream #640), and the
// fallback must render identical text for EVERY push, hostile, empty, or
// undecodable alike. web/src/sw.test.ts pins these byte-for-byte.
const NOTIFICATION_TITLE = 'Fro Bot dashboard'
const NOTIFICATION_BODY = 'New dashboard activity. Open the dashboard to review.'
const NOTIFICATION_TAG = 'fro-bot-dashboard-activity'

// The literal token below MUST stay verbatim: workbox's injectManifest step
// rewrites `self.__WB_MANIFEST` in swDest at build time. It is erased from the
// runtime output, so it never executes.
void [(self as unknown as SwGlobalScope).__WB_MANIFEST]

swScope.addEventListener('install', () => {
  void swScope.skipWaiting()
})

swScope.addEventListener('activate', (event: SwExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
      await swScope.registration.unregister()
      const clients = await swScope.clients.matchAll({type: 'window'})
      for (const client of clients) {
        if ('navigate' in client) {
          void client.navigate(client.url)
        }
      }
    })(),
  )
})

swScope.addEventListener('push', (event: SwPushEvent) => {
  // Always-safe fallback (plan: "must always render a generic safe
  // notification for any push that arrives", including event.data === null or
  // undecodable payloads). The payload is intentionally unread; only the
  // compile-time constants above ever reach the notification surface.
  event.waitUntil(
    swScope.registration.showNotification(NOTIFICATION_TITLE, {
      body: NOTIFICATION_BODY,
      tag: NOTIFICATION_TAG,
    }),
  )
})

swScope.addEventListener('notificationclick', (event: SwNotificationEvent) => {
  // Neutral routing (plan): never navigate to action-bearing state. Close the
  // notification, focus an existing window client, else open the origin root
  // and let the server-side auth redirect pick the landing page.
  event.notification.close()
  event.waitUntil(
    (async () => {
      const clients = await swScope.clients.matchAll({type: 'window', includeUncontrolled: true})
      for (const client of clients) {
        if ('focus' in client) {
          await client.focus()
          return
        }
      }
      await swScope.clients.openWindow('/')
    })(),
  )
})
