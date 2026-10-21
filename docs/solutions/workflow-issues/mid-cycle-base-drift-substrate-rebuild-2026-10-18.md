---
title: Mid-cycle base drift — advance to green main via stash + ff-only, then rebuild the candidate as substrate instead of fighting stash-pop conflicts
date: 2026-10-18
last_updated: 2026-10-18
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - A conductor work order dispatched against base X sees origin/main move (and go GREEN on the checks the candidate cares about) before its validation gate runs
  - The candidate's validation fails on failure classes that main has since cured (born-red baselines, absorbed fixes, pre-landed dependency legs)
  - The uncommitted candidate delta spans files main also touched (manifest, lockfile, ledger)
symptoms:
  - "Ephemeral validation red on a tree whose own diff is green-by-construction (manifest+lockfile+docs only)"
  - "git stash pop after ff-only reports UU conflicts on package.json / pnpm-lock.yaml / ROADMAP.md"
  - "The conflict hunks make it look like main already landed the candidate's work when it has only landed PARTS of it"
solution: |
  Sequence that worked on 2026-10-18 (run 5457d3ff targeted_tests): the dispatched base
  64cd2f6a was born-red on visual; by validation time main had cured itself (389d60ef,
  plus it had PRE-LANDED two of the batch's seven dependency legs via f5927919/57f50594).

  1. git stash push (keep the candidate safe), git fetch origin main, git merge --ff-only
     FETCH_HEAD — never merge-commit an unlanded candidate onto the new base.
  2. Do NOT resolve the stash pop in place. git checkout HEAD -- over the conflicted
     files to take MAIN as substrate, then re-apply the candidate's still-relevant legs
     by hand (edit the manifest pins again, re-apply the ledger ext from its spool
     patch). The stash's value is as a REFERENCE, not as the merge source.
  3. Verify what main actually took before deciding what to re-apply: grep the new base's
     package.json/pnpm-lock.yaml/ROADMAP.md for each leg. Conflict hunk LAYOUT lies —
     during this cycle an Updated-upstream side that contained rider text resembling the
     candidate's led to a false 'already folded' conclusion; the file-level grep proved
     only 2 of 7 legs were on main. Drop the stash only after the grep proof.
  4. Re-resolve the lockfile (corepack pnpm install, then a targeted pnpm update per
     moved package to prune the orphaned old-version entries pnpm leaves behind).
  5. Re-run the gate. The remaining red, if any, is now candidate-caused and actionable
     (that cycle: the axe 4.14 leg — see the rule-bearing-dep-bump solution doc).

  Follow-on detail: the engine's fold gate re-derives the validation digest against the
  RUN base, not the advanced HEAD — derive with the engine's own
  validation_policy.validation_digest(RUN_BASE, worktree) and declare that; the
  vs-HEAD variant goes in the summary for traceability only.
verification: |
  - git status shows only the candidate's intended files modified on the advanced base;
    no conflict markers; stash dropped only after the grep proof of what main carries.
  - Ephemeral validation on the rebuilt tree reads success (2026-10-18: validator
    PR #913 on head conductor/ci-15ad0862109c — runs 39084268885 Main / 39084268895
    visual / 39084268880 Dependency Review all success, Fro Bot 39084268898 skipped),
    and the declared digest re-derivation matches the engine's method.
related:
  - docs/solutions/workflow-issues/rule-bearing-dep-bump-reds-axe-gate-2026-10-18.md
  - docs/solutions/workflow-issues/base-drift-empty-live-digest-extraction-guard-2026-09-24.md
tags:
  - base-drift
  - rebase
  - stash
  - lockfile
  - conductor
---
