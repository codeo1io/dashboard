---
module: roadmap
tags: ['repository-maintenance', 'cycle-6', 'batch-selection', 'hygiene', 'rm-1975', 'rm-1976', 'rm-1977']
problem_type: maintenance-batch
owner: dashboard
run_id: 0790be13ff884b6d8cb2c11706df1e44
attempt: 2a34910a8a8b4a53a4055a6db92e4902
base: 505cc466
selected: 2026-10-18
---

# Repository maintenance cycle:6 — batch selection (prioritize)

## Base and worktree

- Base `505cc466` (worktree of the 2026-10-17 mass-fold, one landing behind origin/main `debde800`).
- Uncommitted lineage in the worktree: the cycle:6 roadmap delta (+20 ROADMAP.md: rm-1975, rm-1976, rm-1977 minted; riders on rm-252 and rm-139). This doc adds the selection record.
- Standing constraint inherited from cycle:1: repo Actions remains suspended for live-GitHub mutations (scheduled-trigger darkness re-verified through 2026-10-18T00:22Z — cron `0 0 * * *` created no run while pull_request runs flow); every leg below is locally gateable end to end without a live mutation.

## Scoring axes

Impact (fleet/repo value), Effort (S/M/L), Risk, Dependencies, Strategic value. Ranking favors: dated urgency first, then fleet leverage per unit effort, then lineage continuity; blocked-by-externals items sink regardless of raw priority.

## Selected batch — "hygiene truth + guard hardening" (4 legs)

### B1 — Fro Bot secret-presence gate re-land (assess finding 1; fog rm-1518 co-applicability)

- Impact HIGH / Effort S / Risk LOW / Deps NONE.
- The 2026.10.43 adoption merge `c51597ad` silently stripped the fro-bot.yaml self-gate (present and proven at `55086ddc`; scheduled run 38998347282 green-skipped on it 2026-10-17T03:19Z); at this base secrets.FRO_BOT_PAT is consumed unconditionally (`.github/workflows/fro-bot.yaml:306`, `:324`) with 0 repo + 0 org secrets on a public repo — the next scheduled fire is a predicted red nightly (the last ungated scheduled fire, 2026-09-18, failed).
- Leg: restore the `55086ddc` gate shape (env.HAS_FRO_BOT_PAT, skip-warning step, per-step guards) plus in-file hardening-survival markers (grep-countable) implementing the rm-252 rider mandate; actionlint container-form gate.
- Coordination: the unlanded fog rm-1518 batch (run adc26670) carries a gate re-land — content-identical intent reconciles first-landed-wins at integrate; the AGENTS.md Fro Bot state line stays in that batch's scope (deferred by rm-1977's acceptance, no double-write).

### B2 — rm-1975: sweep + janitor extend to the `conductor/run-*` namespace

- Impact HIGH / Effort M / Risk LOW / Deps rm-1463/rm-742 stewardship (same-file coordination only).
- 229 `conductor/run-*` refs on origin (47 older than 14d, ~15/day, oldest 2026-09-21) plus 4 open residue PRs (#860/#798/#790/#787; run ids absent from origin/main merge history) are structurally invisible to both tools (SWEEP_NAMESPACES at `scripts/sweep-stale-conductor-refs.ts:28`; CONDUCTOR_HEAD_PATTERN at `scripts/conductor-pr-janitor.ts:70`); the covered ci/ci-base population is clean (126 refs, 0 stale past 14d — self-cleaning works where covered).
- Leg: extend both tools to the run-* form reusing the existing landed/aborted/live disposition; record a dry-run census (no deletions, no closures — two-flag gate untouched) in the implement cycle doc; tests for the new classification ride the existing suites.
- This cycle performs NO live mutation: ref deletion and PR disposition execute only through the two-flag gate in a later phase (Actions-darkness constraint).

### B3 — rm-1976: d.ts drift-guard pins names, not counts

- Impact MEDIUM / Effort S / Risk LOW / Deps NONE.
- TYPE_ONLY_COUNTS at `test/public-dts-drift-guard.test.ts:56-60` passes silent type/interface renames while the file header claims full type pinning; public/ is excluded from the web type-check, so nothing else catches a rename.
- Leg: pin sorted per-file NAME lists for type-only exports; reword the header to match the enforced invariant; rename-probe round-trip proves the gate diffs; check-types green.

### B4 — rm-1977: runbook DASHBOARD_VERSION coverage

- Impact MEDIUM / Effort S / Risk LOW / Deps NONE.
- Zero runbook mentions of the Dockerfile-baked VITE_DASHBOARD_VERSION knob (grep 0 hits) — an operator rebuilding the image cannot discover it; a stale footer then reads as a bug.
- Leg: runbook section (what it bakes, where it surfaces, build-time override) + one-line pointer at the Dockerfile ARG + a docs-guard pin so the knob cannot silently go undocumented again. AGENTS.md Fro Bot line explicitly OUT (fog rm-1518 owns it).

## Non-selected (rationale)

- rm-252 absorb window 2026.10.44-.45 (priority 80.0): dependency-blocked — the INTEGRATE CORRECTION verdict (deployed gateway estate vs the contract ladder) still gates absorb-class risk, and the window is a 33-file surface introducing a markdown-it dependency and a new gateway module. Own cycle with the verdict in hand.
- rm-139 node-train verdict (due 2026-10-20): a decision plus image work whose adoption gate is v26 LTS promotion on 2026-10-28; recording the verdict is a roadmap rider (next roadmap/integrate touch), not this batch's code. The rm-647 libpcre2 HIGH rides the same image family.
- rm-100 "gates green at HEAD" (priority 100.0): local gates ARE green at this base (census, eslint, roadmap guards all rc0 this cycle); its residual scope is main-observability, which needs live CI truth that the Actions outage withholds. Not batchable end to end now.
- rm-022 untested modules (priority 100.0): mega-scope, nibbled across cycles; no coherent slice binds to this batch's theme.
- rm-142 visual lockstep (priority 86.0): three-way playwright lock procedure with the upstream 1.64.1 dance — separate lane, no dated urgency.
- rm-1437 Actions outage root-cause (priority 78.0): cause sits above repo settings (billing/scope escalation); not a repo-editable batch.
- rm-280 / rm-225 GraphQL canaries (priority 84.0 / 76.0): both need a live scheduled cron fire to prove; scheduled-trigger darkness blocks them.
- rm-102 / rm-282 / rm-133 dependency-automation floors: medium effort, no dated urgency; defer to a tooling cycle.

## Batch gates (planned)

actionlint (container form) for the workflow leg; eslint on every touched surface plus this doc; vitest on the two extended tool suites and the hardened guard; check-types; roadmap census + the three roadmap guard files re-run after the implement-phase status flips. No commit/push/pr/ci in this phase.

## Implement-phase dry-run census and dispositions (2026-10-18, rm-1975 acceptance)

All commands read-only toward GitHub (sweep fetches origin into a self-cleaning temp namespace; janitor runs `gh pr list`); zero deletions, zero closures — the two-flag mutation gate (`--apply`/`--execute`) is untouched and live mutation is deferred to a push-authorized phase per the Actions-darkness constraint.

### Sweep census — `node scripts/sweep-stale-conductor-refs.ts --json` (2026-10-18T09:05Z)

- `totalInNamespace: 372`, `cutoffDays: 14`, stale candidates: **48 — every one `run-*`** (cross-checked `git ls-remote origin`: 246 run-*, 124 ci-base-, 2 ci-).
- Stale `run-*` ages: 14–26 days (oldest ≈ 2026-09-22, matching the assess-time oldest 2026-09-21).
- The covered ci-/ci-base- population remains at **0 stale past 14d** — self-cleaning works where the namespaces are covered; the entire drift is the newly-covered run-* class.
- Growth line (rm-1975 measurability mandate): run-* refs 229 at 2026-10-17T22:53Z (assess) → 246 at 2026-10-18T09:05Z = +17 in ~10.2h ≈ **~40/day, faster than the ~15/day estimate** at mint time.

### Janitor triage — `node scripts/conductor-pr-janitor.ts --repo codeo1io/dashboard --json`

5 conductor PRs now in scope (pre-widening, the four run-* heads classified as non-conductor and were invisible):

| PR | Head | Age | Run id on origin/main | Recorded disposition (NOT executed) |
|----|------|-----|----------------------|--------------------------------------|
| #860 | conductor/run-528f458d245a | 2026-10-17T09:17Z | 0 merge hits | superseded-close (absent-merge evidence; empty checks per assess) |
| #798 | conductor/run-1108172d68c2 | 2026-10-16T22:20Z | 0 merge hits | superseded-close (same evidence class) |
| #790 | conductor/run-3d6aa134904b | 2026-10-16T21:24Z | 0 merge hits | superseded-close (same evidence class) |
| #787 | conductor/run-40bcd47ae79f | 2026-10-16T21:10Z | 0 merge hits | superseded-close (same evidence class) |
| #926 | conductor/ci-6fb4fd6f93cf (draft) | 2026-10-18T02:13Z | 0 merge hits | report-only-while-fresh: opened ~7h before census, possibly an in-flight validation run — re-triage once aged; NEW since assess |

Merge-hit evidence: `git log --oneline origin/main --grep=<runId>` empty for all five (528f458d, 1108172d, 3d6aa134, 40bcd47a, 6fb4fd6f), re-verified against a fresh `git fetch origin main` this phase. Closures/`--run-state` dispositions execute only in a later push-authorized phase through the janitor's two-flag gate.

### Verification re-probe (2026-10-18T15:58Z, adoption attempt 282eddb0)

Both widened tools re-run read-only against the live repo during result-adoption verification (all gates re-run green the same pass):

- Sweep dry-run: `totalInNamespace: 385`, stale past 14d = **59 — still every one `run-*`** (up from 48 @ 09:05Z); temp fetch namespace self-cleaned (0 residue refs).
- `git ls-remote` breakdown: 257 `run-` + 128 `ci`/`ci-base-` (in-namespace total 385) + 1 `visual-capture-` (deliberately excluded). Growth after-line: run-* 246 @ 09:05Z → 257 @ 15:58Z = +11 in ~6.9h ≈ **38/day**, consistent with the ~40/day estimate.
- Janitor: the 4 `run-*` residue PRs (#860/#798/#790/#787) still open, unchanged; #926 (report-only-while-fresh at census) has since left the open set — its disposition resolved itself; NEW fresh `ci-` draft **#983** (c5c35adecc09) inherits the same report-only-while-fresh posture until aged. Still zero deletions, zero closures.

## Adoption re-probe (2026-10-18T21:47Z container clock, attempt 636712a5)

Third read-only re-validation of the widened tools during adoption verification (after provider reaps of attempts 290f60da/cc130979 — the implement work itself is attempt 897a2057's, verified in-tree, not redone). All gates re-run green this pass: vitest 4 batch suites 33/33 + 3 roadmap guards 15/15, eslint rc0 on all 11 touched surfaces, check-types rc0, census 278/0-dups/max rm-1977, actionlint 1.7.12 container rc0, hardening marker count 6.

- Sweep dry-run: `totalInNamespace: 387`, stale past 14d = **64 — still every one `run-*`** (oldest 27d); temp fetch namespace self-cleaned (0 residue refs).
- `git ls-remote` breakdown: 261 `run-` + 125 `ci-base-` + 1 `ci-` = 387 in-namespace + 1 `visual-capture-` (deliberately excluded). Growth line: run-* 257 @ 15:58Z → 261 @ 21:47Z (+4 in ~5.8h ≈ 17/day — slower than the ~38-40/day daytime rate).
- Janitor: 5 conductor PRs in scope — the 4 residue `run-*` PRs (#860/#798/#790/#787) unchanged and still open; fresh draft is now **#998** (`run-c8b5d2ece18f`; #983 left the open set since 15:58Z). All 5 rows report/unknown with no `--run-state` passed — the two-flag mutation gate observed intact; zero deletions, zero closures.
- Merge-hit evidence re-verified against a fresh `git fetch origin main`: all four residue run ids (528f458d/1108172d/3d6aa134/40bcd47a) still 0 merge hits on origin/main — the recorded superseded-close dispositions stand.

## Implement-phase gate record (2026-10-18)

- vitest (4 suites: conductor-pr-janitor, sweep-stale-conductor-refs, public-dts-drift-guard, runbook-dashboard-version-guard): 4 files / 33 tests passed.
- rm-1976 pre-existing-red proof: the HEAD version of the old count-pin guard fails 2 of 3 cases (operator-stream 32/35 vs pinned 31/34; run-index 4 vs pinned 3) — the name-pin regen fixed a live broken gate.
- rm-1976 rename probe: `LaunchClient` → `LaunchClientRenamedProbe` in public/operator-launch.d.ts turns the guard red with the exact name diff; revert restores green (3/3).
- actionlint (container form, `rhysd/actionlint:1.7.12`) on `.github/workflows/fro-bot.yaml`: rc=0.
- B1 hardening-survival marker: `grep -c HAS_FRO_BOT_PAT .github/workflows/fro-bot.yaml` = 6 (marker threshold: ≥ 5).
- eslint, check-types, roadmap census + three roadmap guard files: run at phase end (see PhaseResult evidence).
- Re-verification pass 2026-10-18T15:54–15:58Z (adoption attempt 282eddb0): all gates re-run green on the untouched tree — vitest 7 files / 48 tests, eslint rc0 on all 11 touched surfaces, check-types rc0, census 278/0-dups/max rm-1977, actionlint rc0, marker count 6. Tree census at re-verification: exactly 9 tracked `M` + 2 intended `??`, HEAD 505cc466, `public/` probe-clean.
