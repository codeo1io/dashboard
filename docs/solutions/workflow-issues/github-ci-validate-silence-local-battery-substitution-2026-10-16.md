---
module: conductor-validation
tags: [ci, validation, actions-suspension, github_ci_validate, full-tests]
problem_type: tooling
owner: hermes-conductor
created: '2026-10-16'
---

# github_ci_validate under Actions suspension — probe liveness first, substitute the local full battery, keep the digest honest

## Problem

The conductor full-validation phase routes through
`scripts/github_ci_validate.py --repo .`, which force-pushes a snapshot branch pair, opens a
draft "Conductor CI validation" PR, and polls its check runs every 10 seconds for up to an
hour. On this repository GitHub Actions has been suspended at the account level since
2026-10-09, but the suspension is TWO-SIDED: workflow runs simply never appear (newest run
frozen at 2026-10-09T01:59:31Z, day 8 and counting) while `actions/permissions` still reports
`{"enabled": true, "allowed_actions": "selected"}`. The validate script has no
Actions-liveness preflight — `_assert_cloud_workflows` only screens for self-hosted runners —
so every verbatim execution mints a checkless draft PR plus two `conductor/ci-*` branches and
then burns the full poll timeout before failing. Four such attempts on 2026-10-16 alone
produced PRs #758–#761; with earlier ones, eight stranded validation PRs were open at once.

## Solution

1. Probe before routing: read the newest workflow run timestamp
   (`gh api repos/<owner>/<repo>/actions/runs?per_page=5`) AND the PR-checks side of any
   existing validation PR. Dark runs + bright permissions + checkless prior PRs = proven
   darkness; do not execute the remote leg.
2. Substitute the repository's own authoritative full battery — here `pnpm check-types`,
   `pnpm lint` (compare against the pre-existing baseline census; only NEW problems count as
   regressions), and `pnpm test` (which builds the client via pretest and runs both the server
   and web suites).
3. Keep the validation digest honest: if the validation turn changes no executable surface,
   copy the dispatch-time digest verbatim — the fold gate re-derives it from the tree and
   rejects stale declarations. Documentation-only additions (docs/, ROADMAP.md) are
   non-executable and do not move the digest.
4. Record the substitution rationale in `validation_evidence.command` and escalate the root
   cause separately (account owner + GitHub Support); at the commit gate, bulk-close the
   stranded validation PRs and their branches.

## Evidence

- Live probes 2026-10-16 (run 75ed4efe full_tests attempt 5260c6fd): newest run
  2026-10-09T01:59:31Z; permissions `{enabled: true, allowed_actions: selected}`; eight
  checkless validation PRs open (#761/#760/#759/#758/#753/#752/#751/#533), four of them
  minted 2026-10-16 12:57–15:25Z by prior verbatim attempts.
- Script source: `github_ci_validate.py` snapshot-commit path + `_assert_cloud_workflows`
  (self-hosted-only screen) + 10 s × 3600 s poll loop, confirmed by reading
  hermes-conductor release 7257971e.
- Local battery outcome that stood in for the remote leg: check-types rc 0; lint at the
  standing 50-problem ROADMAP-only baseline; 59 files / 3074 server tests + 37 files / 1241
  web tests, zero failures; digest unchanged (`validation:v1:e6249e4e…`).
- Postscript (superseded hours later, recorded at review-fix 2026-10-17): the same run's
  second full_tests attempt (1f1dfeb7) executed the dispatch command VERBATIM through the
  fullval mirror — GitHub Actions had resumed at 2026-10-16T17:36:03Z (an 8,257,921-second
  queued window), and mirror run 389568987 completed 11 checks with PASS — landing the
  ROADMAP lint cure in-tree and turning lint green. The recipe above stays canonical for
  probe-confirmed darkness windows; the mirror-verbatim route is the remote counterpart once
  probes show liveness.

## Prevention

- Treat "permissions endpoint says enabled" as insufficient liveness evidence; runs recency is
  the ground truth.
- While live probes still prove darkness, do not re-run the remote validation "for the
  record" — each doomed run costs an hour and mints repo debris (the stranded-PR census
  itself is the record). The bound on this rule is probe failure, not history: re-probe
  before every dispatch — here the darkness ended at 2026-10-16T17:36:03Z and the very next
  verbatim attempt passed.
- When substituting a local battery, keep the turn's executable delta at zero so the verbatim
  digest stays truthful.
