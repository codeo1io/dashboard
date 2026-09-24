---
title: A documented invariant that no test locks will drift from the code — make docstrings tell the truth and lock the semantics with a test in the same change
date: 2026-09-21
module: dashboard
problem_type: best_practice
component: aggregator
severity: medium
applies_when:
  - a docstring, README, or binding doc makes a behavioral promise (what is exposed, what is redacted, what is counted)
  - adversarial review or cycle research finds wording that no longer matches the code
---

## Problem

`src/github/aggregator.ts` carried a redaction-adjacent invariant in its
docstring (snapshot drift reported "count only, never by repo identity").
The code, meanwhile, listed installation-only discovered repos with full
`full_name` in `RepoStatusDto` under the `discovered` label — deliberate
single-operator exposure, but directly contradicting the doc. Two review
cycles flagged the wording/code disagreement before cycle 4 resolved it.

A doc-only invariant with no test behind it is a promise the repo cannot
keep: the code evolves, the comment stays, and the next reader (human or
agent) trusts a false security property.

## Solution

1. Pick one truth deliberately — for this repo the exposure is intentional
   (single-operator view), so the docstring was rewritten to say what the
   code does and WHY: discovered rows keep full identity; `driftCount`
   carries gap size only (no names, no node_ids).
2. Lock it in the same change: `test/aggregator.test.ts` now asserts
   `driftCount` equals the installation-only non-denylisted count AND that
   discovered rows keep `full_name` AND that denylisted repos are filtered
   before the snapshot (pre-query).

If the intended semantics had been the opposite (strip names), the same rule
applies in mirror: change the code AND add the test AND update the doc in
one change — never leave one of the three untouched.

## Prevention rule

Any behavioral promise in a docstring or binding doc that matters enough to
write down is worth a test that fails when the promise is broken. When a
review finds doc/code drift, the fix is not to soften the doc — it is to
decide the semantics explicitly (batch doc records the decision), then align
docstring, code, and test together.
