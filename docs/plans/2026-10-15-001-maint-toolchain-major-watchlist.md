---
title: "maint: Toolchain major watchlist — dated baseline and sequencing lane"
type: maint
status: active
date: 2026-10-15
origin: docs/prioritization/2026-10-14-cycle-1-batch-run-1b227f20f5f2.md
---

# Toolchain major watchlist (rm-1433) + Node runtime-generation decision lane (rm-1432)

Standing, dated watchlist for the five toolchain majors this fork is behind on,
plus the Node runtime-generation decision. Def acceptance (ROADMAP rm-1433):
one row per major carrying current pin, latest as measured, named blocker, next
re-check date — steps not taken stay rows with re-check dates, not silent rot.
Every step lands independently revertible with the full suite green per step.

Measurements below taken live on **2026-10-15** (`npm view <pkg> version`,
`curl https://endoflife.date/api/nodejs.json`); pins read from this tree.

## Watchlist (2026-10-15 baseline)

| Major | Current pin | Latest (measured 2026-10-15) | Named blocker | Next re-check |
| --- | --- | --- | --- | --- |
| Node runtime | `node:24-trixie-slim` digest (Dockerfile:16), `engines >=24` (package.json:59), `@types/node` 24.13.3 | node 24.21.0 / node 26.11.1 (26 LTS lands 2026-10-28) | **Decided — ride-24 (see decision below)**; swap gated on first post-LTS 26 patch | 2026-10-28 (LTS date) |
| vitest | 4.1.11 (package.json:55) | 5.0.4 | None structural (engines admit node 24); move together with jsdom 30, root + web configs in one step — **stretch cut 2026-10-15, see cut line** | 2026-10-28 |
| jsdom | 29.1.1 (package.json:48) | 30.1.2 | Pairs with vitest 5; jsdom 30.1.2's undici dep (`^8.10.2`) is the durable half of the rm-285 audit pair — take both majors and re-probe `pnpm audit -r == 0` after | 2026-10-28 |
| pnpm | 11.28.5 (package.json:57 `packageManager` + Dockerfile:21 corepack pin) | 12.11.2 | Must move as ONE commit: test/fork-exclusion-guard.test.ts:60-66 asserts 11.28.5 in Dockerfile + packageManager; corepack pin + guard assertions updated together | 2026-11-12 |
| typescript | 6.0.3 (package.json:52) | 7.0.2 | Native-port compat with `@bfra.me/eslint-config` 0.54.0 + `eslint-plugin-erasable-syntax-only` 0.4.2 unverified — needs a compat probe first | 2026-11-12 |
| vite-plugin-pwa | 1.3.0 (package.json:54) | 2.0.0 (2026-10-03; workbox-build ^7.4.1 + workbox-window ^7.4.1 became peerDependencies — this fork installs zero workbox packages today) | Subordinate to rm-138's strip-or-implement decision (PWA layer may be removed outright) | after rm-138 resolves |

## Node runtime-generation decision (rm-1432) — DECIDED 2026-10-15: ride-24

Decision **(b) ride-24** per rm-1432's acceptance, recorded before the
2026-10-28 deadline:

- **Why not swap now:** the swap path rides only on a first *post-LTS*
  node:26 patch existing at implement time. As of 2026-10-15 the 26 line's
  latest is 26.11.1, which **predates** LTS (2026-10-28) — no post-LTS patch
  can exist yet. Pinning a young digest now would violate the def's own
  preference ordering.
- **Why riding is safe:** node 24 leaves *active* support 2026-10-20 but its
  **maintenance line runs to 2028-04-30** (endoflife.date, re-read
  2026-10-15); security fixes keep flowing on 24 through the maintenance
  window. Current 24-line latest: 24.21.0.
- **Standing guard:** the base-drift watcher stays targeted at the 24 tag
  line (digest-pin drift detection unchanged).
- **Named re-decision triggers (any one re-opens the swap lane):**
  1. The first node 26.x patch published after LTS (≈26.12.0, expected early
     November 2026) — preferred digest-pin candidate.
  2. Any CVE against the 24 line that the maintenance window does not patch.
  3. Hard stop: 24-line maintenance end 2028-04-30.
- **Docs asserting the node line:** all remain truthful under ride-24 (24 is
  still the deployed line); no doc re-truthing required by this decision.
  rm-647 (base libpcre2 HIGH) is sequenced on the 24 base — fixing it before
  any future swap avoids doing the work twice.

## Stretch cut line (vitest 5 + jsdom 30) — CUT 2026-10-15

The cycle:1 batch listed vitest 5.0.4 + jsdom 30.1.2 as an explicit,
cut-without-fail stretch. **Cut this cycle**, dated:

- Both majors are engines-clear on node 24 (verified 2026-10-14/15), so the
  blocker is not compatibility but scope: the def requires each step
  independently revertible with the **full suite green per step**, and a
  test-runner major touches every suite in both configs — not provable inside
  this batch's focused-test validation budget. (CI is dark — Actions newest
  run 2026-10-09 — so local battery is the only gate; a runner major deserves
  the full battery, not a focused slice.)
- The pair stays rows above with re-check 2026-10-28, first candidates for the
  next cycle's batch, with the rm-285 durable audit pair (undici
  `>=8.10.2 <9`) re-probed at that landing.

## Ledger

- 2026-10-15 — baseline recorded (this doc); rm-1432 decided ride-24;
  vitest5+jsdom30 stretch cut with dated rationale. Batch run
  1b227f20f5f2 cycle:1 (rm-1431 absorb + rm-1434 poison-row guard landed
  alongside).
