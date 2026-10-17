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
