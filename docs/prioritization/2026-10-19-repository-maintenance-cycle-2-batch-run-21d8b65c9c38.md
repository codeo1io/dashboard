---
module: roadmap
tags: ['repository-maintenance', 'cycle-2', 'batch', 'rm-2008', 'rm-2009']
problem_type: maintenance-batch
owner: dashboard
run_id: 21d8b65c9c38452e823d0c8a00874498
---

# Repository maintenance — cycle 2 batch record (2026-10-19, run 21d8b65c9c38452e823d0c8a00874498)

Base: 389d60ef (worktree HEAD at assess, porcelain-clean at dispatch; live main has
since advanced past it — the landing gate re-derives ROADMAP occupancy per
first-landed-wins). Worktree:
`/home/agent/.hermes/conductor-worktrees/dashboard-864ca327c8/run-21d8b65c9c38-21d8b65c`.

Batch selected by prioritize (attempt cc5a6b3207c840eaa513b817a6200227) from the
cycle:2 roadmap wall (roadmap attempt 1906b754659e4e0994eb3c53e57fcff6, +36
insert-only ROADMAP delta applied byte-exact in-tree; stewardship request
987cb48892a64ab086e8eb2bae527d9f): the two fresh cycle:2 mints — rm-2008 (listener
ingest replay window) and rm-2009 (conductor residue hygiene automation). Standing
constraints honored: no live-GitHub mutations from this batch (the janitor workflow
ships read-only-scheduled; its apply lane is manual dispatch), and no overlap with
sibling fog lanes (fog rm-1975/rm-2004 own the `conductor/run-*` head widening;
fog rm-1958 owns apply-gate semantics; rm-681 stays the residue VISIBILITY census;
rm-1463 stays the manual janitor).

## What this batch changed (11 files incl. the ROADMAP delta and this record; tree uncommitted)

### U1 — rm-2008: bounded seen-delivery cache in listener ingest (6 files)

`src/listener/ingest-auth.ts` (+115): new `createIngestReplayGuard()` /
`seenDeliveryKey()` / `DEFAULT_REPLAY_CACHE_CAP = 1024` beside the unchanged
HMAC verification. Key = the `x-github-delivery` GUID (trim + lowercase, `g:`
prefix, defensively truncated at 128 chars) when present, else `h:` +
HMAC-sha256(digest over `timestamp.body`) + timestamp bucket — so a byte-identical
replay lands on the same key while any re-signed delivery does not. Semantics: an
entry is written the moment a delivery's signature VERIFIES (the replay check runs
strictly after `verifyIngestSignature`, so an unauthenticated caller can never
poison the cache); a second hit inside the window reports replay; after expiry the
same delivery re-admits (genuine late redelivery); at cap, expired entries are
swept first and only then is the oldest-inserted key evicted. In-memory,
process-local, restart/re-mount clears it, nothing persists.

`src/routes/listener.ts` (+29): `ListenerRouterDeps` gains a structural
`ingestReplayGuard` (like `store`/`ingestKey`); the ingest route threads
`x-github-delivery` + the already-read timestamp/body into the guard AFTER
signature verification and rejects replays with `401` `{error: 'unauthorized'}`
before JSON parsing or the store. `src/server.ts` (+5): the mount site constructs
one `createIngestReplayGuard()` per server instance.
`docs/contracts/operator-listener-channel.md` (+19): the optional
`x-github-delivery` header row, a Replay guard section (key choice, window scale,
restart-clears, cap policy), and the 401 row now names replayed deliveries.

Tests: `test/listener-ingest-auth.test.ts` (+128) pins key normalization, prefix
separation, fallback-key separation, truncation, replay-reject, expiry re-admit,
FIFO cap eviction, expired-first sweep, and live-entry survival;
`test/listener-routes.test.ts` (+91) pins the route contract end-to-end — same
GUID replay 401 with the store holding ONE message (reject happens before the
store), fresh GUID 202 then its replay 401, and the no-GUID path (byte-identical
replay 401; a re-signed fresh-timestamp delivery 202). rm-169's store-level replay
tests (`test/listener-store.test.ts`, untouched) stay green — the guard sits
before the store and never alters upsert semantics.

### U2 — rm-2009: scheduled janitor report pass with derived run-state (3 files)

NEW `scripts/conductor-run-state-derive.ts`: derives `--run-state` dispositions for
`scripts/conductor-pr-janitor.ts` from ORIGIN-side evidence instead of hand-feeding:
(1) landing-merge subjects (`merge: autonomously integrate run <id>`,
`LANDING_RUN_PATTERN`, 8-40 hex, case-insensitive) and (2) open-PR head ancestry
(`git merge-base --is-ancestor <oid> origin/main`, consulted only when the subject
scan cannot settle a PR). Proven-landed runs emit `--run-state=<id>=landed` tokens;
everything else is deliberately omitted (janitor unknown → report-only) —
`aborted`/`live` are campaign-side facts with no origin-side ground truth, and
fabricating them would make the janitor close live-run PRs. Pure policy functions
(`landedFullRunIds`, `isLandedBySubject`, `deriveRunStates`, `renderRunStateArgs`)
are exported and unit-pinned in NEW `test/conductor-run-state-derive.test.ts` (7
tests: subject extraction, short/full prefix matching, non-conductor PRs out of
scope, subject-proof short-circuits the git call, ancestry fallback,
never-fabricate, arg rendering).

NEW `.github/workflows/conductor-hygiene.yaml`: weekly report job (Mondays 04:47
UTC — minute 47 otherwise unused on Mondays; after base-drift 04:13, before
upstream-drift 05:17) checks out full history, runs the derive script, echoes its
output to `$GITHUB_STEP_SUMMARY` plus the step log, then runs the janitor in
classify-only mode with the derived args. The janitor call runs with `-e`
suspended so its exit code is captured into the summary and the step always exits
0 — a refusal (rc 2) or a process failure never fails the scheduled job. Mutation
is triple-gated and manual-only: the `apply` job requires `workflow_dispatch` +
`apply` input, `--execute` adds the second gate, and the janitor itself refuses
any close without `--superseding-commit=<sha>` (rm-1463 refusal semantics, rc 2,
surfaced in the summary as "the gate working"). Only the dispatch-only apply job
holds `pull-requests: write`; the scheduled job stays read-only. Action pins match
the tree's dominant digests (checkout 3d3c42e5 v7.0.1, setup-node 949feb24
v7.1.0).

### Deviation of record — rm-2009 derivation source

The acceptance clause says "deriving `--run-state` from the campaign conductor DB
runs table". Deviated, with evidence: a CI runner cannot reach the operator host's
engine state at all, and the operator-host conductor DBs carry no runs table to
read even locally — re-probed first-hand 2026-10-19 (conductor/conductor.db is
4 KiB with no runs table; conductor-74d2adffdc53.sqlite and
conductor/hermes-conductor.db are 0 bytes; first noted in the rm-2009 fleet-data
note 2026-10-18). The repository itself is the only authoritative, everywhere-
reachable source, so the derivation reads origin evidence (landing merges + head
ancestry) and claims `landed` only where provable. The derivation NEVER emits
`aborted`/`live`, so the janitor's close lane can only ever fire on runs whose
content is provably on main.

## Prior-attempt disposition (implement)

First implement attempt e23c91ac32c84e0b9eb7157798406773 ran 2026-10-18
20:57:41Z–21:20:55Z and produced this batch's U1 + U2 in the worktree, then was
reaped by a provider infrastructure failure before writing its typed result — the
event log shows 26 events, dispatch → steady progress → `session_reaped`
(`exit_reason: failed`), no completed artifact. This attempt (8f3f7ea1dbe744aaaf4821dbc06c8c42)
verified the surviving worktree delta line-by-line against the rm-2008/rm-2009
acceptance texts rather than redoing it, adopted it, and completed the remainder:
fixed an exact-status bug in the derive script's ancestry failure path (the
`rc 1` substring check also matched rc 12/128; now compares the captured exit
status), corrected the workflow's janitor exit-code comments to the real contract
(rc 0 clean / 2 refusal / other = process failure — classify mode never exits 1
for "rows exist"), and wrote this batch record.

## Verification (focused battery, 2026-10-19)

- `pnpm vitest run test/listener-ingest-auth.test.ts test/listener-routes.test.ts
  test/listener-store.test.ts test/conductor-run-state-derive.test.ts
  test/conductor-pr-janitor.test.ts test/roadmap-integrity-guard.test.ts
  test/roadmap-length-guard.test.ts test/roadmap-render-guard.test.ts` — green
  (counts recorded in the implement result evidence).
- `node scripts/conductor-run-state-derive.ts --help` — usage renders, rc 0.
- Live read-only derive probe against the real repo (no mutation): derivation ran,
  rc 0; output recorded in the implement result.
- `pnpm check-types` rc 0; `pnpm exec eslint` over every changed/added file rc 0;
  actionlint (container form) green on `.github/workflows/conductor-hygiene.yaml`.

## Owed post-landing

- rm-2009 acceptance tail — "first scheduled fire's report output recorded as
  evidence": the cron first becomes live after this workflow lands on main
  (Mondays 04:47 UTC; landing after 2026-10-19 04:47Z defers the first fire to
  2026-10-26). Capture the first run summary link as the closing evidence.
- ROADMAP status flips for rm-2008/rm-2009 to implemented-pending-landing are the
  compound phase's to write (cycle:1 convention); this record is the
  implementation claim they cite.
