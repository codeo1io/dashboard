/**
 * Opt-in/opt-out push subscribe orchestration + reconcile-sweep trigger
 * wiring.
 *
 * Browser-direct `/operator/push/*` calls (never the server-side
 * `src/gateway/operator-client.ts` — `web/` must never import from `src/`).
 * The fetch/CSRF/idempotency/retry posture mirrors `public/operator-launch.js`
 * `buildLaunchClient` (`credentials:'include'`, `redirect:'error'`,
 * `x-csrf-token` + `idempotency-key` headers, one CSRF-400 retry reusing the
 * same idempotency key).
 *
 * Web-local — no import from `src/`.
 */
import type {Result} from '@bfra.me/es/result'
import {err, ok} from '@bfra.me/es/result'
import {getNotificationPermission, getPushSupport} from './capability.ts'
import {endpointHash} from './endpoint-hash.ts'
import type {HandoffState, PushSubscriptionMetadata, VapidKeyResponse} from './push-types.ts'
import {derivePushHandoffState, reconcile} from './reconcile.ts'
import {urlB64ToUint8Array} from './vapid-key.ts'

// ---------------------------------------------------------------------------
// Browser-direct push client
// ---------------------------------------------------------------------------

export interface PushClientError {
  readonly kind: 'http' | 'network' | 'protocol' | 'validation'
  readonly status?: number
}

export interface PushClient {
  refreshCsrf(): Promise<Result<string, PushClientError>>
  /**
   * `pushDisabled: true` is set only when the Gateway route returned HTTP
   * 404 — the synthetic push_disabled signal driven by status alone, never
   * response-body shape. A non-404 error stays a normal `PushClientError`.
   */
  getVapidKey(): Promise<
    Result<{readonly pushDisabled: boolean; readonly vapidKey: VapidKeyResponse | undefined}, PushClientError>
  >
  /**
   * `pushDisabled: true` is set only when the Gateway route returned HTTP
   * 404 — the synthetic push_disabled signal driven by status alone, never
   * response-body shape. A non-404 error stays a normal `PushClientError`.
   */
  getPushSubscriptionMetadata(): Promise<
    Result<{readonly pushDisabled: boolean; readonly metadata: PushSubscriptionMetadata | undefined}, PushClientError>
  >
  subscribePush(
    subscriptionJson: unknown,
    csrfToken: string,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<Result<void, PushClientError>>
  unsubscribePush(endpoint: string, csrfToken: string, idempotencyKey: string): Promise<Result<void, PushClientError>>
}

export interface BuildPushClientOptions {
  readonly endpointBase?: string
  readonly fixtureSessionId?: string
}

function hasValidSubscriptionMetadataShape(value: unknown): value is PushSubscriptionMetadata {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const c = value as Record<string, unknown>
  return (
    typeof c.endpointHash === 'string' &&
    typeof c.keyVersion === 'string' &&
    typeof c.active === 'boolean' &&
    typeof c.createdAt === 'string' &&
    typeof c.updatedAt === 'string'
  )
}

/**
 * Build the browser-direct push client. Same-origin `/operator/push/*`
 * routes only (reverse-proxied to the Gateway) — never a call into
 * server-side `src/` code.
 */
export function buildPushClient(opts?: BuildPushClientOptions): PushClient {
  const endpointBase = opts?.endpointBase ?? '/operator/push'
  const operatorBase = endpointBase.replace(/\/push$/, '')
  const {fixtureSessionId} = opts ?? {}

  // Appends fixtureSessionId as a query param, mirroring
  // public/operator-run-index.js and public/operator-stream.js. No-op in
  // production (fixtureSessionId undefined) — URLs stay byte-identical to today.
  const withFixtureSessionId = (url: string): string => {
    if (fixtureSessionId === undefined) return url
    return `${url}${url.includes('?') ? '&' : '?'}fixtureSessionId=${encodeURIComponent(fixtureSessionId)}`
  }

  const browserFetch = (input: string, init?: RequestInit): Promise<Response> => {
    const timeoutSignal = AbortSignal.timeout(10_000)
    const combinedSignal = init?.signal !== undefined && init.signal !== null
      ? AbortSignal.any([init.signal, timeoutSignal])
      : timeoutSignal
    return globalThis.fetch(input, {
      ...init,
      signal: combinedSignal,
      credentials: 'include',
      redirect: 'error',
    })
  }

  return {
    async refreshCsrf() {
      try {
        const res = await browserFetch(withFixtureSessionId(`${operatorBase}/session/csrf`), {
          headers: {'content-type': 'application/json'},
        })
        if (!res.ok) return err({kind: 'http', status: res.status})
        const data = (await res.json()) as unknown
        if (data === null || typeof data !== 'object' || typeof (data as {csrfToken?: unknown}).csrfToken !== 'string') {
          return err({kind: 'protocol'})
        }
        return ok((data as {csrfToken: string}).csrfToken)
      } catch {
        return err({kind: 'network'})
      }
    },

    async getVapidKey() {
      try {
        const res = await browserFetch(withFixtureSessionId(`${endpointBase}/vapid-key`), {
          headers: {'content-type': 'application/json'},
        })
        if (res.status === 404) return ok({pushDisabled: true, vapidKey: undefined})
        if (!res.ok) return err({kind: 'http', status: res.status})
        const data = (await res.json()) as unknown
        if (
          data === null ||
          typeof data !== 'object' ||
          typeof (data as {publicKey?: unknown}).publicKey !== 'string' ||
          typeof (data as {keyVersion?: unknown}).keyVersion !== 'string'
        ) {
          return err({kind: 'protocol'})
        }
        return ok({pushDisabled: false, vapidKey: data as VapidKeyResponse})
      } catch {
        return err({kind: 'network'})
      }
    },

    async getPushSubscriptionMetadata() {
      try {
        const res = await browserFetch(withFixtureSessionId(`${endpointBase}/subscriptions`), {
          headers: {'content-type': 'application/json'},
        })
        if (res.status === 404) return ok({pushDisabled: true, metadata: undefined})
        if (!res.ok) return err({kind: 'http', status: res.status})
        const data = (await res.json()) as unknown
        if (data === null || typeof data !== 'object') {
          return ok({pushDisabled: false, metadata: undefined})
        }
        // Gateway returns either an empty object (no subscription) or the metadata shape.
        if (hasValidSubscriptionMetadataShape(data) === false) {
          return ok({pushDisabled: false, metadata: undefined})
        }
        return ok({pushDisabled: false, metadata: data})
      } catch {
        return err({kind: 'network'})
      }
    },

    async subscribePush(subscriptionJson, csrfToken, idempotencyKey, signal) {
      if (csrfToken.trim() === '') return err({kind: 'validation'})
      if (idempotencyKey.trim() === '') return err({kind: 'validation'})

      const post = (token: string): Promise<Response> =>
        browserFetch(withFixtureSessionId(`${endpointBase}/subscriptions`), {
          method: 'POST',
          signal,
          headers: {
            'content-type': 'application/json',
            'x-csrf-token': token,
            'idempotency-key': idempotencyKey,
          },
          body: JSON.stringify(subscriptionJson),
        })

      try {
        const res = await post(csrfToken)
        if (res.ok) return ok(undefined)

        if (res.status !== 400) return err({kind: 'http', status: res.status})

        // 400 → refresh CSRF once and retry ONCE reusing the SAME idempotency key.
        const retryCsrfResult = await this.refreshCsrf()
        if (!retryCsrfResult.success) return retryCsrfResult

        if (signal?.aborted === true) return err({kind: 'network'})

        const retryRes = await post(retryCsrfResult.data)
        if (retryRes.ok) return ok(undefined)
        return err({kind: 'http', status: retryRes.status})
      } catch {
        return err({kind: 'network'})
      }
    },

    async unsubscribePush(endpoint, csrfToken, idempotencyKey) {
      if (csrfToken.trim() === '') return err({kind: 'validation'})
      if (idempotencyKey.trim() === '') return err({kind: 'validation'})

      const post = (token: string): Promise<Response> =>
        browserFetch(withFixtureSessionId(`${endpointBase}/subscriptions/unsubscribe`), {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-csrf-token': token,
            'idempotency-key': idempotencyKey,
          },
          body: JSON.stringify({endpoint}),
        })

      try {
        const res = await post(csrfToken)
        if (res.ok) return ok(undefined)

        if (res.status !== 400) return err({kind: 'http', status: res.status})

        // 400 → refresh CSRF once and retry ONCE reusing the SAME idempotency key.
        const retryCsrfResult = await this.refreshCsrf()
        if (!retryCsrfResult.success) return retryCsrfResult

        const retryRes = await post(retryCsrfResult.data)
        if (retryRes.ok) return ok(undefined)
        return err({kind: 'http', status: retryRes.status})
      } catch {
        return err({kind: 'network'})
      }
    },
  }
}

/**
 * Mint a fresh unique idempotency key, or null when this environment cannot
 * mint one securely (no crypto.randomUUID). Memory-only — never persisted or
 * logged. Callers MUST fail closed on null: never fall back to a weaker
 * generator (e.g. Math.random) — a predictable key would defeat the gateway's
 * zero-duplicate-subscription retry invariant.
 */
export function mintIdempotencyKey(): string | null {
  if (globalThis.crypto !== undefined && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return null
}

// ---------------------------------------------------------------------------
// Subscribe orchestration
// ---------------------------------------------------------------------------

/** Minimal shape of a browser PushSubscription needed by this module. */
export interface MinimalPushSubscription {
  readonly endpoint: string
  toJSON(): unknown
  unsubscribe(): Promise<boolean>
}

export interface MinimalPushManager {
  subscribe(options: {userVisibleOnly: boolean; applicationServerKey: Uint8Array}): Promise<MinimalPushSubscription>
  getSubscription(): Promise<MinimalPushSubscription | null>
}

export interface MinimalServiceWorkerRegistration {
  readonly pushManager: MinimalPushManager
}

export type SubscribeOutcome =
  | {readonly kind: 'subscribed'}
  | {readonly kind: 'sw-not-ready'}
  /** rm-272: no service-worker registration exists, so the ready wait can never settle — permanent, retrying cannot help. */
  | {readonly kind: 'sw-unavailable'}
  | {readonly kind: 'ios-not-installed'}
  | {readonly kind: 'unsupported'}
  | {readonly kind: 'dismissed'}
  | {readonly kind: 'denied'}
  | {readonly kind: 'subscribe-failed'}
  | {readonly kind: 'aborted'}

export interface SubscribeDeps {
  /** Resolves once the SW is ready — normally `navigator.serviceWorker.ready`. */
  readonly serviceWorkerReady: () => Promise<MinimalServiceWorkerRegistration>
  /**
   * rm-272: reads whether any service-worker registration exists, so a timed-out
   * ready wait can be classified permanent ('sw-unavailable') instead of transient
   * ('sw-not-ready'). Defaults to navigator.serviceWorker.getRegistration().
   */
  readonly getSwRegistration?: () => Promise<MinimalServiceWorkerRegistration | undefined>
  readonly getSupport?: () => {readonly supported: boolean; readonly needsInstall: boolean}
  readonly getPermission?: () => NotificationPermission | 'unsupported'
  readonly requestPermission: () => Promise<NotificationPermission>
  readonly pushClient: PushClient
  readonly signal?: AbortSignal
  readonly swReadyTimeoutMs?: number
  readonly mintIdempotencyKey?: () => string | null
}

const DEFAULT_SW_READY_TIMEOUT_MS = 5000

/** rm-272: bound for the sweep/cleanup local-subscription read (serviceWorker.ready + getSubscription). */
const DEFAULT_LOCAL_READ_TIMEOUT_MS = 5000

/** Default registration probe: an absent serviceWorker container reads as "no registration". */
function getDefaultSwRegistration(): Promise<MinimalServiceWorkerRegistration | undefined> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(undefined)
  }
  try {
    // House boundary cast: the module reads only `pushManager` (structural
    // subset), which the DOM registration provides; the full DOM interfaces
    // carry members whose minimal twins differ (BufferSource vs Uint8Array),
    // so the structural assignment itself does not typecheck.
    return navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg as unknown as MinimalServiceWorkerRegistration | undefined)
      .catch(() => undefined)
  } catch {
    return Promise.resolve(undefined)
  }
}

/**
 * rm-272: classify a timed-out `serviceWorker.ready` wait. With no registration
 * the wait can never settle — retrying cannot help — so the caller must surface
 * the PERMANENT 'sw-unavailable' outcome; a registration that merely has not
 * finished activating is the transient 'sw-not-ready' one. A hung or failing
 * getRegistration() also reads as "no registration": it is only consulted after
 * the ready wait already timed out.
 */
async function classifySwReadiness(
  deps: Pick<SubscribeDeps, 'getSwRegistration' | 'swReadyTimeoutMs'>,
): Promise<{readonly kind: 'sw-not-ready'} | {readonly kind: 'sw-unavailable'}> {
  const getSwRegistration = deps.getSwRegistration ?? getDefaultSwRegistration
  const registration = await withTimeout(
    getSwRegistration(),
    deps.swReadyTimeoutMs ?? DEFAULT_SW_READY_TIMEOUT_MS,
  )
  return registration === 'timeout' || registration === undefined
    ? {kind: 'sw-unavailable'}
    : {kind: 'sw-not-ready'}
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | 'timeout'> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve('timeout'), timeoutMs)
    promise.then(
      value => {
        clearTimeout(timer)
        resolve(value)
      },
      () => {
        clearTimeout(timer)
        resolve('timeout')
      },
    )
  })
}

/**
 * Opt-in orchestration: `serviceWorker.ready` (5s timeout) → capability/iOS
 * gate → `Notification.requestPermission()` (skipped if already granted,
 * e.g. on a retry) → `getVapidKey` → `pushManager.subscribe` →
 * `subscribePush` POST. On a Gateway-POST failure after a successful browser
 * subscribe, calls local `unsubscribe()` before surfacing subscribe-failed.
 * An `AbortSignal` (e.g. from a logout mid-flow) discards the result before
 * any POST — the caller passes `deps.signal` through.
 */
export async function subscribeOptIn(deps: SubscribeDeps): Promise<SubscribeOutcome> {
  const getSupport = deps.getSupport ?? getPushSupport
  const getPermission = deps.getPermission ?? getNotificationPermission
  const mintKey = deps.mintIdempotencyKey ?? mintIdempotencyKey
  // Fail closed BEFORE any side effect: without a securely minted key the
  // gateway's zero-duplicate-subscription retry invariant cannot be upheld,
  // so a browser subscription must not even be started.
  const idempotencyKey = mintKey()
  if (idempotencyKey === null) return {kind: 'subscribe-failed'}

  const support = getSupport()
  if (support.needsInstall) return {kind: 'ios-not-installed'}
  if (support.supported === false) return {kind: 'unsupported'}

  const readyResult = await withTimeout(deps.serviceWorkerReady(), deps.swReadyTimeoutMs ?? DEFAULT_SW_READY_TIMEOUT_MS)
  if (readyResult === 'timeout') return classifySwReadiness(deps)
  const registration = readyResult

  if (deps.signal?.aborted) return {kind: 'aborted'}

  const currentPermission = getPermission()
  let permission: NotificationPermission
  if (currentPermission === 'granted') {
    // Already granted (e.g. a subscribe-failed retry) — never re-prompt.
    permission = 'granted'
  } else {
    permission = await deps.requestPermission()
  }

  if (permission === 'denied') return {kind: 'denied'}
  if (permission !== 'granted') return {kind: 'dismissed'}

  if (deps.signal?.aborted) return {kind: 'aborted'}

  const vapidResult = await deps.pushClient.getVapidKey()
  if (!vapidResult.success) return {kind: 'subscribe-failed'}
  if (vapidResult.data.pushDisabled) return {kind: 'unsupported'}
  const vapidKey = vapidResult.data.vapidKey
  if (vapidKey === undefined) return {kind: 'subscribe-failed'}

  if (deps.signal?.aborted) return {kind: 'aborted'}

  let subscription: MinimalPushSubscription
  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(vapidKey.publicKey),
    })
  } catch {
    return {kind: 'subscribe-failed'}
  }

  if (deps.signal?.aborted) {
    // subscribe() already created a local subscription but the gateway has
    // not been told — drop it so no orphaned subscription lingers until a
    // reconcile sweep (rm-264).
    await subscription.unsubscribe().catch(() => false)
    return {kind: 'aborted'}
  }

  const csrfResult = await deps.pushClient.refreshCsrf()
  if (!csrfResult.success) {
    await subscription.unsubscribe().catch(() => false)
    return {kind: 'subscribe-failed'}
  }

  if (deps.signal?.aborted) {
    // Same window as above: local subscription live, gateway uninformed.
    await subscription.unsubscribe().catch(() => false)
    return {kind: 'aborted'}
  }

  const postResult = await deps.pushClient.subscribePush(
    subscription.toJSON(),
    csrfResult.data,
    idempotencyKey,
    deps.signal,
  )

  if (!postResult.success) {
    // A failed POST means the gateway never learned about the subscription —
    // this also covers the abort-during-POST race (rm-264). A successful POST
    // falls through to 'subscribed' even if the signal aborted afterwards:
    // the gateway recorded it, so dropping the local copy would desync.
    await subscription.unsubscribe().catch(() => false)
    return deps.signal?.aborted ? {kind: 'aborted'} : {kind: 'subscribe-failed'}
  }

  return {kind: 'subscribed'}
}

/**
 * `stale_key` resubscribe. Ordering (with an acknowledged no-coverage
 * window): fetch new key → local `unsubscribe()` (required before
 * `pushManager.subscribe()`, which rejects `InvalidStateError` if a
 * subscription already exists) → resubscribe → POST. Skips the native
 * permission prompt (only reachable when permission is already granted).
 *
 * The forced unsubscribe-before-subscribe window is inherent to the browser
 * API and cannot be fully closed. This narrows it with one bounded retry at
 * each of the two failure points:
 *  - `pushManager.subscribe()`: one immediate retry on throw.
 *  - the Gateway POST: `subscribePush` already retries once internally on a
 *    CSRF-400 (reusing the same idempotency key). This layer adds one more
 *    retry on top, reusing the same idempotency key and minting a fresh
 *    CSRF token first if the failure looks CSRF-shaped. Worst case (a
 *    persistently CSRF-shaped 400) is bounded: at most 4 POSTs and 3
 *    `refreshCsrf` calls, all sharing one idempotency key — duplicate-
 *    subscription risk stays at zero regardless of retry count.
 *
 * Final failure -> subscribe-failed; retry re-runs this same flow.
 */
export async function resubscribeStaleKey(deps: SubscribeDeps): Promise<SubscribeOutcome> {
  const mintKey = deps.mintIdempotencyKey ?? mintIdempotencyKey
  // Same fail-closed rule as subscribeOptIn: no securely minted key → no
  // browser (re)subscription attempt.
  const idempotencyKey = mintKey()
  if (idempotencyKey === null) return {kind: 'subscribe-failed'}

  const readyResult = await withTimeout(deps.serviceWorkerReady(), deps.swReadyTimeoutMs ?? DEFAULT_SW_READY_TIMEOUT_MS)
  if (readyResult === 'timeout') return classifySwReadiness(deps)
  const registration = readyResult

  if (deps.signal?.aborted) return {kind: 'aborted'}

  const vapidResult = await deps.pushClient.getVapidKey()
  if (!vapidResult.success) return {kind: 'subscribe-failed'}
  if (vapidResult.data.pushDisabled) return {kind: 'unsupported'}
  const vapidKey = vapidResult.data.vapidKey
  if (vapidKey === undefined) return {kind: 'subscribe-failed'}

  const existing = await registration.pushManager.getSubscription()
  if (existing !== null) {
    await existing.unsubscribe().catch(() => false)
  }

  if (deps.signal?.aborted) return {kind: 'aborted'}

  let subscription: MinimalPushSubscription
  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(vapidKey.publicKey),
    })
  } catch {
    if (deps.signal?.aborted) return {kind: 'aborted'}
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(vapidKey.publicKey),
      })
    } catch {
      return {kind: 'subscribe-failed'}
    }
  }

  if (deps.signal?.aborted) {
    // Fresh local subscription, gateway uninformed — drop it (rm-264).
    await subscription.unsubscribe().catch(() => false)
    return {kind: 'aborted'}
  }

  const csrfResult = await deps.pushClient.refreshCsrf()
  if (!csrfResult.success) {
    await subscription.unsubscribe().catch(() => false)
    return {kind: 'subscribe-failed'}
  }

  if (deps.signal?.aborted) {
    // Same window: local subscription live, gateway uninformed (rm-264).
    await subscription.unsubscribe().catch(() => false)
    return {kind: 'aborted'}
  }

  const postResult = await deps.pushClient.subscribePush(subscription.toJSON(), csrfResult.data, idempotencyKey, deps.signal)

  if (!postResult.success) {
    if (deps.signal?.aborted) {
      // First POST failed (gateway uninformed) and retrying is pointless —
      // drop the local subscription (rm-264).
      await subscription.unsubscribe().catch(() => false)
      return {kind: 'aborted'}
    }

    const csrfShaped = postResult.error.kind === 'http' && postResult.error.status === 400
    let retryCsrfToken = csrfResult.data
    if (csrfShaped) {
      const retryCsrfResult = await deps.pushClient.refreshCsrf()
      if (!retryCsrfResult.success) {
        await subscription.unsubscribe().catch(() => false)
        return {kind: 'subscribe-failed'}
      }
      retryCsrfToken = retryCsrfResult.data
    }

    if (deps.signal?.aborted) {
      // Retry not yet sent: local subscription live, gateway uninformed
      // (the first POST failed) — drop it (rm-264).
      await subscription.unsubscribe().catch(() => false)
      return {kind: 'aborted'}
    }

    const retryPostResult = await deps.pushClient.subscribePush(
      subscription.toJSON(),
      retryCsrfToken,
      idempotencyKey,
      deps.signal,
    )

    if (retryPostResult.success) {
      return {kind: 'subscribed'}
    }

    // Retry failed: gateway uninformed — drop the local subscription (this
    // also covers the abort-after-retry race, rm-264).
    await subscription.unsubscribe().catch(() => false)
    return deps.signal?.aborted ? {kind: 'aborted'} : {kind: 'subscribe-failed'}
  }

  return {kind: 'subscribed'}
}

export interface UnsubscribeDeps {
  readonly getLocalSubscription: () => Promise<MinimalPushSubscription | null>
  /** rm-272: bound on the local read — serviceWorker.ready never settles with no registration, and logout cleanup must not hang on it. */
  readonly localReadTimeoutMs?: number
  readonly pushClient: PushClient
  readonly mintIdempotencyKey?: () => string | null
}

/**
 * Opt-out / logout / revocation cleanup. Always attempts local
 * `unsubscribe()` first. Gateway unsubscribe requires `{endpoint}` — when no
 * concrete endpoint is available locally (no active `PushSubscription`), the
 * Gateway call is skipped entirely and cleanup relies on Gateway-side
 * cleanup (dead-sub detection, session revocation, privacy delete). The
 * endpoint is NEVER persisted solely to work around this.
 */
export async function unsubscribeOptOut(deps: UnsubscribeDeps): Promise<{readonly gatewayUnsubscribeCalled: boolean}> {
  const mintKey = deps.mintIdempotencyKey ?? mintIdempotencyKey
  // rm-272: bound the local read — `navigator.serviceWorker.ready` never settles
  // when no registration exists, and logout cleanup must not hang on it. A
  // timeout (or rejection, which withTimeout collapses to 'timeout') reads as
  // "no local subscription": the Gateway call is skipped per the contract above.
  const localRead = await withTimeout(
    deps.getLocalSubscription(),
    deps.localReadTimeoutMs ?? DEFAULT_LOCAL_READ_TIMEOUT_MS,
  )
  const subscription = localRead === 'timeout' ? null : localRead

  if (subscription === null) {
    // Endpointless case — nothing to unsubscribe locally or remotely.
    return {gatewayUnsubscribeCalled: false}
  }

  const {endpoint} = subscription
  await subscription.unsubscribe().catch(() => false)

  try {
    const csrfResult = await deps.pushClient.refreshCsrf()
    if (!csrfResult.success) return {gatewayUnsubscribeCalled: false}

    // Fail closed on null: skip the gateway POST rather than send a weakly
    // minted key. The local unsubscribe above already ran, so the browser is
    // unsubscribed either way — only the gateway-side cleanup is skipped.
    const idempotencyKey = mintKey()
    if (idempotencyKey === null) return {gatewayUnsubscribeCalled: false}
    await deps.pushClient.unsubscribePush(endpoint, csrfResult.data, idempotencyKey)
    return {gatewayUnsubscribeCalled: true}
  } catch {
    return {gatewayUnsubscribeCalled: false}
  }
}

// ---------------------------------------------------------------------------
// Reconcile sweep trigger wiring
// ---------------------------------------------------------------------------

export interface ReconcileSweepCache {
  readonly permission: NotificationPermission | 'unsupported'
  readonly subscriptionPresent: boolean
  readonly handoffState: HandoffState | undefined
  /** Gateway VAPID key version observed by the last executed sweep (rm-600). */
  readonly keyVersion: string | undefined
  readonly lastActionAt: number
}

export const INITIAL_RECONCILE_SWEEP_CACHE: ReconcileSweepCache = {
  permission: 'default',
  subscriptionPresent: false,
  handoffState: undefined,
  keyVersion: undefined,
  lastActionAt: 0,
}

export interface ReconcileSweepDeps {
  readonly getLocalSubscription: () => Promise<MinimalPushSubscription | null>
  readonly getPermission?: () => NotificationPermission | 'unsupported'
  readonly pushClient: PushClient
  /** Current Gateway VAPID key version, if known (fetched separately/cached by the caller). */
  readonly getCurrentKeyVersion?: () => string | undefined
  readonly now?: () => number
  readonly minIntervalMs?: number
  /**
   * rm-272: bound on the local read. In production this read rides
   * `navigator.serviceWorker.ready`, which NEVER settles when no registration
   * exists — the unbounded await that used to hang the sweep here.
   */
  readonly localReadTimeoutMs?: number
}

export interface ReconcileSweepResult {
  readonly skipped: boolean
  readonly action: import('./reconcile.ts').ReconcileAction | undefined
  readonly uiState: import('./reconcile.ts').ReconcileUiState | undefined
  readonly nextCache: ReconcileSweepCache
}

const DEFAULT_MIN_INTERVAL_MS = 30_000

/**
 * Run one reconcile sweep: computes `endpointHash(subscription.endpoint)`
 * when a local subscription exists, fetches Gateway metadata, derives the
 * handoff state, and returns the reconcile action.
 *
 * Debounce/no-change guard: skips the Gateway GET (and any action) when
 * permission + local-subscription-presence + the Gateway VAPID key version
 * are unchanged since the cached sweep, or when the minimum interval between
 * reconcile actions hasn't elapsed — so rapid `visibilitychange`/`focus`
 * cycling cannot trigger subscribe/unsubscribe storms. Folding the key
 * version into the unchanged predicate (rm-600) is what makes a Gateway key
 * rotation on an open, stably-subscribed page detectable on the following
 * sweep WITHOUT a reload: the version change voids the skip, the metadata
 * GET re-runs, and derivePushHandoffState classifies the stale subscription.
 */
export async function runReconcileSweep(
  deps: ReconcileSweepDeps,
  cache: ReconcileSweepCache,
): Promise<ReconcileSweepResult> {
  const getPermission = deps.getPermission ?? getNotificationPermission
  const now = deps.now ?? Date.now
  const minIntervalMs = deps.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS

  const permission = getPermission()
  // rm-272: bound the local read. It rides `navigator.serviceWorker.ready` in
  // production, which NEVER settles when no registration exists — this was the
  // file's only unbounded serviceWorkerReady await (the subscribe/resubscribe
  // siblings wrap theirs in withTimeout). It also runs BEFORE the
  // unchanged/min-interval guards below, so an unbounded read hung EVERY
  // focus/visibility sweep, not just the first. A timeout (or rejection,
  // collapsed into 'timeout') reads as "no local subscription": the handoff
  // derivation stays conservative — no local hash => 'not_subscribed',
  // notSubscribedConfirmed false => no destructive action — so a slow or stuck
  // service worker can never license a teardown.
  const localRead = await withTimeout(
    deps.getLocalSubscription(),
    deps.localReadTimeoutMs ?? DEFAULT_LOCAL_READ_TIMEOUT_MS,
  )
  const localSubscription = localRead === 'timeout' ? null : localRead
  const subscriptionPresent = localSubscription !== null

  // cache.handoffState === undefined means no sweep has run yet — always run the
  // first sweep regardless of how the cache's other fields happen to be seeded.
  // rm-600: the current key version participates in the unchanged predicate. It
  // is read BEFORE the guards (not only at derivation time) so a rotation voids
  // the skip even when permission and subscription presence are both stable —
  // the version is also threaded into nextCache for the following comparison.
  const currentKeyVersion = deps.getCurrentKeyVersion?.()
  const unchanged =
    cache.handoffState !== undefined &&
    permission === cache.permission &&
    subscriptionPresent === cache.subscriptionPresent &&
    currentKeyVersion === cache.keyVersion
  const withinMinInterval = cache.handoffState !== undefined && now() - cache.lastActionAt < minIntervalMs

  if (unchanged || withinMinInterval) {
    return {skipped: true, action: undefined, uiState: undefined, nextCache: cache}
  }

  const metadataResult = await deps.pushClient.getPushSubscriptionMetadata()
  if (!metadataResult.success) {
    // Transport/protocol error — do not mutate state on an inconclusive read.
    return {skipped: true, action: undefined, uiState: undefined, nextCache: cache}
  }

  // A thrown/rejected hash computation (e.g. a transient crypto.subtle
  // failure) must be treated the same as "unavailable" — not silently
  // dropped into a false not_subscribed/cleanup. Never let it crash the
  // sweep either.
  let localHash: string | undefined
  if (subscriptionPresent && localSubscription !== null) {
    try {
      localHash = await endpointHash(localSubscription.endpoint)
    } catch {
      localHash = undefined
    }
  }
  const handoffState = derivePushHandoffState(localHash, currentKeyVersion, metadataResult.data)

  const permissionForReconcile: NotificationPermission = permission === 'unsupported' ? 'denied' : permission
  // Only a genuinely confirmed mismatch (metadata actually read AND local
  // hash actually computed) may license a destructive cleanup — see
  // reconcile()'s ReconcileOptions doc.
  const notSubscribedConfirmed = metadataResult.data.metadata !== undefined && localHash !== undefined
  const {uiState, action} = reconcile(permissionForReconcile, subscriptionPresent, handoffState, {
    notSubscribedConfirmed,
  })

  const nextCache: ReconcileSweepCache = {
    permission,
    subscriptionPresent,
    handoffState,
    keyVersion: currentKeyVersion,
    lastActionAt: now(),
  }

  return {skipped: false, action, uiState, nextCache}
}
