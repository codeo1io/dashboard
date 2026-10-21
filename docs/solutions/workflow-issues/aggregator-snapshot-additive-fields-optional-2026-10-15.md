---
title: Additive AggregatorSnapshot fields must be optional — verbatim snapshot stubs pin the whole shape
module: 'github-aggregator'
tags: ['aggregator', 'snapshot-type', 'test-fixtures', 'additive-fields']
problem_type: 'wide-test-blast-radius'
date: '2026-10-15'
---

# Additive AggregatorSnapshot fields must be optional — verbatim snapshot stubs pin the whole shape

## Problem

`AggregatorSnapshot` (src/github/aggregator.ts) is stubbed VERBATIM by `getSnapshot()`
fixtures across the operator test surface — e.g. test/operator-fixture-harness.test.ts
and test/operator-route-redirect.test.ts construct object literals typed as the full
snapshot, and test/aggregator-invariants.property.test.ts anchors on
`COLD_START_SNAPSHOT`. Adding a REQUIRED field to the snapshot type (or threading a
required constructor argument) instantly widens a one-feature change into an
edit-every-fixture change, and turns an additive feature into a rebase hazard for the
parallel maintenance lineages that carry their own copies of those fixtures.

## Solution / prevention rule

Any new snapshot-level datum rides as an OPTIONAL field
(`platformStatus?: ... | null`) with null/absent meaning "unknown, render nothing",
and the aggregator populates it opportunistically (fail-open). This is exactly how
`platformStatus` landed 2026-10-15 (rm-1447): zero existing fixtures changed, both
vitest legs green, and downstream DTO/web surfaces treat absence as silent.

The same rule applies to the DTO mirror (`toMonitoringDto` in src/routes/api.ts) and
the web client type (`MonitoringData` in web/src/api/monitoring.ts): additive and
optional end to end, so stale clients and stubs degrade to "no annotation" rather
than failing.

## Symptom if violated

Type errors erupt across unrelated operator fixtures the moment the branch is
rebased or the workspace base moves — the tell is a fixture-edit diff that dwarfs
the feature diff.
