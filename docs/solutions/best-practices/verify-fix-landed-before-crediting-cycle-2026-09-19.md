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
  - Dockerfile:40-41 documents the pin-and-patch discipline this complements — automation proposes bumps; the pin holds until a rebuilt base clears the Trivy gate (review rule recorded in the Dockerfile comment)
tags: [maintenance-loop, verification, landing-state, dependabot]
---
