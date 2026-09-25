---
title: Denylist membership must normalize id forms and discriminators must fail closed with accounting
date: 2026-09-24
category: security-issues
module: dashboard
problem_type: security_issue
component: service_object
severity: high
applies_when:
  - A redaction/security denylist is keyed on a numeric id whose wire form can arrive as number OR bigint (GitHub database_id under @octokit/types 17/18 widening)
  - A YAML/JSON discriminator decides security posture from a loosely-typed field (e.g. `private`)
  - A completeness/degradation heuristic infers intent from a string prefix instead of an explicit signal
---

## Problem

Three independent fail-open shapes were live at origin/main 763c1fa (found by run
b9c36244 assess/research, fixed by the cycle-8 batch, rm-151/rm-152/rm-154):

1. **Int64-unsafe membership.** `redactedDatabaseIds` was `Set<number>` and the
   aggregator's secondary deny guard checked `set.has(id)`. When Octokit widens id
   fields to bigint (@octokit/types 17.0.0 and 18.0.0 are BOTH in pnpm-lock.yaml),
   `Set<number>.has(bigint)` is always `false` — a silent redaction bypass. The
   gateway project hit exactly this class at v0.107.1 (fro-bot/agent PR #1513).
2. **Fail-open discriminator.** The redaction discriminator treated an entry private
   only on strict `entry.private === true`. A YAML authoring accident —
   `private: "true"` — silently classified the entry public and the denylist lost it,
   with no test coverage and no accounting (the entry was neither private nor counted
   as malformed).
3. **Prefix-proxy heuristic.** `denylistComplete` false-warned on `[REDACTED]`-style
   entries that DID carry an explicit `database_id`: the R_-prefix fallback fired even
   when intent was unambiguous, training operators to ignore the warn.

## Solution (cycle-8 pattern)

- **Single-site normalization helper.** All denylist membership goes through one
  `redactedDatabaseIdIn()` helper in `src/github/metadata.ts` that accepts number and
  bigint forms; no raw `Set.has` against the denylist anywhere (grep-able invariant).
  Regression test constructs a bigint database_id and asserts the deny still matches.
- **Fail-closed discriminator with accounting.** `normalizePrivateFlag` accepts
  boolean `true` and the quoted string `true` (case-insensitive — the author writing
  quotes meant private); any OTHER non-boolean value counts into
  `skippedMalformedCount` instead of silently passing public. Tests cover
  quoted-true/True/false and a nonsense value. The failure direction is always
  "count it and warn", never "assume public".
  *(Integrate note, 2026-09-25: main landed the same fail-closed intent FIRST as
  rm-184 — every non-strictly-`false` value (quoted falsy forms included)
  coerces to private with a `privateCoercedCount` warning. rm-184 is strictly
  more fail-closed than the `normalizePrivateFlag` three-way split, so the
  split's mechanics were dropped at the integrate of run b9c36244; the shape
  described here is the historical cycle-8 implementation.)*
- **Explicit signal over proxy heuristic.** A coverage count
  (`redactedEntriesMissingDatabaseId`) replaces the R_-prefix proxy:
  `denylistComplete` is true exactly when every redacted entry has an unambiguous id;
  entries with an explicit `database_id` never warn. Comment at the discriminator
  cites the quoted-string hazard; comment at the Set cites the upstream #1513
  precedent.

## Verification

- Tests: bigint-form membership, quoted-string flag forms, nonsense-value accounting,
  explicit-id no-warn — all in the metadata/aggregator suites; full suite 3135/3135
  green after the batch (3116 baseline + 19 net-new).
- `grep -rn '\.has(' src/github/` shows denylist membership single-sited in the
  `redactedDatabaseIdIn()` helper (the `Set<number>` container itself remains — the
  helper normalizes the PROBE id to number|bigint-safe comparison at the single
  membership site, src/github/aggregator.ts:408).

Related: `docs/solutions/security-issues/cross-source-redaction-denylist-before-query-2026-06-15.md`
(invariant-2 chain: denylist BEFORE query, cross-format keys, fail closed — this doc
adds the id-form/flag-form/coverage-signal trio).
