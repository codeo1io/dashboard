---
title: Never discard upstream expiry data — token caches must honor real expiresAt with a CAP
date: 2026-09-24
last_updated: 2026-09-24
category: logic-errors
module: dashboard
problem_type: logic_error
component: service_object
severity: low
applies_when:
  - An auth/SDK mint result carries an expiry (e.g. GitHub App installation token `expiresAt`) that the consuming cache does not accept
  - The cache instead assumes a fixed lifetime ("55 minutes is safe") for tokens whose real TTL can be shorter
  - The seam's interface types only the string token, so the expiry is structurally invisible to callers
symptoms:
  - "cache serves a token after its real expiry (minted late in its lifetime) → 401s against the GitHub API"
  - "a guessed TTL looks fine in tests because fixtures mint fresh tokens"
cause: |
  `createAppAuth` results expose `expiresAt`, but the `mintInstallationToken` seam typed only `{ token }`, discarding it; `src/github/installations.ts`'s cache then assumed a 55-minute lifetime. A token minted near the end of its validity window is expired well before the cache evicts it.
resolution: |
  Fixed in the cycle:1 batch (rm-180, 2026-09-24): a `MintedToken { token, expiresAt }` shape now flows from `createAppAuth` through `app-client` (normalizing ISO strings/`Date`, `null` on ill-formed) into `setCachedToken`, which honors the real expiry with a 55-minute CAP. Cap rules: `NaN` and far-future expiries fall back to the cap — a NaN must never compare fresh forever. Two fake-timer tests pin the boundaries (5-min expiry honored at the real boundary; 8-h expiry capped).
prevention:
  - "When an upstream authority hands you an expiry, thread it through — never replace authoritative data with a guess, even a conservative one."
  - "Seam types are contracts: if a field is dropped at a seam, every consumer silently degrades; type the full payload."
  - "Cap HONORED expiries from above (clock skew, absurd values, NaN) rather than trusting them blindly — honor + cap, not guess."
related_components:
  - src/github/app-client.ts
  - src/github/installations.ts
tags: [auth, tokens, caching, expiry, types, seams]
---
