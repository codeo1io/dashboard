---
title: A job-level workflow `if:` cannot read `secrets` OR `env` — gate via step-level env or a needs-gate job
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
   checks (see rm-112 for the structural enabler — main was unprotected).
2. The "obvious" fix — the job-level env gate proven at release.yaml 886c28e —
   is ALSO invalid at job level. `env` is not in the job-level context list;
   actionlint reports `context "env" is not allowed here. available contexts
   are "github", "inputs", "needs", "vars"`. The 886c28e pattern works only
   because its `if: env.HAS_RELEASE_APP == 'true'` sits at STEP level, where
   `env` and `secrets` are both available.

Python YAML parsers and non-actionlint linters will not catch this — it is a
context-availability rule, not a syntax error.

## Solution — two valid escapes

The landing rule: never put the secret term in a job-level `if:`. Either (a) move
it to **step level**, where both `env` and `secrets` ARE available — job-level
`env: X: ${{ secrets.S }}` plus per-step `if: env.X == 'true'`, the pattern this
repo actually ships — or (b), when the job-level `if:` itself must carry the
secret term (e.g. the whole job should be skipped), gate through a tiny
preceding job (a step-level `env` MAY read `secrets`), export it as a job
output, and branch on `needs.<id>.outputs`:

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

- The gate job is a real job: it queues a runner slot, appears in
  Check-Workflows expectations, and runs on every configured trigger (seconds
  each). Since PR #11 moved all CI to GitHub-hosted `ubuntu-latest` runners,
  that is the right `runs-on`; a shared single self-hosted runner would
  additionally serialize every job behind the gate.
- Keep it trivial — no checkout, no permissions (`permissions: {}`), small
  `timeout-minutes` so a stuck runner cannot hold a slot long.

Shipped 2026-09-20 via rm-100a. The retry run's batch landed on main as escape
(a): `fro-bot.yaml` carries job-level `env: HAS_FRO_BOT_PAT: ${{ secrets.FRO_BOT_PAT != '' }}`
plus per-step `if: github.event_name != 'schedule' || env.HAS_FRO_BOT_PAT == 'true'`
and a warn-and-skip step for the empty case — exactly the `release.yaml` 886c28e
`HAS_RELEASE_APP` contract, applied to the scheduled trigger. The needs-gate
form above remains the documented escape when the job-level `if:` cannot be
decomposed per-step. Step-level token references (for example
`token: ${{ secrets.FRO_BOT_PAT }}` inside a step) remain legal and were left
untouched.

## Validation

Run the container actionlint across all workflows — it reproduces the GitHub
schema decision exactly (both invalid forms exit 1; the needs-gate exits 0):

```bash
docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12 -no-color
```

Related docs: `actionlint-pipx-missing-container-form-2026-09-19.md` (why the
container form).
