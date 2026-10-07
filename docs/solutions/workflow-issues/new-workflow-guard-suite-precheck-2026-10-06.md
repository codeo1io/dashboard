---
title: New workflow files pass actionlint and lint, then redden the repo-wide guard suites in cloud CI — pre-check both guards locally
date: 2026-10-06
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: ci_workflow_authoring
severity: medium
applies_when:
  - Authoring or adopting any NEW file under .github/workflows/, or editing an existing workflow's shell
  - Treating actionlint + eslint as the complete local gate before a conductor full-validation (ephemeral cloud CI) round
  - Byte-adopting a workflow from another lineage or PR and assuming "it ran somewhere" covers this repo's statics guards
tags: [ci, workflows, actionlint, guard-tests, ephemeral-ci, residue-sweep, conductor, validation]
---

## Problem

The repo keeps two **repo-wide workflow-statics guard suites** that only execute
inside the full battery:

- `test/base-drift-digest-readback.test.ts` (rm-166) — scans every file under
  `.github/workflows/` comment-stripped and fails on the **literal string
  `--format` anywhere in workflow text**. The ban is deliberately blunt: it
  exists to kill the buildx digest-readback empty-extraction class (see
  `base-drift-empty-live-digest-extraction-guard-2026-09-24.md`), and it cannot
  distinguish a docker buildx `--format` template from a harmless
  `git for-each-ref --format=...` format string.
- `test/workflow-persist-credentials-guard.test.ts` (rm-527) — fails if any
  `actions/checkout` step in `.github/workflows/` lacks an **explicit
  `persist-credentials:` key**, either polarity; the key must be present and
  deliberate.

Neither guard runs as part of actionlint or eslint, and neither is hinted at by
them. A brand-new workflow can be actionlint-clean, eslint-clean, shellcheck-
clean, logically correct — and still turn a full conductor validation round RED
after the full cloud round-trip.

## Evidence (2026-10-06, run 00f7bf29 full_tests)

The batch's new `.github/workflows/residue-sweep.yaml` passed actionlint
(container `rhysd/actionlint:1.7.12`), eslint, and every implement-phase local
gate. Full validation round 1 (ephemeral run `37497027937`, 16:36Z) came back
**9/10 green, Test RED — 2383 passed / 2 failed**, and both failures were these
two guards tripping on the new file:

1. `test/base-drift-digest-readback.test.ts:67` — the sweep's ref census used
   `git for-each-ref --format=...` to read tip committerdates. A git format
   string, not the buildx template the ban targets — still banned.
2. `test/workflow-persist-credentials-guard.test.ts:66` — the sweep's
   `actions/checkout` carried only a comment about credentials, no explicit
   `persist-credentials:` key.

Cure (round 2, 16:44Z, 10/10 green):

- Read refs via `git for-each-ref --sort=refname <refspec>` **default output**
  (`sha type TAB ref` lines) parsed with `while read -r _ _ ref`, resolving the
  tip date per ref with `git log -1 --pretty=%ct` — zero `--format` literals.
- Set `persist-credentials: true` explicitly and deliberately (this job pushes
  ref deletions with the workflow token under `contents: write`); the guard
  wants the key present, not false.
- Bonus catch while revalidating: actionlint's embedded shellcheck flagged the
  now-unused loop variables (SC2034) — folded to `_ _` before round 2.

## Prevention rule

Whenever a file under `.github/workflows/` is added or edited, run — locally,
before any full validation round:

```sh
node_modules/.bin/vitest run \
  test/base-drift-digest-readback.test.ts \
  test/workflow-persist-credentials-guard.test.ts
docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12 \
  -no-color .github/workflows/<the-file>.yaml
node_modules/.bin/eslint .github/workflows/<the-file>.yaml
```

Seconds locally versus one full ephemeral cloud round (~8 minutes plus a red
ephemeral PR) per guard you miss. The guard suites are cheap and hermetic —
there is no reason to discover their verdicts in cloud CI.

Two further mechanics worth knowing:

- The ephemeral validation route builds its base from the candidate HEAD with
  `.github/workflows/` **replaced by origin/main's current set** — main-side
  guard updates apply to your candidate even if your branch is stale, so guard
  debt can arrive from outside your diff.
- The correct response to a blunt-guard red is always to **rewrite the
  command**, never to weaken or special-case the guard; if the ban is truly
  wrong for a class, that is a dated ROADMAP decision with its own acceptance,
  not an in-flight patch.

## Cross-references

- `docs/solutions/workflow-issues/base-drift-empty-live-digest-extraction-guard-2026-09-24.md`
  — the empty-extraction class behind the `--format` ban.
- `docs/solutions/workflow-issues/ephemeral-ci-fallback-routes-to-full-when-config-surfaces-change-2026-10-03.md`
  — the targeted-to-full escalation route that makes cloud round-trips the
  expensive case.
- ROADMAP riders dated 2026-10-06 on rm-166 and rm-527 record both live
  catches as guard-liveness evidence; the batch record is
  `docs/prioritization/2026-10-06-repository-maintenance-cycle-1-batch-run-00f7bf29ef2a.md`.
