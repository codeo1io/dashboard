/**
 * RFC 7636 PKCE (S256) helpers for the operator OAuth login flow (rm-149).
 *
 * The verifier is generated server-side from crypto randomness, hashed ONCE at
 * generation time (S256 = BASE64URL(SHA-256(verifier)), RFC 7636 §4.2), and
 * only ever travels two places: the short-TTL HttpOnly verifier cookie
 * (mirroring the oauth_state cookie pattern) and the token-exchange POST body.
 * Nothing cookie-sourced is ever hashed locally — the challenge is always
 * computed from the freshly generated verifier before it enters the cookie.
 *
 * CodeQL note (js/insufficient-password-hash, alerts #74/#75 raised against
 * the unlanded 2026-09-30 candidate): S256 is a deliberate SHA-256 use
 * mandated by RFC 7636, not password hashing. The binding test hashes the
 * INJECTED verifier constant (see test/auth.test.ts, 'OAuth PKCE (S256) —
 * rm-149'), never a value read back from a Set-Cookie header, so no
 * cookie→hash taint path exists anywhere in the suite.
 */
import {createHash, randomBytes} from 'node:crypto'

/** PKCE pair: verifier (cookie + exchange body) and its S256 challenge (authorize URL). */
export interface PkcePair {
  readonly codeVerifier: string
  readonly codeChallenge: string
}

/** Generator seam — tests inject a deterministic pair; production uses crypto randomness. */
export type PkcePairGenerator = () => PkcePair

/**
 * RFC 7636 §4.1 verifier shape: 43-128 chars from the unreserved set.
 * 32 random bytes → exactly 43 base64url chars (the minimum legal length).
 * Enforced at BOTH the callback cookie read and the exchange so a junk
 * verifier never reaches GitHub.
 */
export const PKCE_VERIFIER_PATTERN = /^[\w.~-]{43,128}$/

/** S256 code challenge: BASE64URL(SHA-256(verifier)) with no padding — RFC 7636 §4.2. */
export function s256CodeChallenge(codeVerifier: string): string {
  return createHash('sha256').update(codeVerifier, 'utf8').digest('base64url')
}

/** Production generator: crypto-random verifier + its S256 challenge. */
export function generatePkcePair(): PkcePair {
  const codeVerifier = randomBytes(32).toString('base64url')
  return {codeVerifier, codeChallenge: s256CodeChallenge(codeVerifier)}
}
