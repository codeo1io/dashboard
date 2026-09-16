/**
 * KILL-SWITCH service worker.
 *
 * The previous SW intercepted same-origin navigations and served a precached
 * app shell, hiding the server-side auth redirect (/ -> /operator/auth/...)
 * from unauthenticated browsers — the app rendered with no login path.
 * This deployment no longer uses PWA offline behavior. This SW exists solely
 * to remove the old one from every client: on activate it purges all caches,
 * unregisters itself, and reloads open windows.
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

/** Minimal Clients surface used below (matchAll + per-client navigate). */
interface SwClients {
  matchAll(options?: {type?: 'window'}): Promise<Array<{url: string; navigate(url: string): Promise<undefined>}>>
}

/** Minimal ServiceWorkerGlobalScope surface used by this file. */
interface SwGlobalScope {
  /** Injection point consumed by vite-plugin-pwa at build time. */
  __WB_MANIFEST: unknown
  skipWaiting(): Promise<void>
  registration: {unregister(): Promise<boolean>}
  clients: SwClients
  addEventListener(type: 'install' | 'activate', listener: (event: SwExtendableEvent) => void): void
}

// The runtime global. `swScope` is a typed alias for the real `self`, whose
// DOM-typed declaration cannot see the service-worker scope members.
const swScope = self as unknown as SwGlobalScope

// The literal token below MUST stay verbatim: workbox's injectManifest step
// rewrites `self.__WB_MANIFEST` in swDest at build time. It is erased from
// the runtime output, so it never executes.
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
