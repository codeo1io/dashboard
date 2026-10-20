---
module: dashboard
tags: [repository-maintenance, cycle-4, roadmap, rm-2154, rm-252, rm-1524, rm-2005, rm-1449, rm-139]
problem_type: roadmap-extension
---

# Repository-maintenance cycle 4 — roadmap extension (run 85715d76)

- date: 2026-10-21 · conductor run `85715d76d2714c179f3dc37c2c579a0b`, roadmap attempt
  `c0bd50e1f80943f4b78d02c931bbb0a8` · repository-maintenance
  `996740571bdb4e0282a88c575c66b2a6` cycle:4 · base `76005aa` == origin/main
- inputs: this run's assess `229866f9b28248a39cf3a50c46b8c4cd` (battery fully green
  first-run — check-types rc=0, lint rc=0, tests 3929+1852 passed, zero flakes; census
  325 defs / 0 dups / max rm-2032; ledger check at its known two-stale baseline) and
  research `a62fe887f89649c29b93e376a7ced410` (ce-ideate, live probes 2026-10-21:
  upstream static, per-PR forensics, registry + actions-digest + nodejs.org sweeps)

## Deliverables

- `ROADMAP.md` — extension #52: one mint def (rm-2154), five dated riders (rm-252,
  rm-1524, rm-2005, rm-1449, rm-139), and the extension record comment.

## Mint

1. **rm-2154 — runtime-suite deterministic settles (reliability 55.0).** Port upstream
   PR #682's recipe (fixed wall-clock sleep → `await mounted.awaitInit()`, commit
   b2b5fa8) to the three unconditional real-timer settle seams this run's research read
   first-hand: `web/src/operator/runtime.test.ts:1229` (5 ms settle right after the
   `:1221-1231` mountLoader poll loop — the loop itself is a deliberate fake-clock
   pattern, out of scope) and the `:4675`/`:4687` 10 ms post-release settles. The
   in-file precedent already exists (`:4481-4492`, exercised at `:4651`), so the cure is
   recipe-local. Minted above the all-lineage unlanded wall ceiling rm-2153 (re-probed
   live across every dashboard-family worktree this turn; origin/main def-line max
   rm-2032). An unlanded sibling envelope claims the broader operator-suite
   load-tolerance family including the mountLoader flake adjudications — this def owns
   only the settle-recipe sites and reconciles by title at integrate
   (first-landed-wins); sibling ids deliberately uncited.

## Riders

- **rm-252 (absorb window):** window re-measured — 32 behind `f37600d` (tag 2026.10.59,
  static since 2026-10-20); tip is PR #696, a one-line agent-digest bump to v0.125.0 vs
  the fork pin v0.123.1 at `e59939d` (fro-bot.yaml:357). Resolved-digest census:
  actions/cache v6.1.0 = `55cc834` is exactly upstream main.yaml's pin while the fork
  composite pins v5.1.0 `caa2961` — absorb-surface, not fork pin-lag.
- **rm-1524 (vitest lane):** the dated gate ARRIVED — dependabot.yml self-schedules
  this re-evaluation for 2026-10-21, and upstream proved the recipe on 2026-10-20:
  #694 (vitest 5.0.5, lockfile-only) + #695 (a 12-line `jest-dom.d.ts` shim upstream adds at the web/src root —
  ABSENT at the fork tip) + #691 (jest-dom 7) + #692 (jsdom 30) — vitest + jest-dom move as ONE
  change; strongest next-cycle lead.
- **rm-2005 (axe gate):** darkness corroboration — @axe-core/playwright 4.14.0
  published 2026-10-15 sits six days later with ZERO dependabot PRs (and none for
  @playwright/test 1.64.1, the noble-lockstep anti-candidate); the bump stays manual,
  gated on the operator-DOM remediation the def owns.
- **rm-1449 (major-version sweep):** registry + actions-digest truth at `76005aa` —
  typescript 7.1.0-beta iterating (stable 7.0.2 unchanged, typescript-eslint still
  peer-blocking below 6.1.0 — spike-before-adopt holds, rider datum only); impeccable
  4.7.0 (2026-10-19) is LIVE-GREEN at tip (Design Check command, empty findings rc=0,
  4.6.0 control identical) — folds into the fresh-minor lane, no mint; setup-node
  v7.1.0 = `949feb24` newest while release-channel.yaml:55 still resolves v7.0.0 =
  `8207627` (the one straggler, already tracked — no re-mint); watch items unchanged:
  hono latest 4.13.13 / next 5.0.0-rc.1, OSV CVE-2023-45853 still open (modified
  2026-10-20T15:23Z).
- **rm-139 (Node 26 gate):** v26.12.0 still lts:false at the 2026-10-21 probe — the
  2026-10-28 promotion window stands; triple-bump not yet due; bun 1.4.3 at parity,
  ubuntu-latest still ubuntu-24.04.

## Screening (no mints)

- The mountLoader awaitInit port as part of a broader load-tolerance def — an unlanded
  sibling envelope already claims that family; this run mints the narrower settle-recipe
  scope with the two post-release settles the sibling carrier does not name, reconciling
  by title at integrate.
- impeccable 4.7.0 pin bump — detect-proven minor, rm-1449 fresh-minor lane, no mint.
- @axe-core/playwright 4.14.0 / @playwright/test 1.64.1 — rm-2005 / noble-lockstep
  lanes respectively, rider truth only.
- Node 26 triple-bump — rm-139 owns it; gate 2026-10-28, evidence unchanged.
- Stale-PR hygiene and branch-protection shell observations from assess — already owned
  by standing defs on the live ledger; no new surface.

## Census

After this extension: 326 defs / 0 dups / max rm-2154 (next free rm-2155; fleet fog
through rm-2153, first-landed-wins by title). Verified at compose:
`node scripts/roadmap-census.ts` reports 326 / 0 / rm-2154; the ledger check returns
its known baseline of exactly two pre-existing stale anchors; all four roadmap guard
suites green; eslint clean on ROADMAP.md and this doc.
