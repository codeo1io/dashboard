---
module: src/routes/auth.ts
tags: [auth, oauth, pkce, csrf, security, codeql]
problem_type: security_issue
issue: ROADMAP.md rm-149
related:
  - docs/solutions/security-issues/gateway-operator-auth-recovery-mode-aware-router-2026-06-21.md
---

# OAuth PKCE S256 on GitHub OAuth Apps — nuances + alert-clean authoring (rm-149, 2026-10-09)

## Problem

The operator OAuth flow (`src/routes/auth.ts`) sent `state`-only CSRF protection on the
authorize redirect — no PKCE. GitHub's OAuth Apps documentation now documents PKCE as
strongly recommended for exactly this app class (public clients on a web page); the
defense completes the authorization-code binding against interception of the `code`
itself (state only proves the request linkage, not the response delivery).

## Solution shape

- `src/auth/pkce.ts` — RFC 7636 helpers: verifier = 43-char base64url of 32 random
  bytes (shortest RFC-legal length, unreserved set only); challenge =
  `BASE64URL(SHA-256(verifier))`.
- `/auth/login` mints the verifier into an `oauth_pkce` cookie that mirrors the state
  cookie exactly (600s TTL, `path=/auth`, HttpOnly, SameSite=Lax, the rm-604
  branch-(b) Secure rule) and puts only the challenge on the redirect.
- `/auth/callback` requires a well-formed verifier cookie BEFORE the exchange (403,
  exchange never called), clears both auth cookies one-time-use, and sends
  `code_verifier` in the token body. A well-formed but wrong (tampered) verifier is
  rejected by GitHub at the exchange (401 path); a verifier-less exchange cannot be
  constructed anywhere on the path.

## GitHub nuances (why the code looks the way it does)

1. **S256 only.** GitHub's authorize endpoint supports the `S256` method for OAuth
   Apps; `plain` is not a supported fallback. The redirect builder therefore pins
   `code_challenge_method=S256` and there is deliberately no plain branch.
2. **Confidential client + PKCE coexist.** This app is a confidential client (the
   client secret rides the token exchange as HTTP Basic auth in
   `src/auth/oauth.ts`). PKCE is additive there: `code_verifier` is an extra body
   param beside the existing `client_id`/`code`/`redirect_uri`/`grant_type` — GitHub
   checks `S256(code_verifier)` against the challenge bound to the authorization
   code, independent of the client-auth mode.
3. **A failed binding surfaces as the existing bad-code error class.** A wrong or
   missing verifier fails the exchange with `bad_verification_code` (the
   `GITHUB_OAUTH_ERROR_CODES` mapping already present in `src/auth/oauth.ts`), so
   the route's existing 401 handling needs no PKCE-specific branch.
4. **No server-stored secret to compare against.** Unlike `state`, the verifier is
   not compared to anything held in server memory — the binding proof lives at
   GitHub. That is why the callback's local check is a public-by-construction shape
   gate (plain regex, not a timing-safe compare): length and charset are not secret.
5. **The verifier never rides a URL.** Only the challenge does; the verifier exists
   solely in the cookie and in the token-exchange body over TLS (asserted in
   `test/auth-pkce.test.ts`).

## CodeQL alert-clean authoring (the 2026-09-30 rider, honored)

CodeQL's `js/insufficient-password-hash` flagged the UNLANDED PKCE candidate twice
in 2026-09-30 PR validation snapshots (alerts #74/#75 on `refs/pull/230/merge` and
`refs/pull/237/merge`) because the S256 derivation hashed a value sourced from a
`Set-Cookie` header — CodeQL treats cookie-sourced inputs as credential-shaped.
Substance was false-positive (RFC 7636 mandates exactly SHA-256 here), but the
landing constraint is to author the sites so the rule never fires on main:

- In `test/auth-pkce.test.ts`, the binding proof hashes the `code_verifier`
  **argument** the fake client's `validateAuthorizationCode` receives — a value
  captured before it enters any cookie; the Set-Cookie↔argument link is asserted by
  **plain string equality**. There is no `getSetCookie` → `createHash` dataflow
  anywhere in the landed tree (`grep`-verified), so no
  `'// codeql[js/insufficient-password-hash]'` suppression was needed.
- Production never hashes anything: `/auth/login` hashes only the locally generated
  random verifier (input is `randomBytes`, not request-derived), and `/auth/callback`
  performs no hashing at all.

If a future change reintroduces a cookie-sourced hash input, prefer restructuring
the test dataflow first (this file's recipe), a scoped suppression comment second,
and post-landing dismiss-with-reason last (the latter needs a
`security_events`-scoped token; repo PAT scopes are `repo/gist/read:org`).

## Verification recipe

```sh
pnpm check-types
./node_modules/.bin/eslint src/auth/pkce.ts src/auth/oauth.ts src/routes/auth.ts test/auth-pkce.test.ts test/auth.test.ts
./node_modules/.bin/vitest run test/auth.test.ts test/auth-pkce.test.ts test/gateway-auth.test.ts
grep -rn 'code_challenge' src/            # the single redirect builder + this seam
grep -rn 'code_verifier' src/             # token body + callback pass-through
```

All green at 2026-10-09 14:50Z on base 364272b (focused 9-suite set 433/433).
