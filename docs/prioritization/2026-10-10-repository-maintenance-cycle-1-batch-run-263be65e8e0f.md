# Repository maintenance — cycle 1 run 263be65e8e0f (2026-10-10)

Phases: assess e8711b03 · research a5c3059b · roadmap 36462a57 · prioritize
fe2efcc6dd8f (this doc). Status: implement and later phases follow; nothing of
this run has landed. Authored at base d2b1acf with the roadmap phase's
uncommitted ledger extension (rm-912 mint + 6 riders + guard pin 866 → 912)
in-tree. NOTE recorded at selection: origin/main has since advanced to 843d081
(integrate of run 159ec0eba87d, batch rm-836/837 ci-freshness+lint) — the
selection below was re-checked against that delta and is file-disjoint from it;
the integrate union note in the roadmap extension #38 comment governs.

## Selected batch (prioritize fe2efcc6dd8f) — operator contract 1.9.0 questions window

**Theme:** adopt the fro-bot/agent PR-#1749 operator-contract 1.9.0 surface in
the consumer this fork already runs, ahead of the fleet's dated dashboard image
pin. Single-def batch — the surface is one seam and the deadline is real.

**Why now (strategic value, all first-hand this cycle):**
- Agent releases advanced v0.118.x → v0.119.0 (2026-10-09) → **v0.119.1
  (2026-10-10T11:08:26Z, latest)**; marcusrbrown/infra still pins dashboard
  image **2026.10.15** with **no gateway daemon bump** past the 2026-10-07/#1478
  era — a dated pin that will silently start shipping a 1.9.0-serving gateway
  the moment infra re-pins the daemon. The contract window exists precisely to
  absorb this skew; a 1.8.0-only dashboard behind a 1.9.0 gateway is the
  failure mode (research a5c3059b C1: "contract 1.9.0 is now a binding fleet
  deploy gate").
- Upstream dashboard is at OPERATOR_CONTRACT_VERSION '1.8.0' at tip 270820b
  with **zero open consumer PRs** (`gh pr list -R fro-bot/dashboard --state
  open` EMPTY) — the adoption window is uncontested; leading from this fork
  also feeds the rm-252 absorb decision (due 2026-10-13).
- The immediately preceding cycle landed the exact same class of work
  end-to-end (run 28cd8f6c, merge eee2667 in this tree's lineage: "complete
  operator contract 1.8.0 consumer, flip primary", batch rm-252/157) — the
  browser twin `public/operator-stream.js` is now 3272 lines, contract-aware,
  17 contractVersion/checkoutProvenance hits, window `['1.6.0','1.7.0','1.8.0']`
  in src/gateway/operator-contract/version.ts. rm-912 extends a proven seam,
  it does not pioneer one.

| Member | Why selected | Acceptance shape |
| --- | --- | --- |
| rm-912 (headliner, operator-experience p76) | Top selectable priority in the 79-item live pool (above it only non-selectables: rm-104 p98 upstream-generator-gated, rm-279 p96 cured-pathology stale score, rm-703 p76 landed-by-content residue via rm-691); deadline-forced by the 2026.10.15 image pin; uncontested upstream | Additive window entry '1.9.0' (rm-157's window mechanics); question frames + waiting_for_question parsed in the production twin; GET questions / POST decision client methods on the operator gateway proxy surface ONLY (read-only invariant absolute — an operator reply is not a GitHub App write); operator twins render question card/options/decision with <=8 questions / <=64 options surfaced as UI guards; 400 {error,reason,questionIndex} typed end-to-end; MAX_SSE_BUFFER_BYTES response-cap parity (rm-822's rule — rejections PROPAGATE); fixture-stream conformance replay (question frame → waiting_for_question → decision ack) in both twins; push notifications + audit events contract-version-gated (>=1.9.0 only, rm-157's deployed-gateway probe pattern); property-suite coverage for the new frame family (rm-144 partial) |

**Sizing (effort/risk):** L — same class as the landed 1.8.0 consumer batch.
Dependencies: refresh the `.slim/clonedeps` agent mirror off v0.78.0 BEFORE
implementing (rm-120's 2026-10-10 rider; the 1.9.0 handler surfaces are
documented only in the v0.119.x release stream) — read-only mirror prep, no
repo surface. No push/pr/ci needed to land (local commit gate; validation on
the supervisor-approved local route while the Actions outage holds).

**Wire-or-fold record (rm-253, per its acceptance "the decision recorded in
the cycle batch doc"):** the fold decision is DEFERRED AGAIN, deliberately —
a live sibling lane (dashboard-main-258bb638, run 7f03c505, prioritize
imminent, no claim yet) has minted rm-901 "SSE reader frame parse failures are
logged-and-continued" targeting `src/gateway/operator-sse-reader.ts` — the
exact file a fold would delete. Folding into this batch would create a hard
cross-lane collision (their fix lands on a file my batch removes). rm-912
therefore builds on the CURRENT architecture: production parser = the
contract-aware browser twin (post-eee2667), server reader stays as-is with
zero production callers (re-verified this session: only src/ ref is
operator-client.ts importing MAX_SSE_BUFFER_BYTES). The fold is sequenced for
the first cycle after rm-901's lane resolves. Pointer rider added on rm-253.

## Claimed-and-excluded (congestion audit)

Live fleet at selection (first-hand, campaign conductor.db scans +
`ps aux`): dashboard campaigns 05e5da53 (run 35704196 recoverable), 22d11f81
(run 6a54049e running, no mints/claims visible — early), **47e79832 (run
7f03c505 running, mints rm-900..903, NO selection yet)**, **258bb638 (run
91ddebf6 running, SELECTED rm-906/910/911 today)**, plus non-dashboard
agenttrace lanes. Claim scans across all 16 sibling worktrees + main-ledger
baseline (0 selected at HEAD d2b1acf).

- **rm-906 / rm-910 / rm-911 — live lane 91ddebf6's current batch** (claimed
  today): ROADMAP placement guard (doc-only), operator-server-fetch abort
  signals, impeccable CI pin. File-disjoint from rm-912's set
  (operator-contract/*, operator-client.ts, public/operator-stream.js,
  web/src/operator/*, fixtures, tests). Named seam adjacency only.
- **rm-900..903 — live lane 7f03c505's unselected mints** (no claim exists):
  rm-900 operator transport non-ok bodies is adjacent to operator-client.ts
  (same-file risk if selected); rm-901 sse-reader (drives the rm-253 deferral
  above); rm-902 snapshot-store sync write; rm-903 ROADMAP split. No claim to
  yield to; risk recorded.
- **rm-117 / rm-162 — committed-but-unintegrated lane** conductor/run-20cf2f7b
  (e184acc, "security visibility at flat API cost"): content in flight on its
  branch, not on main; do not re-implement.
- **rm-836 / rm-837 — just integrated** (origin/main 843d081, run 159ec0eba87d,
  ci-freshness + lint hygiene): now landed content, no longer congestion.
- **b3ae50bf** — in-flight per assess at d2b1acf, but NO committed content
  locatable (`git log --all --grep b3ae50bf` empty, no worktree): treated as
  unclaimed; noted for the integrate union.
- **rm-804 — dead-lane unlanded mint of this same subject** (run 8dd690c8
  cycle:2, never selected, worktree still carries the def): reconciles by
  content at integrate; rm-912's def-line carries the lineage note.
- **rm-249 (p72) + rm-163 (p54) push family — runner-up pair, deferred:** the
  push-only service worker is high operator value but 1.9.0's
  push-notification bullet is contract-gated and lands the subscription
  surface in the SAME web/ seam this batch touches; sequencing it after the
  window lands avoids two batches colliding in web/src/operator/*.
- **rm-194 (p50) approvals aging, rm-656 (p61)/rm-657 (p59) run-URL/probe,
  rm-655 (p56)/rm-629 (p58) operator-experience, rm-144 (p54, partially):**
  lower value or different seams; rm-144 gets expected partial coverage inside
  this batch's property-suite acceptance (stays open).
- **rm-116 (p56) branch-protection fill:** sequenced behind Main-job greens —
  frozen by the Actions outage (newest run 37872407109 @2026-10-09T01:59:31Z,
  re-probed today), non-selectable now.
- **rm-860 / rm-832 / rm-659 blocked-external, rm-104 upstream-gated,
  rm-279 / rm-703 stale/residue:** non-selectable by trap map and status.
- **rm-205 zlib doc truthing (docs-only):** real but tiny; not implement-batch
  material for this seam-focused cycle — candidate for a docs-only slot next
  cycle per its 2026-10-10 rider.

## Selection risk

1. Cross-lane seam adjacency: 7f03c505 (live, unselected) may claim rm-900
   (operator-client.ts) — same file as rm-912's questions/decision client
   methods. Mitigation: implement scoped to additive client methods; any
   conflict reconciles by content at integrate (house rule).
2. The 1.8.0 precedent's review history (3b6cf864 caught a fabricated
   parser-layer claim) — rm-912's acceptance evidence must be first-hand
   probes only; fixture-stream replays must exist on the tree before they are
   claimed (the falsified-fixtures lesson).
3. Deadline pressure must not break the additive-window discipline: '1.8.0'
   stays served until a deployed-gateway probe proves the flip (rm-157's
   durability rule); no shape breaks to 1.6.0/1.7.0 frames.
4. Read-only invariant: the decision POST is the operator's own reply through
   the gateway proxy — zero GitHub App permission surface changes.

## Verification

- Selection recorded: rm-912 def-line flipped to
  `status: open (selected 2026-10-10, run 263be65e8e0f cycle:1 prioritize
  fe2efcc6dd8f4f02b644635859ce5384, 'operator contract 1.9.0 questions
  window')` with a selection rider carrying the displaced parenthetical
  verbatim; pointer rider on rm-253 (fold deferral + collision reason).
- Census after selection: 258 defs / 0 dups / max rm-912 (defs unchanged);
  status moves candidate 73 → 72, open 2 → 3 — the only ledger mutations.
- Guards: roadmap-integrity + roadmap-length green; eslint clean on
  ROADMAP.md and this doc; census script re-run.
