---
title: Conductor full_tests — the ephemeral-PR route and the byte-exact evidence command contract
date: 2026-09-24
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - A conductor phase dispatches `scripts/github_ci_validate.py --repo .` as the authoritative validation command (full_tests or merge-release routes)
  - A delegate documents a companion local suite run (e.g. `pnpm test`) alongside the engine-named command
  - Anyone interprets "ephemeral PR validation" as full CI coverage of the pushed tree
---

## Problem

Two independent traps hit during run b9c36244's full_tests phase (attempts aff22363 →
ce46300, 2026-09-23/24):

1. **Evidence command identity.** The phase ran the engine-named
   `github_ci_validate.py --repo .` verbatim AND the local `pnpm test`, then declared
   `command: "<script> --repo . ; pnpm test"` in `validation_evidence`. The fold gate
   rejected the result and re-dispatched the phase: for `phase_id == full_tests` the
   engine requires a full-scope passing record whose `command` equals the dispatch
   `full_command` **byte-exactly** — any suffix reads as a substitution
   ("full_tests evidence command does not match the authoritative dispatch full_command;
   substitutions are not accepted"). One full phase re-run was burned on formatting.

2. **Route coverage misread.** The validator's ephemeral-PR route creates a synthetic
   base branch (`conductor/ci-base-*`) and a draft PR, so **only pull_request-gated
   workflows fire** — on this repo that is `visual` alone. `Main` (the full 3135-test
   suite) is push-gated and never triggers on the synthetic base. A green
   `ok: true` from the route is visual coverage plus whatever the snapshot carries,
   not suite coverage.

## Root causes

- The fold gate (`hermes_conductor.validation_policy.apply_validation_gates`, release
  589c2d68) compares the declared command string against the dispatch stamp with exact
  equality; it has no notion of "command plus companion".
- The validator's snapshot mechanism (snapshots the worktree delta onto a synthetic
  base) inherits pull_request workflow gating by construction; nothing about the route
  advertises that Main-style push workflows are absent.

## Solution

- Declare the engine-named command EXACTLY as dispatched in `validation_evidence.command`.
  Document companion commands (the paired local `pnpm test` full-suite run) in
  `trigger_reason`, `evidence_refs`, or the summary — never in `command`.
- Run the ephemeral route **backgrounded** (`nohup … > /tmp/log 2>&1 < /dev/null &`) so
  its cleanup (close PR, delete `conductor/ci-*` refs) always runs even if the session
  is reaped mid-wait; poll the log file.
- Pair the route with the local full suite and say so: hosted evidence = visual workflow
  over the delta; local evidence = the complete test suite. Both are needed for an
  honest `scope: full`.
- Cleanup contract: after success verify the PR is CLOSED and both refs
  (`conductor/ci-<snap>` head and `conductor/ci-base-<sha>`) are deleted. If other
  `conductor/ci-*` refs exist, check for a live validator process before touching them
  (a sibling session may own them); orphaned refs from crashed runs are housekeeping,
  never edit another session's in-flight refs.
- The route is a **push+pr+ci mechanism sanctioned only when the work order's
  validation block commands it** (full_tests / merge-release). A targeted phase naming
  the same script must NOT run it — use focused local suites instead.

## Notes

- The validator's snapshot excludes `.conductor/**` deltas but inherits files already
  tracked in HEAD — engine-internal state committed to main rides into ephemeral CI
  (see the rm-131 tracked-breadcrumb regression in ROADMAP.md).
- The engine's `validation_digest` hashes only executable-classified file contents, so
  index-only deletions of non-executable files (e.g. `git rm --cached .conductor/…`)
  are digest-neutral; declaring the dispatch digest verbatim after such a change is
  correct, with a before/after `git status` fingerprint as proof.

Related: `docs/solutions/workflow-issues/parallel-conductor-campaigns-frame-movement-collisions-2026-09-20.md`
