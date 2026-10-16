---
module: dashboard
tags: [repository-maintenance, cycle-1, batch, rm-1462, rm-1463, rm-251]
problem_type: maintenance-batch
---

# Repository maintenance — cycle 1 batch record (2026-10-16, run 7a0e2163d05846288b3df822ce31c07f)

Base: 3e3664c (== origin/main at assess time; origin/main later moved to 06095e9 —
landing gate re-derives ROADMAP occupancy per first-landed-wins). Worktree:
`/home/agent/.hermes/conductor-worktrees/dashboard-864ca327c8/run-7a0e2163d058-7a0e2163`.

Batch selected by prioritize (attempt e33f2440cb9b4b939edb67b6d17001a6) under three
standing constraints: repo Actions suspended since 2026-10-09 (no live-GitHub mutations;
full validation rides the mirror route), upstream contract absorb dependency-blocked on
the gateway estate verdict (rm-252 INTEGRATE CORRECTION), and sibling lineages hold
in-flight staged pin/digest work that must not be duplicated.

## What this batch changed (5 files, tree uncommitted)

### U1 — Ledger truth-up + new defs (ROADMAP.md, 21+/1-)

Applied byte-exact the roadmap-phase deliverable (spool patch sha256
0955f6313ea052880657682cd1675c2b4c88cd39406747356a840d96c7dcce17):

- rm-251 in_progress → implemented (truth-up: acceptance landed at base — useBoundedPoll
  consumed by Listener/Monitoring/App; pins at useBoundedPoll.test.ts:167,185; full suite
  4281/4281 green at assess).
- Minted candidates rm-1461 (upstream absorb window rider, extended to release 2026.10.41),
  rm-1462 (public d.ts↔js drift guard — this batch), rm-1463 (conductor PR-residue
  janitor — this batch), rm-1464 (branch enforcement via repository ruleset, sequenced
  behind the Actions-suspension decision).

### U2 — rm-1462: public d.ts drift guard (NEW test/public-dts-drift-guard.test.ts)

Pins the value-export surface of all three vendored pairs
(`public/operator-{stream,launch,run-index}.{d.ts,js}`): every `.d.ts` `export declare
function|const|class|let|var` must exist as a runtime export key of the sibling `.js`
(verified by dynamic import), every runtime key must be declared or allowlisted, the
allowlist cannot go stale, and type-only declaration counts are pinned (31/34, 1/2, 3/2).

**Drift found at guard birth** (pre-existing, allowlisted — repairing the vendored
declarations is a separate change unit per the stewardship contract):

- `public/operator-stream.js` exports `APPROVAL_FETCH_TIMEOUT_MS` — undeclared in
  `operator-stream.d.ts`.
- `public/operator-run-index.js` exports `formatRelativeTime` and
  `markCardExpandedForLaunch` — undeclared in `operator-run-index.d.ts`.
- `operator-launch.d.ts` is in perfect parity (12 = 12).

### U3 — rm-1463: conductor PR-residue janitor (NEW scripts/conductor-pr-janitor.ts + test/conductor-pr-janitor.test.ts)

Pure policy (`classifyConductorPr`, `triage`, `runIdFromHead`) + gh CLI seam.
Dry-run by default; `--apply` only prints the exact `gh pr close` commands;
`--execute` (which requires `--apply`) is the only mutating path. Policy: non-conductor
head → keep (never touched); conductor/ci-* + landed/aborted run → close; live run →
keep; unknown run state → report-only.

Dry-run triage executed live 2026-10-16 (read-only; full output preserved in spool at
delegate/50a68e811c63407c8cc2cad1a8b05497-scratch-dryrun.txt):

| PR | action | run state | head |
|---|---|---|---|
| #749 | report | unknown | conductor/ci-00e0bddc4452 |
| #748 | report | unknown | conductor/ci-61930efda866 |
| #747 | report | unknown | conductor/ci-635c0dd838c9 |
| #745 | report | unknown | conductor/ci-365023e596ae |
| #744 | report | unknown | conductor/ci-a3c3049d7eaa |
| #743 | report | unknown | conductor/ci-d1ade50aba5a |
| #742 | report | unknown | conductor/ci-d164197c8f65 |
| #741 | report | unknown | conductor/ci-a327f0839fdb |
| #740 | report | unknown | conductor/ci-f41fb392c90e |
| #738 | report | unknown | conductor/ci-98dca1bec5e7 |
| #735 | report | unknown | conductor/ci-04ea6d446336 |
| #734 | report | unknown | conductor/ci-d1fa96dd5417 |
| #732 | report | unknown | conductor/ci-8a430e5c9646 |
| #729 | report | unknown | conductor/ci-e4262b7b6acb |
| #533 | report | unknown | conductor/ci-59baf8bb71a7 |
| #521 | report | unknown | conductor/ci-aad2427b6ad7 |
| #509 | keep | unknown | conductor/run-493bbbf2227c (out of scope) |
| #508 | keep | unknown | conductor/run-1c814809d084 (out of scope) |

Summary: close=0 keep=2 report=16. Note the residue GREW during the cycle: assess saw 8
open PRs; live count is 18 (11 new conductor/ci-* drafts minted 2026-10-16 while Actions
is suspended — every validation clone that would have closed its PR now leaks one). No
closes were executed: every run state is unresolved without campaign-side disposition,
which is exactly the report-only default. Feeding the janitor `--run-state
<runId>=landed|aborted|live` entries is the follow-up once dispositions are recorded.

## Verification (focused battery per the implement-phase budget)

- `pnpm exec vitest run test/public-dts-drift-guard.test.ts
  test/conductor-pr-janitor.test.ts test/roadmap-length-guard.test.ts
  test/prose-residue-guard.test.ts test/should-release.test.ts` → 5 files / 14 tests
  passed (roadmap guards run against the PATCHED wall).
- `pnpm check-types` → 0 errors (covers the new test + script).
- `pnpm exec eslint <three new files>` → clean; `pnpm lint` total → EXACTLY the frozen 50
  (all pre-existing, all ROADMAP.md).
- `node scripts/conductor-pr-janitor.ts` (dry-run, live gh read) → table above, RC 0.

## Landing notes

- Full validation rides the mirror route (Actions suspended): local mirror of the six Main
  jobs per the outage-validation runbook.
- Re-derive rm-1461..1464 occupancy vs origin/main before landing (06095e9 wall currently
  0-hit for these ids); expect hunk-level ROADMAP conflicts vs the 06095e9 rider region.
- Keep ROADMAP/cycle-doc prose bracket-free where markdown could read it as a label
  reference (frozen-lint trap).
