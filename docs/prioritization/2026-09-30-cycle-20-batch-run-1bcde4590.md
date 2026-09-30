# Dashboard maintenance — cycle 20 batch (2026-09-30, run 1bcde4590)

module: docs/prioritization
tags: [roadmap, prioritization, stewardship]
problem_type: maintenance-cycle

Frame: 2026-09-30 · run=1bcde4590bae42c2a8dd591528d53925 ·
prioritize attempt=59688c0c747248219923c5a8e3a44ff4 ·
stewardship attempt=98d79a425e30490982b0201f784c78d6

> Provenance note: this doc was first written by the prioritize phase
> (2026-09-30) and was lost when the run worktree was re-materialized
> (4th observed scrub of this run's tree). It is re-materialized verbatim
> as the stewardship phase's human-readable companion; the authoritative
> machine channel is the stewardship phase_result JSON.

## The cycle's mandate

Canonical ledger ground truth (verified 2026-09-30, prioritize phase):
`git rev-parse HEAD` = 31995a2; `git hash-object ROADMAP.md` equals
`git rev-parse HEAD:ROADMAP.md` — worktree clean, canonical ROADMAP.md is
1153 lines, and its `## Open` set is exactly **rm-134..rm-140** (5 candidate,
1 partial, 1 blocked). The roadmap phase's mint (rm-279..rm-286) landed only
in a stale 5245-line generation that does not exist at HEAD — recorded as a
ledger incident; re-mint belongs to the next roadmap phase.

## Selected batch (this cycle) — stewardship_request

**B1 = rm-138 (47.0, candidate)** — Sentry client-tokens fixture restoration.
scripts/ gains a client-tokens JSON import script that stays OUT of the
default test run; a test/ integration helper mints/loads the local tokens
fixture (honoring the client-JSON conventions: local token path or
DASHBOARD_TEST_CLIENT_TOKENS, die() on missing). Effort 2.

**B2 = rm-136 (44.0, candidate)** — rate-limit test coverage debt: policy
engines for all three path classes, the RATE_LIMIT_TRUSTED_PROXY first-hop
spoof case, and the rm-276/rm-277 reproducers + rm-279 canary eval named by
the item. Tests-only; NO runtime change to the limiter rides this batch.
Effort 2.

**B3 = rm-134 (34.0, candidate)** — client-side cancellation gap in
web/src/push/subscribe.ts:610-624: the cancellation chain's AbortSignal never
aborts the SWR fetch; a run hangs until the upstream completes and poll-level
deferrals never trigger (stale/frozen UI). Wire abort through + colocated
client test. Effort 2.

**B4 = rm-140 (30.0, candidate)** — invalid/missing Cache-Control on static
assets: fingerprinted /assets/* served from src/server.ts (~:1036-1061 static
mounts) need `Cache-Control: public, max-age=31536000, immutable`; manifest/sw
keep short-lived no-cache semantics. Server test pins the header. Effort 1.

Coherence: client-lifecycle correctness (B3) + ops test debt (B1/B2) +
static-asset correctness (B4); all effort ≤2, independently testable, no
lockfile, no gateway dependency, zero collision with in-flight sibling
lineages (the auth/rate-limit-runtime cluster rm-160/rm-276/rm-277 is
untouched — B2 tests existing behavior only).

## Must remain separate (change-unit boundaries)

- `src/server.ts` rate-limit policy engine (runtime) ✂ B2 `test/` rate-limit
  coverage — tests-only unit must not carry a limiter behavior change.
- `web/src/push/subscribe.ts` (B3, client runtime) ✂ `src/server.ts` static
  mounts (B4, server runtime) — different runtimes and gates (web pretest
  build vs server vitest).
- `scripts/` client-tokens fixture (B1) ✂ `test/` default suite entry — the
  fixture must never enter the default vitest run (that is rm-138's purpose).
- ROADMAP.md ledger re-mint (rm-279..rm-286) ✂ this code batch — the ledger
  restoration is the next roadmap phase's change-unit.

## Deferred (with recorded reasons)

- rm-137 (40.0, partial) — redaction self-test teardown; partial status =
  another lineage's in-flight work; collision-avoided.
- rm-135 (26.0) — staleness watchdog; sequenced behind B3 (same file
  locality, separate behavior change).
- rm-139 (55.0, blocked) — merge-hygiene baseline; stays sequence-blocked,
  and required checks would freeze merges during the Actions Lint-ceiling
  epoch (6/6 ceiling kills observed 2026-09-30).

## Implement-phase instruction (durable rule, 4th loss on record)

After landing any file delta, ALSO persist it out-of-band immediately:
checkpoint commit on a run-scoped branch (conductor-run-<runid>-implement-N
pattern) and/or per-file copies under
/home/agent/.hermes/conductor-delegate-spool-infra-deploy/delegate/ — never
only inside the worktree. This run has now lost FOUR worktree generations
(roadmap-phase ledger edit, prioritize-phase batch doc, plus the two
previously recorded implement losses).

## Verification recipe

- Ledger: `git rev-parse HEAD` → 31995a2; `git hash-object ROADMAP.md` ==
  `git rev-parse HEAD:ROADMAP.md`.
- B3: `sed -n '610,624p' web/src/push/subscribe.ts` (abort wiring point).
- B4: `grep -n 'serveStatic\|assets' src/server.ts` (mount region ~1036-1061).
- Gates: `pnpm check-types && pnpm lint && pnpm test`.
