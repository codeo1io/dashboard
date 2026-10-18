---
title: Ephemeral CI validator grafts main's workflows onto an old worktree base — full_tests path-parity reds foreign to the batch
date: 2026-10-18
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: low
applies_when:
  - 'A conductor full_tests run (`github_ci_validate.py --repo .`, release 854477cb era) fails the Main Test bucket on `test/should-release.test.ts` — "every workflow paths entry is accounted for by the guard" names a path your batch never touched (e.g. `scripts/gzip-static-sidecars.ts`)'
  - 'Your worktree base predates an origin/main commit that added a path to `.github/workflows/release.yaml` `on.push.paths` AND its guard pairing'
symptoms:
  - 'The named path appears ZERO times in your worktree (`grep` the workflows dir + `scripts/release-paths.ts` = 0 hits) and the suite passes locally 64/64'
  - 'Re-running the validator reproduces the identical failure (deterministic, not a cold-runner flake)'
root_cause: |
  The validator's ephemeral tree is NOT a rebase of your branch onto main: per
  `hermes_conductor/github_ci.py` (`tree_source`), it builds the tree from the WORKTREE HEAD tree
  and grafts `.github/workflows` from CURRENT origin/main. Any main commit that adds a
  workflow-referenced path after your base therefore lands in the ephemeral tree UNPAIRED with
  your base's `scripts/release-paths.ts` corpus, and the should-release parity guard reds —
  regardless of your batch's content. Proven run c84d9094a65d full_tests (2026-10-18): base
  edf948de, main 5ab50da0 carrying 9f67ea88's `scripts/gzip-static-sidecars.ts` pairing.
resolution: |
  Adjudicate first — prove the red foreign (grep zero refs in your tree + local suite green +
  `git log origin/main -1 -- <path>` shows the pairing commit postdating your base) — then align
  BOTH guard halves to main's landed content in the uncommitted delta:
  `git checkout origin/main -- scripts/release-paths.ts .github/workflows/release.yaml`
  (verify `git diff origin/main -- <both>` = 0 lines). Both guard directions (`unaccounted` AND
  `extraneous`) then pass in the local tree AND the ephemeral tree, and the hunks are
  content-identical to the fold target, so the landing rebase no-ops them. Because these are
  executable surfaces, RE-DERIVE and declare the fresh `validation:v1` digest
  (`hermes_conductor.validation_policy.validation_digest(base_sha, worktree)`) — the dispatch-time
  digest is now stale and the fold gate rejects stale declarations.
alternatives:
  - 'If pulling main''s workflow file is unwanted, the #19162 allowlist cure (one `WORKFLOW_TRIGGER_ONLY_PATHS` entry in scripts/release-paths.ts) keeps the local base''s yaml untouched — the allowlist is excluded from the corpus→workflow reverse assertion while a corpus-only line is not. Post-fold, main''s landed shape (corpus pairing + yaml entry) supersedes either.'
prevention:
  - 'Treat any full_tests failure naming a path absent from your tree as a base-age artifact FIRST; blame the injection template before the batch (extends the #19140/#19153 class with the exact 854477cb tree-construction mechanism).'
  - 'Long-lived worktrees: re-derive the corpus-vs-workflow pairing whenever origin/main moves a workflow `paths` filter; the mismatch only surfaces at full_tests time.'
references:
  - 'run c84d9094a65d424fba812b8b286ed080 full_tests attempt 09b95c464643434faf31e72329ed73bd (3 runs: rc=1, rc=1, rc=0 after cure; /tmp/c84d7-full*.log)'
  - 'ephemeral PR #939, commit 11e496b2037855150b8cc967808a55312636c537 — the green record'
  - 'docs/prioritization/2026-10-17-repository-maintenance-cycle-4-batch-run-c84d9094a65d.md — Compound outcome section'
