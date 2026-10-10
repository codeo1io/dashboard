/**
 * PUSH-ONLY service worker (rm-249).
 *
 * History: this file was the rm-128 kill-switch that replaced the old
 * precaching PWA worker — it purged caches, unregistered itself, and reloaded
 * clients. That self-unregister is exactly what stranded the web-push
 * machinery: `navigator.serviceWorker.ready` could never settle to a stable
 * worker, so `web/src/push/subscribe.ts` could only terminate at
 * 'sw-not-ready' / 'sw-unavailable' (the premise correction recorded on
 * rm-262/rm-272). This file is now the persistent push-only substrate the
 * opt-in flow needs.
 *
 * Deliberate scope — the joint rm-138 PWA decision stays open and unabsorbed:
 * - NO fetch handler: this worker never intercepts network traffic, so the
 *   precache-vs-strip decision is not prejudiced either way.
 * - The precache manifest stays INERT: `__WB_MANIFEST` is referenced only
 *   because vite-plugin-pwa's injectManifest strategy requires the injection
 *   point; nothing is cached and rm-138 owns what happens to it.
 * - The activate-stage purge of legacy cache storage survives from the
 *   kill-switch mission (idempotent — this worker writes no caches).
 * - The kill-switch's reload-clients and unregister-self steps are gone: a
 *   push worker must stay registered, and with no fetch handler there is no
 *   served-from-cache escape to recover from.
 *
 * Event behavior (pure logic in web/src/push/sw-handlers.ts, unit-tested
 * there): `push` shows a notification for every event (userVisibleOnly
 * contract, generic copy for malformed payloads), `notificationclick` focuses
 * an open window or opens the route, and `pushsubscriptionchange` re-subscribes
 * with the current VAPID key and hands the replacement to the gateway (the
 * rotation ownership the 2026-09-29 rm-249 rider demands — the page-side
 * rm-600 sweep cannot observe expiry with no page open).
 *
 * Typing note: this file executes in the ServiceWorkerGlobalScope, but
 * web/tsconfig.json compiles the app against DOM (where `self` is a Window)
 * because TypeScript cannot combine the DOM and WebWorker libs in one
 * program. The local interfaces below declare the minimal service-worker
 * surface this file touches; `swScope` is the real global at runtime.
 */

/** Service-worker lifecycle event (MDN: ExtendableEvent). */
interface SwExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void
}

/** Push event: `data` is null for silent pushes; `json()` throws on non-JSON. */
interface SwPushEvent extends Event {
  readonly data: {json(): unknown} | null
  waitUntil(promise: Promise<unknown>): void
}

interface SwNotificationClickEvent extends Event {
  readonly notification: {readonly data: unknown; close(): void}
  waitUntil(promise: Promise<unknown>): void
}

interface SwClientsApi {
  matchAll(options?: {type?: string; includeUncontrolled?: boolean}): Promise<readonly {focus(): Promise<unknown>}[]>
  openWindow(url: string): Promise<unknown>
}

interface SwPushSubscription {
  toJSON(): unknown
  unsubscribe(): Promise<boolean>
}

interface SwPushManager {
  subscribe(options: {userVisibleOnly: boolean; applicationServerKey: Uint8Array}): Promise<SwPushSubscription>
}

interface SwCacheStorageLike {
  keys(): Promise<readonly string[]>
  delete(cacheName: string): Promise<boolean>
}

/** Minimal ServiceWorkerGlobalScope surface used by this file. */
interface SwGlobalScope {
  /** Injection point consumed by vite-plugin-pwa at build time. */
  __WB_MANIFEST?: unknown[]
  skipWaiting(): Promise<void>
  readonly caches: SwCacheStorageLike
  readonly clients: SwClientsApi
  readonly registration: {
    readonly pushManager: SwPushManager
    showNotification(title: string, options?: {body?: string; data?: unknown; tag?: string}): Promise<void>
  }
  addEventListener(type: 'install', listener: () => void): void
  addEventListener(type: 'activate', listener: (event: SwExtendableEvent) => void): void
  addEventListener(type: 'push', listener: (event: SwPushEvent) => void): void
  addEventListener(type: 'notificationclick', listener: (event: SwNotificationClickEvent) => void): void
  addEventListener(type: 'pushsubscriptionchange', listener: (event: SwExtendableEvent) => void): void
}

declare const self: SwGlobalScope

const swScope: SwGlobalScope = self

import {
  handleNotificationclick,
  handlePush,
  handlePushsubscriptionchange,
  type PushSubscriptionLike,
} from './push/sw-handlers.ts'
import {buildPushClient, mintIdempotencyKey} from './push/subscribe.ts'
import {urlB64ToUint8Array} from './push/vapid-key.ts'

swScope.addEventListener('install', () => {
  // Keep the vite-plugin-pwa injection point referenced (see scope notes).
  // The bundle erases the cast, leaving the literal `self.__WB_MANIFEST`
  // that injectManifest rewrites to the (inert) precache manifest.
  void [(self as unknown as SwGlobalScope).__WB_MANIFEST]
  // Take over from any earlier worker immediately: the push-only worker has
  // no state to migrate and no fetch routing to hand over.
  void swScope.skipWaiting()
})

swScope.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Legacy purge (kill-switch heritage): drop every cache this origin
      // ever held under a precaching worker. This worker writes no caches,
      // so the sweep is idempotent and costs one keys() call per activation.
      const cacheKeys = await swScope.caches.keys()
      await Promise.all(cacheKeys.map((key) => swScope.caches.delete(key)))
    })(),
  )
})

swScope.addEventListener('push', (event) => {
  handlePush(event, async (notification) => {
    await swScope.registration.showNotification(notification.title, {
      body: notification.body,
      data: notification.data,
      // One replaceable slot: a newer push supersedes the previous one
      // instead of stacking notifications.
      tag: 'fro-bot-push',
    })
  })
})

swScope.addEventListener('notificationclick', (event) => {
  handleNotificationclick(event, swScope.clients)
})

swScope.addEventListener('pushsubscriptionchange', (event) => {
  // Rotation ownership (2026-09-29 rm-249 rider): re-subscribe with the
  // current VAPID key and deliver the replacement to the gateway. Built
  // per-event — same-origin /operator/push/* via the push client, exactly
  // like the page-scope opt-in flow.
  const pushClient = buildPushClient()
  handlePushsubscriptionchange(event, {
    pushManager: swScope.registration.pushManager as {subscribe(options: {userVisibleOnly: boolean; applicationServerKey: Uint8Array}): Promise<PushSubscriptionLike>},
    getVapidKey: pushClient.getVapidKey,
    refreshCsrf: pushClient.refreshCsrf,
    subscribePush: pushClient.subscribePush,
    mintIdempotencyKey,
    urlB64ToUint8Array,
  })
})
