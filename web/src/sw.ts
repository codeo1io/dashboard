/**
 * Service Worker — deny-by-default fetch router.
 *
 * Registration order is load-bearing (specific before catch-all):
 *   1. /auth/*            → NetworkOnly  (OAuth must reach the server)
 *   2. /operator/auth/*   → NetworkOnly  (operator auth must reach the server)
 *   3. /api/*             → NetworkOnly  (default-deny; all API routes)
 *   4. precache           → precacheAndRoute(self.__WB_MANIFEST); outdated
 *                           cleanup runs at ACTIVATION (rm-2142), not eval time
 *   5. /operator nav      → local redirect to / (canonicalize old links offline)
 *   6. navigate           → NavigationRoute(/) denylist [/auth/, /operator/auth/, /api/, /privacy/]
 *
 * Precache (4) MUST come before the NavigationRoute (6): createHandlerBoundToURL
 * resolves '/' against the precache at call time, so the manifest must be
 * precached first or SW registration throws non-precached-url and aborts.
 *
 * SECURITY: A SW intercepts ALL same-origin navigations + fetches once registered.
 * The denylist on NavigationRoute and the NetworkOnly routes for /auth/* and /api/*
 * ensure OAuth callbacks and API calls always reach the server.
 *
 * OPERATOR DATA POLICY: operator session, run, stream, approval, launch, and
 * run-index responses are network-only/no-store. Only the static shell and
 * hashed assets are precached — no runtime caches exist (rm-274 truthing). On
 * logout/auth change the page posts PURGE_RUNTIME; the handler's only owned
 * sweep is the legacy monitoring-v1 orphan from pre-migration clients.
 *
 * INSTALLED-CLIENT MIGRATION: old installed clients running a previous SW
 * pick up this worker on their next navigation — the browser checks for SW
 * updates on navigation, and this worker skips waiting itself (see
 * ACTIVATION), so no "close every tab" window remains. The /operator redirect
 * handler below ensures that once the new SW is active, offline /operator
 * navigations canonicalize to the cached / shell.
 *
 * ACTIVATION — auto-update (rm-1960). A new worker skips the waiting phase
 * itself: self.skipWaiting() runs at worker startup (top-level, during
 * install) and the activate handler claims open clients. The build registers
 * the SW with registerType: 'autoUpdate' (web/vite.config.ts). No silent
 * reload fires: the emitted registerSW.js is the bare register, and the
 * controllerchange-reload path lives in the register module this app never
 * imports — claimed open tabs pick up the new shell on their NEXT
 * NAVIGATION, with no operator action and no close-every-tab window. The
 * SKIP_WAITING message listener stays for workbox-window messageSkipWaiting
 * compatibility — an explicit post from a page still works alongside the
 * self-activation.
 *
 * ACTIVATION, cleanup (rm-2142). The activate handler runs Workbox's
 * `cleanupOutdatedCaches` (added rm-184) — Workbox's documented placement.
 * rm-1960's ordering record above had the cleanup at eval time; rm-2142
 * answers that record: an eval-time call races the install phase (a failed
 * install leaves the previous format's precaches dangling while the new
 * worker may already have torn other state down) and straddles the
 * Workbox-major-migration window, whereas activation is the only point
 * where the new worker owns the caches it cleans. Ordering inside
 * activation: cleanup first, then clients.claim.
 */

import {cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute} from 'workbox-precaching'
import {NavigationRoute, registerRoute} from 'workbox-routing'
import {NetworkOnly} from 'workbox-strategies'
// The only non-Workbox imports in this file: pure modules for the
// payload→safe-notification mapping and the notification-click resolver. Any
// future non-Workbox import here should be a conscious decision (the
// no-server-imports guard does not cover new web-side imports).
import {handleNotificationClick} from './push/notification-click.ts'
import {buildNotification} from './push/sw-notification.ts'

// skipWaiting is a WebWorker-lib member absent from the ServiceWorkerGlobalScope
// type in scope here (see the type note on SWMessageEvent below); declare it minimally.
declare const self: ServiceWorkerGlobalScope & {skipWaiting(): Promise<void>}

// 1. Auth routes — OAuth callbacks must reach the server.
registerRoute(
  ({url}) => url.pathname.startsWith('/auth/') || url.pathname === '/auth',
  new NetworkOnly(),
)

// 2. Operator auth routes — operator session auth must reach the server.
registerRoute(
  ({url}) => url.pathname.startsWith('/operator/auth/') || url.pathname === '/operator/auth',
  new NetworkOnly(),
)

// 3. API routes — default-deny; operator data must never be cached by the SW.
registerRoute(
  ({url}) => url.pathname.startsWith('/api/') || url.pathname === '/api',
  new NetworkOnly(),
)

// 4. Precache hashed app-shell assets.
// ORDER: precacheAndRoute MUST run before the NavigationRoute below.
// createHandlerBoundToURL('/') resolves against the precache at call time —
// if the manifest isn't precached yet, Workbox throws non-precached-url and aborts.
precacheAndRoute(self.__WB_MANIFEST)
// Outdated-precaches cleanup moved to the activate handler in rm-2142 — see
// section 8 and the ACTIVATION note in the header.

// 5. /operator navigation — redirect to / before the generic NavigationRoute fires.
// Ensures offline old links canonicalize to the cached operator shell.
// The server also redirects /operator → / unconditionally; this is the offline guard.
registerRoute(
  ({request, url}) =>
    request.mode === 'navigate' &&
    (url.pathname === '/operator' || url.pathname === '/operator/'),
  () => Promise.resolve(Response.redirect('/', 302)),
)

// 6. Navigation requests → precached app shell.
// /auth/*, /operator/auth/*, /api/*, and /privacy are denylisted so
// server-side handling runs for those paths instead of the cached SPA shell.
// /privacy is a public, unauthenticated document served by the server at
// src/server.ts — without this exemption an SW-controlled client navigating
// there would be served the precached app shell and never reach it.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/'), {
    denylist: [/^\/auth(\/|$)/, /^\/operator\/auth(\/|$)/, /^\/api(\/|$)/, /^\/privacy(\/|$)/],
  }),
)

// Logout purge handler — page posts {type:'PURGE_RUNTIME'} on logout or auth
// change. Nothing writes runtime caches at head (rm-274 truthing: the old
// OPERATOR_RUNTIME_CACHE sweep had no writer and no forward-wiring owner —
// rm-249's push-only SW direction was superseded by the push handlers landing
// in this main SW), so the handler's sole owned sweep is the legacy cache.
// The precache is NOT deleted — the app shell must survive logout for instant
// next-user load.
// Legacy purge: monitoring-v1 is the orphaned cache from the pre-migration SW.
// Clients that installed the old SW may still have it on disk; delete it here
// so stale monitoring data does not linger after migration.
//
// Type note: ExtendableMessageEvent is in the WebWorker lib (not DOM). Minimal
// inline interface avoids adding the WebWorker lib to tsconfig (conflicting globals).
interface SWMessageEvent extends Event {
  readonly data: unknown
  waitUntil(f: Promise<unknown>): void
}

const LEGACY_MONITORING_CACHE = 'monitoring-v1'

addEventListener('message', (event: Event) => {
  const e = event as SWMessageEvent
  const messageType = (e.data as {type?: string} | null)?.type
  // Posted by workbox-window's messageSkipWaiting() when the operator clicks
  // Refresh in the update prompt — the sole trigger for activating a waiting worker.
  if (messageType === 'SKIP_WAITING') {
    e.waitUntil(self.skipWaiting())
  }
  if (messageType === 'PURGE_RUNTIME') {
    e.waitUntil(caches.delete(LEGACY_MONITORING_CACHE).then(() => undefined))
  }
  // Dev-only synthetic push: the notifications consent surface posts
  // {type:'MOCK_SYNTHETIC_PUSH', payload} to the SW for visual verification
  // without a real push subscription/relay round-trip. `payload` has the wire
  // shape {title, body, data: {type, route, failureLabel?}} and is routed
  // through the same safe-copy mapping as a real push — never renders raw
  // payload text.
  //
  // The receiver is gated by the SAME import.meta.env.DEV flag as the only
  // sender (web/src/views/Notifications.tsx): Vite replaces the flag at build
  // time, so production builds dead-branch-eliminate this block and the
  // fixture literal never reaches web/dist/sw.js (pinned by
  // test/static-assets.test.ts and web/src/sw.test.ts; rm-2003).
  if (import.meta.env.DEV && messageType === 'MOCK_SYNTHETIC_PUSH') {
    const {title, body, data} = buildNotification((e.data as {payload?: unknown} | null)?.payload)
    e.waitUntil(registration.showNotification(title, {body, data}))
  }
})

// Push, notificationclick, and pushsubscriptionchange handlers.
//
// Touch NO cache — these are notification-lifecycle concerns, orthogonal to
// the fetch/cache routing above. Registered after the message handler per
// plan ordering; does not affect the load-bearing precache/navigation order.
//
// Type note: PushEvent, NotificationEvent, PushSubscriptionChangeEvent, and
// the Clients/WindowClient/ServiceWorkerRegistration.pushManager surface are
// WebWorker-lib types (not DOM). Minimal inline interfaces — same pattern as
// SWMessageEvent above — avoid adding the WebWorker lib to tsconfig
// (conflicting globals with the DOM lib this file otherwise uses).

interface SWPushEvent extends Event {
  readonly data: {json(): unknown} | null
  waitUntil(f: Promise<unknown>): void
}

interface SWWindowClient {
  readonly url: string
  readonly focused: boolean
  readonly visibilityState: string
  focus(): Promise<unknown>
  postMessage(message: unknown): void
}

interface SWClients {
  matchAll(options: {type: 'window'; includeUncontrolled?: boolean}): Promise<SWWindowClient[]>
  openWindow(url: string): Promise<unknown>
  claim(): Promise<unknown>
}

interface SWNotification {
  readonly data: unknown
  close(): void
}

interface SWNotificationEvent extends Event {
  readonly notification: SWNotification
  waitUntil(f: Promise<unknown>): void
}

interface SWPushSubscriptionChangeEvent extends Event {
  waitUntil(f: Promise<unknown>): void
}

declare const clients: SWClients
declare const registration: {
  showNotification(title: string, options: {body: string; data: unknown}): Promise<void>
}

/**
 * `push`: parse defensively; always show a notification (never silent) via
 * the fixed safe-copy mapping in `sw-notification.ts`. The SW push handler
 * is an always-safe fallback — it renders regardless of the dashboard's
 * consent-UI flag state, because a subscription created during a prior
 * enablement can outlive a flag flip.
 */
addEventListener('push', (event: Event) => {
  const e = event as SWPushEvent
  let rawPayload: unknown
  try {
    rawPayload = e.data?.json()
  } catch {
    rawPayload = undefined
  }

  const {title, body, data} = buildNotification(rawPayload)
  e.waitUntil(registration.showNotification(title, {body, data}))
})

/**
 * `notificationclick`: delegates to the pure resolver in
 * `push/notification-click.ts`. It never builds a URL from `route` or any wire
 * text (open-redirect guard); a question click targets only a validated
 * `runId`. Everything else focuses an existing window or opens `/`.
 */
addEventListener('notificationclick', (event: Event) => {
  const e = event as SWNotificationEvent
  e.notification.close()
  e.waitUntil(handleNotificationClick(clients, e.notification.data))
})

/**
 * `pushsubscriptionchange`: performs NO resubscribe. The SW-created
 * subscription would deliver nothing (the Gateway only learns endpoints via
 * the page's authenticated POST) and the page's next reconcile sweep would
 * detect the endpointHash mismatch and unsubscribe it anyway — pure churn.
 * Registration is owned entirely by the page. This handler only posts an
 * in-memory hint to open window clients so the page can run an immediate
 * reconcile sweep instead of waiting for its next load/visibility trigger.
 * No durable queue: the hint is simply dropped if no client is open. The SW
 * persists nothing about the subscription. Never throws — any failure here
 * is recovered by the page's next load/visibility reconcile regardless.
 */
addEventListener('pushsubscriptionchange', (event: Event) => {
  const e = event as SWPushSubscriptionChangeEvent
  e.waitUntil(
    (async () => {
      try {
        const windowClients = await clients.matchAll({type: 'window'})
        for (const client of windowClients) {
          client.postMessage({type: 'PUSH_SUBSCRIPTION_CHANGE'})
        }
      } catch {
        // Best-effort only — never throws out of the event handler.
      }
    })(),
  )
})

// 8. Auto-update activation (rm-1960) + outdated-precaches cleanup (rm-2142).
// The worker skips waiting itself at startup (install phase) instead of
// waiting for every tab to close, then claims open clients on activation;
// claimed pages pick up the new shell on their next navigation (the emitted
// registerSW.js is the bare register — no silent reload). The cleanup of
// previous-format precaches runs HERE, at activation — never at eval time
// (rm-2142): an eval-time call races the install phase, and a failed
// install must not leave a torn-down cache state behind. Order: cleanup
// first, then claim.
self.skipWaiting()

interface SWActivateEvent extends Event {
  waitUntil(f: Promise<unknown>): void
}

addEventListener('activate', (event: Event) => {
  const e = event as SWActivateEvent
  e.waitUntil(cleanupOutdatedCaches().then(() => clients.claim()))
})
