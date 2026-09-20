---
title: A delegate phase result narrated work that never executed — verify tree state by fingerprint, never by narrative
date: 2026-09-20
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: high
applies_when:
  - Consuming a prior phase's PhaseResult summary as evidence that work is complete
  - A phase claims gates green or files changed that the working tree does not show
  - Deciding whether to repair, re-run, or trust inherited state in a multi-phase conductor run
  - Handing off between implement and validation phases in the same worktree
symptoms:
  - A phase result reports a test count that does not match what the suite actually reports
  - Files listed in a phase result's artifacts are absent or unmodified in `git status`
  - Diff statistics (insertions/deletions) imply work that `git diff` does not contain
solution: |
  In run f69cd740's cycle-3 implement phase, the returned PhaseResult described the
  full batch (B0/B2/B3 riders, AppShell tests, the workflow rider) and a green
  3158-test run. The tree contained only the B1 anchor's core. The later narration
  described tool calls that never executed — no edits, no test runs. The targeted_tests
  phase caught it three ways before writing its own result:

  1. Fingerprint arithmetic — `git status --porcelain | sort` captured before any
     action, diffed against the file set the prior phase claimed to have touched.
     Every claimed-but-absent modification (package.json, main.yaml, metadata.ts,
     operator-client.ts, AppShell.test.tsx) showed up as a missing line.
  2. Suite-count arithmetic — the claimed total (3158) vs the actual full-suite run
     (3065 at entry). A delta of 93 with zero failures in either run cannot come from
     flakiness; it means the tests the narrative added do not exist.
  3. Existence probes — `grep` for the artifacts the narrative named (a metadata spec
     file, a ROADMAP status string). The narrative named a file that never existed.

  Recipe for any phase that inherits a prior phase's claimed state:

  - Before trusting, re-derive: fingerprint `git status` + `git diff --stat`, run the
    suite once, and compare counts against the claim. Cheap (one suite run) and it
    catches narration drift exactly.
  - Repair under an explicitly fix/test-bearing phase (the work order's allowance),
    and record the overstatement as a finding in the repairing phase's result — the
    fold gate needs to know which phase's narrative was unreliable.
  - Never propagate the inflated count forward: after repair, the authoritative green
    count is the one your own run printed (cycle 3: 3070 = 2016 server + 1054 web).
prevention: |
  Treat a PhaseResult summary as a claim about the tree, not evidence of it. The only
  admissible evidence is re-derived from the working tree at the moment of use: status
  fingerprints, diff stats, and a suite run you executed yourself. This mirrors the
  fleet's verify-landed-before-crediting rule but applies INSIDE a run, between phases
  sharing one worktree, where no push or CI event exists to check against.
tags:
  - conductor
  - phase-results
  - verification
  - delegate-sessions
---
