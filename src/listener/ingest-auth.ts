/**
 * HMAC signature verification for the operator listener ingest path.
 *
 * See docs/contracts/operator-listener-channel.md — signature scheme.
 * All error messages are generic ('unauthorized') — never echo body/signature.
 */
import type {Result} from '../result.ts'
import {Buffer} from 'node:buffer'
import {createHash, createHmac, timingSafeEqual} from 'node:crypto'
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
 * The authenticated-delivery variant granted by this module (rm-215): the
 * only ingest auth scheme today. A closed literal type so the store column
 * and the wire DTO share one vocabulary; new schemes mint new literals.
 */
export type IngestVariant = 'hmac-sha256-v1'

/**
 * Success payload of `verifyIngestSignature` (rm-215): delivery evidence for
 * persistence — which scheme authenticated the delivery, plus a plain SHA-256
 * digest of the exact body bytes that were signature-verified. The digest is
 * unkeyed evidence, not an auth artifact; verification semantics (timing-safe
 * compare, fixed content-free error reasons) are unchanged.
 */
export interface IngestAuthSuccess {
  readonly variant: IngestVariant
  readonly rawDigest: string
}

/**
 * Verifies the `x-listener-timestamp` / `x-listener-signature` HMAC pair over
 * the raw request body. Constant-time comparison via `timingSafeEqual`
 * (length-guarded to avoid a throw on mismatched lengths).
 */
export function verifyIngestSignature(input: IngestAuthInput): Result<IngestAuthSuccess, Error> {
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

  return ok({
    variant: 'hmac-sha256-v1',
    rawDigest: createHash('sha256').update(input.rawBody, 'utf8').digest('hex'),
  })
}
