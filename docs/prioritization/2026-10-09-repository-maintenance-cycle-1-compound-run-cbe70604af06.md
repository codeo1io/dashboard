---
module: dashboard
tags: [repository-maintenance, cycle-1, compound, rm-780, rm-187, rm-779]
problem_type: maintenance-compound
---

# Repository-maintenance cycle 1 — compound record (2026-10-09, run cbe70604af06)

Pre-review compounding of the whole cycle: assess `efc44cef` → research `61867321` → roadmap
ext #36 (`32cdbb96`, mints rm-779/rm-780, census 239/0/rm-780, guard pin 780) → prioritize
`3b41dc6e` → stewardship `18b5bcb6` → implement `9c43cf72` → targeted `e78e6d54` → full
`8eddfdcd` (three ephemeral-PR rounds, two in-turn fixes). Nothing was re-validated at
compound; every outcome below is consumed from the recorded typed results.

## Cycle outcome (compounded)

Batch `Degradation truth surfaced — monitoring view + listener store`, implemented at base
`559642a` (== origin/main at cycle open):

- **U1 `rm-780`** (operator-experience) — aggregator-shipped stale/unknown truth finally
  rendered: attention-first `monitoring-stale-repo` cards with per-repo notes (behind red,
  ahead of green), footer `monitoring-stale-count` separated from "not failing",
  `postReadyFailures` banners in BOTH views, all-clear empty state suppressed while any row is
  stale/unknown or the view is post-failure, and the GET seams gain a 15s wall-clock bound via
  NEW `withGetSeamTimeout` (`web/src/api/fetch-timeout.ts`) wired into `fetchMonitoring` +
  `fetchListenerMessages`. No aggregator DTO change owed (rm-112's half stays separate).
- **U2 `rm-187`** (reliability) — `parseLinksCell` degraded-links guard in
  `src/listener/store.ts`: corrupt/non-array links cell degrades to an empty list with every
  other field intact, one `console.warn` per degraded read, endpoint stays 200 with healthy
  rows; NEW `test/listener-store-degradation.test.ts` (4 cases incl. endpoint 200).

Validation chain (consumed, not re-run): targeted `e78e6d54` green on the engine-derived
surfaces (4 impacted files / 53 tests + complementary 11 + web 35); full `8eddfdcd` GREEN at
ephemeral PR **#452** (11/11 checks; Test 64 server files + 33 web files) on validation
digest `validation:v1:f55f734e…a014757` — after two in-turn corrections, both caught ONLY by
the full gate (details below). Statuses flipped to `implemented … pending landing`.

## Ledger deltas made at compound

- def-line status flips: `rm-780` and `rm-187` `open (selected …)` → `implemented 2026-10-09
  (… pending landing; prior: selected …)` — the completed/landed flips stay reserved to
  landing verification per house rule.
- compound riders on both defs (validation provenance + the two corrections' prevention-rule
  pointers).
- zero def-line id changes; census and guard pin unchanged: `239 defs / 0 dups / max rm-780`,
  `expect(live.max).toBe(780)` still correct (verified via `node scripts/roadmap-census.ts`).

## Reusable lessons recorded this cycle

1. **Race/timeout wrappers must propagate rejections** (NEW prevention rule):
   `docs/solutions/best-practices/race-timeout-wrappers-propagate-rejections-2026-10-09.md` —
   the wrapper owns only the hang case; swallowing a rejection into the timeout sentinel
   collapses the caller's `try/catch` error taxonomy (`AbortError`→timeout vs
   transport→network), and both landed seam suites red on CI. Corollary: focused verification
   of a shared-helper change must include every pre-existing suite importing the touched seams
   (grep importers) — the targeted selector maps files→suites, never callers→suites, so this
   class is invisible until the full gate.
2. **Roadmap census claims must be exact slash-form** (NEW prevention rule):
   `docs/solutions/workflow-issues/roadmap-census-claim-exact-slash-form-2026-10-09.md` — the
   guard's claim regex takes the FIRST slash-form match in the newest dated comment;
   `239 / 0 / rm-780` shorthand is inert, the older at-compose claim kept the slot, and the
   guard reded only on the ephemeral-PR Test job (run 37857579938). Fix shape: post-edit
   census in exact slash form first, basis census demoted to comma-form. Second same-day
   fleet occurrence — pattern, not one-off.
3. **Ephemeral-PR attribution by UTC clock** (recipe note, no new doc): the prompt's date can
   run ahead of UTC, so a same-minute validation PR looks like yesterday's sibling residue;
   attribute by `date -u` + `gh run view <id> --json headBranch` before flagging. All three
   of this run's PRs (#450/#451/#452) were closed and refs force-deleted by the tooling —
   verified clean teardown (48/28 sibling ci-refs before == after).

## Next-cycle candidates + preconditions (concrete, ordered)

1. **`rm-779` cve-tripwire NODE_IMAGE reconciliation — TIME-SENSITIVE.** First scheduled fire
   Monday 2026-10-12 06:53Z is deterministic red until `NODE_IMAGE: 'node:24-slim'`
   (cve-tripwire.yaml:35) matches the Dockerfile's trixie pin; THREE sibling lanes
   (8521c80a, 89ebbf49, 9fd8bcad) already built the same one-line fix — the next cycle
   RECONCILES rather than rebuilds (check landed state first; the def's pass-over rider
   carries the integrate note). The last non-comment `ubuntu-latest` (cve-tripwire.yaml:40)
   rides the same fix and discharges rm-188's acceptance.
2. **`rm-252` operator contract 1.8.0 absorb — due 2026-10-13.** Upstream steady at 1.8.0
   (#573 + #578 recipe doc); fork pins 1.6.0 (`src/gateway/operator-contract/version.ts:15`).
   MUST exclude write-capability surfaces (rm-259's standing never-absorb) and upstream's
   bookworm base-image family (fork is trixie `173f1258…`). The adapted recipe already lives
   at `docs/solutions/best-practices/consume-gateway-operator-contract-1-8-0-2026-10-07.md`.
3. **`rm-112`'s open DTO half** — now unblocked by this batch's view-layer landing: the
   aggregator-side degradation signal (MonitoringDto) is the remaining half, deliberately kept
   separate per rm-780's acceptance.
4. **`rm-116` branch-protection fill** — standing FIRST post-landing action (Main-job
   conclusions + CodeQL, strict, admin-enforced; protection object is still a hollow shell).
5. **Node v26 LTS window 2026-10-28 (`rm-139`) + `rm-711` impeccable 4.1.0** — the 4.1.0 pin
   bump exists only in sibling lane 69b161e1's wall; reconcile at the next absorb rather than
   re-deriving.
6. **NOT ours to re-take (re-probe walls first):** `rm-751` (f266ce30's unlanded
   Monitoring.test.tsx describe — integrate UNIONS it with this batch's rm-780 tests, distinct
   testids), `rm-752`/`rm-753`/`rm-754` (f266ce30), trixie re-pin (LANDED as rm-698), the
   sibling cve-tripwire fix lanes above, and any mint above rm-780 without re-probing the
   all-lineage ceiling (sibling walls claimed rm-778/rm-769/rm-767 before this run's mints).
7. **Deploy currency:** this batch's banner/routes/tests join the post-landing release queue;
   live probes (stale banner over a forced-stale snapshot, per rm-780's evidence line) are
   deploy-gated until then.

## Integrate obligations (fresh at compound, 2026-10-09)

- This tree's ledger delta vs main: ext #36 comment + minted rm-779/rm-780 + selection/
  research riders + today's 2 flips and 2 compound riders; `test/roadmap-integrity-guard.test.ts`
  pin 744→780. The landing re-derives census + pin from the UNIONED tree (guard takes the
  newest-date, last-in-document-order claim — ext #36's corrected `239 defs / 0 dups / max
  rm-780` must stay the first parseable claim in its body through any union reflow).
- Sibling contention to resolve at union: f266ce30's `rm-751` Monitoring.test.tsx describe
  (union, do not drop either side's tests), the three identical cve-tripwire fixes (fold to
  one, attribute via the def's rider), and any newer extension comments from sibling landings
  that advanced main past 559642a mid-run.
- Untracked riders of the landing: `test/listener-store-degradation.test.ts`,
  `web/src/api/fetch-timeout.ts` (+ its test), this compound doc, the two prevention-rule
  docs, and the batch record doc
  (`docs/prioritization/2026-10-09-repository-maintenance-cycle-1-batch-run-cbe70604af06.md`).
- Post-merge: `git ls-files .conductor` must end empty (standing landing trap).
