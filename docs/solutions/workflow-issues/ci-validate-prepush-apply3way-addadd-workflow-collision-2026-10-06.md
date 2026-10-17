---
title: github_ci_validate fails pre-push when git apply --3way hits an add/add on a workflow file main landed separately — harmonize batch bytes to the live tip first
date: 2026-10-06
last_updated: 2026-10-06
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - A completion-locked full_tests phase runs scripts/github_ci_validate.py and exits rc=1 within seconds, before any push or PR exists
  - The log shows 'fatal: 3-way merge failed' and 'U .github/workflows/<file>' from git apply --3way inside the validation clone's prepare step
  - The batch adds or rewrites a .github/workflows/* file while current origin/main has since landed its own variant of that same path
  - The identical command went green earlier the same day for a run pinned at an older main tip
tags:
  - conductor
  - validation
  - github-ci-validate
  - git-apply-3way
  - add-add-collision
  - workflow-harmonization
---

## Problem

`scripts/github_ci_validate.py` (release 5a13a866 `github_ci.py`) builds its
ephemeral validation clone in three steps: (1) a temp-index snapshot of the
worktree (`git add -A` under the engine's excludes), (2) a temp clone whose base
is constructed from the **current** `origin/main` workflow files, and (3) the
run's diff applied onto that base with `git apply --3way`. Push, draft PR,
polling and teardown all happen strictly AFTER the apply — so the apply is a
pre-push gate, and it evaluates against the live main tip, not the run's pinned
base.

When a batch carries a workflow file as an **add** (or content divergent from
what main has), and main has since landed its own variant of that path, the
3-way apply hits an add/add (or content) collision and fails closed:

```
error: could not apply patch...
fatal: 3-way merge failed on .github/workflows/lockfile-guard.yaml
U .github/workflows/lockfile-guard.yaml
```

Failing closed is the correct behavior: rc=1 in ~5s, zero refs pushed, zero PRs
opened, zero remote debris. The failure costs one attempt, not a cleanup.

## First-hand repro (run e9bc28f5, repository-maintenance cycle:3, 2026-10-06)

The batch adopted the fleet-cure `lockfile-guard.yaml` (62-line variant, blob
`c3f7b6d9`) byte-for-byte from the origin run's validated PR #389 head
(`conductor/ci-6f0d0d063134`). Between the run's targeted phase and its
full_tests phase, `origin/main` moved `3d07cf9 → fe928ca`, and `fe928ca`
landed its **own** 58-line variant (blob `97a8ebf6`). The full_command
(verbatim) then died pre-push on exactly that file: a `git merge-tree` census
of the temp-index snapshot against the new tip showed one 'added in both'
(`lockfile-guard.yaml`) plus three 'changed in both' files the apply could
have handled. Same-day sibling runs hit the identical class from the mirror
direction (their older base colliding with a later landing) — the mechanism
and the fix are the same both ways.

## Cure (applied in-phase; retry went green end-to-end)

1. **Re-probe the live tip** — `git ls-remote origin refs/heads/main`. Never
   trust a cached fetch: this repo's main moved `3d07cf9 → fe928ca → c210933 →
   ac61ff3` within hours on 2026-10-06, and its history has been rewound
   same-day before. Re-probe at *every* route.
2. **Hash-compare every workflow file the batch touches** against that tip:
   `git hash-object <file>` vs `git rev-parse origin/main:<path>`.
3. **Adopt the tip's bytes when the delta is comment-only — and prove it**:
   diff the variants and count changed lines that are not `^[-+]\s*#`
   (must be exactly 0); triggers/steps/stanza content stay identical.
4. **Re-validate cheaply**: `actionlint` (container form) rc=0 on the
   harmonized file; re-stage so the temp-index snapshot carries the new bytes.
5. **Re-derive and re-declare the emission digest.** Comment-only byte changes
   DO move `validation:v1:` (it is a content hash over executable surfaces):
   this run's digest moved `9cade959… → 76030301…` on a 20-line all-`#`
   harmonization. A digest declared before harmonization is stale.
6. **Re-run the full_command verbatim.** Retry result here: ephemeral draft PR
   #402, 11/11 checks SUCCESS, head `7be773d54b07`, both `conductor/ci-*` refs
   deleted on teardown — zero debris.

With this run's retry the harmonized guard was `97a8ebf6` (58 lines, the then
tip's variant). By compose time the tip had moved again to a 68-line variant
(blob `1ab27c9`) — the obligation is recurring, not one-shot: harmonize at
every route.

## Prevention checklist

- Before EVERY `github_ci_validate` route: `git ls-remote` the tip and
  hash-compare ALL batch workflow files against it. A batch validated green at
  one tip can trail the next tip hours later.
- Treat 'comment-only' as the safe class ONLY with the stripped-diff proof
  (zero non-comment changed lines) plus an actionlint rc=0. Real content
  divergence between fleet variant and main variant is a decision, not a
  silent adoption.
- Do not 'work around' the collision by dropping the file from the batch: the
  guard/workflow is part of the cure; harmonize instead.
- After ANY byte change to an executable surface — even comments — re-derive
  the validation digest before declaring evidence.

## References

- Run `e9bc28f55ed24038bce3613649c6e9af` full_tests artifacts: attempt
  `736cc62b` (fail-closed record + merge-tree conflict census) and attempt
  `f95c7f3f` (harmonization delta proof + PR #402 pass record), delegate spool.
- Related, same module mechanics:
  `docs/solutions/workflow-issues/validation-clone-exclude-pathspec-drops-staged-breadcrumb-deletion-2026-09-24.md`
  (temp-index snapshot pathspec behavior),
  `docs/solutions/workflow-issues/upstream-lockfile-content-merge-2026-09-20.md`
  (content-merge class on pnpm-lock.yaml).
