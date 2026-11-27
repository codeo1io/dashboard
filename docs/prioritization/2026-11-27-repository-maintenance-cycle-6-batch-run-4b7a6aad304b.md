# Repository-maintenance batch — 2026-11-27 · run 4b7a6aad304b4523a52bed057451ac90

Security invariant hardening round (B1–B4, roadmap defs rm-2135 / rm-2137 / rm-2138 / rm-2139),
selected by this run's prioritize phase and implemented by the implement phase in this tree.
Ledger state: census 355 defs / 0 dups / max rm-2150 (unchanged by this batch — no defs minted
or closed; status flips stay owned by the engine-side ledger render).

## Deliverables

- `package.json`
- `bun.lock`
- `.github/workflows/audit.yaml`
- `.github/workflows/release-pending.yaml`
- `scripts/release-pending.ts`
- `public/operator-stream.js`
- `test/release-workflow.test.ts`
- `test/release-pending.test.ts`
- `test/operator-stream-core.test.ts`
- `docs/prioritization/2026-11-27-repository-maintenance-cycle-6-batch-run-4b7a6aad304b.md`

(The same uncommitted tree also carries the same-run roadmap phase's mint — `ROADMAP.md` and the
2026-10-15 carrier's Landing-record re-census — plus the rm-2137 signal-line correction made in the
stewardship phase. They ride the landing together with these deliverables; the ledger render and
its guards remain engine-owned.)

## B1 — rm-2135: picomatch GHSA-fc5q-39xc-vjpf disposition

- `bun audit` (bun 1.4.4, 2026-11-27) does NOT flag `picomatch@4.0.7` — the disposition is a
  written accepted-risk record in `.github/workflows/audit.yaml` (dev-only reachability: rollup
  pluginutils / eslint / fdir optional peer; 4.0.7 is the advisory's terminal line, no patched 4.x
  exists), with the future-cure path documented: `--ignore GHSA-fc5q-39xc-vjpf` with that rationale
  if a future audit run starts flagging it. No lockfile change for picomatch (verified unchanged).
- Discovered during implementation: the ACTUAL live advisory is `serialize-javascript@7.1.2`
  (GHSA-m5mm-p8h7-m29v, low) — cured by the rm-276 convention: an overrides floor
  `>=7.1.3 <8.0.0` in `package.json` + regenerated `bun.lock` (re-resolved to 7.1.4).
  `bun audit` now reports zero advisories across 799 packages.

## B2 — rm-2137: release-pending hardening

- Token mint scope: `release-pending.yaml`'s app-token step now mints repo-scoped
  (`owner: ${{ github.repository_owner }}` + `repositories: ${{ github.event.repository.name }}`),
  mirroring release.yaml's publication-token pattern (upstream 2026.11.11 #792 rationale) —
  recorded rationale comment inline.
- CalVer prepare-vs-release drift: `scripts/release-pending.ts` now requires the computed next tag
  to be the exact successor of `releases/latest` (same month → patch+1; later month → patch 0)
  and fail-closes with a reconcile-manually error otherwise.
- Readback transient retries: the PR-head lag-retry loop catches transient fetch errors and
  retries within its 4-attempt / 2s budget; the post-loop readback check still fail-closes.
- Guard tests: `test/release-workflow.test.ts` gains a 'release-pending workflow — token mint
  scope' describe pinning the pinned action SHA, the exact permission set
  (contents+pull-requests, write), and repo-by-name scoping. `test/release-pending.test.ts`
  updates the readback matrix to the new contract: an all-failure window fail-closes
  (readback mismatch), and a new recovery leg proves one transient blip no longer aborts the
  prepare step.
- Schedule dispatch live-proof remains descoped by design (static pin + next real scheduled run).

## B3 — rm-2138: aggregator dual-key union membership — verified already implemented

First-hand verification found the union filter already consults BOTH denylist keys
(`redactedNodeIds` by node_id AND `redactedDatabaseIds` by database_id — the rm-151/rm-255
cross-format lineage), and `test/aggregator.test.ts`'s denylist-before-query suite already pins
both directions (node_id match → excluded; database_id match with skewed node_id format →
excluded). No code change required; closed by verification with this record.

## B4 — rm-2139: operator SSE retryCount re-arm

- `public/operator-stream.js`'s `nextStreamState` 'ready' case now resets `retryCount` to 0 on a
  successful reattach — the count is a consecutive-failure budget for the current connection
  cycle, not a lifetime total (choice recorded in the code comment; drift keeps the count).
- `test/operator-stream-core.test.ts` gains the two-drops-with-recovery leg (ready → drop →
  ready → drop ⇒ second drop starts at 1, not 2).

## Verification

- TDD: both new guard legs proven red against unfixed code before the fixes (targeted vitest runs).
- `bun run check-types` green (rc 0); `bun run lint` green (rc 0).
- `bun run test` (full suite): 4426 passed / 1 failed / 1 skipped. The one failure is
  `test/roadmap-render-guard.test.ts`'s narrative-ref census leg (rm-678, rm-13640, rm-553 refs
  without def/fog/Closed-items resolution) — PROVEN pre-existing at committed HEAD 63e2dba4c
  (stash-replicated: the leg reds on the pristine tree too), an engine-owned managed-render
  bookkeeping defect from the roadmap-sync refresh; not hand-fixed per the standing doctrine.
- One known-flaky unrelated leg (`finished-run store — bounds > the usable check does not refresh
  recency`) observed once in a full-suite run; passes 3/3 isolated and in its own full-file run.
- `bun audit` — zero advisories (799 packages) after the serialize-javascript floor.
- `node scripts/roadmap-census.ts` — 355 defs / 0 dups / max rm-2150; roadmap-integrity guard 13/13.
