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

export const VALID_HANDOFF_STATES: ReadonlySet<string> = new Set([
  'push_disabled',
  'not_subscribed',
  'subscribed',
  'stale_key',
  'inactive',
])

// ---------------------------------------------------------------------------
// Operator contract 1.10.0 (fro-bot/agent #1787 + #1788, v0.120.0) — web-local
// mirror of the gateway's push vocabulary. Same duplication rule as the header:
// never import from `src/`; the vendored contract (operator-contract/push.ts +
// responses.ts) holds the server twin, and the conformance test holds both to
// the gateway's exact order and spelling.
// ---------------------------------------------------------------------------

/**
 * The trigger kinds the gateway stamps into a push payload's `data.type`
 * (gateway export: OPERATOR_PUSH_TRIGGER_KINDS).
 */
export type OperatorPushTriggerKind = 'approval' | 'question' | 'run_failed'

export const OPERATOR_PUSH_TRIGGER_KINDS: readonly OperatorPushTriggerKind[] = ['approval', 'question', 'run_failed']

/**
 * Push health on the authenticated operator session (gateway export:
 * OperatorPushHealth) — 'ready' (subscription live), 'degraded' (subscription
 * present but failing), 'unknown' (push not configured). Absent entirely when
 * the gateway has no push surface.
 */
export type OperatorPushHealthStatus = 'ready' | 'degraded' | 'unknown'

export const OPERATOR_PUSH_HEALTH_STATUSES: readonly OperatorPushHealthStatus[] = ['ready', 'degraded', 'unknown']
