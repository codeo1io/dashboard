---
module: ci
tags: [actions, outage, ephemeral-pr, full-tests, validation, github-ci-validate]
problem_type: workflow-issue
---

# Actions run-creation outage: ephemeral-PR validation registers zero checks; detect before burning the poll, fall back to the six-job local mirror

Recorded 2026-10-09 (repository-maintenance cycle:1, runs 155f9770 + 122a6930;
deviation reports delegate/fulltests-155f9770-58737c07-report.md and
delegate/fulltests-122a6930-b4bec689-report.md).

## Symptom

`github_ci_validate.py --repo .` on a public repo pushes two `conductor/ci-*` refs and
opens an ephemeral draft PR fine — then registers ZERO check-runs for the entire poll
(default 3600s) and fails with `GitHub CI timed out without registering any PR checks`.
There is NO zero-check fast-fail in the poll loop: it always burns the full budget.

## Detection (cheap, before launching)

The signature is repo-wide run-creation failure, not a workflow problem:

    gh api 'repos/codeo1io/dashboard/actions/runs?created=>=2026-10-09T02:00Z' --jq .total_count

Zero while PR/branch creation works = the outage. Scheduled fires are equally gated: a
schedule-triggered workflow (e.g. cve-tripwire) that cannot create runs simply does not
fire — do not read silence as health.

## Approved fallback (supervisor authorization, twice granted 2026-10-09/10)

Run the six Main-workflow jobs content-identically against the worktree (origin/main
main.yaml): `TIMING=1 pnpm lint`; `npx --yes impeccable@3.2.1 detect --json web/src
web/privacy.html` (expect `[]`); `pnpm check-types`; `pnpm test` (pretest builds
web/dist); `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12
-no-color`; a Node strip-only import loop over non-test `src/**/*.ts`. Declare scope
full + dispatch digest verbatim when zero executable surfaces changed that turn, record
the deviation as a HIGH finding, and defer GitHub-runner confirmation to the first
authorized push-gate turn after recovery (re-run the verbatim command then; ~5 min
expected pass, tree unchanged).

## Cleanup-crash defect (timeout path)

Under a swept shared TMPDIR (delegate tmp), the finally-block's base-ref deletion runs
with `cwd=validation_clone` and crashes `FileNotFoundError` at github_ci.py:755 AFTER
the PR close + head-ref delete succeeded — so the PR self-closes but
`conductor/ci-base-*` refs STRAND on origin (this run: conductor/ci-base-2c550c93faff).
Running with `TMPDIR=/tmp` avoids the sweep. Stranded refs are fleet-visible residue;
delete them only in an authorized push-gate turn. The error-path catch set (GitHubCIError,
TimeoutExpired) lets the FileNotFoundError mask the failure JSON — read the traceback,
not just the exit code.
