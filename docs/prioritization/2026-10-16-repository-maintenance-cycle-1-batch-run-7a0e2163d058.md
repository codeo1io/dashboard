---
module: roadmap
tags: ['repository-maintenance', 'cycle-1', 'batch', 'rm-1462', 'rm-1463', 'rm-251']
problem_type: maintenance-batch
owner: dashboard
run_id: 7a0e2163d05846288b3df822ce31c07f
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
  (all pre-existing, all ROADMAP.md) — true at implement time; the compound pass later
  regressed this to 52 (review caught it; restored to 50 in the review-fix pass below).
- `node scripts/conductor-pr-janitor.ts` (dry-run, live gh read) → table above, RC 0.

## Full validation + compound (2026-10-16, attempts a1a03349 / 5aa3a2e0)

Full gate = six-job Main-workflow mirror, deviation-disclosed (verbatim
`github_ci_validate.py` is the ephemeral-PR lane; repo Actions hard-disabled — live 422
dispatch probe vs enabled:true readback vs run list frozen at 37872407109):

| Job | Result |
|---|---|
| install + lint | RC 0; lint EXACTLY frozen-50, identical rule mix at base via stash A/B |
| design-check | impeccable@3.2.1 detect --json web/src web/privacy.html -> `[]` PASS |
| check-types | RC 0 |
| build:web + test | RC 0; 4292/4292 (61 root files/3079 + 34 web/1213; base 4281 + 11 new) |
| check-workflows | actionlint v1.7.12 -> 0 findings |
| test-scripts-load | workflow-verbatim RC 0 + all-scripts sweep (janitor loads clean) |

Digest `validation:v1:4a820d46fd71de5015852cd1cc5300b348c77e339ca5a0bb92c57f01a708394c`
re-derived == dispatch (nothing executable changed post-implement). Per-job logs:
delegate/a1a03349-scratch/.

### Cycle learnings (for the next cycle's assessment)

1. **The CI lint job is structurally red AT BASE**: `pnpm lint` exits 1 on the frozen 50
   ROADMAP.md errors (rm-100 baseline) with or without any delta — stash A/B proved the
   rule mix identical at pristine base. The rm-100 ledger item owns the return-to-green;
   no batch should
   be blamed for (or block on) lint's exit code until it lands — the operative bar is
   frozen-50 parity.
2. **The suspension leaks PRs by design**: conductor/ci-* draft count grew 8 -> 18 during
   this one cycle (11 minted 2026-10-16 alone). Every future full-validation that cannot
   run its ephemeral-PR lane adds one more. The janitor (rm-1463) now exists, but closes
   need campaign-side run dispositions (`--run-state runId=landed|aborted|live`) — feed it
   before the residue buries the PR list.
3. **Two-sided probe discipline works**: GET /actions/permissions and `gh workflow list`
   both read healthy while dispatching 422s — only the POST dispatch probe or the frozen
   run list exposes the outage. Probe BEFORE pushing any validation branch.
4. **npm exec vs pnpm exec**: the engine's impacted-test runner emits `npm exec -- vitest
   run ...`; it resolves the workspace vitest (4.1.11) only because
   node_modules/.bin/vitest exists in this worktree's pnpm layout — probe that link first
   and substitute `pnpm exec` if missing (memory #18720 records the failure mode).
5. **Digest stability**: md-only ledger/doc edits do NOT move the validation digest
   (executable surfaces only) — verified again this cycle (implement digest re-derived
   identical in full_tests). Roadmap/compound phases keep the full_tests anchor current
   instead of re-running suites.
6. **Guard-first paid off**: minting rm-1462 (drift guard) surfaced 3 real undeclared
   exports on its very first run — evidence that hand-maintained .d.ts pairs DO drift
   silently; the shrink-only allowlist pattern (fail on grow, fail on stale) is the
   reusable recipe for pinning any vendored-interface pair.

### State at cycle close (pre-review)

- Tree uncommitted at 3e3664c: M ROADMAP.md (rm-251 flip + mints rm-1461..1464, with
  rm-1462/rm-1463 flipped to implemented-pending-landing in the compound pass) + the 4
  new files.
- Open for next cycle: rm-1461 full-window disposition (re-derive fresh; pins subset
  deferred this cycle on sibling collision), rm-1464 ruleset route (blocked on rm-1450),
  d.ts allowlist-emptying repair unit, janitor --execute with real dispositions,
  #508/#509 manual triage.
- Review and shipping outcomes land after this step; next cycle's assessment carries
  them forward.

## Independent review + fix pass (2026-10-16)

Review attempt 032036e1 returned NEEDS_CHANGES — 7 findings, no architectural
objection (anchors re-verified true). Fix attempt 8199c70c addressed all of them
in the pending tree:

1. **high — lint parity regression (ROADMAP.md:1004)**: the compound-added rm-1463
   evidence line carried four bare ci/run glob asterisks pairing into two emphasis
   spans (+2 `markdown/no-space-in-emphasis`; total 52 vs the frozen 50). Fixed by
   code-spanning every glob fragment; parity re-proven below.
2. **medium — phantom def ref (learning #1)**: cited rm-893, which exists on no wall
   (0 hits in base ROADMAP and origin/main). Re-pointed at the rm-100 ledger item that
   actually owns the frozen baseline and the return-to-green.
3. **medium — silent sweep truncation (janitor `fetchOpenPrs`)**: `gh pr list` defaults
   to 30 results while the residue fleet passed 30-scale during the cycle. Now pinned
   `--limit 200` via an exported, unit-pinned `ghPrListArgs`, plus a stderr warning when
   the cap is hit so truncation can never look complete.
4. **low — usage/parser mismatch**: usage documented `--run-state <runId>=<state>`
   (space form) but the parser accepted only the `=` form, so documented input was
   silently ignored. Both forms now parse; a dangling `--run-state` throws; `--repo` and
   `--superseding-commit` take both forms too.
5. **low — close summary lacked the superseding commit**: rm-1463 acceptance requires
   each close to name its superseding commit; no sha input existed.
   `--superseding-commit <sha>` (7-40 hex, validated) is now REQUIRED whenever a close
   row would print or execute — refusal exit 2 otherwise (proven live read-only:
   `--apply --run-state=<runId>=landed` without the sha refuses after the triage table).
6. **low — typo**: "payed" → "paid".
7. **low — frontmatter drift**: aligned to the newest sibling convention
   (single-quoted tags, `module: roadmap`, `owner`, `run_id`).

Post-fix gates (this turn, fix attempt 8199c70c): janitor unit tests 8 → 10 green;
`pnpm check-types` 0 errors; eslint clean on both changed TS files; `pnpm lint`
EXACTLY frozen-50 again; ROADMAP.md stdin eslint identical to pristine (rule-mix
diff empty); roadmap guard suites green. Janitor dry-run re-probed live post-fix:
8 open PRs (close=0 keep=2 report=6) — the 2026-10-16 ci-draft batch visible at
review time has since been closed outside this tool (the janitor has never executed
a close; the `--limit 200` listing now guards exactly that fleet-scale growth).

## Landing notes

- Full validation rides the mirror route (Actions suspended): local mirror of the six Main
  jobs per the outage-validation runbook.
- Re-derive rm-1461..1464 occupancy vs origin/main before landing (06095e9 wall currently
  0-hit for these ids); expect hunk-level ROADMAP conflicts vs the 06095e9 rider region.
- Keep ROADMAP/cycle-doc prose bracket-free where markdown could read it as a label
  reference (frozen-lint trap), and code-span every ci/run glob — bare glob asterisks
  pairing on one line ship `markdown/no-space-in-emphasis` (the compound pass did;
  review caught it).
