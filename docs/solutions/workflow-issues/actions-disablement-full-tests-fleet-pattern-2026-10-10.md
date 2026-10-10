---
title: Full-tests under an Actions disablement — verbatim detached validator, six-job local mirror, digest bookends, and the finally-crash base-ref stranding
date: 2026-10-10
category: workflow-issue
module: dashboard
component: ci-validation
problem_type: workflow_issue
severity: medium
---

# Full-tests under an Actions disablement

Account-level Actions disablement (probed first-hand 2026-10-10, run
e5b718478274 full_tests attempt bbbd1849): `gh api -X POST
repos/codeo1io/dashboard/actions/workflows/audit.yaml/dispatches -f ref=main`
returns HTTP 422 `Actions has been disabled for this repository`, `gh run list`
shows the newest run frozen at 2026-10-09T01:59:31Z (CodeQL) with zero runs
created since midnight, and every ephemeral validation PR sits at
`statusCheckRollup` length 0 forever — the hosted `github_ci_validate.py`
check-wait can never conclude. Side-effect visible in public posture: the
OpenSSF CI-Tests sub-check erodes (`2 out of 5 merged PRs checked`) because
merged PRs ran check-dark; that is account-state, not repo-code regression.

## The fleet pattern (supervisor-accepted this run)

1. **Bracket the outage** with fresh probes on both sides of the phase (422
   dispatch probe + newest-run read). A still-422 bracket means zero-checks
   observations are disablement, never a batch verdict.
2. **Pre-apply the batch**, then execute `validation.full_command` VERBATIM,
   detached (`nohup ... &`, pid + log on disk). The ephemeral draft PR it
   mints is the batch proof: `gh pr diff <n> --name-only` must equal the
   patch's file list exactly.
3. **Run the content-identical six-job mirror locally** over the same applied
   tree (workflows read from origin/main at the current remote tip): lint,
   impeccable design-check, check-types, `pnpm test` (server + web, pretest
   rebuilds web/dist), actionlint, scripts-load. Green mirror + PR path-set
   proof is the substitute for the unreachable hosted checks.
4. **Digest bookends**: derive the engine validation digest over the pristine
   tree before and after; both must equal the dispatch stamp (nothing
   executable changed during the phase — the emission-time rule).

## The single-fatal transient

The 3600s check-wait dies on ONE `error connecting to api.github.com`
(observed ~2340s in). That is a transient, not a verdict — the burn exit is
`GitHubCIError: gh pr checks failed (1)`. All pre-wait mechanics (clone,
3-way apply, ref pushes, PR creation) had already succeeded.

## The finally-crash base-ref stranding (mechanism, first-hand)

After the transient kills the wait, the validator's `finally` closes the PR
and deletes the HEAD branch, then CRASHES with `FileNotFoundError` — the temp
clone is already gone when the cleanup subprocess needs it as `cwd` — BEFORE
deleting the BASE ref. Consequence: **every transient-killed full_tests
attempt under the outage strands one `conductor/ci-base-<sha>` ref on
origin.**

Cure, proven this run:

```bash
git push origin --delete conductor/ci-base-<sha>   # rc=0
```

Leave `refs/pull/N/head` alone — that is GitHub's immutable PR ref, not a
branch. The residue sweep (rm-159) must cover BOTH `conductor/ci-*` and
`conductor/ci-base-*` prefixes and re-derive in-flight exclusions from open
PRs at sweep time.

## Dead-attempt forensics rules

- A reaped attempt whose event log holds only heartbeats (`session_reaped`,
  exit_reason failed) and whose typed PhaseResult artifact is absent left
  nothing durable IF the tree was porcelain-clean at its start — verify the
  tree, then redo; do not adopt.
- An **EMPTY `gh pr diff` on a conductor PR is a pristine-tree execution** —
  the dead attempt's validator ran with no batch pre-applied (observed: PR
  541 from reaped attempt bd6d4dc5). It is never an adoptable
  byte-identical predecessor for the batch, no matter how green its
  mechanics looked.

## Prevention

When a full_tests phase runs during an outage, end-of-phase checklist: PR
closed, HEAD branch deleted, BASE ref deleted (by hand if the finally
crashed), bookend digests recorded, tree restored porcelain-clean. The
next-cycle recovery probe: any dashboard Actions run newer than the frozen
newest-run timestamp, or a dispatch probe that stops returning 422.
