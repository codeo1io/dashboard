---
title: Built public bundle twins own the dead-code census — public/ operator bundles are hand-maintained vanilla siblings of web/src helpers, not build outputs
date: 2026-10-04
category: best-practices
module: dashboard
problem_type: best_practice
component: operator_bundles
severity: low
applies_when:
  - 'declaring code dead ("zero production callers") in this repo'
  - 'deleting or fail-closing a helper that exists in web/src and public/operator-*.js'
  - 'censusing Math.random / Date.now idempotency-key minters or any id/key-generation helper'
tags: [dead-code, census, operator-bundles, public, vanilla-twins, idempotency-key, deletion]
---

# Built public bundle twins own the dead-code census

Date: 2026-10-04 (event) · Run: `80e8409255b94d3782ec2a9b7f871fe0`
(repository-maintenance cycle 1, rm-482 rider / batch B3) · Author:
hermes-conductor compound phase (attempt `1874fe8e79114ba1966ea5a56ac65f24`).

## Problem

`web/src/operator/` helpers have TWINS inlined into the hand-written vanilla
bundles under `public/` (`operator-launch.js`, `operator-stream.js`, served
at `/static/*`). The twins are NOT build outputs — `pnpm build:web` writes to
`web/dist/` and never touches `public/` — so no build step links the two
copies. Consequences, both hit by the rm-482 lineage:

- A dead-code census scoped to `src/` + `web/` + `test/` finds "zero
  production callers" and declares a helper dead, while the LIVE launch-path
  twin keeps minting real keys inside `public/operator-launch.js`.
- Deleting the `web/src` twin does not close the class: the bundle sites live
  independent lives and must be edited (or fail-closed) directly.

This cycle's concrete instance (2026-10-04, base 227375247):
`web/src/operator/runtime.ts` `mintRuntimeIdempotencyKey` was dead — zero
production callers — and was deleted together with its test blocks; the REAL
launch keys were always minted inside the bundles.

## The census recipe (sweep order that works)

1. Sweep ALL of it, not the source tree alone:
   `grep -rn <symbol> src/ web/src test/ public/ scripts/`
2. Classify each hit: definition / test-only / production caller / bundle
   twin. A hit inside `public/*.js` is a PRODUCTION caller by definition —
   the bundles are served to operators verbatim.
3. For Math.random / Date.now key minters, also count the fallback sites:
   `grep -n 'Math.random' public/operator-launch.js public/operator-stream.js`
   (at this base: launch `:76` inside `mintIdempotencyKey` def `:67`, sole
   call `:598`; stream `:1557` + `:1893` as `Date.now`-`Math.random`
   ternaries).
4. Only then pick the disposition per site: deletion (source twin with zero
   callers), fail-close (bundle site that must keep working —
   `crypto.randomUUID`-or-refuse), or leave-with-rider.

## Next-cycle remainder (recorded in rm-482's ledger riders)

The class's open sites after this cycle's deletion, verified at current
lines: `public/operator-launch.js:67` (def) + `:76` (`Math.random` fallback)
+ `:598` (sole caller), `public/operator-stream.js:1557` + `:1893` — all
fail-close candidates to the `crypto.randomUUID`-or-refuse contract.

## Prevention rule

A "zero callers" claim in this repo must cite a grep that included
`public/` and `scripts/`. When a helper has a bundle twin, the ledger entry
must name BOTH sites and their dispositions separately — a single-site
closure re-opens the class on the next audit.

## Related records

- Ledger: `rm-482` in `ROADMAP.md` (2026-09-26 mint → 2026-10-04 riders:
  deletion + validation + next-cycle sites), disclosure extension #12.
- Batch record: `docs/prioritization/2026-10-04-repository-maintenance-cycle-1-batch-run-80e8409255b9.md`
  (B3, Outcome + next-cycle candidates).
- The B2 companion lesson from the same cycle:
  `docs/solutions/security-issues/middleware-default-headers-invisible-to-source-grep-2026-10-04.md`
  (same shape: the truth lives outside the audited source tree).
