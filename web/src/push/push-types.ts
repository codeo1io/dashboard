/**
 * Web-local copy of the push DTOs and the HandoffState string set.
 *
 * This is duplicated here (rather than imported from
 * `src/gateway/operator-contract/push.ts`) because `web/` is the browser SPA
 * bundle and must never import from `src/` (the server) — the Docker builder
 * stage only copies `web/` into the image, so a `src/` import fails to
 * resolve at build time. Keep this in sync with the vendored copy; the
 * parity test in `push-types.test.ts` pins field names and the HandoffState
 * value set.
 */

/**
 * Canonical response shape for GET /operator/push/vapid-key.
 * EXACTLY these two fields — the Gateway returns no other fields.
 */
export interface VapidKeyResponse {
  readonly publicKey: string
  readonly keyVersion: string
}

/**
 * Safe subscription metadata, mirroring the Gateway's
 * `GET /operator/push/subscriptions` response. Opaque endpoint hash only —
 * NEVER the raw endpoint, p256dh, or auth subscription keys.
 */
export interface PushSubscriptionMetadata {
  readonly endpointHash: string
  readonly keyVersion: string
  readonly active: boolean
  readonly createdAt: string
  readonly updatedAt: string
  readonly inactiveReason?: string
}

/**
 * Client-derived push handoff state. NOT a wire field — computed from
 * PushSubscriptionMetadata plus local browser state (permission, local
 * PushSubscription presence/keyVersion).
 */
export type HandoffState = 'push_disabled' | 'not_subscribed' | 'subscribed' | 'stale_key' | 'inactive'

/**
 * Coarse gateway-observed push health on the operator session (contract
 * 1.10.0, agent #1788): `ready` (observed working within the last hour —
 * observed readiness, NOT guaranteed delivery), `degraded` (startup
 * self-test or a recent delivery observation failed), `unknown`
 * (configured but nothing fresh observed — never read as healthy).
 * Web-local duplicate of the vendored `OPERATOR_PUSH_HEALTH_STATUSES`; the
 * equality is pinned by the server-side conformance suite.
 */
export const PUSH_HEALTH_STATUSES = ['ready', 'degraded', 'unknown'] as const
export type PushHealthStatus = (typeof PUSH_HEALTH_STATUSES)[number]

/** Session push-health shape as carried on GET /operator/session (contract 1.10.0). */
export interface SessionPushHealth {
  readonly status: PushHealthStatus
}

/**
 * The closed set of events that produce an operator push notification
 * (contract 1.10.0, agent #1787). Web-local duplicate of the vendored
 * `OPERATOR_PUSH_TRIGGER_KINDS`; equality pinned by the conformance suite.
 */
export const PUSH_TRIGGER_KINDS = ['approval', 'question', 'run_failed'] as const
export type PushTriggerKind = (typeof PUSH_TRIGGER_KINDS)[number]

export const VALID_HANDOFF_STATES: ReadonlySet<string> = new Set([
  'push_disabled',
  'not_subscribed',
  'subscribed',
  'stale_key',
  'inactive',
])
