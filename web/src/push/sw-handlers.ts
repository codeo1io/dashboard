/**
 * rm-249: push-only service-worker event handlers.
 *
 * Pure orchestration for the three Service Worker events the push substrate
 * owns — `push`, `notificationclick`, and `pushsubscriptionchange` — with
 * every collaborator injected, so they are unit-testable without a real
 * ServiceWorkerContainer (mirrors the `Minimal*` deps discipline of
 * subscribe.ts). `web/src/sw.ts` wires them to the live scope.
 *
 * Scope boundaries (deliberate):
 * - No fetch handler, no precache manifest consumption, no cache writing —
 *   the joint rm-138 PWA-precache decision stays unprejudiced.
 * - `pushsubscriptionchange` is the SW's ownership of subscription rotation
 *   (the 2026-09-29 rm-249 rider): the browser fires it when the
 *   subscription expires or is invalidated server-side — exactly the moment
 *   the post-hoc page-side reconcile sweep (rm-600) cannot observe, because
 *   no page is open. Platform reality: Chromium does not reliably fire this
 *   event today (it is specified by the W3C Push API and supported in
 *   Firefox/Safari lineage), so the rm-600 sweep remains the second line of
 *   defense; this handler is the first.
 */
import type {PushClient} from './subscribe.ts'

import {buildNotification, type SafeNotification} from './sw-notification.ts'

// ---------------------------------------------------------------------------
// push
// ---------------------------------------------------------------------------

/** Minimal PushMessageData shape this module needs (`json()` may throw on
 * non-JSON payloads — silent pushes arrive with `data: null`). */
export interface PushMessageDataLike {
  json(): unknown
}

export interface PushEventLike {
  readonly data: PushMessageDataLike | null
  waitUntil(promise: Promise<unknown>): void
}

export type ShowNotification = (notification: SafeNotification) => Promise<unknown>

function readPushPayload(data: PushMessageDataLike | null): unknown {
  if (data === null) return undefined
  try {
    return data.json()
  } catch {
    return undefined
  }
}

/**
 * Every push MUST surface a notification (the `userVisibleOnly` contract we
 * subscribe under): malformed or missing payloads fall back to the generic
 * copy via `buildNotification(undefined)` instead of dropping the event.
 */
export function handlePush(event: PushEventLike, showNotification: ShowNotification): void {
  const notification = buildNotification(readPushPayload(event.data))
  event.waitUntil(Promise.resolve(showNotification(notification)))
}

// ---------------------------------------------------------------------------
// notificationclick
// ---------------------------------------------------------------------------

export interface ClickedNotificationLike {
  readonly data: unknown
  close(): void
}

export interface NotificationClickEventLike {
  readonly notification: ClickedNotificationLike
  waitUntil(promise: Promise<unknown>): void
}

export interface WindowClientLike {
  focus(): Promise<unknown>
}

export interface ClientsApiLike {
  matchAll(options?: {readonly type?: string; readonly includeUncontrolled?: boolean}): Promise<readonly WindowClientLike[]>
  openWindow(url: string): Promise<unknown>
}

/**
 * Click routes are self-authored (`sw-notification.ts` pins them to `/`),
 * but stay defensive anyway: only same-origin relative paths survive —
 * anything else (or nothing) falls back to the dashboard root.
 */
export function safeNotificationRoute(data: unknown): string {
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const route = (data as Record<string, unknown>).route
    if (typeof route === 'string' && route.startsWith('/') && !route.startsWith('//')) {
      return route
    }
  }
  return '/'
}

/** Focus an already-open dashboard window; only open a new one when none exists. */
export function handleNotificationclick(event: NotificationClickEventLike, clients: ClientsApiLike): void {
  const route = safeNotificationRoute(event.notification.data)
  event.notification.close()
  event.waitUntil(
    (async () => {
      const windowClients = await clients.matchAll({type: 'window', includeUncontrolled: true})
      if (windowClients.length > 0) {
        await windowClients[0]!.focus()
        return
      }
      await clients.openWindow(route)
    })(),
  )
}

// ---------------------------------------------------------------------------
// pushsubscriptionchange — subscription rotation ownership
// ---------------------------------------------------------------------------

export interface PushSubscriptionLike {
  toJSON(): unknown
  unsubscribe(): Promise<boolean>
}

export interface PushManagerLike {
  subscribe(options: {readonly userVisibleOnly: boolean; readonly applicationServerKey: Uint8Array}): Promise<PushSubscriptionLike>
}

export interface PushsubscriptionchangeEventLike {
  waitUntil(promise: Promise<unknown>): void
}

export interface RotationDeps {
  readonly pushManager: PushManagerLike
  readonly getVapidKey: PushClient['getVapidKey']
  readonly refreshCsrf: PushClient['refreshCsrf']
  readonly subscribePush: PushClient['subscribePush']
  readonly mintIdempotencyKey: () => string | null
  readonly urlB64ToUint8Array: (base64url: string) => Uint8Array
}

/**
 * Re-subscribe with the current VAPID key and hand the new subscription to
 * the gateway. Fail-closed at every step; a freshly minted local subscription
 * that cannot be delivered is unsubscribed again so no orphan lingers on the
 * browser side (the gateway would otherwise 410 on it later anyway).
 */
async function rotatePushSubscription(deps: RotationDeps): Promise<void> {
  const idempotencyKey = deps.mintIdempotencyKey()
  if (idempotencyKey === null) return

  const keyResult = await deps.getVapidKey()
  if (!keyResult.success) return
  if (keyResult.data.pushDisabled || keyResult.data.vapidKey === undefined) return

  let subscription: PushSubscriptionLike
  try {
    subscription = await deps.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: deps.urlB64ToUint8Array(keyResult.data.vapidKey.publicKey),
    })
  } catch {
    return
  }

  const csrfResult = await deps.refreshCsrf()
  if (!csrfResult.success) {
    await subscription.unsubscribe().catch(() => false)
    return
  }

  const postResult = await deps.subscribePush(subscription.toJSON(), csrfResult.data, idempotencyKey)
  if (!postResult.success) {
    await subscription.unsubscribe().catch(() => false)
  }
}

export function handlePushsubscriptionchange(event: PushsubscriptionchangeEventLike, deps: RotationDeps): void {
  event.waitUntil(rotatePushSubscription(deps))
}
