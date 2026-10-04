---
title: Bidirectional docs↔routes parity guard from Hono app.routes
date: 2026-10-04
category: best-practices
module: dashboard
component: api-surface-docs
problem_type: best_practice
severity: low
applies_when:
  - 'A prose endpoint list (README `### Endpoints`, contract doc) has drifted from the live route table before — one-time hand re-truths do not hold across batches'
  - 'You need the guard to catch BOTH directions: a mounted route missing from docs, and a documented route the server no longer mounts'
  - 'The server is a Hono app whose route table can be enumerated in-process from the test harness'
tags: [guard-test, hono, app-routes, docs-drift, parity, allowlist, red-first]
related:
  - 'test/endpoint-parity-guard.test.ts'
  - 'test/env-docs-guard.test.ts (rm-214 precedent)'
  - 'test/release-trigger-paths-guard.test.ts (rm-248 locked-both-ways precedent)'
---

## Problem

The README `### Endpoints` table drifted from the live route surface six separate
times (rm-121/134/203/275/287/421 family). Each fix was a one-time hand re-truth;
none could survive the next route addition. At 28396ca9 three live routes were
undocumented (`GET /auth/logout-csrf` since 2026-06-25 — it even predated the
rm-134 re-truth — plus `GET /api/listener/csrf` and `GET /.well-known/security.txt`).

One-direction checks (docs ⊆ routes) miss new routes; the reverse alone misses
stale rows. Re-truthing by hand scales linearly with drift.

## Solution

Enumerate the live route table in-process and compare it against the parsed
markdown table, both directions (rm-556, run b528f707):

1. **Build the app through the production seam.** `await buildDashboardApp({...})`
   with a minimal injected `listenerStore` — without it the `/api/listener/*`
   rows are absent from `app.routes` and the guard would silently under-cover.
2. **Normalize before diffing.** `app.routes` contains duplicated static-mount
   rows and `/*` middleware registrations (`ALL` method) — normalize `ALL → GET`
   for middleware, strip trailing slashes, dedupe.
3. **Parse, don't grep, the docs.** Read README's `### Endpoints` section, split
   the table rows on the path backticks; every parsed row must match a live
   (method, path).
4. **Explicit commented ALLOWLIST for deliberate omissions**, each entry naming
   its documenting home (the `/operator/*` proxy lives in
   docs/runbooks/gateway-access.md; asset/static/SW mounts are infra, not API).
   Pin the allowlist itself: every allowlist key must match at least one live
   route, so a renamed route reddens the guard instead of letting the allowlist
   rot.
5. **Prove the guard red-first in both directions** before trusting it: add a
   fixture route → guard fails naming it; delete a documented row → guard fails
   naming the row; restore and confirm clean.

The failure message should name the offending routes and the two legal cures
(document it, or allowlist it with a reason) — drift then takes one commit to
resolve instead of one audit cycle to discover.
