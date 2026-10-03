---
title: Impacted-test selection silently escalates to a full cloud-CI push when config surfaces change — and it lands on your false-green local gates
date: 2026-10-03
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: ci_test_selection
severity: high
applies_when:
  - Running a conductor work order's targeted (impacted-tests) validation command when the changed-surface set may include shared build/test configuration
  - Trusting implement-phase local gate output (check-types, eslint) that was produced under aggressive output clearing
  - Adopting or adjudicating a reaped predecessor attempt's claimed outcomes without re-deriving them from typed records and the Actions API
tags: [ci, targeted-tests, impacted-tests, ephemeral-ci, false-green, gates, conductor, validation]
---

# Impacted-test selection silently escalates to a full cloud-CI push when config surfaces change — and it lands on your false-green local gates

Date: 2026-10-03 (event) · Run: `d620213c17734b18bddec98e7db07c7f`
(conductor run id, not a commit sha) (repository-maintenance cycle 1) · Author:
hermes-conductor compound phase (attempt
`2b67cfddfc3a400d82f8196d8d297137`, also a conductor attempt id, not a
commit sha; ce-compound)

## Problem

The conductor's targeted validation command — `run_repo_impacted_tests.py`
with `--mode fast` and a `github_ci_validate.py` fallback — routes by changed
surface. When the engine's changed-surface set contains a shared build/test
configuration file (here `package.json`, which entered the set via union with
a reaped sibling's landing diff, not via this run's own edits), the selector
prints `impacted-tests: shared build/test configuration changed; fallback=full`
and the "targeted" command becomes the FULL validation entrypoint: it pushes
an ephemeral `conductor/ci-*` branch, opens a throwaway PR, and gates on the
complete cloud Main workflow. In this cycle that escalation surfaced a second,
latent defect: the implement phase's local-gate claims (check-types green,
eslint green) were false greens produced under aggressive output clearing, so
the first ephemeral run failed hard — Check Types (6 `tsc` errors: TS2345,
TS2532, TS18048 — regex-nullable bindings in the new guard test) and Lint (10
eslint errors) — while every prior local narration said green.

## Symptoms

- The phase's targeted command takes minutes instead of seconds and its log
  ends with PR/branch activity rather than a vitest summary (first occurrence
  here: Main run 37093541570 on PR #358, Check Types + Lint FAILURE).
- Local re-runs of the "green" gates now fail immediately once their output is
  actually persisted and read (`prev-checktypes-errors.txt`,
  `ephemeral-lint-errors.txt` captured the exact 6 + 10 defect set).
- A reaped predecessor's in-tree product (here: the two new test files) is
  cured while its phase record shows no usable result — the cure existed only
  in scratch copies plus the tree.

## What Didn't Work

- Executing the work order's targeted command verbatim and assuming "targeted"
  means local and read-only. The routing decision happens inside the selector
  and is invisible unless you ask for it.
- Reading cleared gate output as success: an empty terminal is not an exit
  code. The implement phase narrated `pnpm check-types rc=0` and
  `eslint rc=0` from output that had been cleared; the cloud run proved both
  false for the combined tree.
- Adjudicating the failed attempt from its summary text: the typed record and
  the Actions API are the ground truth (the first attempt's typed JSON said
  `status: failed`; its narration said passed).

## Solution (protocols, all proven this run)

1. Ask the selector before you execute. `run_repo_impacted_tests.py
   --print-only --fallback-command 'true' -- <surfaces>` prints the routing
   decision (kept as `selector-printonly-full.log` in the run's spool). If it
   says `fallback=full`, the exact command WILL push an ephemeral branch and
   PR — decide deliberately whether that is in scope for the phase.
2. When push/PR/CI is out of scope for the current phase (compound and review
   phases are read-only by policy), decompose instead: run the selector over
   the testable surfaces minus the config surface, run the new suites
   directly, then `pnpm check-types`, the full `pnpm lint`, and actionlint
   over touched workflows. That decomposition is what actually validated this
   batch: 13 suites / 611 tests over the 11 testable surfaces, both new
   suites 5/5, all gates rc=0.
3. Make every local gate persist its own verdict:
   `cmd > log 2>&1; echo RC=$?` — then grep the RC line out of the log. Never
   certify from a cleared screen, and treat "no output seen" as unverified,
   not green.
4. Verify phase outcomes from typed records (`*.json` result artifacts) and
   the Actions API (`gh api .../actions/runs/<id>/jobs`), not from prose
   narration — the first attempt here was rejected by exactly that check.
5. For reaped (infrastructure-killed) attempts: recover the in-tree product
   from scratch copies, verify it first-hand (md5 against the scratch
   record), and adopt the product — never the missing result.
6. Record validation evidence byte-exactly: the executed command string must
   equal the dispatch's pinned command AND cite the dispatch's CURRENT
   release path. A superseded-release path in the evidence voids the run even
   when CI was green (this cycle's full-validation first attempt was rejected
   for precisely that).

## Detection (forensics recipe)

- `gh api repos/<owner>/<repo>/actions/runs/<id>/jobs` for per-job
  conclusions; `gh run view --job <job-id> --log` for the failure text.
- `gh pr list --head conductor/ci-<sha>` to find and close the throwaway PR;
  `git ls-remote origin 'refs/heads/conductor/ci-*'` to confirm the refs were
  reaped.
- Keep `fix-and-gates.log`-style rc-trace files per gate; they are the appeal
  record when a narration and a typed record disagree.

## Adjacent defect recorded here (ledger tooling)

The implement phase's ROADMAP rider script never landed its riders: it placed
new mint items "before the heading that follows the last `- id:` line" — but
the file's last id line sits in the Superseded section with no `## ` heading
after it, so the script died on `StopIteration` before writing (the tree
stayed at its committed census while the phase narrated riders landed). The
correct placement is the ext-#5 closing-comment marker at the end of the Open
items section (the convention of the roadmap phase's composer). Compounding
phase re-materialized the riders that way; census 187 defs / 0 dups after.

## Related records

- Ledger: riders on `rm-527`, `rm-528` (validation evidence), `rm-279` (two
  further green push-to-main Lint runs), disclosure extension #8 in
  ROADMAP.md.
- Batch record: `docs/prioritization/2026-10-03-repository-maintenance-cycle-1-batch-run-d620213c.md`
  (Outcome + reusable lessons + next-cycle candidates).
- Sibling learning, same trap family: `docs/solutions/workflow-issues/roadmap-monolith-lines-kill-cloud-lint-split-recipe-2026-09-30.md`
  (remote Lint cost class; landed on origin/main after this frame — read it
  there via `git show origin/main:<path>` if absent at this base).
