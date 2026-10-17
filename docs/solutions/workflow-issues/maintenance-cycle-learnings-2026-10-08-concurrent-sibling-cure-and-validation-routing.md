---
module: 'dashboard'
tags: ['maintenance-cycle', 'concurrent-landing', 'ephemeral-pr-validation', 'prioritization-collision', 'dead-attempt-forensics', 'conductor']
problem_type: 'process'
---

# Maintenance-cycle learnings — concurrent sibling cure, ephemeral-PR validation routing, forensics discipline (cycle 2, run c026a644)

Lessons from the 2026-10-07/08 repository-maintenance cycle, recorded pre-review
from cycle evidence only (batch: release.yaml digest-readback SIGPIPE cure +
detailsUrl https-only boundary, ledger mints rm-708/rm-709 with the rm-166
guard extension; targeted 165/165 across 4 impacted suites + fence 7/7;
full battery ALL 11 checks green on ephemeral PR #437). No tests were executed
while compounding this document.

## 1. A fleet-visible red draws concurrent cures — plan the integrate around it

**Problem.** This cycle's P1 headliner (release.yaml digest-readback SIGPIPE,
7/8 red release runs) was ranked first by this run's prioritize AND
independently implemented and landed by sibling run b2a3ae9b while this run sat
between implement and validation: origin/main advanced ac61ff3 → 5aab7c7 →
f66e547 across the cycle, and the landed main already carries the same END-block
readback form at release.yaml :492/:535.

**Lesson.** When the batch headliner is the fleet's most-visible red, a sibling
landing of the same cure mid-cycle is the expected case, not an anomaly. Probe
origin/main for the batch's exact surfaces at EVERY phase boundary (a one-line
`grep` of the cured sites is enough), and design cures so duplicates converge:
the guard fence pins readback FORMS (`awk '/^Digest:/{d=$2} END{print d}'`),
not line numbers, so a sibling's byte-different but same-form landing does not
conflict with the candidate's fence.

**Application.** Reconcile-by-content at integrate; the candidate's RED-proof
fence stays the durable artifact either way; the live acceptance gate
(two consecutive green release runs) is still 0/2 regardless of which cure
landed first.

## 2. Full validation routes to the ephemeral-PR cloud path for this repo

**Problem.** `github_ci_validate.py` refuses private repos (`remote-CI route is
only enabled for public repositories`); this repository is public with ADMIN,
so the dispatched full_command takes the cloud route.

**Mechanics.** The tool builds a throwaway clone whose BASE pairs the worktree
HEAD with origin/main's CURRENT `.github/workflows` set, applies the
working-tree delta 3-way on top, pushes both refs, opens a DRAFT PR, waits for
checks, then closes the PR and deletes the refs in its `finally`. Two
consequences worth remembering:

- the full battery validates the candidate delta against main's landed
  workflows (workflow edits in the delta are checked via the merged snapshot's
  Check Workflows job), so a green run is also a dry-run of the integrate's
  workflow union;
- cleanup is the tool's job — verify it anyway (`gh pr view` state, and
  `git ls-remote origin 'refs/heads/conductor/ci-*'` returning no refs from
  your snapshot/base pair).

**Precedent.** A transient `error connecting to api.github.com` inside the poll
loop (cycle 3, PR #383) resolves by re-running the command verbatim — rerun,
don't diagnose.

## 3. Dead-attempt forensics: read the event log before redoing anything

**Problem.** Two attempts this cycle died at the provider layer, with opposite
correct responses: targeted_tests attempt 9472b1eb (event log = exactly 3
events: `delegate_turn_started` → `session_reap_failed` 32 s later →
`delegate_turn_completed failed`; no typed result, no scratch, no tool
activity) held ZERO work — redo from scratch. The roadmap phase's dead attempt
6311d716 left a complete standing composition — adopt after content-level
verification (census re-derivation, guard-equivalent newest-comment check).

**Lesson.** An absent envelope is not evidence of no work; a present artifact
is not proof of validity. The durable trail (event log length + scratch
contents + file mtimes) decides adopt-vs-redo in minutes. File mtimes separate
an earlier attempt's work from a provider-death attempt that touched nothing
(this cycle: 17:53:55–18:09:38 implement mtimes vs a 22:14 infra death).

## 4. The worktree's node_modules is swept between phases

Any local suite run after a phase gap needs `pnpm install --frozen-lockfile`
first (~7 s, zero drift). Symptom if skipped: missing `node_modules/.bin`
executables, not a pnpm error inside vitest. This does not affect the
ephemeral-PR full-validation route, which builds on GitHub runners.

## 5. actionlint container form: pinned tag + explicit workdir

The bare form `docker run --rm -v $PWD:/repo rhysd/actionlint:latest` runs
actionlint from the image default workdir and exits 3 with `no project was
found in any parent directories`. Use the documented form from
`docs/solutions/workflow-issues/actionlint-pipx-missing-container-form-2026-09-19.md`:
pinned tag `1.7.12` with `-w /repo`. Re-hit at this cycle's targeted_tests
phase; the documented form is correct and green.
