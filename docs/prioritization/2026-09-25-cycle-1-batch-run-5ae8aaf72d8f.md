# Dashboard maintenance — cycle-1 batch (2026-09-25, run 5ae8aaf72d8f)

Selected by prioritize phase a78da601 against canonical origin/main 828a1e6
(tip re-verified unchanged at selection time). Deliverable for the implement
phase: apply this batch end-to-end — no scope growth, no re-selection.

## Selection

**Batch: "ledger & citation truth"** — apply the staged roadmap extension, correct
the 10 id-citation sites that mis-cite landed meanings, and reword the rm-196
rider comment. Three slices, zero executable-behavior change, zero new
permissions, conflict-clean against every open PR.

| axis | assessment |
|---|---|
| impact | HIGH — the id-space collision (assess F1) is active corruption: 10 code/doc sites cite rm-203/rm-204 for meanings the roadmap owns differently; every future reader/grep is misled, and the parallel lineage already converged on rm-222/rm-223 — landing the staged roadmap is what makes that convergence real |
| risk | LOW — comments + docs + ledger text only; no runtime surface touched (B2 sites are all comments/table rows; B3 is a YAML comment; B1 is ROADMAP.md) |
| effort | S/M — three small slices; full-suite baseline 3284 green at 828a1e6 (memory #3152); visual gate untouched (no web/ files) |
| dependencies | none blocking; open-PR overlap verified non-conflicting: PR #196 server.ts hunks @-15/-42/-319/-699/-720/-781 vs B2 sites 1161/1298/1311 — no overlap; PRs #155/#157 don't touch B1/B3 files at all |
| strategic | this run's whole product IS the ledger repair (assess F1 → roadmap staged → priority lands it); leaving it staged while parallel runs mint more ids grows the collision class this repo keeps re-firing (#10178 family) |

## B1 — apply the staged roadmap extension

Source: delegate spool `roadmap-84b4941f-staged.md` (verified: 107 own-ids,
0 dups, rm-222/223/224 minted, 0 deleted lines). Apply byte-identical as
ROADMAP.md. Content: rm-222 (deadline racing + stall watchdog, landed-record) +
rm-223 (DASHBOARD_MONITORING_REFRESH gate, landed-record) with ids adopted from
parallel c8b5d2ec's claim; rm-224 (fleet PR review-request inbox, net-new
candidate); dated signals on rm-119/133/157/196/218; INTEGRATE-MERGE header
comment for the fc4bb6a4 merge (828a1e6, PR #166); extension #6 comment.
Post-apply gates: own-id count 107, 0 duplicate own-ids, rm-101 absent,
Open/Completed/Superseded section order intact.

## B2 — the 10-site citation sweep (assess F1 code half)

`git grep -n 'rm-203\|rm-204' origin/main` census (authoritative, supersedes the
9-site list in c8b5d2ec's recommendation — it missed two sites):

rm-203 → **rm-222** (deadline racing meaning):
- README.md:93 — swap the rm-203 half of `(rm-203/rm-141)`, keep rm-141
- src/github/aggregator.ts:307 — "this run's rm-203: deadline racing + stall watchdog"
- src/github/aggregator.ts:701 — "Outbound deadline machinery (this run's rm-203)"

rm-204 → **rm-223** (monitoring-gate meaning):
- README.md:97 and README.md:122 (Configuration table row)
- src/server.ts:1161, :1298, :1311 (comment + the gate's log line)
- test/server.test.ts:635, :638 (describe title — cosmetic but sweep it anyway)

**DO-NOT-SWEEP guard**: `.github/workflows/base-drift.yaml:2/148/167` also cite
rm-204 — those are CORRECT (rm-204's landed meaning IS the pin-drift watch,
minted at the a4a97e30 landing, see base-drift.yaml:148's own note). A blanket
sed of rm-204 would corrupt three correct citations. Sweep only the 7 gate sites
listed above.

Post-sweep gate: repo-wide grep (excluding ROADMAP.md, docs/prioritization,
docs/solutions — historical) shows zero monitoring-gate/deadline citations of
rm-203/rm-204; base-drift.yaml's 3 rm-204 citations remain.

## B3 (rider) — rm-196 rider comment truth (assess F2/F3)

pnpm-workspace.yaml `minimumReleaseAgeExclude` block: the comment "both past
their 1440-minute maturity timestamps" was false for vite at merge time —
hono@4.13.9 (published 2026-09-24T01:32Z) was ~33h old, but vite@8.3.1
(2026-09-24T12:26Z) was ~68 minutes SHORT of maturity at the 11:18:36Z merge —
the exclude was load-bearing for vite. Reword to record that (and that both are
past maturity as of 12:26Z Sep-25). B1 already truthed rm-196's roadmap status
(rider LANDED at 828a1e6); this closes the file-side half. No YAML value changes.

## Deliberately NOT in this batch (sequenced)

- **rm-224 review-inbox** (research C1, 48.0) — NEXT-CYCLE LEAD. Highest-value
  net-new feature but a full vertical slice (GraphQL extension + inbox feed +
  web surface + visual baselines); pairing it with the ledger batch would risk
  half-landing the cycle. Evidence + acceptance already on rm-224's item.
- **rm-119 monitoring panel** (52.0, 5th recurrence) — pairs with rm-224
  next cycle on the same operator triage loop; queue-metric GraphQL path
  recorded on its item by this run's research.
- **rm-187 store.ts:51 JSON.parse guard** — LIVE at tip (PR #155's diff does
  not touch the rowToMessage shape) but its two files (src/listener/store.ts,
  test/listener-store.test.ts) are in open PR #155's set — same-file conflict
  with the listener rewrite. Next-cycle rider post-#155 (same disposition
  cycle-15 gave rm-208's web half).
- **rm-208 poll swallow** — still blocked by PR #155 (per cycle-15's DEFERRED
  note, unchanged).
- **rm-116 branch-protection shell** — standing; needs a live-fill that
  persisted-last-time-falsely; not this batch.

## Verification plan (implement phase)

`pnpm check-types` (server + web), `pnpm lint`, `pnpm test` (baseline 3284 —
expect no delta: B2's test-file cite is a comment/describe string, no assertion
changes), the B1/B2 grep gates above, and `git status` clean of unexpected
drift. Visual gate: untouched (no web/ files in the batch). Invariant sweep:
no new GitHub permissions, no write path, .conductor untracked stays untracked
(#3256 discipline).
