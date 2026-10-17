---
module: dashboard
tags: ['maintenance-cycle', 'ci', 'validation', 'github-actions', 'conductor']
problem_type: workflow-issue
---

# Maintenance-cycle learnings — detached CI wait (2026-10-05/06, run `cfa9f94b`, repository-maintenance cycle 3)

Companion to `docs/solutions/workflow-issues/maintenance-cycle-learnings-2026-09-29-bounded-poll.md`
(bounded poll inside a phase). Four first-hand lessons from this cycle's validation legs.

## L1 — config-surface changes deterministically route to full validation

`run_repo_impacted_tests.py --mode fast` classifies `package.json` as shared build/test
configuration, refuses to prove a narrower scope, and prints
`impacted-tests: shared build/test configuration changed; falling back to authoritative full validation`.
Any batch touching `package.json` (or a workflow file riding alongside) should BUDGET for the full
ephemeral-PR route from the start: this cycle's seeded targeted command burned its whole 1200s
foreground budget on the fallback leg and was killed mid-wait. Evidence: delegate-spool
`/tmp/cure-17d88d58/targeted.log` (the runner's verbatim line) and `targeted2.log` (the 207-test
content-match leg that DID prove the narrower scope when run separately).

## L2 — never wait on CI in the foreground: detached launch + bounded polls

The delegate harness kills a single tool call at 1200s; an ephemeral-PR validation needs minutes of
check-waiting AFTER its push. Waiting inside one foreground call means the harness kills the wait
mid-flight, the validator's finally-logic (close PR, delete both refs, remove the temp clone) never
runs, and origin keeps a dangling PR with a deleted head — exactly PR #390 (head
`conductor/ci-0f467511ddc5`, opened 2026-10-05T22:20:36Z; the waiting session was reaped at
22:22:10Z, cleanup never ran; the PR was closed manually 4 minutes later). The working pattern
(zero debris, observed twice): launch detached — `setsid nohup <full_command> > /tmp/<run>/full.log
2>&1 < /dev/null &` — then poll with short calls that only read the log and `gh pr checks`; the
validator then runs to completion including its own cleanup. Transient blips on the first network
probe of a session (one `Permission denied (publickey)` on the opening `git fetch`, one
`api.github.com` connect error during install) resolved on verbatim retry — rerun before
diagnosing.

## L3 — wall-clock datum for budgeting

On this repo the full 11-check suite (Main x6 jobs, CodeQL x2, Dependency Review, visual, Lockfile
Guard) completes on ephemeral GitHub-hosted PRs in ~2m38s open-to-all-green (PR #392,
2026-10-06T00:00:45Z to 00:03:12Z); PR #389 the day before had the same shape. Budget ~5-10
minutes of detached polling, not 20+.

## L4 — the full-command snapshot never mutates the run worktree

`github_ci_validate.py --repo .` builds its validation commit via a temp index and a `--shared`
temp clone; the dirty run worktree's porcelain was byte-identical before and after both full
validations this cycle (6 modified + 4 untracked, unchanged — this doc is the fourth
untracked file). Safe to run in a dirty worktree —
no stash, no restore needed.

Cross-references: the batch's own trap doc
`pnpm-lockfile-config-mismatch-frozen-install-trap-2026-10-05.md` (why these validations were
needed); the engine's ephemeral-PR mechanism (`_prepare_validation_clone` / `_wait_for_pr_checks`
in `github_ci.py`); ROADMAP rm-159 tracks the residue class this prevents.
