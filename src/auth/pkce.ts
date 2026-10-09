/**
 * RFC 7636 PKCE helpers for the operator OAuth flow (rm-149).
 *
 * GitHub OAuth Apps accept PKCE with the S256 method only — 'plain' is not a
 * supported method on GitHub's authorize endpoint, so this module produces and
 * validates exactly the S256 shape: code_challenge = BASE64URL(SHA-256(
 * code_verifier)) on the authorize redirect, code_verifier on the token
 * exchange. There is deliberately no plain-method fallback anywhere on this
 * path (no downgrade).
 *
 * Verifier construction: 32 random bytes base64url-encoded → exactly 43 chars,
 * the shortest verifier RFC 7636 §4.1 permits, entirely within the unreserved
 * character set [A-Za-z0-9-._~]. The fixed length and charset are what the
 * callback's shape gate keys on (isWellFormedPkceVerifier).
 */
import {createHash, randomBytes} from 'node:crypto'

/** Length of every verifier minted by generatePkceVerifier (base64url of 32 bytes). */
export const PKCE_VERIFIER_LENGTH = 43

/** RFC 7636 §4.1: verifier characters are limited to the unreserved set. */
const PKCE_VERIFIER_PATTERN = /^[\w.~-]{43}$/

/**
 * Generates a fresh PKCE code_verifier: 43 base64url chars from 32 random
 * bytes (~256 bits of entropy). Called once per /auth/login; the value is
 * stored in the short-lived `oauth_pkce` cookie and never leaves the origin
 * except inside the token-exchange body sent to GitHub over TLS.
 */
export function generatePkceVerifier(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Derives the S256 code_challenge: BASE64URL(SHA-256(verifier)) per RFC 7636
 * §4.2 (the ASCII bytes of the verifier). Pinned to the RFC's Appendix B
 * reference vector in test/auth-pkce.test.ts.
 */
export function deriveS256Challenge(verifier: string): string {
  return createHash('sha256').update(verifier, 'ascii').digest().toString('base64url')
}

/**
 * True when a value has the exact shape every generatePkceVerifier mint has:
 * 43 unreserved-set characters. The callback applies this to the
 * client-supplied `oauth_pkce` cookie BEFORE treating it as a verifier — a
 * plain regex (not a timing-safe compare) is correct here because length and
 * charset are public by construction; the secret binding proof is not local:
 * GitHub's token endpoint checks S256(code_verifier) against the challenge
 * bound to the authorization code, and a well-formed but wrong verifier is
 * rejected by that exchange.
 */
export function isWellFormedPkceVerifier(value: string | undefined): value is string {
  return (
    typeof value === 'string' &&
    value.length === PKCE_VERIFIER_LENGTH &&
    PKCE_VERIFIER_PATTERN.test(value)
  )
}
