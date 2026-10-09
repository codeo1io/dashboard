# Dashboard roadmap prioritization — 2026-10-09, repository-maintenance cycle:2 batch (conductor run e8c99e0ef7914724b2963f83188d2cee)

Worktree base `559642a` (porcelain at phase start = exactly the roadmap-phase deliverable pair
`ROADMAP.md` + `test/roadmap-integrity-guard.test.ts`; census 238 defs / 0 dups / max rm-784
re-derived first-hand this run). Main has since advanced to `7055c52` (integrate of run c026a644
/ PR #444, merged 2026-10-08) — selection markers describe THIS tree per house convention; the
integrate phase reconciles. Run lineage: assess `d60e86d0` → research `c2150417` → roadmap
`d5a96c57` (mint rm-784 + 8 riders + ext comment, pin 744→784) → **prioritize `fffb656f` (this
selection)**. Skill routing: no ce-* skill installed in this harness (standing finding since the
research phase); native inspection only.

In-tree ledger at selection: `node scripts/roadmap-census.ts` → 238 defs / 0 dups / max rm-784
healthy (candidate 72 / open 2 pre-selection). This phase mutates the ledger ONLY by selection
markers (3 def-lines candidate→open, first token parseable) + 3 selection riders; census totals
and the guard pin are untouched by construction (post-selection census re-derived below).

## Implementation-space congestion audit (first-hand, 2026-10-09)

Every probe live this phase, not inherited: `gh pr list -R codeo1io/dashboard --state open` = 3
(#444 later observed MERGED into `7055c52`; open now #447 run 788aa489, #448 run 9289efaa);
per-worktree def-line ceiling scan across all 20 sibling worktrees (max rm-783 @ ab16a466a77c);
selection-rider scan for rm-501/rm-485/rm-784 across every active lane (ab16a466, 32f33f1b,
cbe70604, 788aa489, c37a8576, 13de8662, 392bad29, 4fcdb776, 89ebbf49, 9fd8bcad, f266ce30,
5bd710d8, e328be89) = ZERO claims; file-overlap check against #447 (package.json, pnpm-lock.yaml,
src/github/snapshot-store.ts, test/github/snapshot-store.test.ts, workflows audit/lockfile-guard/visual)
and #448 (docs/, src/gateway/operator-contract/*, test twins, cve-tripwire.yaml) = none touch
`web/src/App.tsx`, `web/src/api/listener.ts`, or `public/operator-launch.js`.

Claimed-and-excluded (do NOT re-select): cve-tripwire NODE_IMAGE reconciliation = rm-779
(cbe70604, candidate) with 32f33f1b's selected cycle:2 batch 'pre-Monday tripwire parity'
(rm-781) implementing it now; action re-pins = rm-558 census tradition + rm-782 guard (ab16a466);
snapshot read-before-bound + node:fs spyOn = PR #447; operator-contract 1.8.0 twin = PR #448;
rm-780 (Monitoring red-filter staleness) = cbe70604 selected. Strategically deferred, not
excluded forever: rm-108 majors (typescript 7 / vitest 5 / vite-plugin-pwa 2 — too big for this
cycle, config-compatibility proofs first), rm-139 node window (dates 2026-10-20/28 — acting
before the maintenance flip would strand the decision data), rm-102 dependabot enablement
(settings-level, outside repo scope — folded into that def's acceptance per this run's rider).

## Batch selected for this cycle (implement-phase scope): 'client network-bound truth'

Theme: every client/operator network call is bounded and routes failures fail-closed. This run's
assess produced the first-hand inventory (App.tsx:157-170 re-probe as the only unbounded client
fetch, push/subscribe + listener acks already bounded as the house pattern), and the three units
below close the remaining three unbounded/stale-path surfaces in the same truth class. All three
are pure client code, testable in the existing fake-timer/jsdom seams, with zero API, schema, or
workflow coupling — a batch that can be implemented, reviewed, and validated end-to-end this
cycle.

- **U1 `rm-784` (reliability, priority 40.0) — App.tsx focus re-probe bound.** This run's own
  mint, selected at first eligibility. `reprobeSessionOnFocus` fires
  `fetch('/api/session-probe')` with no signal/timeout while every other client path is bounded
  (`AbortSignal.timeout(10_000)` in push/subscribe, `withAckTimeout` in listener). Acceptance:
  bound the call (house 10 s or tighter), route abort into the existing fail-closed expiry
  handler (single-shot-per-focus disposition stands per the 530bd1a9 compound aee65ca6 rider),
  fake-timer test proves the abort path. Impact: kills the last indefinite-promise path in the
  authenticated operator UI. Risk: minimal; Effort: small.
- **U2 `rm-501` (operator-experience, priority 44.0) — unbounded operator client fetches.**
  Acknowledge/clear-all, logout chain, GET /messages, run-page transitions are unbounded and
  raced against `document.visibilityState` teardown. Acceptance: every operator fetch carries a
  timeout; fetch handles dispose on unload/visibilitychange; the logout chain is idempotent.
  Impact: eliminates the wedge-mode stale-state class across the operator surface; Effort:
  medium (several call sites, one shared helper); Risk: low (behavioral no-op on the happy path).
- **U3 `rm-485` (reliability, priority 32.0) — launchRun stale-CSRF refresh-and-retry.**
  `rm-130` landed refresh-then-resend for methods that retry; `launchRun` never received it, and
  the vanilla-JS port (public/operator-launch.js, landed ad8f21e) inherits the gap. Acceptance:
  403 on launch triggers ONE CSRF refresh + retry then a surfaced failure; tests cover the retry
  path, the double-failure path, and no-retry-on-other-errors. Impact: completes the CSRF
  discipline across the whole operator surface on the freshest-landed code; Effort: small-medium.

Priority arithmetic: the batch takes the three highest-priority UNCLAIMED client-truth defs
(44.0 / 40.0 / 32.0) — the only pool items above them are sibling-owned or strategically
deferred as audited above. Dependencies: none beyond the landed port; U1 and U3 are independent,
U2 may share the bound-fetch helper U1 introduces (sequencing note for implement, not a blocker).

## Selection mechanics

Def-line status flips candidate→open on rm-784/:2026, rm-501/:1576, rm-485/:1618 with this doc's
path in the marker; one selection rider per def block. Post-selection census (re-derived
first-hand this phase): 238 defs / 0 dups / max rm-784, healthy — statuses now open 5 /
candidate 69; guard pin 784 untouched. No vitest run at prioritize; the implement phase owns
test execution.
