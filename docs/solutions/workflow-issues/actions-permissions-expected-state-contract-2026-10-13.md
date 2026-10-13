---
title: Actions-permissions expected state — the rm-843 selected allowlist was reverted live; re-apply contract + one-command re-probe
date: 2026-10-13
last_updated: 2026-10-13
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - '`gh api repos/codeo1io/dashboard/actions/permissions` reports `allowed_actions` other than `selected`'
  - 'A maintenance cycle needs to prove the repo''s Actions supply-chain posture without waiting for a workflow run'
  - 'Actions has been disabled repo-wide (the 2026-10-09 outage) and settings drift is invisible to every in-repo gate'
---

## Problem

The rm-843 batch hardened this fork's Actions permissions to an allowlist
(`allowed_actions: 'selected'`). That state was later reverted live: the
repository runs `allowed_actions: 'all'` (probed 2026-10-12, research
67e6e3ea — `gh api repos/codeo1io/dashboard/actions/permissions` →
`{enabled: true, allowed_actions: 'all', sha_pinning_required: true}`). The
permissions object is repo-settings state, not a tracked file, so no in-repo
gate can see the regression; and with Actions disabled repo-wide since
2026-10-09T01:59:31Z (workflow dispatch returns HTTP 422 "Actions has been
disabled for this repository"), zero run noise keeps it hidden too. A class
that silently reverted once must stay re-checkable in one command forever —
this document is that contract (ROADMAP rm-1012).

## Expected state (adjudicated 2026-10-13 against the workflows actually present)

`gh api repos/codeo1io/dashboard/actions/permissions` must report:

```json
{
  "enabled": true,
  "allowed_actions": "selected",
  "sha_pinning_required": true,
  "selected_actions_url": "https://api.github.com/repos/codeo1io/dashboard/actions/permissions/selected"
}
```

And the selected list (`gh api repos/codeo1io/dashboard/actions/permissions/selected`)
must equal exactly this adjudication — derived from the `uses:` census of
`.github/workflows/*.yaml` on 2026-10-13 (11 workflows, 17 distinct remote
actions):

| Pattern allowed | Why (workflows that need it) |
| --- | --- |
| `actions/*` | checkout, setup-node, upload-artifact, create-github-app-token, dependency-review-action — every workflow |
| `github/codeql-action` | codeql.yaml (init/analyze/upload-sarif) |
| `aquasecurity/trivy-action` | audit.yaml, release.yaml image scans |
| `docker/*` | setup-qemu/setup-buildx/login/build-push — release.yaml multi-arch |
| `ossf/scorecard-action` | scorecard.yaml |
| `pnpm/action-setup` | .github/actions/setup composite (via workflow jobs) |
| `fro-bot/agent` | fro-bot.yaml (the Fro Bot workflow) |

- `github_owned_allowed: false` — first-party `actions/*` is enumerated
  explicitly; do not broaden to all GitHub-authored actions.
- Local composite actions (`./.github/actions/setup`, 8 uses) resolve inside
  this repository and are not subject to the third-party allowlist — confirm
  with the first Main run after apply (its jobs are built on the local
  action).
- `sha_pinning_required: true` is already live and must survive the apply —
  re-probe it after the PUT (it is part of the same permissions object).

### Ride re-checks (rm-1012 acceptance, 2026-10-13)

- Upstream #611 (02a712e) bumps `ossf/scorecard-action` v2.4.4 → v2.5.0 at the
  next absorb: same owner, already covered — the allowlist does not strand it.
- Upstream #611 also bumps the `fro-bot/agent` workflow pin v0.119.3 → v0.120.0
  (this fork's fro-bot.yaml:347 still v0.119.1): same owner, already covered.
- A future absorb that introduces a NEW owner's action must extend this table
  in the same change — the fork-exclusion review is the natural checkpoint.

## Apply recipe (ships DORMANT — see below)

```sh
# 1. re-probe current state (one command, always safe):
gh api repos/codeo1io/dashboard/actions/permissions

# 2. switch to selected:
gh api -X PUT repos/codeo1io/dashboard/actions/permissions \
  -f enabled=true -f allowed_actions=selected

# 3. install the adjudicated allowlist:
gh api -X PUT repos/codeo1io/dashboard/actions/permissions/selected \
  -F github_owned_allowed=false \
  -F patterns_allowed[]='actions/*' \
  -F patterns_allowed[]='github/codeql-action' \
  -F patterns_allowed[]='aquasecurity/trivy-action' \
  -F patterns_allowed[]='docker/*' \
  -F patterns_allowed[]='ossf/scorecard-action' \
  -F patterns_allowed[]='pnpm/action-setup' \
  -F patterns_allowed[]='fro-bot/agent'

# 4. verify (both must match the Expected state above, incl. sha_pinning_required):
gh api repos/codeo1io/dashboard/actions/permissions
gh api repos/codeo1io/dashboard/actions/permissions/selected
```

Requires a token with repository **admin** scope (the codeo1io token has it).

## Why this ships dormant (rm-1012 acceptance clause, ordered per rm-1014)

Actions has been disabled for this repository since 2026-10-09T01:59:31Z —
dispatches return 422, no runs register, so the allowlist would protect
nothing today while risking the recovery catch-up: the post-revival sequence
(docs/runbooks/actions-recovery-order.md) re-fires standing guards and
dispatches first, and a stale-narrow allowlist could red-herring that
attribution-sensitive window. The apply therefore rides the recovery runbook's
step 2, after the rm-974 benign-dispatch drill proves runs register. Recovery
signals to watch: a dispatch that is NOT 422, any run newer than
2026-10-09T01:59:31Z, or a check-run on any `conductor/ci-*` PR.

## Verification

- One-command re-probe: `gh api repos/codeo1io/dashboard/actions/permissions`
  (the diff interpretation is the table above: anything not `selected`/`true`
  is a regression of this contract).
- After apply: the two GETs in step 4, plus the first Main run green on the
  local composite action.
