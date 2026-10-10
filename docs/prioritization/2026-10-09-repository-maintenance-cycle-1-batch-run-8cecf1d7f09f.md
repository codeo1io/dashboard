---
module: dashboard
tags: ['prioritization', 'repository-maintenance', 'cycle-1', 'batch-selection']
problem_type: maintenance-planning
run: '8cecf1d7f09f411084245429a43c1743'
cycle: 1
---

# Dashboard maintenance batch (2026-10-09, run 8cecf1d7f09f)

> **Landing renumber map (2026-10-10 integrate, conflict case
> 87124eb3a29742ca8be48aeb36025584):** this batch's `rm-807` is `rm-866` on
> main — main landed 155f9770's dep-refresh def at the rm-807 numeral, landed
> meanings own ids, and the renumber rides this merge. The record below is
> preserved verbatim as the at-write selection record; `rm-860` is unchanged.

Authoritative batch-selection record for repository-maintenance cycle:1 run
`8cecf1d7f09f` (prioritize attempt `4454d9e15b6e45c7b011e1e952cd8525`), base
`364272b` (origin/main, porcelain 0 at dispatch, main-ledger selected-baseline 0)
carrying this run's roadmap layer (spool patch
`c8f41ea687c949438376449821de605e-roadmap.patch`: census 246 defs / 0 dups /
max rm-807, guard pin 807; applies cleanly at 364272b, round-trip verified in the
roadmap phase). Selection edits do not move the census — the guard pin stays 807.

## Inputs

- assess `9d18c80ba9154c2e9d6222c44a97b2a2` — web client suite flake (2 of 1203
  failed on run#1 at the App.test.tsx :243 waitFor, green isolated and green on
  full re-run), the unbounded focus re-probe fetch (web/src/App.tsx:157-170),
  the sole floating runner (cve-tripwire.yaml:40), all Actions pins sha-locked,
  env table in sync, frozen install rc=0.
- research `0b947c39516d454d901ff3afbfdafa15` — C1: the ubuntu-latest label
  flips to Ubuntu 26.04 in November 2026 (runner-images ubuntu-slim/20261005.17,
  #14748/#14747); held-dep windows: @hono/node-server 2.1.4 (from
  2026-10-10T04:42Z) and vite 8.3.4 (from 2026-10-10T12:07Z); codeql-action
  24c5418 == v4.38.3; upstream tip 22e2e46 dep-level only, agent v0.118.3 serves
  contract 1.8.0; pnpm 12.10.1.
- roadmap `c8f41ea687c949438376449821de605e` — mint rm-807 + six dated riders;
  prior roadmap attempt df0e011b was provider-reaped with zero durable work,
  redone from scratch (forensics recorded).

## Selection floor

(a) this run's own evidence-backed discoveries with acceptance authored this
cycle — no secondhand scope; (b) zero content AND file overlap with any LIVE
sibling lane's selected batch (fleet scanned: campaign stores, sibling walls,
current batch docs); (c) locally verifiable end-to-end this cycle — no external
clock, release, or gate dependency; (d) one-cycle size (the rm-703 playbook).
Two members clear the floor as one coherent batch.

## Selected batch — 'client focus re-probe hardening'

| # | Item | Def / ownership | Surfaces | Effort | Verification |
|---|------|-----------------|----------|--------|--------------|
| B1 (headliner) | Focus re-probe tests deterministic under full-suite load | `rm-807` (this run's mint, selected lead; def-line flipped, provenance moved to the selection rider) | `web/src/App.test.tsx` (timer discipline in the rm-487 focus re-probe family), test seams in `web/src/App.tsx` only if the conversion needs them | M | full web suite green on two consecutive runs with the formerly flaky tests green in both; fake timers or explicit bounded waits replace real-clock sleeps inside `act`; no assertion weakening |
| B2 (fold member) | reprobeSessionOnFocus fetch bound | dead-lane `rm-784` re-implemented by content, NO new mint (owner run e8c99e0ef791, cycle:2 batch 'client network-bound truth', failed at implement — verified in the campaign store 2026-10-09; fold note rides rm-807's selection rider) | `web/src/App.tsx:157-170` | S-M | the re-probe call carries AbortSignal.timeout (house bound); abort/rejection routes into the existing fail-closed expiry handler (no state latch, single-shot-per-focus stands); abort-path unit test (fake timers + never-resolving fetch resolves probe-failed within the bound); pnpm check-types + full test green |

Coherence: B1 and B2 share one seam family (the client focus re-probe path) and
rm-807's acceptance explicitly doubles as B2's propagation suite — a timeout
wrapper owns only the hang case, rejections must propagate (the run cbe70604
listener-ack lesson). Zero live-lane overlap on `web/src/App*.tsx` (every live
implement/full_tests lane's current batch doc read: d1a0b216 →
web/src/operator/runtime.ts, d8fdf8b7 → src/github/snapshot-store.ts,
c4617181 → package.json + Dockerfile + README + a new workflow gate,
38e72854 → src/routes/api.ts, cb0cfe96 → src/listener/store.ts +
src/routes/auth.ts, 91776e25 → .github/workflows/main.yaml +
src/github/{auth,installations}.ts, 438dea88 → remote-only API-ledger work,
cb189044 → .github/workflows/cve-tripwire.yaml).

## Claimed-and-excluded (congestion audit — every candidate named)

- rm-793 cve-tripwire NODE_IMAGE digest fix — URGENT (first scheduled fire
  Monday 2026-10-12 06:53Z is red by construction until fixed) but LIVE-owned:
  d1a0b216 running at implement (selected rm-793 + rm-794, batch doc claims
  cve-tripwire.yaml); cb189044 running at full_tests on the same file
  (rm-788/rm-789). Content- and file-excluded.
- rm-188 zero-ubuntu-latest pin half (November-2026 deadline, this run's rider) —
  file overlap with both live cve-tripwire.yaml lanes above (:40 runs-on vs
  their :35 NODE_IMAGE edits); the dated rider carries the urgency until the
  file frees.
- rm-805 mechanical no-floating-runner guard — dead lane 8dd690c8's wall claim
  (no live run row in any campaign store); deferred, not folded: it scans
  .github/workflows/* and collides with the two live workflow lanes.
- codeql-action 24c5418 bump — rides dead lane df0dd46d's rm-787 acceptance;
  delivery would touch .github/workflows/main.yaml == LIVE 91776e25's rm-117
  surface. File-excluded.
- rm-760 held-dep refresh (@hono/node-server 2.1.4, vite 8.3.4) — release-age
  windows open 2026-10-10T04:42Z/12:07Z, after this cycle's implement; floor (c)
  fails today. NOTE: sibling 155f9770 minted the same numeral rm-807 for THIS
  subject (see pairing below) — their lane owns it.
- rm-140 pnpm 12.x — evaluation strictly post-cure (standing rider);
  rm-252 upstream absorb — external decision clock 2026-10-13; rm-108 node-26
  and rm-133 majors — 2026-10-21 gate. Floor (c).
- Trap-map non-selectables read with riders: rm-104 (P98,
  upstream-generator-gated acceptance), rm-279 (P96, cured pathology with stale
  score), rm-703 (P76, landed-by-content residue via the rm-691 lineage).
- Live-lane selections excluded: rm-116/rm-792 (438dea88), rm-117/rm-162
  (91776e25), rm-187/rm-149 (cb0cfe96), rm-788/rm-789 (cb189044),
  rm-793/rm-794 (d1a0b216), rm-797/rm-799/rm-800 (c4617181),
  rm-802/rm-803 (d8fdf8b7), rm-599/rm-797 (38e72854).
- rm-806 operator label retryability — sibling aec9c3e8's same-hour mint
  (running at prioritize); different subject, no collision with this batch.
- Standing September items (rm-282, rm-249, rm-281, rm-163, rm-119, rm-194,
  rm-220, rm-253, rm-224, rm-153, rm-141) — not this run's discoveries; floor
  (a) fails; no new evidence this cycle.

## Selection risk

- rm-784 fold relies on the owner lane staying dead (failed at implement,
  verified 2026-10-09 in dashboard-main-bce98df55716560f; wall intact and read
  first-hand). If e8c99e0e resurrects and lands first, this batch's B2 folds by
  content at integrate — never double-implement.
- NUMERAL PAIRING (same-hour parallel mint, different subjects): sibling lane
  155f9770 (requirement 8e7a74aa, cycle:3, roadmap 10795424) minted the same
  numeral rm-807 for the held-deps refresh minutes after this run's mint —
  both frontier derivations were correct at their probe times. Both lanes'
  records name the pairing; at integrate the landed meaning owns the id and the
  other renumbers mechanically. No content overlap (reliability test
  determinism vs maintainability manifest movement).
- Parallel prioritizers 493bbbf2 + aec9c3e8 (both running at prioritize) may
  select overlapping standing items; this batch's surfaces (web/src/App*.tsx)
  have zero overlap with their known subjects (493bbbf2: wall torn down, events
  show assess + research only; aec9c3e8: rm-806, web/src/operator/* family).
- The flake's exact racing layer (suite load timing vs the unbounded fetch) is
  unproven; B1's cure is robust to either root — fake timers remove the
  wall-clock race entirely, and B2 bounds the fetch either way.

## Verification

- Selection mechanics: rm-807 def-line flipped to
  `status: open (selected 2026-10-09, run 8cecf1d7f09f cycle:1 prioritize 4454d9e15b6e, 'client focus re-probe hardening')`
  (first parseable status token 'open'; no rm- numerals inside the flipped
  def-line — phantom-scan hygiene); mint provenance moved verbatim into the
  selection rider with a pointer left in the def-line; fold member + numeral
  pairing recorded in the rider.
- Post-edit battery (all first-hand at the composed tree): census unchanged
  246 defs / 0 dups / max rm-807 (selection edits never move the census);
  newest census comment still extension #41 (claims=green); both roadmap guard
  suites green; eslint ROADMAP.md + this document 0 problems; worktree restored
  pristine (porcelain 0) with the cumulative spool patch as the deliverable —
  this patch SUPERSEDES the roadmap-phase patch (it contains it).
- Implement-phase evidence expectations: B1's two consecutive green full-suite
  runs (the formerly flaky tests green in both), B2's abort-path unit test +
  check-types, and a fold attestation naming rm-784's content lineage and the
  rm-807 numeral pairing.

## Implement outcome (2026-10-09, run 8cecf1d7f09f implement 5f31a4c309794b028335c2140460a642, base 364272b)

- B1: all three rm-487 family tests converted to fake timers
  (`vi.useFakeTimers` + `vi.advanceTimersByTimeAsync` flushes inside `act`);
  call counts asserted synchronously at the dispatched focus; a scoped
  `afterEach` restores real timers. Assertions strengthened, not weakened:
  dormancy now proven across a full poll interval, recovery across the
  re-armed interval tick, fail-closed retry across a full interval with the
  loop still dead.
- B2 (rm-784 fold; fold attestation + numeral pairing in rm-807's implement
  rider in ROADMAP.md): the re-probe call in `web/src/App.tsx` passes
  `abortSignal: AbortSignal.timeout(15000)` (`REPROBE_TIMEOUT_MS`, exported
  for the driven clock); no state latch, single-shot-per-focus stands with
  the next focus retrying. New abort-path test drives the bound on fake
  timers with a never-resolving fetch — first-hand platform fact: jsdom's
  `AbortSignal.timeout` schedules outside the timers vitest fakes
  (`globalObject.setTimeout` in AbortSignal-impl.js), so the test shims the
  static onto the faked clock with the identical contract (TimeoutError
  DOMException) while App's wiring under test stays real; rm-606's tests
  cover the real static under real timers.
- Evidence: App.test.tsx 30/30 focused (was 29); web suite 1204/1204 on two
  consecutive runs (the formerly flaky family green in both — the two-green
  acceptance); `pnpm check-types` rc=0 (server + web + .opencode, node
  22.22.0 with the known engines advisory); `pnpm build:web` green. Root
  suite untouched this phase (focused/impacted budget — server surfaces
  unchanged). Census after flip: 246 defs / 0 dups / max rm-807.
