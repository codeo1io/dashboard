---
title: Property-test generator pitfalls on fast-check — five counterexamples from the first suite
date: 2026-09-24
category: best-practices
module: dashboard
problem_type: best_practice
component: testing_framework
severity: low
applies_when:
  - Writing fast-check property suites over parsing/redaction/ordering surfaces (rm-144 lineage)
  - A property fails only after tightening a generator, and you must decide whether the bug is in the product or in the spec
  - Pinning fast-check as an explicit devDependency when it previously rode in transitively
tags:
  - fast-check
  - property-testing
  - vitest
  - rm-144
---

# Property-test generator pitfalls on fast-check

## Context

Conductor run 3538ec96 (cycle-10 B3, rm-144) introduced the repo's first
property-based suites: ingest-contract parsing, SSE data-line framing, and
attention ordering (fast-check 4.9.0, pinned as an explicit devDependency —
it already resolved transitively, so the lockfile delta was 3 lines). During
development the properties caught **five bugs — all in the tests, none in the
product**. Each is a distinct, reusable generator-design trap.

## Guidance

1. **Don't let the generator produce reserved domain tokens.** A marker
   generator built from a free alphabet emitted the literal `ED`, colliding
   with a reserved token in the ingest contract. Constrain the alphabet to
   exclude the parser's reserved set, or construct markers the way the
   protocol does.
2. **Trim before comparing, or generate already-trimmed input.** An untrimmed
   string comparison fails on arbitrary trailing whitespace the property
   itself injected.
3. **Decide the empty boundary up front.** Arbitraries emit the empty case;
   know whether the invariant holds there and assert it explicitly rather
   than letting an empty-body property flap.
4. **`fc.date` can emit invalid `Date`s** (fast-check constructs from raw
   time values). Filter or constrain the arbitrary so every generated value
   passes `!Number.isNaN(d.getTime())`.
5. **Failure-message text is input too.** A redaction property asserted that
   a fixed human-readable error message leaks no field names — and the
   message legitimately contained the word "name". Constrain both the
   generated field names and the checked substrings, or assert against
   structured output instead of prose.

## Why This Matters

The value of a property suite is measured by how often a failure means "real
bug". Every generator flaw above produced a false counterexample that had to
be triaged before trust in the suite could form. Five triages in one session
is the tuition; the list above is the rebate for the next suite.

## When to Apply

- Adding to `test/*.property.test.ts` (ingest contract, SSE framing,
  attention ordering are the standing examples).
- Before concluding "the property found a product bug" — check this list
  first; all five of this cycle's counterexamples were spec-side.

## Examples

Invalid dates (trap 4):

```ts
// bad: fc.date() alone can yield an invalid Date
const dates = fc.date({ mode: 'native' }); // still unconstrained

// good: constrain the range AND guard validity
const validDate = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') })
  .filter((d) => !Number.isNaN(d.getTime()));
```

Reserved tokens (trap 1):

```ts
// bad: free alphabet can spell the reserved token
const marker = fc.stringMatching(/^[\w]+$/);

// good: sample from an alphabet that cannot form it
const alphabet = 'abcfghjklmnpqrstuvwyz0123456789'.split('');
```

Cross-references: rm-144 in `ROADMAP.md`; lint-form constraints on generator
regexes in
`docs/solutions/workflow-issues/lint-after-any-test-file-edit-regexp-rules-2026-09-24.md`.
