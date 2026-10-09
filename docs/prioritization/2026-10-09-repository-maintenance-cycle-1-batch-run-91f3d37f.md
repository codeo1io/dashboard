# Dashboard maintenance — repository-maintenance cycle 1 batch (2026-10-09, run 91f3d37f)

module: dashboard
tags: `[operator-experience, correctness, batch-record]`
problem_type: batch-record

Frame: base `88e423a6` (== origin/main, porcelain-clean at every phase dispatch and
re-verified `git rev-parse HEAD origin/main | uniq -c` → 2×88e423a at stewardship).
Run `91f3d37f3c9b4223a90aa56818fed8f5`, repository-maintenance
`f24ea34af1b1` cycle:1. Phases: assess `543756a4c11d49518fcba539a75760af`,
research `084b79170a7e4c2784ebd7c92e835caf` (attempt `8a19984056af` reaped
provider-side, redone), roadmap `a268ee63aa0c49b58a7c86e7b821cde9` (extension #37 —
mint rm-835 + nine riders, guard pin 780→835; attempt `4153379a` reaped
provider-side, redone), prioritize `9f7f67de33e146d49ce8e96cfd661cba`,
stewardship `dc35adec52dc4c97852a10691e69e102`, implement
`c53c3bc6b82049e5b60e9be76b9cf778` (this document's implementation record).

## Batch: 'cold-start truth hardening' — rm-835 (single def)

The Monitoring board's `allClear` predicate (`web/src/views/Monitoring.tsx:120`)
consulted only row state — an empty enumeration counted as clear — and never
consulted `data.staleBanner`, so the aggregator's fail-closed cold-start DTO
(`src/github/aggregator.ts:1017`/`:1304` — `repos: []` + `staleBanner: true`,
the state the 2026-10-09 repo-wide Actions disable actually produces) rendered
the stale panel and the green "All repositories green" claim in one frame: a
freshness assertion the DTO itself contradicts. DTO-level residual of landed
rm-780 (its acceptance wording covered row staleness only).

### Selection rationale (prioritize)

37 live unlanded sibling claims across the 89 fleet walls (HEAD baseline 0
landed); every higher-priority free candidate was non-selectable this cycle —
external render gate (rm-104), CI-gated acceptance under the Actions disable
(rm-103/703/779), content-closed dispositions (rm-282/512), majors-window
entanglement (rm-249), dual-def canonicality (rm-153/226), same-file contention
with claimed rm-825 (rm-114), sibling fresh mints (rm-831/832/833). rm-835 is
this campaign's own mint, offline-completable end-to-end, zero contention, and
pairs by content at integrate with sibling run-28cd8f6c2568's rm-780 amendment
rider (their research notes defer the mint).

## Implementation (implement c53c3bc6)

- `web/src/views/Monitoring.tsx` — `allClear` gains the `!data.staleBanner` DTO
  gate; new `noData` branch: `data.repos.length === 0` renders a distinct
  `monitoring-no-data` empty state ("No repository data — … no health claim can
  be made") instead of the green claim, for fresh and stale enumerations alike;
  the suppressed-note copy generalized from "while refreshes fail" to "while
  data is stale or refreshes fail" (the same retraction now covers the DTO-level
  banner with rows present). rm-780's in-code comments extended with the rm-835
  rationale. No aggregator changes — the DTO is already correct fail-closed.
- `web/src/views/Monitoring.test.tsx` — new `Monitoring rm-835` describe, three
  pinning tests: (1) the fail-closed cold-start DTO (`repos: []` +
  `staleBanner: true`) renders the stale banner and the no-data state, never the
  green claim; (2) an empty-but-fresh enumeration renders no-data, not green;
  (3) the DTO banner retracts the green claim even with healthy rows present
  (suppressed note + banner + last-known footer count). No existing test
  asserted the replaced behavior (all green-state fixtures carry a healthy repo).
- Ledger — cumulative patch applied (`prioritize-91f3d37f-9f7f67de.patch`:
  extension #37 + rm-835 mint + selection + guard pin 780→835) and rm-835
  flipped `implemented` (census 248/0/835, candidate 73 / open 2 /
  implemented 125).

## Verification (focused battery — repo-wide validation reserved for the gate)

- `pnpm build:web` first (fresh worktrees carry no `web/dist`), then targeted
  `vitest run web/src/views/Monitoring.test.tsx` (16 tests) green;
  roadmap guards (`roadmap-integrity-guard` + `roadmap-length-guard`, 9/9) green;
  `npx eslint` on every touched file green; `pnpm check-types` green.

## Separation hints honored

`public/operator-stream.js` (sibling rm-825 surface) and `src/github/aggregator.ts`
(PR #479 pending content) untouched; this run's batch doc distinct from
`2026-10-09-repository-maintenance-cycle-1-batch-run-91776e259752.md`.
