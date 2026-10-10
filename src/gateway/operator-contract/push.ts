/**
 * Push notification DTOs and parse helpers for the operator contract.
 *
 * VapidKeyResponse mirrors the Gateway's `GET /operator/push/vapid-key`
 * response: `{publicKey, keyVersion}` only — there is NO `contractVersion`
 * field on this response.
 *
 * PushSubscriptionMetadata mirrors the Gateway's safe-metadata response from
 * `GET /operator/push/subscriptions`: an opaque endpoint hash, timestamps,
 * key version, active state, and an optional coarse inactive reason. The
 * real `endpoint`/`p256dh`/`auth` subscription keys are never included.
 *
 * PushHandoffState is NOT a wire field — it is derived client-side from
 * PushSubscriptionMetadata plus local browser state (permission, local
 * PushSubscription presence/keyVersion). It is defined here so the vendored
 * contract and the web-side duplicate (web/src/push/push-types.ts) share one
 * canonical string set.
 *
 * Error messages are fixed strings — never echo or interpolate input.
 * Extra fields are ignored (permissive structural subtyping).
 */

import type {Result} from '../../result.ts'

import {err, ok} from '../../result.ts'

// Practical caps: keyVersion strings and endpoint hashes are well under 512
// chars; ISO 8601 dates are at most ~35 chars.
const MAX_ID_LENGTH = 512
const MAX_EPOCH_MS = 1e13
const ENDPOINT_HASH_LENGTH = 64

/**
 * Canonical response shape for GET /operator/push/vapid-key.
 * EXACTLY these two fields — the Gateway returns no other fields.
 */
export interface VapidKeyResponse {
  readonly publicKey: string
  readonly keyVersion: string
}

function hasValidVapidKeyShape(value: unknown): value is VapidKeyResponse {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const candidate = value as Record<string, unknown>

  if (typeof candidate.publicKey !== 'string' || candidate.publicKey.length === 0) {
    return false
  }

  if (typeof candidate.keyVersion !== 'string' || candidate.keyVersion.length === 0) {
    return false
  }

  return true
}

/** Parse an unknown value as VapidKeyResponse. Returns err with a fixed reason string on failure. */
export function parseVapidKeyResponse(input: unknown): Result<VapidKeyResponse, Error> {
  if (hasValidVapidKeyShape(input) === false) {
    return err(new Error('invalid vapid key response shape'))
  }

  // Closed DTO — copy only declared fields; never spread input.
  const response: VapidKeyResponse = {
    publicKey: input.publicKey,
    keyVersion: input.keyVersion,
  }

  return ok(response)
}

/**
 * Client-derived push handoff state. NOT a wire field — computed from
 * PushSubscriptionMetadata plus local browser state. Defined here as the
 * single canonical string set shared between the vendored contract and the
 * web-side duplicate.
 */
export type PushHandoffState = 'push_disabled' | 'not_subscribed' | 'subscribed' | 'stale_key' | 'inactive'

export const VALID_PUSH_HANDOFF_STATES: ReadonlySet<string> = new Set([
  'push_disabled',
  'not_subscribed',
  'subscribed',
  'stale_key',
  'inactive',
])

/** Parse an unknown value as PushHandoffState. Returns err with a fixed reason string on failure. */
export function parsePushHandoffState(input: unknown): Result<PushHandoffState, Error> {
  if (typeof input !== 'string' || !VALID_PUSH_HANDOFF_STATES.has(input)) {
    return err(new Error('invalid push handoff state'))
  }

  return ok(input as PushHandoffState)
}

/**
 * rm-693: coarse, non-oracle reasons a subscription record became inactive,
 * vendored from the gateway contract's `OperatorPushInactiveReason`
 * (agent responses.ts — present since the 1.6.0-serving gateway line and
 * carried unchanged through 1.8.0; verified at tags v0.114.1/v0.118.3).
 * Distinct from the client-derived `stale_key` handoff state: these are
 * SERVER-side lifecycle reasons; `stale_key` is a key-version drift the
 * client can detect and recover from by resubscribing.
 */
export type OperatorPushInactiveReason = 'unsubscribed' | 'dead' | 'revoked' | 'session-revoked'

/**
 * Exact membership of the inactive-reason ladder — exported so coverage
 * tests can pin it at runtime (rm-833 vocabulary conformance suite).
 */
export const OPERATOR_PUSH_INACTIVE_REASONS: ReadonlySet<string> = new Set([
  'unsubscribed',
  'dead',
  'revoked',
  'session-revoked',
])

/** Parse an unknown value as OperatorPushInactiveReason. Returns err with a fixed reason string on failure. */
export function parseOperatorPushInactiveReason(input: unknown): Result<OperatorPushInactiveReason, Error> {
  if (typeof input !== 'string' || !OPERATOR_PUSH_INACTIVE_REASONS.has(input)) {
    return err(new Error('invalid push inactive reason'))
  }

  return ok(input as OperatorPushInactiveReason)
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
  readonly createdAt: number
  readonly updatedAt: number
  readonly inactiveReason?: OperatorPushInactiveReason
}

function hasValidPushSubscriptionMetadataShape(value: unknown): value is PushSubscriptionMetadata {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const candidate = value as Record<string, unknown>

  if (
    typeof candidate.endpointHash !== 'string' ||
    candidate.endpointHash.length !== ENDPOINT_HASH_LENGTH
  ) {
    return false
  }

  if (typeof candidate.keyVersion !== 'string' || candidate.keyVersion.length > MAX_ID_LENGTH) {
    return false
  }

  if (typeof candidate.active !== 'boolean') {
    return false
  }

  // Wire truth (verified at gateway tags v0.114.1 and v0.118.1/v0.118.3):
  // createdAt/updatedAt are epoch-millisecond NUMBERS. The previous string
  // typing rejected every real gateway payload fail-closed; fixed 2026-10-09
  // (run 471d3910531e implement, rm-693 discovered correction).
  if (
    typeof candidate.createdAt !== 'number' ||
    !Number.isSafeInteger(candidate.createdAt) ||
    candidate.createdAt < 0 ||
    candidate.createdAt > MAX_EPOCH_MS
  ) {
    return false
  }

  if (
    typeof candidate.updatedAt !== 'number' ||
    !Number.isSafeInteger(candidate.updatedAt) ||
    candidate.updatedAt < 0 ||
    candidate.updatedAt > MAX_EPOCH_MS
  ) {
    return false
  }

  // inactiveReason is optional — if present must be a member of the vendored
  // ladder (rm-693); anything else fails closed so no fabricated state ever
  // renders against an older or future gateway.
  if (
    'inactiveReason' in candidate &&
    (typeof candidate.inactiveReason !== 'string' ||
      !OPERATOR_PUSH_INACTIVE_REASONS.has(candidate.inactiveReason))
  ) {
    return false
  }

  return true
}

/** Parse an unknown value as PushSubscriptionMetadata. Returns err with a fixed reason string on failure. */
export function parsePushSubscriptionMetadata(input: unknown): Result<PushSubscriptionMetadata, Error> {
  if (hasValidPushSubscriptionMetadataShape(input) === false) {
    return err(new Error('invalid push subscription metadata shape'))
  }

  // Closed DTO — copy only declared fields; never spread input.
  const metadata: PushSubscriptionMetadata = {
    endpointHash: input.endpointHash,
    keyVersion: input.keyVersion,
    active: input.active,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    ...('inactiveReason' in input ? {inactiveReason: input.inactiveReason} : {}),
  }

  return ok(metadata)
}
