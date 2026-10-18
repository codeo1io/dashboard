---
title: Pre-diagnose mixed-tree validation hazards before spending a CI cycle
date: 2026-10-18
category: workflow-issues
module: ci-validation
problem_type: prevention-rule
component: [github_ci_validate, release-trigger-paths, visual-tests]
severity: medium
applies_when: running any conductor validation gate (targeted or full) in the dashboard estate while origin/main moves between validations
tags: [validation, mixed-tree, baselines, release-paths, pre-diagnosis]
---

# Pre-diagnose mixed-tree validation hazards before spending a CI cycle

## Problem

`github_ci_validate` builds its ephemeral validation tree as: **workflows from
CURRENT origin/main + every other file from the batch's base HEAD + the batch
diff**. When main lands workflow changes between a batch's base and its
validation, the batch can go red on files it never touched. Two classes hit in
one cycle (run 26b6e1ab0a9f, 2026-10-17/18):

1. **rm-142 lockstep (baseline companions).** Main's visual.yaml/playwright
   image advanced past the base; the mixed tree compared runner-rendered
   output against stale baselines — `dashboard-operator-dark.png` expected
   1280x966, received 1280x3178. The other two visual specs passed; no batch
   surface touched visual. Cure: the sanctioned baseline harvest — build the
   exact validation tree with the engine's own `_prepare_validation_clone`
   (release src on sys.path; doubles as the apply-conflict pre-check), push
   its head as a `conductor/ci-baselines-*` tool branch, run
   `gh workflow run visual.yaml --ref <branch> -f update-baselines=true`,
   harvest the `visual-baselines` ARTIFACT into the worktree (runner-captured
   only — never regenerate on a workstation; cloud font stacks differ), delete
   the branch. (Note: only dashboard-operator-dark actually differs across
   image 1.63→1.64; listener/privacy are byte-stable.)

2. **PR-#898 class (release-paths parity).** Main's release.yaml
   `on.push.paths` gained `scripts/gzip-static-sidecars.ts`; the mixed tree
   pairs it with the base's `scripts/release-paths.ts`, and
   `test/release-trigger-paths.test.ts`'s "Mode PR safety" leg requires every
   workflow push-path to appear in `WORKFLOW_TRIGGER_ONLY_PATHS` ∪ HARD —
   ours listed 11 of 12. Cure: add the path to `WORKFLOW_TRIGGER_ONLY_PATHS`
   (trigger-only keeps the base-era Direction-A leg green; at integrate,
   main's own HARD pairing wins — check
   `git show origin/main:scripts/release-paths.ts`).

## Prevention rule (the compounding lesson)

Before every validation gate, spend two minutes on main's workflow delta
since the last GREEN validation instead of discovering the red in CI:

1. `git fetch origin main && git diff --stat <last-green-sha> origin/main -- .github/workflows`
   — if only push-paths/release-trigger semantics moved, expect class 2; if
   visual/image/playwright shapes moved, expect class 1.
2. For class 2: enumerate `git show origin/main:.github/workflows/release.yaml`
   push-paths against the local `WORKFLOW_TRIGGER_ONLY_PATHS ∪ HARD` lists.
   Prove the fix locally by overlaying main's workflow onto the worktree,
   running the parity suite, and restoring the file byte-identically —
   `cp` backup, test, restore, confirm porcelain unchanged. This converts a
   deterministic CI failure into a local proof and keeps the ephemeral PR
   record green-first.
3. For class 1: confirm the mismatch is baseline-class (dimension-delta
   signature; other specs green; no batch surface in visual) before
   harvesting — the harvest touches executable surfaces (`tests/` prefix is
   executable-classed) and therefore RE-KEYS the emission digest; re-derive
   with the RUNNING engine release's `validation_policy` afterward and
   declare that digest, never the dispatch-time one.
4. Any local overlay/probe must leave the tree byte-identical (backup +
   restore + porcelain check); a drifted overlay is worse than the red.

Why pre-diagnosis beats red-first: the failure classes are fully determined
from readable facts (test source, main's workflow text, local lists), a red
ephemeral-PR cycle costs ~8 minutes and leaves a misleading failure record
attributable to the batch, and the cure is often a one-line conscious-entry.

## Evidence

- Run 26b6e1ab0a9f targeted_tests: first validator run red on visual only
  (1280x966 vs 1280x3178), cured by the sanctioned harvest (baseline run
  39070172109), identical command then green overall.
- Run 26b6e1ab0a9f full_tests: parity hazard pre-diagnosed from
  57f50594→origin/main workflow delta (+22 release.yaml only), cured with the
  trigger-only entry, proven via the overlay simulation (8/8 with main's
  workflow), full gate green FIRST cycle (PR #923; re-validated PR #948).
- `docs/plans/2026-10-17-001-darkness-watch-probe-truth-hono-215-exact-pin-plan.md`
  carries both step-by-step records.
