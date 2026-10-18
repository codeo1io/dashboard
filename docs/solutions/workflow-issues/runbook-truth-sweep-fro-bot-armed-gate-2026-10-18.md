---
title: Runbook truth must be probed live — the Fro Bot workflow became an armed-to-fail cron without any doc saying so
date: 2026-10-18
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: high
applies_when:
  - A runbook states repo/workflow/secret/scorecard state that can drift (workflow enabled-ness, secret presence, Scorecard sub-scores, PR queue shape)
  - Re-probing docs/runbooks claims before relying on them, or deciding which runbook lines are falsified vs still true
  - Writing a docs-only maintenance batch whose edits must each cite a live probe
---

## Problem

Runbooks that describe *live repository state* (not process) rot silently.
`docs/runbooks/outage-validation.md` claimed the `Fro Bot` workflow "stays
`disabled_manually` until a `FRO_BOT_PAT` secret is provisioned" — a state
verified 2026-09-19. By 2026-10-18 the workflow was ACTIVE with no secret and
a nightly cron that fails at checkout, every night, with nothing in any doc
recording the flip. The same sweep found `security-posture.md` frozen at a
2026-09-22 Scorecard snapshot (7.1) while the live analysis read 7.7 with a
different sub-8 set, and a superseded-PR runbook whose minting case had since
closed. Docs that assert current state without a probe recipe are worse than
docs that say nothing.

## The probe table (batch run 31fe572f, all probes executed 2026-10-18 ~04:00Z)

| Claim (file:line, before) | Probe | Verdict / action |
| --- | --- | --- |
| outage-validation.md:82 `Fro Bot` stays `disabled_manually` until `FRO_BOT_PAT` provisioned | `gh workflow list` → `Fro Bot  active  330819996`; `gh secret list` → empty; `gh run list --workflow=fro-bot.yaml --limit 12` → schedule run 39093521474 (2026-10-18T03:24:43Z) `failure` in 7s, annotation `Input required and not supplied: token` at `Checkout repository` (fro-bot.yaml feeds `token:`/`github-token:` from `secrets.FRO_BOT_PAT`); pull_request runs skip green in 1-2s | **FALSIFIED** — flipped to armed-gate reality with embedded re-probe recipe |
| gateway-access.md v0.114.1 + PR #1651 introduced `GATEWAY_OPERATOR_TRUSTED_PROXIES` requirement | `gh api repos/fro-bot/agent/releases/tags/v0.114.1` → exists, published 2026-09-22T21:47:02Z; `gh api repos/fro-bot/agent/pulls/1651` → merged 2026-09-22T18:00:02Z, title `fix(gateway): key operator rate limits on the client, not the proxy` | **HELD** — no edit |
| gateway-access.md CLI: `bunx @marcusrbrown/infra`, subcommands status/deploy/logs/backup/restore, no `restart`, remote user `root`, compose dir `/opt/gateway/deploy` | `npm view @marcusrbrown/infra version` → 0.26.0; published tarball `dist/cli.js`: `DEFAULT_REMOTE_USER = "root"`, `opt/gateway/deploy` ×3, zero `restart` command strings | **HELD** — no edit |
| gateway-access.md line refs `apps/gateway/src/deploy.ts:192/:187` | npm tarball ships no `apps/` source; unverifiable without a `marcusrbrown/infra` checkout (none on this host) | **NOT FALSIFIABLE here** — left untouched |
| actions-darkness-watch.md verdict semantics (exit ladder 0/1/3, candidate set, 100-run window) | full read of `scripts/actions-darkness-watch.ts` at HEAD + live run: `verdict=DARK … candidates=12`, exit 3 | **HELD** except the GREEN bullet, which implied staleness alone trips the probe — tightened to stale-AND-owed |
| actions-darkness-watch.md pagination bound ("reports `never-ran` … `last_run` understates") | live: audit lane printed `never-ran` while its true last run is 2026-10-05T10:48:22Z (`gh run list --workflow=audit.yaml`, conclusion `failure`); cve-tripwire has zero runs ever | **HELD** + recorded as fresh 2026-10-18 proof |
| security-posture.md:4 score 7.1 as of the 2026-09-22 run | `api.securityscorecards.dev/projects/github.com/codeo1io/dashboard` → score 7.7, analysis date 2026-10-18T02:50:32Z (matches the 02:50:21Z push run) | **FALSIFIED** — updated to 7.7 with trajectory note |
| security-posture.md Fuzzing 0 / tracked rm-144 | same API: Fuzzing 10, reason `project is fuzzed`; grep over `.github/` finds no OSS-Fuzz/ClusterFuzzLite/cifuzz references; ROADMAP rm-144 still `in_progress` | **FALSIFIED** — row left the sub-8 table, honesty note added |
| security-posture.md table lacks CI-Tests | same API: CI-Tests -1, reason `no pull request found` (2026-10-09 reading was "2 out of 5 merged PRs checked" — ROADMAP rm-143 rider) | **ADDED** row, tracked rm-116 |
| security-posture.md Branch-Protection "main is currently unprotected" | `gh api …/branches/main/protection` → object exists, `checks` empty, `enforce_admins` false; Scorecard reason is an internal token error ("can't read classic branch protection rules") | **REFINED** — "empty shell" + measurement-artifact note |
| security-posture.md "badge data updates Thursdays" | `scorecard.yaml` triggers: push to main + `cron: '27 6 * * 1'`; API analysis timestamp == same-day push run | **FALSIFIED** — cadence corrected |
| superseded-batch-pr-disposition.md PR #10 "open since 2026-09-21" | `gh pr view 10` → CLOSED, closedAt 2026-09-29T05:13:26Z | **RESOLUTION APPENDED** (minting case is history) |

## Cure

Every live-state runbook claim now carries its own re-probe recipe inline, and
this note is the batch's durable probe transcript. The pattern for future
sweeps: enumerate claims that assert *current state* (workflow state, secret
presence, scores, queue shape) → probe each live → fix only falsified ones →
cite the probe at the edit site → record the full table in a dated solutions
note. Claims that cannot be probed from this host (line refs into a private
infra checkout) are left untouched and named as not-falsifiable, never
silently "verified".

## Traps

- The reaped-attempt hazard cuts both ways: a reaped implement attempt left
  zero tree drift (porcelain clean at base 64cd2f6a), so the sweep had to be
  redone from scratch — check `git status --porcelain` before trusting that
  "the work happened".
- `gh secret list` exits 0 with empty output when no secrets exist — an empty
  string is the finding, not a probe failure.
- Scorecard sub-check `reason` strings carry the ground truth the badge hides
  (token-artifact errors, "no pull request found"); read the full JSON, not
  just the score.
- The darkness-watch probe's `never-ran` is not evidence a workflow never
  ran — cross-check `gh run list --workflow=<file>` before writing it down.
