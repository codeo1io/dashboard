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
 * PushSubscriptionListResponse mirrors the Gateway's
 * `GET /operator/push/subscriptions` response since upstream PR #631:
 * `{subscriptions: [...]}` with epoch-millisecond numeric timestamps. This
 * fork's parse is shape-tolerant (rm-873): the list wire is PRIMARY; the
 * pre-#631 flat single-record wire (string ISO dates) stays as a graceful
 * fallback, wrapped as a one-entry list. The fork DTO keeps ISO-8601 string
 * dates — epoch-millisecond timestamps are normalized at the parse seam —
 * so every downstream consumer's type is unchanged.
 *
 * Error messages are fixed strings — never echo or interpolate input.
 * Extra fields are ignored (permissive structural subtyping).
 */

import type {Result} from '../../result.ts'

import {err, ok} from '../../result.ts'

// Practical caps: keyVersion strings and endpoint hashes are well under 512
// chars; ISO 8601 dates are at most ~35 chars.
const MAX_ID_LENGTH = 512
const MAX_DATE_LENGTH = 128
const ENDPOINT_HASH_LENGTH = 64

/** Largest representable JS Date instant in epoch-ms (rm-873 list-wire bound). */
const MAX_EPOCH_MS = 8_640_000_000_000_000

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

const VALID_PUSH_HANDOFF_STATES: ReadonlySet<string> = new Set([
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
 * Safe subscription metadata, mirroring one entry of the Gateway's
 * `GET /operator/push/subscriptions` response. Opaque endpoint hash only —
 * NEVER the raw endpoint, p256dh, or auth subscription keys.
 *
 * Dates are ISO-8601 strings in the fork DTO (stable consumer contract):
 * the list wire carries epoch-millisecond numbers, normalized to ISO at the
 * parse seam by `parsePushSubscriptionListResponse`.
 */
export interface PushSubscriptionMetadata {
  readonly endpointHash: string
  readonly keyVersion: string
  readonly active: boolean
  readonly createdAt: string
  readonly updatedAt: string
  readonly inactiveReason?: PushInactiveReason
}

/** Canonical response shape for GET /operator/push/subscriptions. */
export interface PushSubscriptionListResponse {
  readonly subscriptions: readonly PushSubscriptionMetadata[]
}

/**
 * Coarse inactive reasons the Gateway reports on a subscription entry.
 * Allowlist-gated on the list wire (upstream #631 parity): an unknown reason
 * is dropped from the entry, never a rejection of the entry itself.
 */
export type PushInactiveReason = 'unsubscribed' | 'dead' | 'revoked' | 'session-revoked'

const VALID_PUSH_INACTIVE_REASONS: ReadonlySet<string> = new Set([
  'unsubscribed',
  'dead',
  'revoked',
  'session-revoked',
])

/** Epoch-ms guard: finite, non-negative, inside the JS Date representable range. */
function isEpochMs(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_EPOCH_MS
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

  if (typeof candidate.createdAt !== 'string' || candidate.createdAt.length > MAX_DATE_LENGTH) {
    return false
  }

  if (typeof candidate.updatedAt !== 'string' || candidate.updatedAt.length > MAX_DATE_LENGTH) {
    return false
  }

  // inactiveReason is optional — if present must be a length-capped string
  if (
    'inactiveReason' in candidate &&
    (typeof candidate.inactiveReason !== 'string' || candidate.inactiveReason.length > MAX_ID_LENGTH)
  ) {
    return false
  }

  return true
}

/**
 * Parse an unknown value as PushSubscriptionMetadata — the pre-#631 flat
 * single-record wire (string ISO dates, length-capped free-form
 * inactiveReason).
 *
 * DEPRECATED as a direct wire parse (rm-873): retained as the graceful
 * fallback inside {@link parsePushSubscriptionListResponse} for gateways
 * still serving the flat record. Remove together with the fallback once a
 * live probe proves the deployed Gateway serves the list wire.
 */
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

/** Parse one list-wire entry; `undefined` when any field is invalid (entry dropped). */
function parsePushSubscriptionListEntry(value: unknown): PushSubscriptionMetadata | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined
  }

  const candidate = value as Record<string, unknown>

  if (
    typeof candidate.endpointHash !== 'string' ||
    candidate.endpointHash.length !== ENDPOINT_HASH_LENGTH
  ) {
    return undefined
  }

  if (typeof candidate.keyVersion !== 'string' || candidate.keyVersion.length > MAX_ID_LENGTH) {
    return undefined
  }

  if (typeof candidate.active !== 'boolean') {
    return undefined
  }

  if (!isEpochMs(candidate.createdAt) || !isEpochMs(candidate.updatedAt)) {
    return undefined
  }

  // Closed DTO — copy only declared fields; never spread input. An unknown
  // inactiveReason is dropped rather than rejecting the entry (upstream
  // #631 parity).
  const metadata: PushSubscriptionMetadata = {
    endpointHash: candidate.endpointHash,
    keyVersion: candidate.keyVersion,
    active: candidate.active,
    createdAt: new Date(candidate.createdAt).toISOString(),
    updatedAt: new Date(candidate.updatedAt).toISOString(),
    ...(typeof candidate.inactiveReason === 'string' && VALID_PUSH_INACTIVE_REASONS.has(candidate.inactiveReason)
      ? {inactiveReason: candidate.inactiveReason as PushInactiveReason}
      : {}),
  }

  return metadata
}

/**
 * Parse an unknown value as the Gateway's subscription list (rm-873).
 *
 * PRIMARY: the #631 list wire `{subscriptions: [...]}` with epoch-ms
 * timestamps — invalid entries are dropped (per-entry validation, never a
 * whole-list rejection).
 *
 * FALLBACK (deprecated): a value that is not a list-shaped object but parses
 * as the pre-#631 flat metadata record (string ISO dates) is wrapped as a
 * one-entry list — a not-yet-upgraded gateway keeps working. Remove the
 * fallback once a live probe proves the deployed gateway serves the list
 * wire (probe-gated follow-up; the deprecation note on
 * `parsePushSubscriptionMetadata` tracks the same removal).
 */
export function parsePushSubscriptionListResponse(input: unknown): Result<PushSubscriptionListResponse, Error> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return err(new Error('invalid push subscription list shape'))
  }

  const candidate = input as Record<string, unknown>

  if (Array.isArray(candidate.subscriptions)) {
    const valid: PushSubscriptionMetadata[] = []
    for (const entry of candidate.subscriptions) {
      const parsed = parsePushSubscriptionListEntry(entry)
      if (parsed !== undefined) valid.push(parsed)
    }

    return ok({subscriptions: valid})
  }

  const flat = parsePushSubscriptionMetadata(input)
  if (flat.success) {
    return ok({subscriptions: [flat.data]})
  }

  return err(new Error('invalid push subscription list shape'))
}
