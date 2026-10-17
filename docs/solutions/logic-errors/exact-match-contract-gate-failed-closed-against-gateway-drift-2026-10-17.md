---
title: An exact-match operator-contract gate failed closed against every current gateway, so the run stream went dark by design
date: 2026-10-17
category: logic-errors
module: dashboard
problem_type: logic_error
component: gateway_reader
tags:
  - operator-contract
  - version-gate
  - fail-closed
  - additive-acceptance
---

## Problem

The operator run-stream reader (`src/gateway/operator-sse-reader.ts`) accepted exactly one
operator-contract version, `1.9.0` (`src/gateway/operator-contract/version.ts`). The gateway this
dashboard reads is an independently-deployed service that advertises its contract version
unconditionally in the first SSE `ready` frame. When the deployed gateway family moved to
`1.11.0`, the reader's `!==` check failed closed on every connection: the operator stream went
down entirely - not degraded, dark - while every local test stayed green, because the fixtures
also pinned `1.9.0`.

A second instance of the same error class hid one layer deeper: the subscription-metadata read
in `src/gateway/operator-client.ts` parsed `raw.data` as a flat record because that was the
shape when it was written; the gateway had since switched to returning a list. The test fixture
pinned the flat shape, so the suite faithfully asserted the bug.

## Root cause

Both sites treated "the shape I developed against" as a contract, instead of treating the
server as an independently-moving party. Exact-match (or single-shape) clients turn routine
server-side evolution into outages, and pinning fixtures to the observed-at-development shape
makes the test suite a co-conspirator.

## Cure (landed 2026-10-17, run e4d61c80e7fa)

- Replace the exact match with a known-good SET: `ACCEPTED_OPERATOR_CONTRACT_VERSIONS` covers
  1.6.0 through 1.11.0; unknown versions still fail closed with `contract-drift`. Fail-closed
  on the unknown is the invariant; the bet on one exact version never was.
- Parse the wire tolerantly at the envelope boundary but closed-DTO at the entry boundary: the
  contract mirror (`operator-contract/push.ts`) validates list entries field by field and drops
  invalid ones; a flat record is rejected outright - no supported gateway serves one, so accepting
  it would widen the parsed surface without a producer. The fixture flipped to the current wire
  and the test pins the rejection.
- Keep fixture preservation where it is the actual guard: `test/run-responses.ts` run-summary
  shapes are pinned deliberately so an absorb that changes wire shapes visibly breaks.

## How to prevent recurrence

When adding any cross-service reader: enumerate the versions/shapes you will accept as a set,
fail closed only on the unknown, and give every accepted member a test. When a server you do
not control ships a new version, extending the set is a compatibility fix, not a feature.
Audit pinned fixtures for "shape captured at development time" - if the fixture encodes an
observation rather than an invariant, it is a future red herring.
