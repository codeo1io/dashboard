---
module: 'workflows'
tags: ['ci', 'lint', 'validation', 'hermes-conductor']
problem_type: 'process'
---

# CI validator poll window vs cold lint on the shared runner pool

Date: 2026-09-29 · Run: 995ad0e10428 (dashboard cycle 19, full_tests) ·
Author: conductor delegate (attempt lineage 9dd3fe0a → 83bc2935 → 4387be9a)

## Problem

`github_ci_validate.py --repo .` (the full_tests full_command) pushes an
ephemeral PR and polls GitHub checks for roughly twenty minutes. The repo-wide
cold `pnpm lint` on the shared runner pool regularly exceeds that window when
three or more Main workflows run concurrently: every functional check (Test,
Check Types, Design Check, Check Workflows, Test Scripts Load, CodeQL,
Dependency Review, Visual) went green in **all seven attempts**, while Lint was
cancelled at the poll deadline each time — an infrastructure signature, not a
regression. Two independent failure layers had to be peeled apart:

1. The lint **job** carried `timeout-minutes: 20` and could self-kill even when
   the pool was healthy.
2. The lint job's own duration under herd contention exceeded the **validator's**
   poll window even after the job timeout was raised.

A second, sneakier trap surfaced on the first re-fire: the rider comment added
to `.github/workflows/main.yaml` contained the unqualified phrase
`self-hosted`, which `test/prose-residue-guard.test.ts` (rm-164) rejects
tree-wide. The Test job then failed in **75 seconds** — a fast crash, not a
timeout — on a tree whose Test had been green twenty-five minutes earlier.
Signature to remember: a check that dies in seconds after a doc/comment-only
edit is almost always a guard suite, not a flake; grep the edited text against
`test/prose-residue-guard.test.ts` before re-running anything expensive.

## Solution

Two riders on the same uncommitted tree, both landed with the cycle-19 batch:

- `timeout-minutes: 35` on the lint job (rm-13640) so the job never self-kills
  while the validator is still willing to poll.
- The rider comment says "shared runner pool" — an era-qualified phrase the
  residue guard accepts.

Plus **window discipline** when firing the validator:

- Fire only when at most one foreign Main workflow is in flight. Two-runner
  overlap measured green (Lint ~7 min); three-plus herds reliably blew the
  window (14 concurrent Mains observed at 10:33Z that day).
- Prefer a background launch (`setsid`, script-file launcher) and poll the
  process + GitHub API with short calls; the validator buffers all stdout
  until exit, so an empty log mid-run means nothing.
- Sibling validators sharing the same base sha can cross-pollinate a verdict:
  my 09:38 attempt's validator reported a sibling's Test failure as mine.
  Let foreign validators exit before firing.

## Verification (recorded in the run's phase artifacts)

- Final execution: all nine buckets SUCCESS, `ok: true`, exit=0 on ephemeral
  PR #260 (Main run 36554900045), fired into a dedicated window at 10:44Z.
- Log capture resilience: `/tmp` scratch was swept mid-run twice; the launcher
  copies the log to a `.keep` sibling at exit, and a swept-but-open log stays
  readable via `/proc/<pid>/fd/1`.

## Prevention

- When a batch touches `.github/workflows/**`, grep the diff for the residue
  guard's banned vocabulary before handing off to any CI-bearing phase.
- Treat "every functional check green, one heavyweight check cancelled at a
  constant wall-clock offset" as a window/deadline signature — raise the job
  ceiling and re-window, do not chase phantom regressions in the code.

## Residue leak when the validator dies before cleanup (2026-09-30)

A validator that exits before its close-and-delete epilogue (poll-deadline
cancel, kill, host loss) leaks both artifacts on origin: the ephemeral PR and
its `conductor/ci-*` head + `conductor/ci-base-*` base refs. Detect via
`gh pr list --state open` (draft PRs headed `conductor/ci-*` with a cancelled
check) and `git ls-remote origin 'refs/heads/conductor/ci-*'`. Disposition
(adjudicated on PR #233, run 26210bbbb651, execution riding the run's pr/push gates — re-verify live state at execution; recorded at ROADMAP rm-159): prove the
base marker commit content-free and its ref shared by no other open PR,
archive any unique unlanded content out of the head ref first — durably, in-repo (docs/archive/, sha256-pinned; a delegate spool is transient and must never be the sole copy), close the PR
not-planned with an explanatory comment, and only then delete both refs —
close strictly before delete, so a base ref is never removed from under an
open PR.

## Supersession: the cold-lint monolith cliff, not herd contention (2026-10-01)

Date: 2026-10-01 · Run: 7aa6908492a8 (dashboard cycle 2, implement) ·
Author: conductor delegate

The herd-contention framing above ("three or more Main workflows running
concurrently") turned out to be only half the story — and not the causal half.
Adversarial re-measurement of three consecutive Main runs cancelled ONLY on
Lint at the 35-minute wall (36576833307, 36599485283, 36692888877) found the
real driver: `ROADMAP.md` had grown three mega-paragraphs (7967 / 7317 / 5222
chars) and the markdown lint path is superlinear in paragraph length on a COLD
checkout (CI's fresh clone is always cold; `--cache` helps only local runs).
No amount of window discipline fixes a job that needs 35+ minutes alone.

Proof by cure, on main at 5bf15e1 (2026-10-01): the ROADMAP monolith split
landed (max line 5222) and the next Main run's Lint job completed in 51
seconds — and then failed, honestly, on 11 latent
`@stylistic/no-trailing-spaces` errors in a newly-reached archive doc that the
dead 35-minute path had never gotten far enough to lint. That whitespace-only
micro-fix is cycle-2's B0 (ROADMAP rm-320 records the lineage).

What survives from this doc:

- The window-discipline recipe (fire into a quiet window, background launch,
  let foreign validators exit) remains correct operational hygiene.
- The "every functional check green, one heavyweight check cancelled at a
  constant wall-clock offset" signature remains a deadline signature — but the
  FIRST suspect for a lint-shaped one is now lint input size (measure the
  longest markdown lines in the diff) before runner-pool contention.
- The guard-suite trap (a check that dies in seconds after a doc/comment-only
  edit is a guard suite, not a flake) is unchanged.

Tracked at ROADMAP rm-320, whose acceptance names this addendum.
