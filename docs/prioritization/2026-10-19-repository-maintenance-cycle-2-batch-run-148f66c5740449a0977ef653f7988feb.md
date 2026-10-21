# 2026-10-19 · repository-maintenance cycle:2 · batch selection

Run `148f66c5740449a0977ef653f7988feb`, prioritize attempt `220a504a9a4847549efcb11974ad3d46`.
Base `655bfe50` (== origin/main at dispatch; live main `55aedc97` is 5 commits ahead — see
Landing notes). Inputs: the ledger as extended by this run's roadmap phase (289 defs, census
green, guards 15/15), assess `856d46c3`, research `4d4e4e0d`.

## Selected batch — "fresh-mint coverage closure"

1. **ANCHOR — `rm-2061` (reliability 52.0, flipped to in_progress by this selection).**
   Combined-mode coupled test: the deployed shape runs listener ingest and gateway operator
   sessions in one process, yet the four gateway-session suites exercise that surface in
   isolation (zero `listenerStore` references across them) and no other suite couples the two.
   Implement adds one integration suite that mounts the app with the gateway-operator session
   enabled AND the listener ingest path live, with three red-first legs (ingest → store →
   operator read with session-cookie semantics; operator-window requests classifying to the
   operator rate-limit class at the combined boot; an ack flow's CSRF cookie surviving a
   listener-store write in the same session).
2. **`rm-2062` (reliability 51.0, flipped to in_progress by this selection).** The vendored
   time module under the public operator tree ships without a type twin while its three
   consumers each have one, so the type gate never reaches it. Implement adds the twin and a
   parity guard that fails when the twin drifts from the module (red-first by deleting one
   declared export). Scope is twin + guard only; SSE byte accounting and offline caps stay with
   their fog owners.
3. **Ledger rider at implement — `rm-1437` closes externally-revived.** Premise rewritten by
   this run's roadmap phase (the Actions outage ended without the probe landing; residue folds
   to the Fro Bot and branch-protection lanes). Zero-code status flip plus the closure rider
   already staged; rides this batch's implement phase.

## Why this batch wins on impact / risk / effort / dependencies / strategic value

- **Impact.** The two mints are the only verified-open fresh gaps this run's assess and
  research produced, and both sit on the deployed reliability surface (the coupled boot is the
  real production shape; the vendored time module feeds all three operator scripts). Highest
  fresh priorities not already spoken for (52.0 / 51.0).
- **Risk.** New files only — one suite, one twin, one guard — zero tracked-file overlap with
  the five commits main took since base (which touched adjacent-but-disjoint listener-store and
  SSE-reader surfaces). No lockfile churn, no CI secret dependency, no live-state mutation, no
  workflow edits.
- **Effort.** Moderate and bounded: both items are additive with the established harness
  (app-factory request tests with injected fakes; the single-sourcing parity-guard pattern).
  Red-first acceptance is locally verifiable end to end in this cycle.
- **Dependencies.** None beyond the standing gates (type check, lint, tests, roadmap guards).
  Neither item is blocked by the lockfile window, the Bun absorb-gate, an owner decision, or a
  date-gate.
- **Strategic value.** Closing the fresh-mint band the same cycle it was minted keeps the
  ledger's test-coverage track honest (no rotting candidates), and the coupled-boot suite is
  the prerequisite evidence for any future combined-mode hardening (rate-limit transitions, ack
  coexistence) that the ledger already anticipates.

## The sweep — considered and not selected

| Item | Priority | Why not selected |
| --- | --- | --- |
| Legacy band 84–100 (rm-022, rm-021, rm-284, rm-885, rm-863/864, rm-178, rm-886/887, rm-647, …) | 84–100 | Owned by unlanded sibling lanes or superseded — the cycle:3 batch lane holds the truth closes (rm-100, rm-022 among its staged riders), the base-drift rework lane implements the digest cures in code, and the digest re-derive is literally in that lane's diff. Ownership map verified 2026-10-18 and re-spot-checked this cycle. |
| `rm-850` operator-contract 1.9.0 readiness | 78.0 | Entangled with the unlanded agent-pin lanes; its named acceptance surface does not exist at base or on main, and the contract has since moved past its premise (agent contract now well beyond 1.9.0). Needs a premise re-derive before it is implementable — ledger work, not this cycle. |
| `rm-1437` as a code item | 78.0 | Premise rewritten this cycle; the correct action is the zero-code externally-revived closure, which rides this batch as a ledger rider instead. |
| `rm-878` branch-protection fill | 66.0 | Claimed by the unlanded cycle:3 batch lane (its batch doc is staged in that worktree). Double-claiming would collide at landing. |
| `rm-879` Fro Bot provision-or-disable | 64.0 | Operator decision owed (provision secrets vs disable + truth AGENTS.md). Not delegate-selectable; the triad state rider this cycle keeps the pressure current. |
| `rm-856` readback-tag derivation | 50.0 | Cure implemented-unlanded in two sibling lanes; re-implementing here would triple-land. |
| cve-tripwire derivation extension | — | MOOT, verified this cycle: the tripwire already parses the Dockerfile ARG for its pinned image (rm-779 derivation in-workflow), so there is no hardcoded readback tag left to fix there. |
| `rm-883` dependency refresh | 62* | Lockfile window held by unlanded lanes (one carries the dependency bump natively, another touches the lock directly); main still sits at react 19.3.0. Selecting it would manufacture a four-way lock conflict. |
| `rm-889` Fro Bot triad, `rm-147` license | high | Owner decisions owed (secret provisioning / workflow disable; license terms). Riders this cycle root-caused both; the decisions are not the delegate's to make. |
| `rm-139` / `rm-271` node 26 moves | — | Date-gated 2026-10-28 and LTS-gated (26.12.0 still lts:false; arm64 prebuilts absent at tag). |
| `rm-2055` main.yaml consolidation | — | Congestion unchanged: the markdown lane and the main.yaml lanes are all still unlanded. Remains next-cycle flagship. |
| `rm-2056` Monday-fire pre-arm | — | Fires had NOT happened at selection time (see fresh verification below) — nothing to adjudicate yet. |
| `rm-2060` absorb-verify (Bun-aware) | — | Double-claimed fog id (this run's research recorded both claimants); the adopting lane owns it. |
| `rm-252` absorb window / #648 Bun migration | — | Blocked on the Bun-aware gate re-derivation, which is the adopting lane's work. |

## Fresh verification behind this selection

- **Zero Actions runs today** at selection time (Sunday, 2026-10-18 ~22:4x UTC container clock;
  newest runs are the 2026-10-18T22:36Z green Main/CodeQL/visual/Scorecard checks of the latest
  landing). The Monday cron cluster (audit 03:37Z, base-drift 04:13Z, upstream-drift 05:17Z,
  canary 05:23Z, scorecard 06:27Z — all `* * 1`) fires the morning of 2026-10-19; the
  adjudication riders belong to the cycle AFTER those fires, not this one. The daily Fro Bot
  cron remains doomed until the secrets decision lands (triad rider of this run).
- **No mint collision.** Live main's ledger tops out at `rm-1485`; the fog band (rm-2004+,
  including the double-claimed rm-2060) is all unlanded sibling work. `rm-2061`/`rm-2062` are
  clear everywhere.
- **Both mints re-verified open ON LIVE MAIN (55aedc97), not just at base**: the four
  gateway-session suites there still carry zero `listenerStore` references, and the landed
  listener-store degradation / SSE-reader suites from the newest landing do not cover the
  coupled boot; the vendored time module there still has no type twin while all three consumers
  (launch, run-index, stream) still import it.
- **No sibling uncommitted tree claims either area.** Full worktree scan of every lane: none
  touches the coupled-boot suite area or the vendored-time twin.

## Implement expectations

- Red-first legs as written in the two defs; every leg fails with the coupling severed or the
  twin drifted, before the fix makes it green.
- Gates: targeted suites via the established app-factory request harness, the pretest/web-dist
  caveat honored per the targeted-vitest solution doc; full type check; lint across all
  surfaces; roadmap guards + census stay green (selection riders added by this phase keep the
  ledger coherent).
- New files only; no tracked-file edits beyond the ledger and this doc.

## Landing notes

- Base is 5 behind live main. The newest landing added adjacent-but-disjoint suites and a type
  twin for one consumer; our items do not overlap those files, but the integrate phase must
  rebase onto main's guard set (the render/integrity guard itself changed in that landing) and
  re-run the cohort tripwire with the then-newest batch-doc date.
- The rm-2060 double-claim reconciles by content at whichever claimant lands second; this run's
  ledger already records both semantics.
- Next-cycle leads (from this run's riders): Monday-fire adjudication after the 2026-10-19
  cluster; Fro Bot + license owner decisions; node-26 date-gate 2026-10-28; the dependency
  window unblocks when its carrying lanes land.

## Implement addendum (2026-10-19, cycle:2 implement 5c70d2a9)

Status: implement-complete in the stewardship worktree; nothing committed or pushed (topology
is Conductor's). Changed files vs base: `test/combined-mode-boot.test.ts` (new, rm-2061),
`public/operator-time.d.ts` + `test/operator-time-twin-guard.test.ts` (new, rm-2062),
`ROADMAP.md` (ledger: two status flips to `implemented … pending landing` with implement
riders, rm-1437 flipped `candidate → closed externally-revived` per its staged closure rider,
zero code). `public/operator-time.js` byte-stable; no src/, lockfile, or workflow edits.

Attempt forensics — this action burned six dispatches before this one (events/*.jsonl for the
run id): f6131719 (02:17Z, reaped), **b0a796df (04:57–05:22Z, 25 min — authored all three new
files, mtimes 05:09/05:15/05:17Z, reaped before any envelope)**, e817a968 (dead-letter, expired
lease), 84c16c29 / 86e256c7 / 9eb5e96f (short provider reaps, no output). This attempt adopted
the b0a796df tree unit ZERO-EDIT and re-verified every claim first-hand rather than redoing:
node_modules had been lost between attempts (cured `pnpm install --frozen-lockfile`, 14.4s).

Verification (all run this attempt, sequentially, in the stewardship worktree):

- `vitest run test/operator-time-twin-guard.test.ts test/combined-mode-boot.test.ts` → 12/12.
- Red-first, re-derived first-hand (mutations applied, observed red, reverted, re-greened):
  - A — store `insert` stubbed to discard writes (the def's literal "listenerStore stubbed
    out"): combined suite 4 red / 4 green — leg 1 (both tests incl. the severed control's
    store assertion) + leg 3's write-dependent pair; leg 2 correctly green.
  - B — `classifyRateLimitPath` misclassifies `/api/listener/messages` to `public` AND the
    server.ts ackCsrf ternary severed to null: 4 red / 4 green — leg 2 reds at the
    budget-independence assertion (healthz 429s with the flooded class), leg 3's csrf trio
    reds (503/unavailable instead of 200/invalid); leg 1 correctly green.
  - C — one twin declaration renamed: twin guard 2/4 red with the declared-vs-shipped
    deep-equal and the kind assertion firing; restored → 4/4.
  - After all reverts `git diff` on src/ and public/operator-time.js is empty; tree = exactly
    the change unit (M ROADMAP.md + three new files + this doc).
- Roadmap ledger: census 289 defs / 0 dups / max rm-2062; render/length/integrity guards and
  eslint ROADMAP.md green (see the implement riders for the per-def records).
