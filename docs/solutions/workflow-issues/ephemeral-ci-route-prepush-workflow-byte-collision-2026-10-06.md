---
module: dashboard
tags: [ci, ephemeral-pr, github-ci-validate, lockfile-guard, workflows, add-add-collision, fail-closed]
problem_type: workflow-issue
---

# The ephemeral-CI validation route aborts fail-closed PRE-PUSH when a batch workflow file is not byte-identical to main's variant

**Date**: 2026-10-06 · **Runs**: conductor c5b7cd7d full_tests (route attempt 1 aborted pre-push, harmonized re-run green) · **Tree**: run worktree HEAD 3d07cf9 + the 9-path uncommitted cure batch; origin/main was fe928ca at the time.

## Symptom

`github_ci_validate.py --repo .` (the conductor full-suite validation route) exits rc=1 within ~5 seconds having created **no** refs and **no** PR. The failure precedes every GitHub side effect, so there is nothing to clean up — but also nothing validated.

## Mechanism

The route never validates the bare worktree. It builds a **disposable base** = run lineage + **current origin/main's** `.github/workflows` (main's workflow files are checked out over the lineage), then applies the batch diff with `git apply --3way`. If the batch introduces or rewrites a workflow file that main already carries and the two variants are not byte-identical, the apply add/add-collides and the route aborts fail-closed **before** the force-push / draft-PR / checks-wait / close-delete sequence.

A comment-prose-only delta collides exactly like a functional one: `git apply --3way` is byte-driven, and `git merge-file` reports conflicts on attribution headers and quote-style differences inside comments.

## First-hand instance (this repo, same file on both sides)

- The batch carried the fleet's 62-line `.github/workflows/lockfile-guard.yaml` (PR `#389` lineage); main's landed variant is 58 lines. The diff was comment prose only — triggers and steps byte-identical.
- Route attempt 1 on the un-harmonized tree: aborted pre-push (`attempt1-route-failed-prepush-main-collision.log`, delegate spool 3af2c857e3384fa0a5e4657ccc483ee5-scratch/).
- Harmonization: byte-adopt main's 58-line variant (functional no-op, proven by hunk diff), then simulate the base-construction + `git apply --3way` in a scratch clone → clean apply (`route-sim-clean-apply.patch`).
- Route attempt 2 on the harmonized tree: green end-to-end — ephemeral draft PR `#400`, snapshot `c6b1490e`, 11/11 checks SUCCESS.
- Fleet record: sibling run e9bc28f5 hit the same pre-push abort rc=1 in ~5s the same day.

## Prevention rule

Before invoking the ephemeral-CI route on a batch that introduces or rewrites a workflow file main already carries:

1. Fresh-fetch, then diff the batch variant against **current** main's (`git diff origin/main -- .github/workflows/<file>`). Trust `git ls-remote origin refs/heads/main` for the tip, not the remote-tracking ref — a stale tracking ref masked a main move for two phases of the same cycle that hit this trap.
2. If the delta is prose-only, **byte-adopt main's variant**. Zero functional change, and it also un-blocks the future landing merge (same add/add surface).
3. A workflow file is an **executable surface**: after harmonizing, re-derive and re-declare the validation digest — the dispatch-time digest describes the pre-harmonization tree.
4. Reproduce cheaply before burning a route attempt: construct the disposable base in a `/tmp` clone (lineage + main's workflows) and `git apply --3way` the batch diff there. A collision shows as a non-zero exit with zero GitHub side effects.

## Related

- `docs/solutions/workflow-issues/pnpm-lockfile-config-mismatch-frozen-install-trap-2026-10-05.md` — the lockfile wall this guard family cures.
- `ROADMAP.md` rm-285 riders (2026-10-06) — the cycle record of the harmonization and the PR `#400` full-suite outcome.
- `ROADMAP.md` rm-116 — 'Lockfile Guard' joins the required-context fill after the cure landing.
