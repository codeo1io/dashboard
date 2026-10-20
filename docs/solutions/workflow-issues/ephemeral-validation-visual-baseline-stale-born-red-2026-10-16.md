---
title: Ephemeral validation PRs fail visual on a stale born-red baseline — prove the cure with cmp, then adopt the matching bytes
date: 2026-10-16
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: high
applies_when: running github_ci_validate.py (or its run_repo_impacted_tests.py fallback) on a worktree whose base predates a visual-baseline regeneration
---

## Problem

The conductor's ephemeral validation PR builds its tree from the **run-base**
HEAD plus the candidate patch, then overlays `.github/workflows` from current
`origin/main` and asks GitHub CI for conclusions. Its `visual` job compares the
**candidate tree's** Playwright baselines against the **candidate tree's**
client render. If the base carries a baseline from an older client shape, the
comparison is born red — the failure is in the base, not the batch, and it will
reproduce on every validation PR from that lineage.

Observed 2026-10-16 (run 9511a1b53fe5460db5bba559f5055b4e, targeted_tests
attempt a131b4bb): base `7042635` carried
`tests/visual/__screenshots__/dashboard.spec.ts-snapshots/dashboard-operator-dark-chromium-linux.png`
at 1280x966 (86215 bytes) while the actual render was 1280x3178. Ephemeral PR
814 failed `visual` with every static check green.

## Diagnosis recipe

1. Do not read the run log first (logs expire fast); pull the artifact:
   `gh run download <run-id> -R codeo1io/dashboard -n playwright-report`.
2. Open `playwright-report/report.md` — it names the failing spec, the expected
   and received image sizes.
3. `cmp` the **received** screenshot (in `data/`, name = its sha256) against
   current `origin/main`'s green baseline for the same spec
   (`git show origin/main:<baseline-path> | cmp - <received.png>`).

If they are byte-identical, the candidate tree renders exactly what a green
baseline already encodes: the defect is purely the stale baseline file.

## Cure

Adopt the matching green bytes into the worktree baseline path (this cycle:
main's `ae3726c4`, 316204 bytes, byte-identical to the failed run's received
screenshot) and re-run the same validation command. PR 815 and the later
full-suite PR 840 both went green with that single change (receipt corrected
2026-10-17 per independent review 11b65ca3: the earlier draft named sibling-run
PR 838, whose checks actually failed).

## Boundary — do not copy main's baseline blindly

The baseline must match **the validation tree's client render**, not main's
current client. This recipe's cmp step is the proof obligation: if main has
since regenerated baselines for client code that is *newer than the run base*,
its bytes will not match the base-era render and adopting them is wrong —
regenerate against the validation tree instead (run the spec locally with
`--update-snapshots` semantics or re-derive from the received artifact if the
render itself is canonical).

## Related

- Baseline currency is also ledger-tracked (rm-142 rider, 2026-10-16).
- The same overlay rule is why non-workflow surfaces must stay base-era
  consistent in a validation tree (see the fro-bot.yaml overlay notes in
  `AGENTS.md` landing-pipeline traps).
- PNG baselines are executable-classed for the validation digest: adopting one
  changes the digest and must be declared at emission time, not copied from an
  earlier dispatch.
