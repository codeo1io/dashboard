---
module: dashboard
tags: [ci, github-actions, workflows, add-add-conflict, git-apply-3way, ephemeral-pr, hermes-conductor, validation-digest]
problem_type: workflow-issue
---

# github_ci_validate aborts pre-push on comment-only workflow divergence (add/add) — harmonize batch workflow bytes to current main

**Date**: 2026-10-06 · **Runs**: 9189a4ac (full_tests attempt a109f87c — first-hand
repro and in-phase fix; this entry) · **Precedent**: e9bc28f5 (attempts killed by the
same abort; fix proven same-day) · **Base**: 3d07cf9; origin/main at validation time
c210933.

## Problem

A maintenance batch that adds or modifies a `.github/workflows/*` file can be
completely green locally — lint, actionlint, full test battery — and still be
unable to reach the repository's authoritative full-suite validation
(`github_ci_validate.py`, the ephemeral GitHub-hosted CI PR route): the route
aborts **before any push**, with no PR and no refs created, on a divergence that
is *comment prose only*.

## Mechanism (verified in dispatch release 5a13a866)

`github_ci_validate.py --repo .` builds a disposable validation clone
(`_prepare_validation_clone`):

1. checks out the run's HEAD (`source_head`), then **removes the entire
   `.github/workflows/` tree and checks out the CURRENT default branch's
   workflows in its place** — the validated tree always runs main's live
   workflow set on top of the run lineage;
2. applies the worktree delta with `git apply --3way`.

If the batch's delta *adds* a workflow file that current main has also added
since the run's base — or modifies one main also touched — the 3-way apply hits
an **add/add collision**. Even a header-comment rewrite is enough: there is no
common preimage, so `git apply` leaves the path unmerged and exits non-zero,
and the route fail-closes pre-push by design.

First-hand log (run 9189a4ac, 2026-10-06, batch carrying the fleet 62-line
`lockfile-guard.yaml` blob `c3f7b6d9` vs main `c210933`'s landed 58-line blob
`97a8ebf6`; triggers/steps byte-identical, 20 changed lines all `#`):

```
error: Failed to merge in the changes.
Applied patch to '.github/workflows/lockfile-guard.yaml' with conflicts.
U .github/workflows/lockfile-guard.yaml
{"ok": false, "error": "applying candidate delta to ephemeral cloud-CI base failed: ..."}
```

## Fix

Byte-adopt current main's version of the colliding workflow file
(`git show origin/main:<path> > <path>`), verify `git hash-object` equals
main's blob, re-stage, re-run actionlint (container form) — then re-run the
validation command. Comment-only harmonization is a functional no-op; the
merge-time 3-way against main is exactly what you just pre-performed.

## Prevention rules

1. **Before dispatching any batch that touches `.github/workflows/`, diff every
   batch workflow file against `origin/main`'s current bytes.** Any delta —
   including comments — that main also carries on that path is a pre-push
   abort. Harmonize comment-only deltas to main's bytes at compose time; carry
   functional deltas only with a merge plan.
2. **Re-check the main tip immediately before each validation route.** Main can
   move mid-campaign (it moved twice during this run: fe928ca, then c210933);
   a batch harmonized against yesterday's main collides against today's.
3. **Any byte change to an executable surface moves the emission
   `validation:v1:` digest** — it is a content hash over *all* executable
   surfaces (tracked + untracked-non-ignored), not a semantics hash. A
   comment-only workflow harmonization legitimately changes the digest;
   re-derive and re-declare it (`hermes_conductor.validation_policy.validation_digest`),
   never copy a pre-change digest forward.
4. **Keep scratch out of the repository root.** Untracked non-ignored files
   both ride into the validation clone and move the digest. Compose in the
   delegate spool or `/tmp`.
5. **Verify in-worktree writes same-call** (re-read + hash) — see the
   conductor-worktree write-anomaly note; a `cp` + `git hash-object` chain
   gives you that proof for free.

## Verification recipe

```bash
git fetch --quiet origin main
diff <(git show origin/main:.github/workflows/lockfile-guard.yaml) \
     .github/workflows/lockfile-guard.yaml          # expect: empty
docker run --rm -v "$PWD":/repo -w /repo rhysd/actionlint:latest \
     -color .github/workflows                        # rc=0
# then re-run the authoritative validation command and re-derive the digest
```
