# 2026-10-16 repository-maintenance cycle-1 batch — run fecd3997128b

Campaign `ea434235a0554b5da97e1e54eb879228` · run
`fecd3997128b4b10b6a28083b6786d72` · base `3e3664c` (canonical main at
dispatch) · worktree `dashboard-864ca327c8/run-fecd3997128b-fecd3997` ·
branch `conductor/run-fecd3997128b-fecd3997`. Batch authored 2026-10-15
19:27-20:00Z; validation through 2026-10-17; everything left UNCOMMITTED for
the landing gate.

## Summary

Six-item fork-local batch (correctness + observability + gate hygiene), zero
overlap with the sibling campaign's selected rm-857/858/859 work:

| # | item | ledger home | state (pre-review) |
|---|------|-------------|--------------------|
| S1 | dual-shape push-subscription wire parser (flat legacy + list envelope epoch-ms → canonical ISO DTO; #631 superset) | rider on rm-252 | implemented + full-suite green |
| S2 | watchdog surfacing: MonitoringData fields + degraded banner | rm-863 (minted this cycle) | in_progress, implemented + green |
| S3 | timeoutMs seam for approval/cancel clients; both-halves test runner | rm-594 rider + rm-651 rider | implemented + green; flake cured |
| S4 | orphaned impeccable detector subprocess kill on hook timeout | rm-862 (minted this cycle) | in_progress, implemented + green |
| S5 | healthz dead-DTO drop + Cache-Control no-store | rm-599 rider | implemented + green |
| S6 | lint-green rider (3 label-refs backticked, 46 trailing spaces) | rm-675 rider | lint exit 0, census 0 |

Tree delta: 26 entries uncommitted (21 M + 3 ?? after compound) — code+tests
for S1-S6, `scripts/run-both-suites.mjs`, `test/operator-contract-push.test.ts`,
this doc, and the prevention note
`docs/solutions/workflow-issues/roadmap-ledger-bracket-groups-label-refs-2026-10-16.md`.

## Validation outcomes (pre-review, recorded)

- targeted (attempt b8c104a8): engine runner deterministically escalates to
  full because `package.json` is a shared config surface — executed the
  impacted suites directly at targeted scope (9 root files + 3 web files
  green, check-types + eslint on the touched surfaces green) rather than
  burning a duplicate full round.
- full (attempt e2010f41): VERBATIM `github_ci_validate.py --repo .` rc=0 via
  the ephemeral-PR route on the long-lived fullval mirror
  (`codeo1io/dashboard-fullval-8fd22b8b` PR #12, 9/9 checks green: Main
  Test/Lint/Check Types/Design Check/Check Workflows/Test Scripts Load +
  CodeQL/Analyze + Dependency Review); validation digest
  `validation:v1:c662ee1edbdbff0d229238380797d7e4e0d8ec7d47b85d87a3fd71fcdd723538`
  equals dispatch pre- and post-run. Local both-halves mirror: root 60 files
  3081/3081 + web 34 files 1223/1223 (after the one real fix the full run
  surfaced: the second healthz pin at `test/server.test.ts:58`).
- Attempt ledger: assess e1b03bc0, research 98a9e24a, roadmap 6ecf2fe8,
  prioritize f6b6df97, stewardship 2d3c4bad, implement 72fd0c4d (adopted via
  forensics d213ef1218 after dead bb611c31 was proven a no-work 64s reap),
  targeted b8c104a8 (dead 3be650e4 proved no-drift, re-executed), full_tests
  e2010f41 (2d417d6d canonical-route attempt superseded by the Actions stall,
  see below).

## Fleet context learned this cycle

- Canonical `codeo1io/dashboard` Actions executed ZERO runs 2026-10-09 →
  2026-10-16 (workflows `state=active`, permissions enabled — execution
  stalled; all landings in that window merged with no CI). Resumed
  ~2026-10-16T17:00Z. 16 stale `Conductor CI validation` draft PRs from the
  stall window remain open on canonical — janitor candidate (rm-1463
  lineage).
- Full-validation route used the long-lived fullval mirror precisely because
  canonical was unproven at emission time; the mirror's Main workflow is
  byte-identical to canonical's for the delta surface.

## Next-cycle candidates (pre-review, for assess to carry)

1. Upstream absorb window `#616`-`#635` (18 commits past a385ca5): contract
   1.11.0 + waiting-run family (#619 plan doc; #623 `operator-time.js`;
   #630/#634 UX), #631 now a pure pin/UX swap on top of S1's parser, #629 iOS
   install steps, #633 signed-out sign-in (dedupe vs rm-1451), agent pin
   v0.122.1 → v0.122.3 (security-laden). Coordinate with sibling campaign's
   rm-858 window — S1 deliberately did not preempt it.
2. rm-116 branch-protection fill is NOW UNBLOCKED (Actions resumed; required
   checks can actually run again).
3. Renderer-side bracket-group wrap (durable half of rm-675) — repo-side
   lint-green landed; watch the next managed render for regression.
4. Stale-PR janitor sweep (the 16 stall-era ci-* PRs + any siblings).
5. Toolchain majors evaluation windows (rm-271 riders; vitest 5 / TS 7 /
   pnpm 12 / jsdom 30 / vite-plugin-pwa 2).
6. `prose-residue-guard` walk() node_modules-prune micro-fix (3-line, forked
   from assess F8) if not landed by a sibling.
7. Sibling-campaign spool lineage: the rm-857 restore batch, rm-858 absorb
   gate, rm-860 PR-janitor, and rm-482 all live as UNTRACKED spool patches
   (no defs on this tree; ids rm-857..861 reserved, absent from ROADMAP) —
   next assess must read the sibling campaign's ledger/spool state before
   minting or absorbing any of those surfaces (dual-author risk).

## Review/shipping

Explicitly out of scope here per compound-phase policy: review outcomes,
landing, commit/push, and CI-state flips ride the post-compound gates; the
next cycle's assessment carries any residual findings forward.
