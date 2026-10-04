# Dashboard maintenance — cycle 1 batch (2026-10-04, run a86ee3dc)

- run: `a86ee3dca32445199c9d3167090c9afc` (repository-maintenance `3f8c1e8050aa40b28b676e95dcf47a94` cycle:1)
- phase: prioritize (attempt `225b7a49e79e4db58cb601dd6b056aa3`), base HEAD `227375247414e025902a29148c22c10d7244aacc` == origin/main
- worktree: `run-a86ee3dca324-a86ee3dc` — carries this run's landed roadmap deliverable (`M ROADMAP.md`, +2 rider lines, rider-only per extension #18)
- inputs: this run's assess (`21f3b92b…`) + research (`02050faa…`, candidate set C1–C7 — every unit of which is same-day claimed or adjudicated, see census) + the committed open ledger (146 open ids re-extracted this session) + a fresh same-day claim census

## Landed outcomes (implement 6e47f1c6, 2026-10-04, in-worktree at 227375247)

Both units landed end-to-end; full battery deferred to the cycle's full_tests gate per the validation budget.

- **B1 → minted `rm-633`** (next-free confirmed at mint: committed ceiling rm-528, uncommitted all-lineage ceiling rm-632 per stewardship's 165-worktree census re-run this session). `src/github/aggregator.ts`: `unionByDatabaseId` index added to loop 1 (seeded via rm-255's own conservative `deriveDatabaseId`), install-loop admission flipped to dual-key — node_id OR database_id identity — mirroring the dual-key denylist at :503. `test/aggregator.test.ts`: rm-255's skew pin flipped `toHaveLength(2)` → `toHaveLength(1)` (auth-context pins kept green: installation 77, channel collab, stale false) + NEW regression test absorbing the baefaefb repro constants (legacy `MDEwOlJlcG9zaXRvcnkxODY5MTU0` = databaseId 1869154 vs `R_kgDOGexample00`) pinning length 1 / driftCount 0 / metadata-row-wins / exactly one per-repo query under installation 42. Suite **100/100** (99 prior + 1 new); the non-skewed driftCount test (real install-only repos, length 2) unchanged and green — real drift semantics preserved.
- **B2 → rm-194 implemented** (status flipped in the ledger + rider). `web/src/views/Listener.tsx`: exported pure `orderListenerMessages` (unread-first, createdAt desc, NaN-last, id tie-break) + `listenerAgeBucket` (fresh ≤24h / aging ≤72h / stale / unknown; future clamps to fresh); ready render orders per pass so poll refreshes preserve the invariant by construction (this surface is useBoundedPoll, not SSE — the append test pins the invariant via the 30s poll refresh). Age badge in the card meta row + `.listener-age`/`age-fresh|aging|stale` rules in `web/src/index.css` following the severity-pill token pattern. Suite **17/17** (12 prior + 5 new).
- **Ledger**: `rm-633` def placed after rm-528 (open-items tail) with reconcile-at-integrate notes (d1850b2e's unlanded rm-601 twin = merge-by-content; 5bf98ac3's 'by design' docstring rider superseded by the :145-148 contract); rm-194 → implemented + dated rider. One self-inflicted split of rm-528's rider line during the edit was repaired from `git show HEAD:ROADMAP.md` (verified line-identical).

## Selection method

Two filters, both run first-hand this session at base `227375247`:

1. **Premise freshness.** Every headline-priority open item's premise was re-derived against live state before it could anchor the batch. This killed or demoted more priority than any other step — see "Premise-freshness findings" below.
2. **Same-day claim census.** (a) `git worktree list` + per-worktree porcelain for code-dirty lanes (5 found); (b) today's untracked sibling batch docs' `### B*` selection lines (7 found); (c) mention-greps across those docs for raced/deferred language on every candidate considered (`rm-487`, `rm-501`, `rm-194`, `rm-117`, `rm-279`, `rm-282`, union/double-count/drift-contract). The union-merge unit had **zero** hits anywhere.

## Selected batch — "operator truth wedges" (2 units; drop order B2 → B1)

The theme: two verified-live cases where the operator surface reports wrong or under-sorted truth — the server's drift count and the approvals queue — both with fresh first-hand evidence, zero sibling-lane collisions, and code+test cures of end-to-end size for one implement phase.

### B1 — Aggregator union-merge double-counts a repo under node_id format skew — the lead unit, unminted

- **provenance**: proven by sibling assess `baefaefb` (attempt `310d71ed`, executable repro `delegate/310d71ed…-scratch/prove-drift-doublecount.mjs` — data-injection shows repos length 2 / driftCount 1 / 2 per-repo GraphQL queries), ranked C1 by sibling research `03e668c42592`; left unminted by this run's rider-only roadmap phase (extension #18 "standing" note); **re-derived first-hand this session** at `227375247`.
- **mint instruction**: implement mints the def as next-free id (**≥ `rm-622`**; live all-lineage uncommitted ceiling is `rm-621` by `86c2dd13`, re-census at mint per fleet law; renumber at integrate on collision — precedented in-batch authorship, cf. rm-246/rm-511).
- **surfaces (fresh, this session)**: `src/github/aggregator.ts:507-517` — working-set union membership checks `node_id` ONLY while rm-255's format-independent `database_id` derivation sits one join away at `:464-475`; `:145-148` — driftCount's landed count-only contract ("Count of repos the Agent App can see that are NOT in public metadata"), which the bug violates: under the exact skew rm-255 pinned (legacy-base64 metadata `node_id` vs installation `R_` format for the SAME repo), the repo enters the working set twice (metadata entry + install-only "discovered" twin), driftCount counts a repo that IS in public metadata, and the per-repo GraphQL walk runs 2× for it every refresh. The behavior is test-pinned as "the documented skew drift": `test/aggregator.test.ts:672` asserts `toHaveLength(2)`. Redaction invariants hold in the repro (denylist `continue` precedes the union).
- **acceptance (for the minted def)**: union membership consults the `database_id` index in addition to `node_id` (mirroring rm-255's conservative derivation: legacy-format metadata node_ids derive a databaseId, new-format does not), so a same-repo skew merge collapses to ONE entry; the skew test flips to length 1 + driftCount 0 while still pinning the rm-255 auth-context join (installation_id resolved, not stale); the baefaefb repro's data-injection case absorbed as a regression test; the `:145-148` contract comment re-reads true.
- **impact/risk/effort**: impact M (core data-truth contract + 2× query cost under a live-proven skew class); risk low-moderate (must not disturb rm-255's auth semantics — the acceptance keeps its pins); effort S/M (one membership predicate + a second union set + one test flip + repro absorb).
- **why lead**: the only *proven* correctness bug left in the pool; the aggregator family's other open ids are implemented or stale (`rm-112` implemented 2026-09-25, `rm-168` implemented 2026-09-24, `rm-141` pool landed on main), so this is the family's last open wedge; no lane touches `src/github/aggregator.ts`.

### B2 — `rm-194` approvals aging + attention ordering

- **track/priority**: operator-experience 50.0, status candidate (added 2026-09-25, research S4) — the highest-priority *unclaimed, unraced* item in the open pool after premise-freshness filtering.
- **surfaces (re-derived fresh this session)**: `web/src/api/listener.ts:17` (DTO `createdAt`), `:42/:50` (validation passes `read` through — the store read-flag precedent rm-194 cites), `web/src/views/Listener.tsx` — verified TODAY to render approvals with no age emphasis and no unread-first ordering (no sort/age logic present; only the `unreadCount` badge at `:98`). Premise live.
- **acceptance (ledger's own)**: createdAt bucketing (fresh / >24h / >72h) with visual emphasis; unread-first then age-descending ordering pinned by a test; SSE live appends preserve the ordering invariant.
- **impact/risk/effort**: impact M (the dominant feature cluster of every competing tool in the 2026-09-25 survey; the raw material — createdAt, read flags — already ships); risk low (client-only, pure presentation/ordering); effort M (view + store ordering + `Listener.test.tsx` sort pins under ties/empty/single-element + SSE-append invariant).
- **collisions**: none — no lane touches `web/src/views/` or `web/src/api/` (the only web-src code lane, `2c3b4c64`, touched `web/src/test-setup.ts` only).

**Drop order B2 → B1**: if budget forces one unit, the proven contract violation survives; the UX feature re-queues cleanly.

## Same-day claim census (why nothing else)

Claimed by today's batch docs (`### B*` lines, read first-hand): `3b584779` = rm-617 + rm-484; `2c3b4c64` = rm-608 + rm-609 (code landed in-worktree); `146d73f2` = rm-286 + rm-594 + rm-595 (+rm-596 rider); `38ee3e1c` = rm-187 + rm-501 + rm-597 (+rm-596 rider); `733651705ae2` = rm-601 + rm-604 + rm-605; `fefc4067` = rm-601 + rm-602 + rm-603; `86c2dd13` = rm-619/620/621 (its own mints). Raced/deferred by mention: rm-487 (folded into `63b5848a`'s rm-568–573 set per `84860aac`/`d1850b2e`), rm-117 + rm-116 + rm-107 (decision-first, fleet consensus per `84860aac`:132). My run's research C1–C7: all claimed or adjudicated (extension #18 map; C3's re-encode cost was adjudicated "deliberate bounded re-encode, not a defect" by the rm-616 retraction, and `b3491252`'s rm-618 owns the delta-accounting framing).

Deferred with reasons:

| candidate | reason |
|---|---|
| rm-279 (96.0) | premise-stale for the outage half (see below); residual decomposition is CI-workflow scale; fleet already defers it (`146d73f2`, `3b584779`, `86c2dd13`) |
| rm-104 (98.0) | cure lives in the external hermes-roadmap render tool + a future render; not completable in-repo this cycle |
| rm-282 (74.0) | floors already at acceptance values (`pnpm-workspace.yaml:54` fast-uri `>=3.1.8`, `:69` undici `>=7.30.0` — this run's research; `pnpm audit -r` rc=0 at tip) — close-as-content at integrate per `146d73f2` |
| rm-226 (44.0) | server.ts file-contention: three live code lanes (`2c3b4c64`, `7a4d9070`, `b528f707`) already carry `src/server.ts` diffs today |
| rm-485 (32.0) | `public/operator-stream.js` contention with `b3491252`'s rm-618 lane + adjacency to `63b5848a`'s rm-571 launch-fetch mint |
| rm-289 (38.0) | workflow-file territory: `5bf98ac3` lane is actively editing `base-drift/canary/visual.yaml` |
| rm-117 (70.0) | next-cycle anchor: L-effort feature (per-repo Dependabot/CodeQL counts ride the GHAS API surface) that deserves its own phase + the fleet's decision-first consensus (`84860aac`:132) |
| rm-249/rm-138 | joint product decision required (push-only SW); decision-first, unblockable this cycle |
| rm-116/rm-146 | live branch-protection mutation is a fleet-coordinating ops action (10+ cycles deliberately untouched); wrong blast radius for an unlanded batch's implement phase |

## Premise-freshness findings (record for the implement phase's ROADMAP pass)

- **rm-279 outage half is STALE at 2026-10-04**: push-to-main runs `37136291212` (2026-10-03 16:17) and `37123847144` (12:44) both ran the Lint job **green in 62s / 54s** (gh api `…/actions/runs/{id}/jobs`, first-hand this session) — nowhere near the 35m ceiling; fleet corroboration (`b528f707` doc: 9 consecutive green Main runs since 2026-10-02, no code fix between red and green — likely rm-256's eslint `--cache` landing cured it). Residual = preventive decomposition ("insurance, not urgent") + the mega-signals-line split shared with rm-104. **Rider opportunity**: truth rm-279's status with today's green-run numbers when its implement cycle eventually takes it.
- **rm-112 / rm-141 / rm-168**: all status-implemented or landed-on-main — the aggregator family's *only* remaining open correctness wedge is the union-merge unit (B1), which is unminted.
- **rm-281**: target file `test/auth-pkce.test.ts` does not exist on main (validation-branch-only hazard); nothing to implement here.

## must_remain_separate (implement-phase seams)

- B1 server hunks (`src/github/aggregator.ts`, `test/aggregator.test.ts`) vs B2 client hunks (`web/src/views/Listener.tsx`, `web/src/api/listener.ts`, `web/src/views/Listener.test.tsx`) — different projects (strip-only server vs Vite client), disjoint test files; never merge hunks across the seam.
- Code hunks vs deliverables: the B1 def mint (`ROADMAP.md` addition) + this batch doc are ledger deliverables, not code — keep their hunks separate from source changes.
- B1's skew-pin flip (`aggregator.test.ts:672`) vs any B2 test edits — both are "flip/pin a rendered expectation" shapes in *different projects*; do not co-locate.

## Evidence expectations (implement)

- B1: focused `test/aggregator.test.ts` green including the flipped skew case (length 1 / driftCount 0 / single per-repo query) + the absorbed baefaefb repro scenario; rm-255's auth-context pins unchanged; the `:145-148` contract comment re-reads true; the new def lands with `signals`/`acceptance` carrying the fresh line cites above.
- B2: `Listener.test.tsx` ordering pins under ties/empty/single-element + the SSE-append ordering invariant; a manual operator-surface check noted in the batch doc's landed appendix.
- Gates: `pnpm check-types`, `pnpm lint`, focused vitest for both projects; full `pnpm test` rides the documented rm-548 baseline (4 files / 100 tests, zero new red).
