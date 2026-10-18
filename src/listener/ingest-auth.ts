/**
 * HMAC signature verification for the operator listener ingest path.
 *
 * See docs/contracts/operator-listener-channel.md — signature scheme.
 * All error messages are generic ('unauthorized') — never echo body/signature.
 */
import type {Result} from '../result.ts'
import {Buffer} from 'node:buffer'
import {createHmac, timingSafeEqual} from 'node:crypto'
import {err, ok} from '../result.ts'

export interface IngestAuthInput {
  readonly key: string
  readonly rawBody: string
  readonly timestampHeader: string | null
  readonly signatureHeader: string | null
  readonly nowSeconds: number
  readonly windowSeconds?: number
}

const SIGNATURE_RE = /^sha256=([\da-f]+)$/i
const DEFAULT_WINDOW_SECONDS = 300

/**
 * Verifies the `x-listener-timestamp` / `x-listener-signature` HMAC pair over
 * the raw request body. Constant-time comparison via `timingSafeEqual`
 * (length-guarded to avoid a throw on mismatched lengths).
 */
export function verifyIngestSignature(input: IngestAuthInput): Result<true, Error> {
  const windowSeconds = input.windowSeconds ?? DEFAULT_WINDOW_SECONDS

  if (input.timestampHeader === null || input.signatureHeader === null) {
    return err(new Error('unauthorized'))
  }

  if (!/^\d+$/.test(input.timestampHeader)) {
    return err(new Error('unauthorized'))
  }
  const timestamp = Number.parseInt(input.timestampHeader, 10)
  if (!Number.isSafeInteger(timestamp)) {
    return err(new Error('unauthorized'))
  }

  if (Math.abs(input.nowSeconds - timestamp) > windowSeconds) {
    return err(new Error('unauthorized'))
  }

  const sigMatch = SIGNATURE_RE.exec(input.signatureHeader)
  if (sigMatch === null) {
    return err(new Error('unauthorized'))
  }
  const providedHex = sigMatch[1] ?? ''

  const expectedHex = createHmac('sha256', input.key).update(`${input.timestampHeader}.${input.rawBody}`).digest('hex')

  const expectedBuf = Buffer.from(expectedHex, 'hex')
  const providedBuf = Buffer.from(providedHex, 'hex')

  if (expectedBuf.length !== providedBuf.length) {
    return err(new Error('unauthorized'))
  }
  if (!timingSafeEqual(expectedBuf, providedBuf)) {
    return err(new Error('unauthorized'))
  }

  return ok(true)
}

// ---------------------------------------------------------------------------
// Bounded seen-delivery cache (rm-2008).
//
// The HMAC above proves authenticity and the timestamp window bounds stale
// replays, but nothing distinguishes a genuine redelivery from a replayed
// byte-identical POST inside the window. This cache does — but ONLY for a
// delivery whose signature already verified: callers must run the replay
// check after `verifyIngestSignature` succeeds, so a caller without the key
// can never poison an entry and deny a genuine delivery (cache poisoning is
// the reason the check is not standalone).
//
// Semantics: a delivery is marked seen the moment its signature verifies —
// even if the body then fails validation; a producer's next genuine POST is
// freshly signed (fresh timestamp, and a fresh delivery GUID when it sends
// one), so it lands on a new key by construction. Entries live for
// `windowSeconds` (default = the HMAC window's scale): after expiry the same
// delivery re-admits, matching genuine late redelivery. The cache is
// bounded, in-memory and process-local per server instance — a restart or
// re-mount clears it (a replay across a restart is still bounded by the HMAC
// window itself) and nothing persists to disk.
// ---------------------------------------------------------------------------

/** Live-entry cap. The listener is single-operator and low-volume; 1024
 * concurrent delivery keys is far past any genuine redelivery horizon and
 * bounds worst-case memory (~100 bytes/entry). */
export const DEFAULT_REPLAY_CACHE_CAP = 1024

/** Delivery GUIDs are truncated to this length before keying — defensive
 * bound against a hostile overlong header, not a GitHub-shape expectation. */
const GUID_KEY_MAX_LENGTH = 128

export interface IngestReplayGuardOptions {
  /** Max live entries (default 1024). At the cap, expired entries are swept
   * first; only if live entries alone exceed the cap is the
   * oldest-inserted key evicted. */
  readonly cap?: number
  /** Entry lifetime in seconds (default: `DEFAULT_WINDOW_SECONDS` — the
   * same scale the HMAC timestamp check enforces). */
  readonly windowSeconds?: number
}

export interface IngestReplayGuardInput {
  /** `x-github-delivery` GUID when the producer sent one — preferred key. */
  readonly deliveryGuid: string | null
  readonly timestampHeader: string | null
  readonly rawBody: string
  readonly key: string
  readonly nowSeconds: number
}

export interface IngestReplayGuard {
  /** True = byte-identical redelivery of an already-VERIFIED delivery inside
   * the window — reject with 401 before the store. False = first sight (or
   * re-admission after expiry): the delivery is recorded and admitted. */
  isReplay(input: IngestReplayGuardInput): boolean
}

/**
 * Cache key for one delivery. The delivery GUID when present (unique per
 * delivery, so a fresh GUID is a new delivery by definition); else the
 * HMAC digest of the signed message plus the timestamp bucket — a
 * byte-identical replay (same timestamp header, same body) lands on the
 * same key, a re-signed fresh timestamp does not. The `g:`/`h:` prefixes
 * keep GUID-shaped and digest-shaped keys from ever colliding.
 */
export function seenDeliveryKey(input: IngestReplayGuardInput): string {
  const guid = input.deliveryGuid?.trim().toLowerCase() ?? ''
  if (guid !== '') return `g:${guid.slice(0, GUID_KEY_MAX_LENGTH)}`
  const digest = createHmac('sha256', input.key)
    .update(`${input.timestampHeader}.${input.rawBody}`)
    .digest('hex')
  return `h:${digest}:${input.timestampHeader ?? 'none'}`
}

export function createIngestReplayGuard(
  options?: IngestReplayGuardOptions,
): IngestReplayGuard {
  const cap = Math.max(1, options?.cap ?? DEFAULT_REPLAY_CACHE_CAP)
  const windowSeconds = options?.windowSeconds ?? DEFAULT_WINDOW_SECONDS
  const seen = new Map<string, number>() // key -> admission time + window
  return {
    isReplay(input) {
      const key = seenDeliveryKey(input)
      const expiresAt = seen.get(key)
      if (expiresAt !== undefined) {
        if (input.nowSeconds < expiresAt) return true
        seen.delete(key) // expired — a genuine late redelivery re-admits
      }
      seen.set(key, input.nowSeconds + windowSeconds)
      if (seen.size > cap) {
        // Sweep expired entries first so a burst of expired keys never evicts
        // a live one; only then fall back to oldest-inserted eviction.
        for (const [k, expires] of seen) {
          if (input.nowSeconds >= expires) seen.delete(k)
        }
        for (const oldest of seen.keys()) {
          if (seen.size <= cap) break
          seen.delete(oldest)
        }
      }
      return false
    },
  }
}
