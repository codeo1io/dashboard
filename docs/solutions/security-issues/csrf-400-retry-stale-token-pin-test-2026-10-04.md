---
title: A pinning test had locked the stale-CSRF retry in as if it were the contract
date: 2026-10-04
category: security-issues
module: dashboard
component: operator-stream-client
problem_type: security_issue
severity: medium
applies_when:
  - 'A CSRF-protected mutation has a one-shot HTTP-400 retry (the refresh-then-resend class rm-130 landed: decideRunApproval, browser submitLaunch, browser cancel, server launchRun)'
  - 'A test describes that retry by asserting the two requests are identical, and the same-ness leaks from the idempotency key (correct to keep) onto the whole request init (wrong — the CSRF token must be FRESH)'
  - 'Adding or reviewing a mutating member of the operator surface in public/operator-stream.js, public/operator-launch.js, or src/gateway/operator-client.ts'
tags: [csrf, retry, idempotency, pinning-test, red-first, operator-client, cancel-client, rm-607]
related:
  - 'ROADMAP.md rm-607 (the flip), rm-130 (the landed discipline), rm-485 (the declined fourth member)'
  - 'docs/solutions/best-practices/operator-approval-channel-consumption-2026-06-22.md (the approval channel failure table already stated the fresh-token expectation)'
  - 'docs/solutions/workflow-issues/jsdoc-contract-tests-normalize-wrapped-docstrings-2026-10-04.md (the companion doc-pin suite)'
---

## Problem

The browser cancel client (`public/operator-stream.js` `buildCancelClient`)
built its request `init` once with the caller's `x-csrf-token` and an
`idempotency-key`, and its single HTTP-400 retry re-POSTed the **byte-identical
`init`** — the in-file comment even said so ("reusing the SAME idempotency key
and init"). A session-expired 400 therefore burned the one retry on a known-stale
token and re-400'd: the cancel control died exactly when an operator needed to
stop a run.

The defect was **pinned as contract by a test**: `test/operator-stream-core.test.ts`
asserted `csrfTokens[0] === csrfTokens[1] === 'the caller's token'` under the
title "triggers exactly ONE retry with the SAME idempotency key". The test
author wrote down the observed behavior; the *same-ness* that legitimately
belongs to the idempotency key silently spread to the whole request. The two
landed twins in the same file already did it right (`decideRunApproval` at
:1115-1128 and browser `submitLaunch` in `public/operator-launch.js` at
:135-143 — refresh CSRF, then re-POST with the FRESH token and the SAME key),
and their tests asserted the fresh-token shape, so the outlier was visible by
diffing members, not by reading any one of them.

## Solution

Flip the pin **red-first**, then fix (run 733651705ae2, rm-607):

1. Rewrite the pinning test to the twin shape FIRST and watch it fail on the
   unfixed code (it failed `expected 3, received 2` — no CSRF refresh fetch
   happened at all). The flipped assertions: exactly 3 fetches = 1 CSRF refresh
   + 2 cancel POSTs; `idempotency-key` identical on both POSTs;
   `csrfTokens[0] !== csrfTokens[1]`; `csrfTokens[1]` equals the refreshed
   token. The persistent-400 negative tightens to exactly 2 fetches — no retry
   loop even when the second attempt also 400s.
2. Fix the 400 branch to mirror the twin: `refreshCsrf()`; on refresh failure
   map the error exactly like the twin (`http` → `{kind:'http',status}`,
   else `network`) and stop; on success re-POST
   `{...init, headers: {...init.headers, 'x-csrf-token': fresh}}` — same
   idempotency key, one retry.
3. Update the stale doc comments at the client's header and `cancelRun`
   docstring — they now name the discipline and both twins, and the four
   mutating `OperatorClient` interface members state their retry contracts
   symmetrically (self-locked by
   `test/operator-client-retry-contract.test.ts`).

## Prevention

- **Per-header retry discipline:** the idempotency key is operation identity —
  resend it unchanged; the CSRF token is a session credential — refresh it
  before any resend. Any new mutating client member copies the landed twin
  branch verbatim rather than re-deriving retry semantics.
- **Never assert two retry requests are byte-identical.** Assert the key is
  identical AND the credential differs. A "same … " phrase in a test title
  about a retry is a smell — check which headers the same-ness covers.
- **Diff a class, not a member.** When a file holds parallel clients for the
  same auth discipline, a member whose retry reuses the whole `init` object is
  the outlier; grep 400-branches for re-use of the same `init` reference.
- A pinning test that documents current behavior is a TODO, not a contract:
  when the behavior is a defect, flip the pin red-first — the red run on
  unfixed code is the proof the test can fail.
