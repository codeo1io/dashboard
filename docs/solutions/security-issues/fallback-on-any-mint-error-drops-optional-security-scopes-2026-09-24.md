---
title: Falling back to a reduced scope set on ANY mint error silently dropped optional security reads
date: 2026-09-24
category: security-issues
module: dashboard
problem_type: security_degradation
component: github_installations
severity: medium
symptoms:
  - "A transient 5xx or network blip during the full-scope installation-token mint fell back to the core scope set — the operator lost security_events/vulnerability_alerts reads for the ~55-min cache TTL with no signal"
  - "Alerts panels rendered null (data missing) instead of the cycle failing loudly, so the degradation was invisible"
root_cause: fail_silent_fallback
resolution_type: code_fix
related_components:
  - src/github/installations.ts
  - test/installations.test.ts
tags:
  - token-minting
  - graceful-degradation
  - optional-permissions
---

# Mint fallback on any error dropped optional security scopes (rm-170)

> **Landing note (2026-09-25, integrate of run d6455cdc candidate ed889597, conflict case 3f2790f4):** this lesson was authored by the d6455cdc batch as its item rm-181; the repair converged with the landed rm-170 (which credits this run as first reporter), so the citation is renumbered to the landed id. The mechanics below are the candidate's converging variant; the landed shape is stricter about retrying — `mintReadOnlyToken` makes exactly ONE full-scope attempt: a non-permission-shaped error (network/5xx/429) rethrows immediately, fail-visible, with no same-scope retry loop (and rm-185 later added the `MintedToken` expiry seam). The prevention rule stands as written.

## Problem

`mintReadOnlyToken` tried the full read-only permission set first and fell back to the core
set on ANY failure of the first mint. A scope rejection (definitive: the installation will not
grant it) and a transient failure (5xx, `fetch failed`) are completely different situations,
but the code treated them identically: both ended in a core-scope token. For transient
failures this silently removed `security_events`/`vulnerability_alerts` reads until the cache
expired — a fail-silent security degradation.

## Fix (2026-09-24, run d6455cdc B2)

- `isTransientMintError` classifies status 429/5xx and network-shape messages as transient.
- Transient failures retry the SAME full scope set with bounded backoff (default delays
  [200, 600] ms, injectable via `opts.retryDelaysMs` for fast tests) and THROW LOUD if they
  persist — optional scopes are never silently dropped.
- Scope-class failures (403/404/422 and unknown non-transient) still degrade to core
  immediately — the intended graceful path for a missing grant is unchanged.

## Prevention rule

**Never let a fallback cover more failure classes than it was designed for.** A degrade path
justified by "the grant is absent" must be gated on evidence of absence (definitive rejection
status), not on any exception. Every "optional + graceful" permission contract needs a test
for each failure class separately — transient (must retry same scopes / fail loud) and
definitive (must degrade) — because the silent variant of the former is indistinguishable from
working code until an operator notices missing data days later. Pairs with the read-only
invariant: effective access is mint-time scoped, so scope loss at mint IS the security
boundary eroding.
