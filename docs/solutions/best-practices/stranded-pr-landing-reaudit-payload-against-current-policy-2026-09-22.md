---
title: when landing a stranded PR, re-audit its payload against CURRENT policy — merge-clean is not policy-compatible
date: 2026-09-22
module: dashboard
problem_type: best_practice
component: maintenance_workflow
severity: medium
applies_when:
  - landing a PR whose branch sat open across a policy change (runner placement, pin style, secret gates)
  - cherry-picking or merging a validated payload that was authored on an older base
---

## Rule

A stranded PR's payload is frozen at AUTHORING time, but it lands at CURRENT
time. `git merge-tree` reporting zero conflicts only proves the text merges;
it says nothing about whether the payload still agrees with the repo's
current policy. Before landing, diff every policy-bearing field in the
payload against what main does NOW.

## Case

PR #10 (27b046a, the cycle-4/6 truth batch) was authored 2026-09-21 under the
self-hosted-runners-only CI policy. Its `base-drift.yaml` declared
`runs-on: self-hosted`. On 2026-09-22, PR #11/#12 moved ALL CI to
GitHub-hosted `ubuntu-latest` — and the `ubuntu-lift` flip that had been
applied to base-drift.yaml on one integration lineage never reached the
stranded branch. The payload merged cleanly into the new main (0 conflict
markers, verified twice) and would have re-introduced a workflow that can
never run: the self-hosted runner era is over.

The cycle-7 landing caught it because the implement phase swept the payload
for stale self-hosted claims (the same sweep that truthed six comment sites),
and flipped `base-drift.yaml` to `ubuntu-latest` with a dated policy comment
in the same staged batch.

## Checklist for landing stranded payloads

- Enumerate the payload exactly: `git diff --name-only $(git merge-base
  origin/main <head>) <head>` — shorthands ("the 16-file batch") undercount
  (this payload was 18).
- Grep the payload for every policy-bearing token that changed since
  authoring: `runs-on:`, action pins, secret-presence gates, container digests.
- Verify claims the payload makes about other files still hold on current
  main (a stranded comment can contradict a file that landed after it).
- Apply corrections in the SAME landing batch, with a dated comment naming
  the policy that superseded the original authoring-time choice.
