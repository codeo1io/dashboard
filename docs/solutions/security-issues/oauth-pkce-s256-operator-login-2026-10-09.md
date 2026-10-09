---
title: Operator OAuth login PKCE (S256) — design and delivery notes
date: 2026-10-09
category: security-issues
module: dashboard
problem_type: security_hardening
component: authentication
severity: medium
applies_when:
  - 'Changing the operator OAuth flow (src/auth/oauth.ts, src/routes/auth.ts) — the PKCE seam is load-bearing for every login'
  - 'Auditing why the OAuth client interface takes codeChallenge/codeVerifier parameters'
  - 'A test needs to assert the S256 challenge↔verifier binding without tripping CodeQL js/insufficient-password-hash'
tags:
  - oauth
  - pkce
  - csrf
  - codeql
---

# Operator OAuth login PKCE (S256) — design and delivery notes

## Problem

rm-149 (priority 66.0, security): the operator GitHub OAuth login carried a
state parameter (CSRF) but no PKCE — RFC 7636 — so a leaked/intercepted
authorization code was redeemable by anyone holding it. The ledger recorded
two prior aborted candidate lineages (a 2026-09-29 research attempt whose
hypothesis lived in an opencode scratch lane, and a 2026-09-30 candidate
whose CodeQL js/insufficient-password-hash alerts #74/#75 chased it back);
`grep code_challenge` across `src/` and `web/src/` returned zero at base
364272b.

## Design decisions

- **Server-generated verifier, cookie-carried.** The verifier is minted
  server-side (`crypto.randomBytes(32).toString('base64url')` → exactly 43
  chars, the minimum legal RFC 7636 §4.1 length) and travels only in a
  short-TTL (10 min) `HttpOnly; SameSite=Lax; Path=/auth` cookie
  (`oauth_pkce_verifier`) that MIRRORS the state cookie exactly — same TTL,
  same scoping, same rm-604 branch-(b) Secure expression (scheme OR
  `x-forwarded-proto`), because cookie sites that drift apart is how the
  long-lived credential later loses a protection the short-lived one kept.
  A browser SPA never needs the verifier: the exchange is server-to-server.
- **Hash once, at generation.** `s256CodeChallenge` is called exactly where
  the pair is generated (`generatePkcePair`). No code path hashes a
  cookie-sourced value — see the CodeQL note below.
- **S256 only.** The authorize URL always sends `code_challenge_method:
  'S256'`; `plain` is never offered (GitHub supports S256 for OAuth Apps).
- **Fail-closed at BOTH ends.**
  - `/auth/callback` requires a well-formed verifier cookie (RFC 7636 §4.1
    shape) before anything else happens after the state check: absent/junk →
    403, the exchange is never attempted, and the verifier cookie is never
    re-set (it is deleted one-time-use alongside the state cookie, so a
    failed attempt cannot leave a usable pairing behind).
  - The client rejects a malformed verifier with a `TypeError` BEFORE the
    wire (`PKCE_VERIFIER_PATTERN` in `src/auth/pkce.ts`).
- **Interface change, not wrapper.** `GitHubOAuthClient.createAuthorizationURL`
  gained a third `codeChallenge` parameter and `validateAuthorizationCode` a
  second `codeVerifier` parameter — an additive signature change; every
  in-repo fake (2-param literal shapes) remains assignable, verified by
  `tsc --noEmit` across the whole suite.
- **Injection seam for tests.** `buildAuthRouter` / `buildDashboardApp`
  accept `pkcePairGenerator` (defaults to `generatePkcePair`); tests inject
  a deterministic pair so the binding can be asserted exactly.

## CodeQL disposition (the 2026-09-30 blocker)

The prior candidate died of `js/insufficient-password-hash` alerts raised
because its TEST hashed a verifier read back from a `Set-Cookie` header —
creating a cookie→hash taint path the scanner reads as "hashing a secret you
shouldn't store". S256 is a deliberate SHA-256 use mandated by RFC 7636, not
password hashing. The delivery avoids the taint structurally: the binding
tests hash the INJECTED verifier constant (never a cookie read), and the
production code hashes only at generation time. Recorded in the
`src/auth/pkce.ts` header comment for the next auditor.

## Verification

Focused battery (implement phase, cycle-2 batch
`oauth-pkce-and-runner-pin-guard`, run 8dd690c85b50):

- `vitest run test/auth.test.ts` — 76 tests incl. 9 new in the
  `OAuth PKCE (S256) — rm-149` describe: challenge-on-redirect + RFC binding
  (`s256CodeChallenge(verifier) === url.code_challenge`), verifier-cookie
  attribute mirror, happy-path verifier-reaches-exchange, absent-verifier →
  403/0 exchanges/no session, tampered pairing → 401 (fake enforces GitHub's
  bad_verification_code rule), malformed cookie → 403 pre-exchange,
  client-side wire-gate, `generatePkcePair` shape/uniqueness.
- `tsc --noEmit` (server) green — all fakes typecheck against the widened
  interface.
- `eslint` clean on every touched file.
- 487 tests across the nine auth-adjacent suites (session,
  endpoint-parity, static-assets, operator-route-redirect, gateway-auth,
  rate-limit-class, dashboard, operator-ui, operator-fixture-harness) green
  after `pnpm build:web` (the documented targeted-vitest `web/dist` trap).

## Traps recorded

- Targeted `vitest run` of suites that hit `/` 404s on a fresh worktree
  without `web/dist` — build first (see
  `targeted-vitest-without-pretest-build-webdist-404s-2026-09-24.md`); the
  failure class looks like a regression but is environmental.
- eslint's `regexp` plugin rejects adjacent ambiguous quantifiers
  (`\s*(.+?)` exchange) in line-scanning test guards — anchor captures with
  `\S` and strip trailing comments in code, not in the pattern
  (see `test/workflow-runner-pin-guard.test.ts`).
- A "verifier mismatch" test must NOT present the cookie the login just set
  (that is the happy path); present a DIFFERENT valid-shaped verifier and
  have the fake enforce GitHub's pairing rule.
