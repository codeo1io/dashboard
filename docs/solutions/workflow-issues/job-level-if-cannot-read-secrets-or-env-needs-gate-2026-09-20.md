---
title: A job-level workflow `if:` cannot read `secrets` OR `env` — gate secret presence through a needs-gate job
date: 2026-09-20
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: high
applies_when:
  - Check Workflows red with the workflow schema rejecting a whole workflow file ('Invalid workflow file' on GitHub; actionlint 'context ... is not allowed here')
  - Writing a job-level `if:` that must depend on whether a repo secret exists
  - Copying the release.yaml 886c28e env-gate pattern up to job level
---

## Problem

GitHub's workflow schema allows a **job-level** `if:` to reference only the
`github`, `inputs`, `needs`, and `vars` contexts. Two natural-looking forms are
both rejected, and the rejection is wholesale — the ENTIRE workflow file becomes
invalid, so every job in it stops running:

1. `if: secrets.FRO_BOT_PAT != ''` at job level — rejected. This is how PR #4
   broke Main on 2026-09-19 (fro-bot.yaml:266): the merge landed with two red
   checks (see rm-116 for the structural enabler — main was unprotected; the
   f4622d7e batch originally numbered this item rm-112 before the 2026-09-20
   lineage reconciliation renumbered the unlanded ids).
2. The "obvious" fix — the job-level env gate proven at release.yaml 886c28e —
   is ALSO invalid at job level. `env` is not in the job-level context list;
   actionlint reports `context "env" is not allowed here. available contexts
   are "github", "inputs", "needs", "vars"`. The 886c28e pattern works only
   because its `if: env.HAS_RELEASE_APP == 'true'` sits at STEP level, where
   `env` and `secrets` are both available.

Python YAML parsers and non-actionlint linters will not catch this — it is a
context-availability rule, not a syntax error.

## Solution — the needs-gate pattern

Compute secret presence in a tiny preceding job (a step-level `env` MAY read
`secrets`), export it as a job output, and branch the real job on
`needs.<id>.outputs`:

```yaml
jobs:
  secret-gate:
    name: Fro Bot secret gate
    runs-on: ubuntu-latest
    timeout-minutes: 5
    permissions: {}
    outputs:
      has_pat: ${{ steps.gate.outputs.has_pat }}
    steps:
      - name: Detect FRO_BOT_PAT presence
        id: gate
        env:
          FRO_BOT_PAT: ${{ secrets.FRO_BOT_PAT }}
        run: >
          echo "has_pat=$([ -n "$FRO_BOT_PAT" ] && echo true || echo false)" >> "$GITHUB_OUTPUT"

  fro-bot:
    needs: secret-gate
    if: >-
      (
      (github.event_name != 'schedule' || needs.secret-gate.outputs.has_pat == 'true') &&
      ...rest of the original condition verbatim...
```

This preserves every original condition arm (only the secret term is replaced)
and works for secrets, because the gate job itself has no `if:`.

Trade-offs to account for:

- The gate job is a real job: it queues a runner slot, it appears in
  Check-Workflows expectations, and it runs on every configured trigger
  (seconds each). (Historical note: when this was authored on 2026-09-20 the
  fork had ONE self-hosted runner, so gate jobs serialized behind real work —
  CI moved to GitHub-hosted `ubuntu-latest` on 2026-09-22, but the
  check-count/queueing cost is unchanged.)
- Keep it trivial — no checkout, no permissions (`permissions: {}`), small
  `timeout-minutes` so a stuck runner cannot hold a slot long.

## What actually shipped in this repo

Two valid escapes exist and BOTH are correct against the schema:

- **Job-level skip required → the needs-gate above.** Authored 2026-09-20 in
  run f4622d7e (rm-100a), whose landing was stranded by the parallel-campaign
  collision (see
  `parallel-conductor-campaigns-frame-movement-collisions-2026-09-20.md`).
- **Step-level gating suffices → job-level `env` + per-step `if: env.X`.**
  This is what fro-bot.yaml on main actually ships (landed via run 270220e7's
  batch at 916783f): job `env: HAS_FRO_BOT_PAT: ${{ secrets.FRO_BOT_PAT != '' }}`
  plus `if: github.event_name != 'schedule' || env.HAS_FRO_BOT_PAT == 'true'`
  on each step and a leading warn-and-skip step — the same contract as
  release.yaml's `HAS_RELEASE_APP` gate (886c28e). It avoids the extra job
  entirely because all real work sits in steps.

Step-level token references (for example `token: ${{ secrets.FRO_BOT_PAT }}`
inside a step) remain legal and were left untouched by both forms.

## Validation

Run the container actionlint across all workflows — it reproduces the GitHub
schema decision exactly (both invalid forms exit 1; the needs-gate exits 0):

```bash
docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12 -no-color
```

Related docs: `actionlint-pipx-missing-container-form-2026-09-19.md` (why the
container form),
`parallel-conductor-campaigns-frame-movement-collisions-2026-09-20.md` (the
stranded-landing lineage context that delayed this lesson's landing).
