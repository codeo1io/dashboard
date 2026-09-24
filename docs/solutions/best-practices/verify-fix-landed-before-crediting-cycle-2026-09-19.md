---
title: A fix that never landed reads as a recurring problem — verify landing state before re-fixing
date: 2026-09-19
category: best-practices
module: dashboard
problem_type: best_practice
component: development_workflow
severity: medium
applies_when:
  - A maintenance or review cycle claims a fix that the next cycle finds missing
  - Re-deriving a fix that was "already made" in an earlier cycle
  - Crediting work to a cycle's outcome without a landing record
  - A conductor maintenance cycle ends without a completed landing phase
symptoms:
  - The same finding recurs cycle after cycle with near-identical proposed fixes
  - git log for the fixed path is empty even though a past report describes the change
  - The live GitHub API disagrees with a local worktree that contains the fix
problem: >
  Worktree state is not repository state. An earlier cycle wrote .github/dependabot.yml
  in its worktree and reported dependency automation as fixed, but the commit never
  reached origin/main. The next cycle's assessment then re-derived the same fix from
  scratch (2026-09-19: dependabot.yml absent from the fork's entire git history and
  the live contents API, despite the prior cycle's report). Un-landed fixes silently
  convert one unit of work into recurring make-work and erode trust in cycle reports.
solution: >
  Before crediting a fix to a cycle, verify it landed where it must persist: for this
  repository, `git log --all --oneline -- <path>` empty plus `gh api repos/<repo>/contents/<path>`
  404 means the fix exists nowhere durable. Fixes may only be counted as done when
  committed to the branch the run targets; a staged-but-uncommitted change is
  in-progress, and the phase result should say so explicitly. When inheriting a
  "fixed" finding, check landing state first — if the fix never landed, re-apply it
  and record the original failure-to-land as its own signal.
verification:
  - 'git log --all --oneline -- .github/dependabot.yml shows the landing commit'
  - 'gh api repos/codeo1io/dashboard/contents/.github/dependabot.yml returns 200'
references:
  - docs/prioritization/2026-09-19-cycle-1-batch.md (rm-102 rationale)
  - Dockerfile header comments document the digest-absorb discipline this complements - pins move only to verified live digests, and an in-image package patch is retired once the rebuilt base ships the fix (the libpcre2 patch block was retired 2026-09-20 when the pin moved to 0e0ff40)
tags: [maintenance-loop, verification, landing-state, dependabot, conductor-worktree, recurrence]
---


## Recurrence and sharpening (2026-09-20, run 54fa71a3)

The pattern recurred **after this doc shipped** — from the same day's cycle.

**Case.** Run 333ad19e (2026-09-19) implemented its entire batch in the run
worktree: the codeql.yaml deps-install step, the Dockerfile base absorb to
`a9d7043`, and the >10-suites aggregator fixture. None of it reached
origin/main. Evidence found by the next cycle's assessment (2026-09-20):
`codeql.yaml` on main has no install step and CodeQL run 18805981102 fails
`Cannot find module 'typescript'`; the Dockerfile still pins `2fe369e` with the
in-image libpcre2 patch; the suite count is 3017, not 3018. Cycle 2 then
re-derived and re-applied the whole batch (docs/prioritization/2026-09-20-cycle-2-batch.md).

**Sharpened mechanism.** Conductor run worktrees
(`.hermes/conductor-worktrees/<repo>/<run>`) are per-run. If a cycle's
landing/CI phases never execute, every implement artifact dies with the
worktree. Verify-after-landing is necessary but not sufficient — the failure
point is *between* implement and landing, where nothing forces the handoff.

**Enforcement seam (new rules, adopted this cycle).**

1. Implement PhaseResults must state worktree-path vs landed-branch explicitly
   for every artifact (cycle 2 does; cycle 1's result did not).
2. Roadmap statuses may say `implemented` only with an explicit
   `landing pending` qualifier — `done` requires the origin/main sha. See
   ROADMAP.md rm-110/111/112/113 statuses after the 2026-09-20 compound phase.
3. The next assessment's first move on any "implemented in a prior cycle" item
   is `git log origin/main -- <path>` (empty means re-derive; costs seconds).
4. Structural mitigations: rm-103 (automated upstream-absorb cadence) removes
   the manual ritual that drops this work; rm-116 (required status checks)
   addresses the adjacent failure — autonomy merges over red gates
   (PR #4 merged one minute after its own CI went red, 2026-09-19).

Related but distinct: the fleet ROADMAP generator emitting lint-breaking
renders (recurred twice: 2026-09-19 14:32, 20:32) is a generator defect
tracked fleet-side (rm-104), not a landing failure.
