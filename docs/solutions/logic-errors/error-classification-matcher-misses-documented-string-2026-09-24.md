---
title: An error-classification matcher missed the exact string its own contract comment documented
date: 2026-09-24
category: logic-errors
module: dashboard
problem_type: logic_error
component: github_aggregator
severity: medium
symptoms:
  - "Repos missing the vulnerabilityAlerts grant rendered stale (data age climbing every 60s cycle) instead of showing live data with alerts=none"
  - "The aggregator log repeated 'Per-repo GraphQL fetch failed; marking stale' for repos whose only error was a missing optional permission"
  - "A regression test (test/aggregator.test.ts 'marking stale' case) pinned the WRONG behavior — it asserted the bug"
root_cause: logic_error
resolution_type: code_fix
related_components:
  - src/github/aggregator.ts
  - test/aggregator.test.ts
tags:
  - error-classification
  - graceful-degradation
  - comment-contract-drift
---

<!-- LANDING PROVENANCE 2026-09-25 (integrate of run d6455cdc, PR #113, conflict case 331964b6): authored in that lineage under its own id rm-177; the landed main id for this repair is rm-168 (cycle-11 B1, run 41c7d471), which credits this batch as first reporter. Code anchors below were measured at the lineage's base 7809df6; the landed matcher lives at src/github/aggregator.ts isVulnerabilityAlertsPermissionError on current main. -->

# Error-classification matcher missed its own documented error string (rm-177)

## Problem

`isVulnerabilityAlertsPermissionError` classified a permission miss by matching lowercased
fragments: `vulnerabilityalerts`, `vulnerability_alerts`, `vulnerability alerts`, or
(`push access` AND `vulnerability`). But the real GitHub error for a missing optional grant is
the bare string **"Resource not accessible by integration"** — no field name, no
"vulnerability" anywhere. The code comment right above the matcher listed that exact string as
the expected error, yet the matcher could not match it. Result: the graceful-degradation path
(no-alerts retry, `openAlertCount: null`, repo stays fresh) was unreachable for the most common
missing-permission case, and every such repo degraded to stale on every cycle.

## Root cause

Contract-comment drift: the matcher encoded an ASSUMED error shape (field-scoped messages)
while the comment (written from observed API behavior) carried the actual shape. Nothing tied
the two together — no test asserted the documented string, and the closest test asserted the
accidental stale behavior.

## Fix (2026-09-24, run d6455cdc B1)

- Matcher now also matches the bare `resource not accessible by integration` string, with an
  in-code comment stating the tradeoff: the string carries no field name, so a permission miss
  on a DIFFERENT field costs one extra no-alerts query before the same stale terminal state —
  never a wrong-success path.
- The old stale-pinning test was replaced by a red-then-green pin: bare string → retry once
  with the no-alerts query, `openAlertCount: null`, `stale: false`, rollup stays green.

## Prevention rule

**Every error string a contract comment documents must be matched by the classifier AND pinned
by a test enumerated from that comment.** When you write "GitHub returns X" in a comment, X is
part of the contract: add it to the matcher and to the test table in the same change. A
matcher that cannot reproduce its own comment's example is failing silently — here for weeks,
because the observable symptom (stale data) looked like a network problem, not a
classification bug.
