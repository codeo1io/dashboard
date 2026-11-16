# Batch — repository-maintenance 0e5f4316 cycle:1, run 1b4ea0710ef24e9eba055503337fd13f

Implement attempt `af01e401f44842599ebfbc2ec76848c4` · 2026-11-19 · worktree base
`cafc17e37d6d` · selection: docs/prioritization/2026-11-19-repository-maintenance-cycle-1-prioritize-a90dc5202b1b4515a47b99c3633cc9a4.md
· stewardship request: delegate/dbff7e5e9c44492baa55eb574eb625bf.json.
Ledger census at this batch: **354 defs / 0 dups / max rm-2147**.

## What the batch delivered

The monitoring board tells the truth (rm-2135 + rm-2137, one web change-unit; the
rm-780 cold-start allClear amendment folded into the same Monitoring.tsx boolean
block per that rider's convergence declaration at the rm-780 row):

- **rm-2135 — degraded-state visibility.** A repo whose rollup is `unknown` or whose
  counts are flagged `stale` (src/github/aggregator.ts:694-696,731-732 produce this
  state on fetch failures) no longer masquerades as "not failing": the board renders
  a degraded banner ("N of M repositories reporting degraded or unavailable data")
  plus a per-repo degraded card, the "not failing" tally excludes degraded rows, and
  the "All repositories green" empty state is gated behind a KNOWN-GOOD snapshot —
  nothing red, nothing degraded, non-empty, and not stale.
- **rm-780 fold (by content).** All-clear additionally requires `!data.staleBanner`
  and a non-empty repos list; empty/stale snapshots render the
  `monitoring-all-clear-suppressed` state instead of claiming green — the exact
  cold-start case the rm-780 rider amendment specified.
- **rm-2137 — fleet-truth surfacing.** The client now parses the rm-156 watchdog
  fields (refreshDurationMs / refreshDegraded — optional-absent, strict when
  present, the rm-1447 platformStatus pattern) and the board renders: an
  attention-inbox with fleet open-PR/open-issue/open-alert totals (per-repo counts
  the server already emits, aggregated client-side; a null alert count anywhere
  renders "alert counts unavailable (partial fetch)" rather than a wrong sum), a
  completeness banner when driftCount > 0 or enumerationIncomplete > 0, a watchdog
  banner when the last refresh exceeded the ceiling (with duration), and the
  refresh duration in the footer.

## Method

TDD (test-driven-development skill, rigid): 16 failing tests written first —
6 view tests for degraded visibility incl. both rm-780 fold cases, 6 view tests for
fleet-truth, 4 DTO parse tests — RED verified (14 failed / 26 passed; the 2 passing
new tests are the intentional regression-guard and negative-presence cases), then
minimal implementation, then GREEN (40/40 focused).

## Validation (focused battery, per implement budget)

- `vitest run --config web/vitest.config.ts web/src/views/Monitoring.test.tsx
  web/src/api/monitoring.test.ts` → 2 files / 40 passed
- full web suite (impacted workspace): 54 files / 2073 passed (was 2057; +16)
- `npm run check-types` → all three tsconfigs green
- root eslint: web/ is outside its scope by design (0 errors)
- repository-wide gates are reserved for the later full_tests / merge-release gate

## Deliverables

- `web/src/views/Monitoring.tsx` — degraded group + banners + gated all-clear + attention-inbox + footer duration
- `web/src/api/monitoring.ts` — client DTO gains refreshDurationMs / refreshDegraded (optional-absent strict parse)
- `web/src/views/Monitoring.test.tsx` — 12 new view tests (rm-2135 ×6 incl. rm-780 fold ×2, rm-2137 ×6)
- `web/src/api/monitoring.test.ts` — 4 new DTO parse tests (defaults, passthrough, 2× malformed→contract-drift)
- `ROADMAP.md` — rm-2135 / rm-2137 status flips (implemented, pending landing)

## Out of scope (must-remain-separate per the stewardship request)

No src/ server file changed (the server already emits every surfaced field); the
prior-phase deliverables riding this worktree (the roadmap mint diff, the
2026-10-15 re-census record, the prioritize doc) stay their own unit.
