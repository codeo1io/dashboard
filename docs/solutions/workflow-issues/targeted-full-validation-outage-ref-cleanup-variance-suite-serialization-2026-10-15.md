---
title: 'Targeted/full validation under the Actions outage — ref-cleanup variance, local-suite serialization, and /tmp sweeper losses'
date: 2026-10-15
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
---

## Problem

Three failure modes observed first-hand while running the engine's canonical
validation commands (`run_repo_impacted_tests.py` / `github_ci_validate.py`)
during the account-level Actions run-creation outage (dark since
2026-10-09T01:59:31Z; still dark 2026-10-15T01:49Z), run 9c5a7d19155c cycle:3:

1. **The validator's cleanup behavior varies by failure path.** The
   3600s-wait timeout path (targeted_tests, PR #683, 2026-10-14) closed its own
   draft PR and deleted the head ref but **stranded `conductor/ci-base-<sha12>`**.
   The early-crash path (full_tests, PR #692, 2026-10-15 — the *first*
   `gh pr checks --json` poll died at its 60s timeout) cleaned **both** refs via
   teardown. You cannot predict which artifacts survive; sibling stranded refs
   (~86 `conductor/ci-*` at one probe) belong to their owning runs and must not
   be swept opportunistically.
2. **Running the local substitution battery concurrently with the background
   canonical validator flaked the suite.** The only test failure of the entire
   cycle — `test/operator-stream-core.test.ts:4467` 'malformed-entries no-wipe'
   (10s budget, 25.8s actual) — occurred only while both ran on one box; the
   file passes 793/793 in isolation and the clean re-run passes 3057/3057 +
   1213/1213 on the byte-identical tree.
3. **A /tmp sweeper deleted the phase's log directory mid-run** (targeted_tests,
   during the ~1h background wait), destroying the canonical-command log and
   gate logs before they could be archived.

## Solution

- **Execute the canonical command verbatim ONCE**, backgrounded, with
  **`TMPDIR` and the log file under the delegate spool**, never `/tmp`.
  Expect failure under the outage; do not retry with longer timeouts (each
  attempt strands GitHub artifacts).
- **After any failure path, re-check BOTH refs** for your run's PR:
  `git ls-remote origin 'refs/heads/conductor/ci-<snap>*' 'refs/heads/conductor/ci-base-*'`
  — delete your own base ref only after verifying no other open PR uses it
  (`gh pr list --json baseRefName`).
- **Serialize the local battery**: run the same-CI-job-set local substitution
  (`pnpm run check-types`, `pnpm run lint`, `pnpm audit --recursive`,
  `pnpm test`) BEFORE launching the canonical background run or AFTER it exits —
  never alongside it.
- When a single test fails only under that concurrency, triage by isolation
  re-run of the file first; treat it as contention, not regression, when the
  tree is unchanged and prior/parallel-clean runs are green.

## Prevention

- A future hardening candidate (roadmap rider, run 9c5a7d19 compound):
  raise or split the `operator-stream-core.test.ts:4467` case's 10s timeout so
  CI on a loaded runner does not flake.
- Logs for any >minutes background process live under the delegate spool by
  default; `/tmp` is sweepable at any moment.

## Verification

- Ref-cleanup variance: PR #683 closed at createdAt+3600s exactly with base ref
  `conductor/ci-base-fc43283f53a0` surviving (deleted manually after the
  unshared check); PR #692 (early-crash path) closed with BOTH
  `conductor/ci-6c39660effeb` and `conductor/ci-base-7158e187a022` absent from
  `ls-remote`.
- Flake: isolated file run 793/793 RC0; clean full re-run 58/3057 + 34/1213 RC0
  (logs: conductor-delegate-spool/delegate/952ea138-*).
- Sweeper: /tmp/targeted-98fa2a15/ gone mid-run (2026-10-14); spool-side logs
  from the next attempt survived intact.
