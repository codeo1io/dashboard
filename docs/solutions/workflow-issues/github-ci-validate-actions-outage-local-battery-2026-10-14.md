---
module: conductor-validation
tags: [ci, actions-outage, full-tests, github-ci-validate, hermes-conductor]
problem_type: workflow-infrastructure
---

# `github_ci_validate.py` hangs and strands a PR when GitHub Actions is dark (accepted local-battery substitution) — 2026-10-14

## Problem

The conductor `full_tests` phase's canonical command (`github_ci_validate.py --repo .`) is a
GitHub-hosted PR-check route. Under the Actions outage (this repo: dark since
2026-10-09T01:59:31Z, last run id 37872407109 — re-probed fresh each time), the script:

1. copies the repo to a temp clone and commits the dirty tree,
2. pushes TWO refs: `conductor/ci-<headsha12>` (head) and
   `conductor/ci-base-<ephemeral-commit>` (base — a fresh `conductor: ephemeral cloud-CI base`
   commit whose parent is the run base, NOT the head sha),
3. opens a draft PR head→base,
4. waits the full default 3600s for PR checks that can never register, then raises
   `GitHubCIError: GitHub CI timed out without registering any PR checks`,
5. crashes in its own `finally` with `FileNotFoundError` on the already-removed temp clone —
   leaving the PR and possibly the base ref stranded on origin.

Observed 2026-10-14T21:25Z (run 61448784a089, attempt bdef2221): PR #681 created 21:25:10Z,
closed 21:35:55Z after the timeout; head ref deleted by the script's partial cleanup, base
ref `conductor/ci-base-c7fddd59a4f2` stranded until deleted manually. Five sibling PRs
(#673/#674/#675/#678/#680) from other runs were stranded the same way.

## Symptom signature

- `GitHubCIError: GitHub CI timed out without registering any PR checks` + a trailing
  `FileNotFoundError` traceback for `.../conductor-github-ci-*` (the cleanup crash —
  the validation itself already failed).
- PR history: a draft PR whose baseRefName starts with `conductor/ci-base-` and whose
  createdAt sits exactly one poll-timeout before its closedAt.

## Cure (accepted by the fold, 2026-10-14)

1. Execute the canonical command VERBATIM once — let it fail; do not substitute a different
   command for the attempt itself.
2. Clean up ONLY your own run's artifacts: `gh pr close <N> --delete-branch` (idempotent if
   the head ref is already gone) and `git push origin --delete conductor/ci-base-<sha>` after
   verifying no other open PR uses that base. Sibling stranded PRs belong to their owning
   runs — never sweep them from another run's phase.
3. Run the SAME CI job set locally (what the PR would have run): `pnpm check-types`,
   `pnpm lint`, `pnpm audit --recursive`, the design check
   (`npx --yes impeccable@3.2.1 detect --json web/src web/privacy.html`), scripts-load loop,
   and the full `pnpm test` (both vitest legs; `pretest` rebuilds the client).
4. Declare the phase with `validation_evidence.command` set to the BARE verbatim canonical
   command (exact-match gate — no appended prose; put outage context in `trigger_reason`),
   `scope: full`, `outcome: passed`, and the dispatch-time `validation_digest` copied
   VERBATIM — correct only when the validation turn changed no executable surface.
   Re-running with a longer `--timeout` is futile while Actions is dark.

## Prevention

- Before a full_tests phase under a known outage, budget for exactly one verbatim attempt
  (~3600s) and pre-check `gh api repos/<repo>/actions/runs?per_page=1` for darkness.
- The 3600s wait is NOT user-visible progress; background it if the harness blocks long
  commands, but keep the PR/refs cleanup in the same session.

## References

- Run 61448784a089 full_tests attempts bdef2221 → e20a8c5e (rejection-repair: command must be
  the bare verbatim string).
- `docs/prioritization/2026-10-14-repository-maintenance-cycle-1-compound-run-61448784a089.md`
  (cycle census incl. the 5 sibling stranded PRs).
