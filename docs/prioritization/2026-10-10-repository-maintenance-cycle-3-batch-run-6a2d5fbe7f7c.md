---
module: dashboard
tags: [repository-maintenance, cycle-3, batch, rm-847, rm-848]
problem_type: maintenance-batch
---

# Dashboard maintenance batch (2026-10-10, run 6a2d5fbe)

Selected at prioritize ee7f4259d83143359723e7e1b1331658 (repository-maintenance 276a564b9c3f4f758df9cbc2a32e4988 cycle:3), from this run's assess 0ad27c6bf9474657b0ab33751b52d2d6 (three fresh findings at base 88e423a) and research e09f0d165e544389b9dba558f6c56e03 (four-stream sweep, deduped against every unlanded sibling claim rm-835..rm-846). Batch name: **transport-abort and enumeration-truth closure of the rm-780 surface**. Both units are this run's own cycle:3 mints (roadmap 6203a475c6e74c3d8da2d762b83c910e) — first-selection is ours by definition; the floor walk above U1's priority 52 lives in the rm-847 selection rider.

Why coherent: both units close gaps in the batch that LANDED as e49a72a (rm-780/187, 2026-10-09) — U1 repairs the transport-abort regression that batch introduced (equal-duration race disarms the poll abort), U2 finishes the truth-surfacing scope that batch left half-done (server already emits `enumerationIncomplete`/`driftCount`; the client validates them; nothing renders them). Same test-file family, same verification battery, zero server/DTO surface, fully completable under the ongoing Actions run-creation outage (re-probed this run's research: newest run 2026-10-09T01:59:31Z).

## U1 — rm-847 (reliability 52): seam-owns-the-abort

`withGetSeamTimeout` becomes transport-aborting: internal `AbortController`, abort when the bound fires, compose with the caller's signal (`AbortSignal.any` family; jsdom implements static `AbortSignal.any` per jsdom/jsdom#3805 — shim per the 2026-10-09 `AbortSignal.timeout` pattern if the locked jsdom predates it).

- `web/src/api/fetch-timeout.ts` — the seam: accept the caller signal (or controller), abort the transport on bound-fire, keep the 8eddfdcd rejection-propagation taxonomy (abort → `timeout`, transport → `network`); poll-abort (external abort) must still classify as `timeout`, matching useBoundedPoll's latch expectations.
- `web/src/api/fetch-timeout.test.ts` — never-resolving fetch: the await rejects at the bound AND the underlying signal flips aborted; taxonomy assertions for abort vs transport.
- `web/src/hooks/useBoundedPoll.test.ts` — inverted-durations test (seam bound > poll interval) proving the poll latch's abort path stays reachable (rm-155/rm-251 contract).
- `web/src/api/monitoring.ts`, `web/src/api/listener.ts`, `web/src/App.tsx` — pass the caller signal into the seam's new abort path (rm-487 focus re-probe included: non-poll callers get aborts too).
- `web/src/views/Monitoring.tsx`, `web/src/views/Listener.tsx` — NO semantic change expected (banners at the bound stay; both ceilings stay 15000).

## U2 — rm-848 (operator-experience 46): enumeration-integrity indicator

- `web/src/views/Monitoring.tsx` — render an enumeration-integrity indicator when `enumerationIncomplete` is true and/or `driftCount > 0` (copy carries the drift count), cleared on a clean enumeration; DISTINCT testids from f266ce30's unlanded rm-751 'enumeration-truth rendering' block; interplay with staleBanner: distinct slots (stale = freshness truth, enumeration = completeness truth) — conflation explicitly rejected in the def's trade-off. Contentions: 91f3d37f/rm-835 (unlanded) co-claims the all-clear/empty-state region with DIFFERENT signals (staleBanner vs enumerationIncomplete/driftCount — no double-mint); integrate = chronological union.
- `web/src/views/Monitoring.test.tsx` — strict-shape fixtures driven through validation to the RENDER path (validation already fail-closed; the test proves rendering, not parsing).
- No `src/` server change: `src/routes/api.ts:76` already emits both fields (verified in assess).

## Verification ledger (focused/impacted only, per implement-phase budget)

Interleaved `pnpm test` twice (pretest builds web/dist; web suite 1212t baseline + new tests; root suite 2478t — seam/hook units are web-side, root untouched in expectation), `pnpm check-types`, `pnpm lint`, `npx vitest run web/src/api/fetch-timeout.test.ts web/src/hooks/useBoundedPoll.test.ts web/src/views/Monitoring.test.tsx` targeted twice, roadmap guards green (ROADMAP carries this batch's selection riders; census 249 defs / 0 dups / max rm-848 unchanged). NO CI claim this cycle (Actions run-creation outage; final validation runs local mirrors per the approved playbook). Dead-line: none — both units are size-small.

## Contentions and hand-offs (for the commit-gate turn)

- Monitoring.tsx render region: this batch (rm-848) + unlanded 91f3d37f/rm-835 + f266ce30/rm-751 test block — three-lineage stack, chronological union at integrate; distinct testids declared here.
- fetch-timeout.ts / useBoundedPoll.ts: ZERO spool contention (additions-only grep over every delegate patch this session).
- The roadmap + selection riders ride the cumulative spool patch (delegate/prioritize-6a2d5fbe7f7c-ee7f4259.patch supersedes roadmap-6a2d5fbe7f7c-6203a475.patch).
