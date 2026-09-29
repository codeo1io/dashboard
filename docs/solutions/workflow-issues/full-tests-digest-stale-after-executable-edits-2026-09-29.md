---
title: full_tests validation digest is emission-tree-bound — executable edits after dispatch invalidate the declared digest
date: 2026-09-29
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - 'A full_tests phase must edit executable surfaces (code, workflow files, lockfile) before or after firing github_ci_validate.py'
  - 'The validator prints no digest of its own and the work order supplies a dispatch-time validation_digest'
  - 'A green verdict gets rejected by the fold gate as stale'
tags:
  - full-tests
  - validation-digest
  - github-ci-validate
  - refire
---

## Problem

The full_tests fold gate re-derives a digest over the CURRENT tree and
compares it to the declared `validation:v1:<sha>` from the work order. The
validator itself prints no digest, so the default instruction — "copy the
dispatch digest verbatim" — is only correct when the attempt changed NOTHING
executable since dispatch.

Observed case (run 5e7cb89f, attempts a38cdc74 → 206a418e): the attempt
reached green (ephemeral PR #268, 10/10 checks, `ok:true`, exit 0), then
fixed a real regression and mirrored a workflow rider — both executable
edits — but still declared its PRE-edit dispatch digest. The fold gate
re-derived the post-edit tree's digest, rejected the phase as stale, and
forced a full re-fire. A wasted ~20-minute CI cycle over a declaration, not
a defect.

## Cure

Decide the digest declaration from the attempt's edit history, not from a
rule of thumb:

- **Zero executable edits since dispatch** → declare the dispatch digest
  verbatim. Prove the zero-edit property with a same-turn census
  (`git status --short` unchanged from the implement phase's dirty set,
  `find . -newermt <window>` empty) before firing.
- **Executable edits are required this attempt** → the green verdict anchors
  the tree by its own commit id / `pr_number`; the digest the fold gate will
  accept is the one derived over the POST-edit tree (the next dispatch's
  digest). Declare that, citing the verdict's commit identity — or close the
  phase with the edits still pending and let a zero-edit re-fire declare its
  dispatch digest cleanly (the observed cure: 206a418e, 10/10, accepted).
- Never edit executable surfaces between the validator's snapshot and the
  declaration: the validator re-snapshots the CURRENT worktree at launch, so
  mid-run edits are simply invisible to the run AND break the declaration.

## Corroboration shortcut

When a re-fire's tree is byte-identical to a prior green attempt's validated
commit, prove it cheaply: `git fetch origin <commit>` then
`git diff <commit> -- .` should show only untracked files (and `cmp` them).
A prior green over an identical tree is legitimate corroborating evidence —
cite it honestly instead of re-burning a CI window.
