# Prioritization — repository-maintenance cycle:2 — run ebdce89e722c4179911b6df97c3ce4d2

Attempts 9bbf0b9615174d4e90092532556215d0 → 618ef89f932e46bb82442600526256ff · 2026-10-04 · base 227375247414e025902a29148c22c10d7244aacc
(Re-dispatched attempt: selection RE-VALIDATED against a fresh full-fleet census — see the
re-verification section at the tail; the selection survived, with one new implement-phase constraint.)
Riding the uncommitted cycle-2 ledger extension (ROADMAP.md +39, mints rm-628..rm-632, riders on rm-103/108/139/252).

## Selection method

1. Open-candidate sweep of THIS worktree's ledger (203 defs; ~55 open candidates, priorities 2.0–98.0).
2. Anti-race census over ALL sibling worktrees under conductor-worktrees/dashboard-864ca327c8/ (166 worktrees):
   dirty-file map + per-worktree claim extraction (added ROADMAP lines with status flips/implemented
   markers + each run's own batch doc). Mentions≠claims — bare-token sweeps were discarded (the
   rm-13640 prose artifact pollutes them everywhere; riders mention owner ids by design).
3. Impact × risk × effort × dependency scoring with the cycle budget in mind (one implement phase,
   end-to-end with tests and gates).

## Selected batch — "operator launch lifecycle + storage-denial hardening" (B1–B3)

All three are THIS run's fresh assess findings (evidence 1–2h old, line-precise), unclaimed anywhere
in the fleet, and file-clean except documented merge friction (below).

### B1 — rm-628 Launch submit stale-generation mutation guard (reliability 52.0) — ANCHOR
- Impact: closes a live cross-instance DOM mutation + leaked SSE stream + operator data loss
  (re-drafted prompt wiped) in the highest-frequency operator flow.
- Risk of change: tiny (one guard line + bail path releasing the mutex); the seam is already
  generation-scoped everywhere else in the module (:462, :483).
- Effort: S. public/operator-launch.js only + fixture-harness test (the re-init-during-submit
  fixture the acceptance demands).
- Conflicts: ZERO sibling touches on public/operator-launch.js (census §204).

### B2 — rm-630 Storage-safe accessor at the six SPA localStorage sites (reliability 40.0)
- Impact: deterministic blank-page class (storage-denied browsers) closed at the cause; render-phase
  initializers become throw-proof.
- Risk: tiny; one helper + six mechanical call-site swaps; behavior identical when storage works.
- Effort: S–M (helper + throwing-getter jsdom tests at each initializer site).
- Conflicts: run-146d73f2 (rm-596 dismiss-reentry) touches AppShell.tsx/InstallPrompt.tsx/Notifications.tsx
  — content-DISJOINT (they export DISMISS_KEYs + add restore nonces; do not touch the six storage
  lines); run-d1850b2e (rm-600 VAPID cache) touches Notifications.tsx elsewhere. Same-file merge
  friction only, not claim races.
- Joint decision recorded: rm-514 (containment arm — root ErrorBoundary) stays open and lands NEXT
  cycle on top of B2's fixtures (throwing-getter tests serve both arms; the mint's never-fold rule
  is about identity, not same-cycle landing).

### B3 — rm-629 Launch submit abort + concurrent-submit surfacing (reliability 26.0)
- Sequenced AFTER B1 (same handler; B1 is the guard, B3 is the lifecycle). AbortController plumbed
  into browserFetch; same-instance mutex semantics unchanged (documented deliberate).
- Effort: S. Zero conflicts.

## Deferred — top-of-ledger items NOT taken this cycle (with reasons)

- rm-104 (98.0) roadmap-render hardening + rm-119/rm-114 sub-acceptances: render-tooling/process
  item, historically sibling-raced (cured-stale), no code seam this repo owns end-to-end.
- rm-279 (96.0) merge-buffer procedure guard: procedural, depends on fleet merge cadence.
- rm-103 (85.0) absorb cadence: rider-refreshed today; window is deps-only (tip #557, 2026.10.8) —
  zero actionable absorb content this cycle.
- rm-252 (80.0) agent v0.115–v0.117.1 absorb: blocked on gateway deployment environment
  (marcusrbrown/infra checkout); rider already advanced the pin target.
- rm-282 (74.0) pinned-digest unification: large blast radius across all workflows.
- rm-249 (72.0) PWA silent-duplication: SW/PWA files are an active sibling war zone TODAY
  (run-146d73f2 in AppShell/InstallPrompt).
- rm-157 (72.0) warm-load budget: perf project, multi-file.
- rm-281 (62.0) workflow timeouts: ALREADY IN FLIGHT at sibling run-d1850b2e (editing
  codeql/dependency-review/fro-bot/scorecard yaml in its uncommitted batch) — anti-race EXCLUDE.
- rm-631 (40.0) all-repositories surface: carries an rm-107 joint-decision requirement (rm-195
  sequencing precedent) — decision first, code next cycle.
- rm-632 (46.0) annotations drill-down: needs an API-client surface + rate-budget decision
  (lazy-fetch contract) — design-bearing, next cycle.
- rm-514 (38.0) root ErrorBoundary: containment arm, deliberately paired to B2's fixtures, next cycle.

## Census artifacts

- claims.txt (mention-level, superseded by the claim-level diffs read directly)
- Direct diff reads: run-146d73f2 (rm-596 lane), run-d1850b2e (rm-600 + workflow-timeouts lane)

## Re-verification (attempt 618ef89f, 2026-10-04, after the re-dispatch)

The engine re-dispatched this phase after the first attempt's result; the perishable part — the
anti-race census — was re-run in full rather than assumed:

- **Zero claims on the batch.** Every dirty worktree's `git diff ROADMAP.md` added-lines scanned for
  rm-628/rm-629/rm-630 family mentions: only THIS worktree hits. No sibling mints overlapping content
  under other ids. Uncommitted sibling def ceiling rm-634 (run-5411da39); nothing minted rm-635+.
- **Zero sibling touches on `public/operator-launch.js`** (B1/B3 anchor file) across all dirty worktrees.
- **Base current**: origin/main unmoved at 227375247414e025902a29148c22c10d7244aacc; porcelain =
  ` M ROADMAP.md` + this doc (untracked) only.
- **Fleet grew**: 177 worktrees, 32 dirty (was 166/… at the 07:15 census). Two NEW lanes appeared, both
  content-disjoint from this batch: run-2c3b4c64 (rm-608 Node-26 web-test localStorage CURE via a
  `web/src/test-setup.ts` rebind + rm-609 stale-SPA-shell serve — test-infra seam, NOT the six SPA-runtime
  storage sites) and run-845265c83109 (a competing repository-maintenance cycle-2 batch: jsdom 30 +
  rm-560 rate-limit denial sampling + 429 Retry-After — disjoint families; it ALSO landed a test-setup.ts
  localStorage rebind, so that seam is contested in ≥2 sibling worktrees).
- **Friction lanes re-read directly** (both implement phases expanded since 07:15):
  run-146d73f2 now also edits server.ts/operator-stream.js (rm-596 implement in flight) — its
  AppShell/InstallPrompt/Notifications hunks (DISMISS_KEY exports, remount nonces, docstrings) remain
  content-disjoint from the six storage lines (:103/:160, :28/:70, :56/:339). run-d1850b2e expanded into
  auth.ts/push/App.test — its rm-281 workflow-yaml claim is re-confirmed live (codeql/dependency-review/
  fro-bot/scorecard all dirty), so the rm-281 anti-race exclusion stands.
- **NEW implement-phase constraint for B2 (rm-630)**: `web/src/test-setup.ts` is now a sibling war-zone
  seam (two worktrees rebind `globalThis.localStorage` there, reconciling by content at their
  integrates). This batch must NOT touch test-setup.ts: the throwing-getter tests install and restore a
  throwing `localStorage` **per-test inside the test files** (vi.stubGlobal / configurable
  Object.defineProperty in beforeEach/afterEach), which composes with either sibling's rebind. Note the
  rebind replaces the jsdom window's storage too (window === globalThis in the vitest env), so the stub
  must be installed after setup and torn down after each test — never rely on the seam's Storage literal.

**Selection UNCHANGED**: B1 rm-628 → B2 rm-630 → B3 rm-629. All deferral reasons above still hold at the
fresh census.
