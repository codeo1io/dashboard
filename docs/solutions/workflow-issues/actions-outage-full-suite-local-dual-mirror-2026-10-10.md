---
title: Full-suite validation during an Actions run-creation outage — canary probe, supervisor-authorized local dual mirror
date: 2026-10-10
category: workflow-issues
module: dashboard
tags:
  - conductor
  - github-actions
  - full-tests
  - outage
problem_type: workflow_issue
component: development_workflow
severity: medium
---

## Problem

The authoritative full-suite command for conductor validation phases is
`github_ci_validate.py --repo .` (release-pinned shim). Its mechanism is:
clone a temp validation repo, push `conductor/ci-base-*` + `conductor/ci-*`
refs, open a draft PR, watch GitHub Actions check runs. When Actions
run-creation is disabled on `codeo1io/dashboard` (outage live since
2026-10-09T01:59:31Z; `POST /actions/workflows/main.yaml/dispatches` → 422
"Actions has been disabled for this repository.") a verbatim run:

- pushes refs and opens a PR that can never report checks,
- strands the refs on origin (29 stranded `conductor/ci-*` refs accumulated
  during this outage; checkless validation PRs #546/#547/#549/#550 had to be
  closed by hand),
- times out after ~1h with zero check runs and fails the phase.

The prohibition list of a given work order can additionally forbid
push/pr/ci outright for that turn, making the verbatim route doubly
unavailable even if Actions recovers.

## Cure — probe, ask, mirror

1. **Canary first, cheaply:** `gh api -X POST repos/codeo1io/dashboard/actions/workflows/main.yaml/dispatches -f ref=main`
   (expect 422 while the outage lives) and
   `gh api 'repos/codeo1io/dashboard/actions/runs?per_page=3'` to date the
   newest run. Record both.
2. **Ask once, with facts:** put the 422 evidence, the stranded-ref count,
   and the prohibition list in front of the supervising Hermes and ask for
   authorization to substitute. Do not silently substitute.
3. **Local dual mirror of ALL six Main jobs**, on both trees — leg A pristine
   base, leg B carrier-applied (a `git worktree add --detach` copy for leg A
   keeps the run worktree single-state):

   | Main job | Local equivalent |
   |---|---|
   | install | `corepack pnpm install --frozen-lockfile` |
   | lint | `env TIMING=1 pnpm lint` |
   | design-check | `npx --yes impeccable@3.2.1 detect --json web/src web/privacy.html` → must print `[]` |
   | check-types | `pnpm check-types` |
   | test | `pnpm test` (pretest builds the web client — never bare `vitest run`) |
   | check-workflows | `docker run --rm -v "$PWD":/repo -w /repo rhysd/actionlint:1.7.12 -no-color` |
   | test-scripts-load | import loop over `src/**/*.ts` non-test files |

4. **Record the dispatch command byte-exact** in `validation_evidence.command`
   (the fold compares it to the dispatched `full_command`) and disclose the
   substitution as a HIGH finding — the evidence shape stays valid, the
   deviation must be visible.
5. **Prove the fold locally:** replicate `apply_validation_gates` from the
   dispatch release against the written evidence (positive ACCEPT + tamper
   probes for command/digest/scope/outcome + a wrong-tree negative control)
   before writing the result file.
6. **Explain every count delta** between legs with arithmetic (deleted vs
   added test files), not silence — a reviewer cannot tell a folded suite
   from a broken one otherwise.

## Environmental notes

- CI runs Node 24 (`actions/setup-node`); a local mirror on Node 22 logs a
  benign engines WARN from check-types. Note it, don't chase it.
- `docker` + the `rhysd/actionlint:1.7.12` image and the npx cache for
  `impeccable@3.2.1` make the mirror possible offline; check both before
  promising the mirror.

## Fleet precedent

Runs 6a2d5fbe, ba5f6d7d, 633717c2, and 4c0ec7a5 (all 2026-10-10) validated
this recipe end to end; 4c0ec7a5 additionally proved the pristine-stamp
close via the patched-tree negative control (see
`docs/solutions/workflow-issues/validation-digest-stamp-describes-mint-time-tree-measure-both-close-states-2026-10-10.md`).

## Recovery hook

On the first Actions run newer than the recorded outage-era newest
(37872407109) or a dispatch canary that stops 422-ing: run the authoritative
validator verbatim once, bank the first green, then sweep the stranded
`conductor/ci-*` refs and reconcile the checkless validation PRs.
