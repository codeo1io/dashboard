---
title: Canonical Actions suspension shows enabled:true — prove it two-sided and validate through the ephemeral mirror
date: 2026-10-16
last_updated: 2026-10-16
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: high
applies_when:
  - Pushes, PRs, and merges succeed but NO workflow run is created for days across every workflow
  - An engine full_tests dispatch (`github_ci_validate.py`) times out with "no checks reported" and closes its own validation PR
  - You are tempted to conclude GitHub-the-platform is down, or that repo settings disabled Actions
---

## Problem

From 2026-10-09T01:59Z onward, codeo1io/dashboard created zero Actions runs —
across all 12 workflows — while pushes, PR creation, merges, and every other
API surface kept working. The misleading part: every ordinary read says Actions
is fine.

- `GET /repos/codeo1io/dashboard/actions/permissions` → `{"enabled":true,"allowed_actions":"selected","sha_pinning_required":true}` (still true during the outage)
- `gh workflow list` / the workflows API → all 12 workflows `active`
- githubstatus.com → Actions component `operational`, and no incident covers the window

A single-sided probe (permissions GET) therefore cannot distinguish a healthy
repo from a suspended one. The run-creation outage also stalls the landing
pipeline: engine full-suite validation (`github_ci_validate.py --repo .`)
creates its ephemeral validation PR, then times out because no check-run ever
registers.

## Diagnosis: the two-sided probe

Suspend-vs-enabled is only distinguishable by attempting a dispatch, not by
reading settings. Probe with the **Main workflow file** specifically:

    gh api repos/codeo1io/dashboard/actions/runs?per_page=1   # newest run frozen at outage start?
    gh api -X POST repos/codeo1io/dashboard/actions/workflows/main.yaml/dispatches -f ref=main

Observed 2026-10-16: run list frozen at 2026-10-09T01:59:31Z while the dispatch
returns **HTTP 422 "Actions has been disabled for this repository."** — that
422 against an `enabled:true` permissions read is the signature of a
repo-scoped Actions suspension with a stuck display state (account/billing-side
cause; recovery needs the account-side re-enable, not a repo change).

Probe `main.yaml` by path: `main.yml` (or a wrong name) 404s and proves
nothing. Exonerations worth recording first so the cause class narrows fast:
platform status (githubstatus components + incidents), repo settings (the
`allowed_actions`/`sha_pinning_required` PUT postdated the outage start), and
workflow states.

## Workaround: validate through the ephemeral public mirror

While the suspension persists, run the authoritative full-suite route on a
mirror GitHub repository whose Actions still works (house mirror family:
`codeo1io/dashboard-fullval-<hash>`), without substituting any command —
`github_ci_validate.py --repo .` itself repoints `origin` temporarily, or a
launcher wraps it:

1. **Mirror reuse checklist before trusting a run**: mirror `main` ==
   canonical `main` (SHA-equal); `fro-bot.yaml` + `visual.yaml`
   `disabled_manually` in the mirror (only `main.yaml` needs to run);
   vulnerability alerts enabled; viewer has write.
2. Push the validation refs (candidate + base) and let the script open its PR;
   the Main workflow's 9 jobs are the gate (Setup / Design Check / Check
   Types / Lint / Test Scripts Load / Check Workflows / Test / Dependency
   Review / CodeQL Analyze).
3. Poll `gh pr checks <n>`; success requires every check `pass` — then close
   the PR and delete both `conductor/ci-*` refs, and confirm the mirror holds
   zero open PRs / stale ci refs afterward.
4. Prove the validated tree is YOUR tree: record the head SHA → tree SHA →
   blob evidence (e.g. the batch's unique paragraph in AGENTS.md) from the
   mirror API, not just the run conclusion.
5. Never leave `origin` repointed: capture the canonical URL before, assert
   it equals the expected canonical remote, and restore in an EXIT trap. In
   linked worktrees `git remote set-url` flips the whole family — serialize
   concurrent validations and assert before capture.

Proven end-to-end 2026-10-16 (run 96397cc91e18 full_tests, mirror PR #6:
9/9 checks green, validated-tree blob proof, refs and PRs cleaned). The
canonical-route fold-contract substitute template is recorded in the campaign
validation notes — the declaration must carry `scope=full`, `outcome=passed`,
and the dispatch `full_command` byte-exact.

## Prevention

- Keep the out-of-band darkness probe (`actions-darkness-probe.sh`,
  spool-side) in the estate-tripwire lane: it names the frozen newest-run
  timestamp, push-vs-run gap, and workflow states in one DARK verdict, so the
  next suspension is detected in minutes, not days.
- Re-check with the two-sided probe before treating any `enabled:true` read as
  proof Actions works; and record the platform-not-guilty evidence once, so
  future triage starts repo/account-side immediately.
