---
module: dashboard
tags: [github-actions, ci, ephemeral-pr-validation, scheduled-workflows, validation-scope, dependency-review]
problem_type: workflow-issue
---

# A green ephemeral-CI validation PR proves the PR-triggered surface only

**Date**: 2026-10-06 · **Runs**: 8b1672ef (targeted_tests 664f580a — PR #393;
full_tests 73c95090 — PR #395) · **Base**: 306a972.

## Problem

The sanctioned repository-wide validation route for this repo
(`github_ci_validate.py`) pushes a snapshot to an ephemeral PR
(`conductor/ci-<head>` on base `conductor/ci-base-<base>`) and waits on the
PR check rollup. That rollup is exactly the workflows with `pull_request`
triggers — 11 checks: Main (Lint / Check Types / Test / Check Workflows /
Test Scripts Load / Design Check), CodeQL (+ Analyze), Dependency Review,
Lockfile Guard, visual.

It structurally CANNOT speak for the scheduled fleet, because none of them
trigger on PRs:

- `audit.yaml` — weekly Monday 03:37 UTC (`pnpm audit --recursive`); by design
  schedule-only so it never gates a merge.
- `canary.yaml`, `base-drift.yaml`, `upstream-drift.yaml`, `scorecard.yaml` —
  Monday crons (03:37–06:27 UTC window).

Consequences observed first-hand this cycle: the full validation (PR #395,
ALL 11 checks SUCCESS) was green on the same day a fresh `pnpm audit`
re-derivation on the identical lockfile returned rc=1 with 2 advisories (see
`recorded-audit-greens-expire-with-advisory-db-2026-10-06.md`) — no PR check
exercises the audit step, and Dependency Review (PR-diff-only) does not flag
vulnerabilities in resolutions the PR does not change. A green validation PR
is therefore **necessary, not sufficient** for repo health.

Practical corollary: scheduled-fire evidence also lags — the 2026-10-05 Monday
crons landed +6h58m..+8h39m late (queueing), so same-day absence of a
scheduled result is not a signal.

## Rule (prevention)

1. Read an all-green ephemeral-CI validation as "the PR-triggered surface is
   green", nothing more.
2. Before declaring repo-level health (fold/ship decisions), check the
   scheduled workflows' latest fires separately, and re-derive any gate that
   depends on moving external state (advisory DB) live — see the companion
   audit-expiry doc.
3. When a workflow is deliberately schedule-only, keep it that way but record
   what its checks would and would not have caught (rm-278's mint analysis is
   the model).
4. Review-enforceable re-validation checklist: ANY post-validation fold into
   the validated tree (dependency floors, lockfile regen, ledger/markdown
   edits — exactly this cycle's review-fix shape) must re-run live
   `pnpm audit -r` and `pnpm lint` and attach both exit codes to the fold
   evidence; an independent review returns NEEDS_CHANGES when either is
   missing or red. The 2026-10-06 review of run 8b1672ef (attempt 1d96c395)
   found exactly this pair red on an 11/11-green-PR tree — the checklist
   makes that finding routine instead of adversarial luck. (rm-276 rider
   prescribes the live-audit half for floors; this extends it to lint and
   makes both fold-blocking.)

## Evidence

- `gh pr checks 395` (2026-10-06): 11/11 pass, including Dependency Review,
  on a tree whose lockfile carries `source-map-js@1.2.1` / `katex@0.16.47`
  against GHSAs published 2026-09-30+.
- `grep` triggers of `.github/workflows/{audit,canary,base-drift,
  upstream-drift,scorecard}.yaml`: schedule/cron only, no `pull_request`.
- Zero-debris pattern both runs: PR self-closed with `--delete-branch`, both
  ephemeral refs deleted (`git ls-remote` → 0 rows) — the route is reusable
  without cleanup hazards.
