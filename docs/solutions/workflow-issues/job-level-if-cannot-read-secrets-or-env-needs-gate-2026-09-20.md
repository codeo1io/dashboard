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
   checks (see rm-112 for the structural enabler — main was unprotected).
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

- The gate job is a real job: it queues on the runner (when this doc was
  written the fork had ONE self-hosted runner, so jobs serialized; CI has
  since moved to GitHub-hosted runners — d73fbe7, 2026-09-22 — where the
  gate still costs a queued job per trigger), it appears in Check-Workflows
  expectations, and it runs on every configured trigger (seconds each).
- Keep it trivial — no checkout, no permissions (`permissions: {}`), small
  `timeout-minutes` so a stuck runner cannot hold a slot long.

Landing note (truth-corrected 2026-09-24; consolidated 2026-10-04 when an
artifact-named duplicate of this doc — `zz-conflict-lint-check.md` — rode the
d34c15c4 upstream-absorb landing and was folded back here): the needs-gate
form above was authored 2026-09-20 by run f4622d7e (rm-100a), whose landing
was stranded. On main the same constraint was instead satisfied with the
step-level variant this doc identifies as legal — job-level
`env: HAS_FRO_BOT_PAT: ${{ secrets.FRO_BOT_PAT != '' }}` plus per-step
`if: ... env.HAS_FRO_BOT_PAT == 'true'` and a warn-and-skip step
(fro-bot.yaml, landed via run 270220e7 at 916783f/aa4ff9f) — which skips
gracefully with a visible warning instead of consuming an extra gate job.
Both forms satisfy the rule above: pick the needs-gate when a whole job (not
just its steps) must be skipped, job-env + step-ifs when only steps do.
Step-level token references (for example `token: ${{ secrets.FRO_BOT_PAT }}`
inside a step) remain legal and are untouched in both forms.

## Validation

Run the container actionlint across all workflows — it reproduces the GitHub
schema decision exactly (both invalid forms exit 1; the needs-gate exits 0):

```bash
docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12 -no-color
```

Related docs: `actionlint-pipx-missing-container-form-2026-09-19.md` (why the
container form).
