/**
 * KILL-SWITCH service worker.
 *
 * The previous SW intercepted same-origin navigations and served a precached
 * app shell, hiding the server-side auth redirect (/ -> /operator/auth/...)
 * from unauthenticated browsers — the app rendered with no login path.
 * This deployment no longer uses PWA offline behavior. This SW exists solely
 * to remove the old one from every client: on activate it purges all caches,
 * unregisters itself, and reloads open windows.
 */
void [self.__WB_MANIFEST]

self.addEventListener('install', () => {
  void self.skipWaiting()
})

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
      await self.registration.unregister()
      const clients = await self.clients.matchAll({type: 'window'})
      for (const client of clients) {
        if ('navigate' in client) {
          void client.navigate(client.url)
        }
      }
    })(),
  )
})
