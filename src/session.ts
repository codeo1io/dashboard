/**
 * Signed-cookie session management.
 *
 * Cookie format: `<base64url(json)>.<base64url(hmac-sha256)>`
 *
 * The HMAC is computed over the base64url-encoded JSON payload, so the `exp`
 * field is always covered by the signature. Tampering with either the payload
 * or the signature is detected via `timingSafeEqual`.
 *
 * Security invariants:
 * - Key MUST be ≥32 bytes (256-bit). Constructor throws on weaker keys.
 * - `exp` is checked AFTER signature verification (fail-closed order).
 * - Comparison uses `timingSafeEqual` to prevent timing attacks.
 * - rm-2063: every cookie carries a unique per-signing session id (`jti`)
 *   inside the signed payload; a durable revocation record is consulted in
 *   `verify` so a stolen operator cookie can be killed mid-TTL without
 *   rotating the signing key. Legacy no-`jti` cookies are rejected (one-time
 *   re-login at deploy).
 */
import {Buffer} from 'node:buffer'
import {createHmac, randomBytes, timingSafeEqual} from 'node:crypto'
import {readFileSync, statSync} from 'node:fs'
import {readFile} from 'node:fs/promises'
import process from 'node:process'
import {logger} from './logger.ts'

/** Verified session payload returned by `SessionManager.verify`. */
export interface SessionPayload {
  readonly login: string
  /** Unique per-signing session id — the revocation key (rm-2063). */
  readonly jti: string
}

/** Raw cookie payload stored in the signed cookie. */
interface CookiePayload {
  jti: string
  login: string
  exp: number // Unix epoch seconds
}

/** Session duration: 24 hours in seconds. */
const SESSION_TTL_SECONDS = 24 * 60 * 60

/** Session-id entropy (rm-2063): 16 random bytes per signing. */
const SESSION_ID_BYTES = 16

/** Exact shape every minted session id has: 32 lowercase hex chars. */
export const SESSION_ID_RE = /^[0-9a-f]{32}$/

/** True when `value` has the exact session-id shape `sign()` mints. */
export function isSessionId(value: unknown): value is string {
  return typeof value === 'string' && SESSION_ID_RE.test(value)
}

/**
 * Durable record of revoked session ids (rm-2063).
 *
 * Contract (fail-closed):
 * - `isRevoked(jti)` MUST be synchronous — it runs on the auth hot path.
 * - A definitive revoked verdict rejects the session in `SessionManager.verify`.
 * - A record that exists but cannot be trusted (unreadable, corrupt, wrong
 *   shape) MUST report revoked for every id — a broken denylist must never
 *   silently re-admit the very sessions it was written to kill.
 * - An ABSENT record (no file) is not an error: no revocations have ever been
 *   recorded, so nothing is revoked.
 */
export interface SessionRevocationStore {
  isRevoked: (jti: string) => boolean
}

/** One revocation entry inside the record file. */
export interface SessionRevocationRecord {
  jti: string
  login: string
  /** Unix epoch seconds the revocation was recorded. */
  revokedAt: number
  /** Unix epoch seconds the revoked session expires; entries past it are prunable. */
  expiresAt: number | null
}

/** Revocation record file shape (single source for reader and writer). */
const REVOCATIONS_FILE_VERSION = 1

/** Env var overriding the revocation record path. */
export const SESSION_REVOCATIONS_FILE_ENV = 'DASHBOARD_SESSION_REVOCATIONS_FILE'

/** Default record path — sibling of the loadCookieKey default `/data/cookie.key`. */
const SESSION_REVOCATIONS_FILE_DEFAULT = '/data/session-revocations.json'

/**
 * Manages signed session cookies using HMAC-SHA256.
 *
 * Cookie format: `<base64url(json)>.<base64url(hmac)>`
 * The HMAC covers the base64url-encoded payload string (not the raw JSON),
 * ensuring the `exp` field is always within the signed scope.
 */
export class SessionManager {
  private readonly key: Buffer
  private readonly revocationStore: SessionRevocationStore | undefined

  constructor(key: Buffer, revocationStore?: SessionRevocationStore) {
    if (key.length < 32) {
      throw new Error(`Cookie signing key must be at least 32 bytes (256-bit); got ${key.length} bytes`)
    }
    this.key = key
    this.revocationStore = revocationStore
  }

  /**
   * Signs a session for the given login.
   * Returns a cookie value string: `<base64url(payload)>.<base64url(hmac)>`
   * Each signing mints a fresh unique `jti` (rm-2063) covered by the signature.
   */
  sign(login: string): string {
    const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
    const jti = randomBytes(SESSION_ID_BYTES).toString('hex')
    const payload: CookiePayload = {jti, login, exp}
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const hmac = this.computeHmac(payloadB64)
    return `${payloadB64}.${hmac}`
  }

  /**
   * Verifies a cookie value.
   * Returns the session payload if valid, or `null` if invalid/expired/tampered.
   *
   * Verification order (fail-closed):
   * 1. Parse structure (must have exactly one dot separator)
   * 2. Recompute HMAC and compare with `timingSafeEqual`
   * 3. Decode and parse JSON payload
   * 4. Check expiry
   */
  verify(cookieValue: string): SessionPayload | null {
    try {
      // FIX #6: Enforce canonical 2-part structure (exactly one dot separator).
      const parts = cookieValue.split('.')
      if (parts.length !== 2) return null

      const payloadB64 = parts[0] ?? ''
      const sigB64 = parts[1] ?? ''

      if (payloadB64.length === 0 || sigB64.length === 0) return null

      // Validate both parts are strict base64url (no padding, no non-base64url chars)
      const BASE64URL_RE = /^[\w-]+$/
      if (!BASE64URL_RE.test(payloadB64) || !BASE64URL_RE.test(sigB64)) return null

      // Recompute HMAC and compare (timing-safe)
      const expectedSig = this.computeHmac(payloadB64)
      const expectedBuf = Buffer.from(expectedSig, 'base64url')
      const actualBuf = Buffer.from(sigB64, 'base64url')

      // Length check before timingSafeEqual (different lengths = definitely tampered)
      if (expectedBuf.length !== actualBuf.length) return null
      if (!timingSafeEqual(expectedBuf, actualBuf)) return null

      // Decode payload
      const jsonStr = Buffer.from(payloadB64, 'base64url').toString('utf8')
      const payload = JSON.parse(jsonStr) as unknown

      if (!isCookiePayload(payload)) return null

      // Check expiry
      const nowSeconds = Math.floor(Date.now() / 1000)
      if (payload.exp <= nowSeconds) return null

      // rm-2063: revocation check — fail-closed, AFTER signature+shape+expiry
      // so only cryptographically valid, unexpired sessions pay for it. A
      // poisoned (unreadable/corrupt) store reports revoked for every id and
      // therefore denies all sessions until the record is fixed or removed.
      if (this.revocationStore !== undefined && this.revocationStore.isRevoked(payload.jti)) {
        return null
      }

      return {login: payload.login, jti: payload.jti}
    } catch {
      return null
    }
  }

  private computeHmac(data: string): string {
    return createHmac('sha256', this.key).update(data).digest('base64url')
  }
}

function isCookiePayload(value: unknown): value is CookiePayload {
  if (value === null || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  // rm-2063: `jti` is required — pre-kill-switch cookies ({login, exp} only)
  // fail this check and force a single re-login at deploy.
  return typeof obj.login === 'string' && typeof obj.exp === 'number' && isSessionId(obj.jti)
}

/**
 * Validates a parsed revocation record file (rm-2063). Returns the records or
 * null when the value is not the exact `{version:1, revocations:[…]}` shape —
 * callers decide the fail-closed consequence (reader poisons, writer refuses).
 */
export function parseSessionRevocations(value: unknown): SessionRevocationRecord[] | null {
  if (value === null || typeof value !== 'object') return null
  const obj = value as Record<string, unknown>
  if (obj.version !== REVOCATIONS_FILE_VERSION || !Array.isArray(obj.revocations)) return null
  const records: SessionRevocationRecord[] = []
  for (const entry of obj.revocations) {
    if (entry === null || typeof entry !== 'object') return null
    const rec = entry as Record<string, unknown>
    if (
      !isSessionId(rec.jti) ||
      typeof rec.login !== 'string' ||
      typeof rec.revokedAt !== 'number' ||
      !(rec.expiresAt === null || typeof rec.expiresAt === 'number')
    ) {
      return null
    }
    records.push({jti: rec.jti, login: rec.login, revokedAt: rec.revokedAt, expiresAt: rec.expiresAt})
  }
  return records
}

/** Serializes revocation records to the canonical file text (single shape). */
export function serializeSessionRevocations(records: readonly SessionRevocationRecord[]): string {
  return `${JSON.stringify({version: REVOCATIONS_FILE_VERSION, revocations: records}, null, 2)}\n`
}

/**
 * File-backed `SessionRevocationStore` (rm-2063).
 *
 * Reads the record file lazily and caches by (mtimeMs, size) — a `statSync`
 * per `isRevoked` call (one syscall on the auth hot path, fine at this
 * dashboard's traffic) plus a full read only when the file changed, so an
 * operator-side `scripts/session-revoke.ts` write is picked up by the running
 * server WITHOUT a restart, and the denylist trivially outlives one (the file
 * is re-read at next boot).
 *
 * Fail-closed matrix:
 * - file absent (ENOENT)            → empty denylist, nothing revoked
 * - file exists but unreadable      → POISONED: every session denied (logged once)
 * - file present but corrupt/mis-shaped → POISONED: every session denied (logged once)
 * Poisoning clears as soon as a readable, well-shaped file replaces it.
 */
export class FileSessionRevocationStore implements SessionRevocationStore {
  private readonly filePath: string
  /** Cache key of the last successfully parsed file ('absent' when ENOENT). */
  private stateKey: string | null = null
  private revokedIds: ReadonlySet<string> = new Set()
  private poisoned = false
  private lastErrorLogKey: string | null = null

  constructor(filePath: string) {
    this.filePath = filePath
  }

  isRevoked(jti: string): boolean {
    this.refresh()
    return this.poisoned || this.revokedIds.has(jti)
  }

  private refresh(): void {
    let stat: ReturnType<typeof statSync>
    try {
      stat = statSync(this.filePath)
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code ?? 'unknown'
      if (code === 'ENOENT') {
        // Absent record = no revocations ever recorded. Not an error.
        if (this.stateKey !== 'absent') {
          this.stateKey = 'absent'
          this.poisoned = false
          this.revokedIds = new Set()
        }
        return
      }
      this.poison(`stat failed (${code})`)
      return
    }

    const key = `${stat.mtimeMs}:${stat.size}`
    if (key === this.stateKey) return

    let raw: string
    try {
      raw = readFileSync(this.filePath, 'utf8')
    } catch (error) {
      this.poison(`read failed (${(error as NodeJS.ErrnoException).code ?? 'unknown'})`)
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      this.poison('is not valid JSON')
      return
    }

    const records = parseSessionRevocations(parsed)
    if (records === null) {
      this.poison('has an invalid record shape')
      return
    }

    this.revokedIds = new Set(records.map(record => record.jti))
    this.poisoned = false
    this.stateKey = key
  }

  /** Marks the store poisoned and logs the reason once per distinct failure. */
  private poison(reason: string): void {
    this.poisoned = true
    this.revokedIds = new Set()
    const logKey = `${this.filePath}:${reason}`
    if (this.lastErrorLogKey !== logKey) {
      logger.error(
        `Session revocation record ${reason}; failing closed — every dashboard session is denied until the file is fixed or removed`,
        {file: this.filePath},
      )
      this.lastErrorLogKey = logKey
    }
  }
}

/**
 * Loads the session-revocation store (rm-2063).
 *
 * Path priority:
 * 1. `DASHBOARD_SESSION_REVOCATIONS_FILE` env var
 * 2. `/data/session-revocations.json` (sibling of the cookie-key default)
 *
 * The store is lazy — constructing it never touches the filesystem, and an
 * absent file simply means an empty denylist.
 */
export function loadSessionRevocationStore(): SessionRevocationStore {
  const override = process.env[SESSION_REVOCATIONS_FILE_ENV]
  return new FileSessionRevocationStore(
    typeof override === 'string' && override.length > 0 ? override : SESSION_REVOCATIONS_FILE_DEFAULT,
  )
}

/**
 * Loads the cookie signing key from env or file.
 *
 * Priority:
 * 1. `DASHBOARD_COOKIE_KEY` env var (hex or base64 encoded, decoded to raw bytes)
 * 2. File at `DASHBOARD_COOKIE_KEY_FILE` env var (or `/data/cookie.key`)
 *
 * Throws if the resolved key is <32 bytes (fail-closed).
 */
export async function loadCookieKey(): Promise<Buffer> {
  const envKey = process.env.DASHBOARD_COOKIE_KEY
  if (typeof envKey === 'string' && envKey.length > 0) {
    return decodeKey(envKey)
  }

  const keyFile = process.env.DASHBOARD_COOKIE_KEY_FILE ?? '/data/cookie.key'
  const rawFile = await readFile(keyFile)

  // If the file is already ≥32 raw bytes and not obviously text-encoded, try raw first.
  // We detect "obviously text-encoded" by checking if the content is valid ASCII printable
  // (hex or base64 chars only). If it looks like raw binary, skip text decoding.
  const trimmed = rawFile.toString('utf8').trim()
  // Only treat as text-encoded if the trimmed content is entirely printable ASCII
  const isPrintableAscii = /^[\u0020-\u007E]+$/.test(trimmed)
  if (isPrintableAscii) {
    return decodeKey(trimmed)
  }

  // Raw binary file
  if (rawFile.length >= 32) {
    assertNonDegenerate(rawFile)
    return rawFile
  }

  throw new Error(`Cookie signing key must be at least 32 bytes (256-bit); file key is too short (${rawFile.length} bytes)`)
}

/**
 * Decodes a key string to a Buffer.
 *
 * Canonical format enforcement (rm-206, cycle 10): the encoded form must be the
 * exact canonical encoding of its decoded bytes — hex at 2 chars/byte or base64
 * (padded) at 4 chars per 3 bytes. Non-canonical encodings (stripped padding,
 * junk tolerated by Node's lenient decoder, raw passphrases) are rejected
 * fail-fast with a specific message so a silently-misprovisioned key cannot
 * load — the operator sees exactly what was wrong at startup.
 *
 * Hardened against the "44 A's" exploit:
 * - Only treats input as hex if it FULLY matches /^[0-9a-fA-F]+$/ AND has even length
 *   AND decodes to ≥32 bytes.
 * - Only treats as base64 if it matches base64 charset AND decodes to ≥32 bytes.
 * - Does NOT fall through to a weaker decoder if a stronger one yields <32 bytes.
 * - Rejects all-zero and single-repeated-byte keys (degenerate/forgeable).
 * - Does NOT round-trip through UTF-8 for raw bytes (avoids U+FFFD corruption).
 *
 * Throws if no candidate yields a ≥32-byte non-degenerate key.
 */
function decodeKey(input: string): Buffer {
  const candidates: Buffer[] = []

  // Try hex ONLY if input is a full hex string with even length
  if (/^[\da-f]+$/i.test(input) && input.length % 2 === 0) {
    const buf = Buffer.from(input, 'hex')
    if (buf.length < 32) {
      // If it matched hex but decoded to <32 bytes, do NOT fall through to base64
      // (the 44-A exploit: 44 hex chars → 22 bytes, then base64 of "AAAA..." → 33 null bytes)
      throw new Error(`Cookie signing key must be at least 32 bytes (256-bit); hex-decoded key is too short`)
    }
    if (input.length !== buf.length * 2) {
      throw canonicalFormatError(input, buf.length, 'hex')
    }
    candidates.push(buf)
  } else {
    // Try base64 (standard or URL-safe) — only if not a hex string
    const isBase64 = /^[\w+/=-]+$/.test(input)
    if (isBase64) {
      const buf = Buffer.from(input, 'base64')
      if (buf.length < 32) {
        throw new Error(`Cookie signing key must be at least 32 bytes (256-bit); base64-decoded key is too short`)
      }
      const canonicalLength = Math.ceil(buf.length / 3) * 4
      if (input.length !== canonicalLength) {
        throw canonicalFormatError(input, buf.length, 'base64')
      }
      candidates.push(buf)
    } else {
      // No raw-UTF-8 passphrase acceptance: the key must arrive canonically encoded.
      throw canonicalFormatError(input, null, 'neither')
    }
  }

  const key = candidates[0]
  if (key === undefined) {
    throw new Error(`Cookie signing key must be at least 32 bytes (256-bit); decoded key is too short`)
  }

  assertNonDegenerate(key)
  return key
}

/**
 * Builds the fail-fast canonical-format error.
 *
 * `decodedBytes` is null when the input matched neither charset at all (e.g. a
 * raw passphrase with spaces/punctuation).
 */
function canonicalFormatError(input: string, decodedBytes: number | null, encoding: 'hex' | 'base64' | 'neither'): Error {
  const got =
    decodedBytes === null
      ? `input of ${input.length} chars is neither hex nor base64`
      : `${encoding} input of ${input.length} chars is not the canonical encoding of its ${decodedBytes} decoded bytes`
  return new Error(
    `Cookie signing key must be canonically encoded (hex at 2 chars/byte or padded base64 at 4 chars per 3 bytes, ≥32 bytes): ${got}`,
  )
}

/**
 * Rejects degenerate keys: all-zero or single-repeated-byte.
 * These indicate a misconfigured or zeroed-out key that would be trivially forgeable.
 */
function assertNonDegenerate(key: Buffer): void {
  const first = key[0]
  if (first === undefined) {
    throw new Error('Cookie signing key is empty')
  }
  // Check if all bytes are identical (covers all-zero and any single-repeated-byte pattern)
  let allSame = true
  for (let i = 1; i < key.length; i++) {
    if (key[i] !== first) {
      allSame = false
      break
    }
  }
  if (allSame) {
    throw new Error(
      `Cookie signing key is degenerate (all bytes are 0x${first.toString(16).padStart(2, '0')}); this key is trivially forgeable — use a cryptographically random key`,
    )
  }
}
