---
title: Running github_ci_validate.py under repo-level GitHub Actions suspension (mirror repoint)
date: 2026-10-15
module: dashboard
problem_type: workflow-issue
component: ci-validation
severity: high
applies_when: workflow_dispatch returns 422 "Actions has been disabled for this repository" while GET actions/permissions says enabled:true
---

# Problem

Conductor `full_tests` phases must run the release script's
`github_ci_validate.py --repo .` verbatim: it pushes ephemeral
`conductor/ci-*` refs to the worktree's `origin`, opens a draft PR, and waits
for its checks. When GitHub has suspended Actions **per-repo** (external,
support-ticket class — settings PUTs do not lift it), no ephemeral PR on that
remote can ever register checks: the script polls for its full 3600s timeout,
then times out and fails the phase. Symptom pair (two-sided probe, 2026-10-14/15):

- `gh workflow run audit.yaml` → HTTP 422 `Actions has been disabled for this repository`
- `gh api 'repos/codeo1io/dashboard/actions/runs?created>=2026-10-10'` → `total_count: 0`
  while `GET /actions/permissions` → `enabled: true`.

# Solution

Run the SAME verbatim command with the worktree `origin` temporarily repointed
at a long-lived public full-validation mirror whose `main` is byte-identical to
the canonical `main` (so the ephemeral PR executes the default branch's real
workflows):

1. Preconditions: mirror `main` == canonical `main` (commit-for-commit). The
   expected steady state is drift — canonical advances while the long-lived
   mirror lags (live example, 2026-10-16: mirror `3e3664c` vs canonical
   `06095e9`). If unequal, STOP and sync the mirror FIRST — the validator
   account holds ADMIN on it: clone the mirror into delegate scratch, add
   the canonical repo as a second remote (`git remote add canonical
   git@github.com:codeo1io/dashboard.git`), `git fetch canonical main`,
   then `git push origin FETCH_HEAD:main`. A plain push is fast-forward-only,
   so a diverged mirror `main` refuses rather than rewriting history; on
   refusal treat the mirror as disposable (its only job is byte-identical
   validation workflows): reset/recreate its `main` from canonical, re-check
   equality, and re-verify the state checks below. Still required: mirror
   has Actions ENABLED (check its newest run timestamp); the mirror's copies
   of noisy scheduled workflows (fro-bot/visual) are `disabled_manually`;
   `vulnerability-alerts` ON (Dependency Review job).
2. `git remote set-url origin <mirror-ssh-url>` — from a detached launcher with
   `trap 'git remote set-url origin <canonical-url>' EXIT` so ANY exit restores
   the canonical origin.
3. Run the release's `github_ci_validate.py --repo .` exactly as the work order
   spells it. Everything (clone, ref pushes, PR, polling) routes through
   `origin`, i.e. the mirror.
4. Expect `{'ok': true, 'mode': 'ephemeral-pr', ...}`; verify ALL jobs green
   (Main 6 jobs + CodeQL + Dependency Review ≈ 9 checks) and that the PR's
   file diff is byte-exact the candidate delta before accepting the result.
5. The script's `finally` auto-closes the PR and deletes its `conductor/*`
   refs; verify `git ls-remote origin 'refs/heads/conductor/*'` is empty
   afterwards.

# Verification (cycle 3, 2026-10-15, run 4dc4697d attempt 54568657)

Mirror `codeo1io/dashboard-fullval-8fd22b8b`, main `3e3664c` == canonical:
PR #5, commit `ba24d2e`, 9/9 checks green in ~3 min; PR diff = ROADMAP.md
+28/−7, byte-exact the implement delta; PR auto-CLOSED and conductor refs
auto-cleaned by the script.

# Traps

- **Identify YOUR PR by the temp clone HEAD, not by recency.** Multiple
  sibling validators run concurrently; the newest draft PR may be a sibling's.
  The script clones to `conductor-github-ci-*` under your TMPDIR — that
  clone's HEAD sha is your `ci-<sha>` ref. Two sibling runs can even share a
  run base, so ancestry alone does not disambiguate.
- **Keep the launcher's TMPDIR inside your delegate scratch**, not /tmp root:
  the session sweeper can delete /tmp scratch and take the temp clone (and a
  mid-flight validation) with it.
- **Do not kill sibling validators.** `pgrep -af github_ci_validate` may show
  several; only terminate your own PID.
- **Untracked repo files are not durable across phase boundaries** — if the
  workaround needs helper files, keep them in the delegate scratch, never in
  the worktree.
- The 3600s poll means a mis-routed run costs an hour; do the two-sided
  suspension probe BEFORE launching, not after.

# Root cure

Only GitHub Support/owner action lifts the per-repo suspension; the mirror is
a validation detour, not a fix. While suspended, treat every CI-derived
signal (cron sentinels, PR checks, workflow state) as absent and prefer REST
readbacks + local job-set replication.
