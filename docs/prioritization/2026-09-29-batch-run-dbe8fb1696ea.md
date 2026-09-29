---
date: '2026-09-29'
topic: 'dashboard maintenance batch — scoring and selection (post-38afd90, ledger rm-265..268 minted this run)'
mode: 'delegated-conductor'
run: 'dbe8fb1696ea4062a9dd58adc8e9ca7e'
phase: 'prioritize'
attempt: 'a384c20f8c6b4d02b4f944aec09af884'
skill: 'ce-plan (scoring/batch selection — no dedicated ce-prioritize skill in the installed router; fleet precedent uses ce-plan identically). Deviations declared: no subagent surface in this session, frames run in-process and disclosed. Label disclosure: the engine cycle label is 1; the repo lineage has consumed cycles 1-17 plus the 2026-09-29 bounded-poll batch (run 262f170c), so this artifact is named by date+run, not a lineage number.'
---

# Dashboard maintenance batch (2026-09-29, run dbe8fb1696ea)

## Live frame facts (re-measured this run, not carried stale)

- Fork tip `38afd90` (cycle-18 batch `ea579c7` landed since the prior assess base `d89ffe7`). Worktree carries exactly ONE deliberate uncommitted change: ROADMAP.md (+31/-5, this run's roadmap phase minting rm-265..rm-268 above the all-lineage max; census 143 ids / 0 dups / max rm-268; targeted `npx eslint ROADMAP.md` RC=0).
- Gates at tip, verified this run (assess phase): server tsc RC=0 and web tsc RC=0 (both with NODE_OPTIONS=--max-old-space-size=6144), targeted vitest 234/234 server (aggregator + operator-sse-reader + transport-timeout-contract) and 9/9 web Monitoring, after pnpm install + `vite build web` in the fresh worktree.
- Fresh adversarial findings, all minted: F1/F2 — CRLF split across read chunks forges a phantom record boundary and the frame is dropped with NO onError, in BOTH readers (`src/gateway/operator-sse-reader.ts:532` and the production twin `public/operator-stream.js:2489`); PROVED LIVE (`/tmp/d060ece7-sse-cr-split.mjs` driving `createOperatorSseReader`: single-chunk control `[ready,status]`, mid-payload split `[ready,status]`, CR-boundary split `[ready]` with errors=none), contradicting the suite header's own "Partial-chunk reassembly" contract (test/operator-sse-reader.test.ts:12). F3 — App.tsx keeps a third hand-rolled poll copy (stale "mirrors Listener.tsx" comment, lost unmount abort, hidden-tab divergence). F4 — /static operator assets (~150KB unversioned JS, consumer web/src/views/Operator.tsx) have zero client-caching policy while the SW is a self-purging kill-switch. F5 — useBoundedPoll freezes config at mount. CORRECTION OF RECORD: the assess claim "security-header test gap still open" is FALSE (19 CSP assertions in test/static-assets.test.ts + 13 in test/server.test.ts; corroborates rm-258's refutation) — nothing was minted on it.
- Research dated signals this run: NO new fro-bot/agent tag (v0.117.0 still latest); upstream dashboard main `f4a1aeb` = dep bumps already inside rm-252's rider set, wiki-write divergence persists (rm-259 stands); typescript-eslint 8.70.1→8.71.0 with the typescript peer UNCHANGED `<6.1.0` (TS 7.0.2 hard-blocked; vitest 5.0.2 deferred per rm-133's 2026-10-21 re-eval); pnpm GitHub-releases 12.8.1 vs npm-latest 12.6.0 (measurement split recorded at rm-140); GitHub's 2026-09-25 Actions-API count capping reviewed-and-NOT-EXPOSED (GraphQL typed-Int totalCount at aggregator.ts:213-236).
- Standing next-cycle block unchanged: gateway contract forward-support (rm-252, P80) + the rm-253 wire-or-fold decision + rm-254 runbook facts — the dashboard pins contract 1.6.0 and fail-closes on mismatch (operator-sse-reader.ts:494), so any gateway deployment past v0.114.1 bricks the operator view until re-pin + parser work.

## Five-axis scoring (1–5; Effort 5 = cheapest; Dep-free 5 = no external landing dependency)

| Ref | Impact | Delay | Effort | Dep-free | Strategic | Total | Standing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| rm-265 SSE CRLF chunk-boundary fix, both parsers | 5 | 5 | 4 | 5 | 4 | 23 | SELECTED B1 (anchor) |
| rm-267 App.tsx poll migration + hidden-tab decision | 3 | 4 | 4 | 5 | 4 | 20 | SELECTED B2 |
| rm-266 /static caching policy + assertions | 3 | 3 | 4 | 5 | 2 | 17 | SELECTED B3 |
| rm-268 stale `public/static/` doc citations | 2 | 3 | 5 | 5 | 2 | 17 | SELECTED R1 (rider) |
| rm-149 OAuth PKCE (S256) | 4 | 4 | 2 | 5 | 4 | 19 | DEFER (anchor-grade standalone; distinct auth surface doubles the batch's blast radius — named next-cycle anchor candidate) |
| rm-252 gateway 1.7.0/1.8.0 + v0.117.0 absorb riders | 5 | 4 | 2 | 3 | 5 | 19 | DEFER (unchanged: mirror re-pin + additive parsing + deployment coupling + rm-253 decision; B1's dual-landing keeps the parser seam correct regardless of wire-or-fold) |
| rm-253 operator-sse-reader wire-or-fold | 4 | 3 | 2 | 5 | 4 | 18 | DEFER (decision item; B1 lands the fix on BOTH sides so the decision stays neutral) |
| rm-162 per-cycle GitHub API budget | 4 | 3 | 2 | 5 | 3 | 17 | DEFER (touches the client surfaces rm-252's absorb reshapes — sequencing avoids double-churn) |
| rm-257 web/** lint coverage | 3 | 3 | 2 | 5 | 3 | 16 | DEFER (unknown finding blast-radius; sized as its own batch) |
| rm-260 logger stdout sink | 2 | 3 | 3 | 5 | 2 | 15 | DEFER (decision-first, standalone) |
| rm-104 render hardening (98.0) | 4 | 3 | 3 | 1 | 3 | 14 | DEFER (external generator) |
| rm-102 dependabot first-PR proof (90.0) | 3 | 2 | 3 | 1 | 3 | 12 | DEFER (external clock) |
| rm-103 absorb cadence gate (85.0) | 3 | 2 | 2 | 4 | 3 | 14 | DEFER (absorb is next cycle's) |
| rm-116 branch protection / rm-146 automerge | 4 | 4 | 3 | 2 | 4 | 17 | DEFER (ops/admin stewardship) |
| rm-127 gateway redirect + rm-129 topology | 3 | 3 | 3 | 5 | 3 | 17 | DEFER (auth-adjacent, dedicated test design) |
| rm-144 browser-parser property half (50.0) | 3 | 3 | 3 | 5 | 3 | 17 | DEFER (folds into the rm-252/rm-253 consolidation) |
| rm-107 monitoring consumer / rm-119 gate roll-up | 3 | 3 | 2 | 5 | 4 | 17 | DEFER (feature track, joint design) |
| rm-141 / rm-139 Node 26 / rm-140 pnpm 12 / rm-187 / rm-200 residuals | 2-3 | 2-3 | 3-4 | 3-5 | 2-3 | ≤16 | DEFER (window- or decision-gated) |

Selection rule applied: the fleet's proven shape — one medium anchor + mechanical riders, every unit locally verifiable with zero external dependency and zero file overlap with the anchor's hot paths. rm-265 dominates: silent data loss in the PRODUCTION parser (the browser twin is what the operator view actually runs), live-proved with a three-feed repro, cheapest credible fix (carry pending-CR state / defer normalization until after boundary search — a small state machine, pattern-classic), and its tests land in suites that already exist on both sides (test/operator-sse-reader.test.ts + the public/operator-stream.js suite + the rm-114 property suite). It also rides rm-253's wire-or-fold decision NEUTRALLY: the fix is dual-landed now, so folding the twin later deletes already-correct code instead of leaving a known bug in a dead file. rm-149 loses only on coherence, not merit — PKCE is the next standalone anchor. rm-252 keeps its standing as the next major cycle's anchor for exactly the reasons the 2026-09-29 (262f170c) scoring recorded.

## Selected batch — "SSE seam truth + client hardening" (4 units, one landing)

Anchor hot paths: `src/gateway/operator-sse-reader.ts`, `public/operator-stream.js`, `test/operator-sse-reader.test.ts`, the operator-stream suite, the rm-114 property suite. Riders touch disjoint files (web/src/App.tsx + hooks; src/server.ts + test/static-assets.test.ts; docs). Drop order if the cycle runs short: R1 → B3 → B2 (anchor last-dropped).

### B1. CRLF chunk-boundary fix in BOTH SSE readers (rm-265, anchor)

The defect: both readers run their CRLF normalization per chunk (`normalizeCrlf` at operator-sse-reader.ts:532 and the identical seam at operator-stream.js:2489), so a read() chunk ending `\r` followed by a chunk starting `\n` becomes `\n` + `\n` — two truncated records, both failing parseSseFrame, frame dropped with NO onError. The rm-114 property suite generates whole-record chunkings, never chunk-boundary splits, so the gate is green with the gap.

- work: carry pending-CR state across chunks (hold a trailing `\r` back until the next chunk arrives) or defer normalization until after boundary search — applied identically in `src/gateway/operator-sse-reader.ts` and `public/operator-stream.js`; no consolidation (rm-253's decision is NOT taken here).
- acceptance: regression tests in BOTH suites splitting a CRLF frame exactly at the CR and exactly at the LF; the rm-114 property suite gains a chunk-boundary-split generator case; LF-only streams keep byte-identical behavior (no new record emission); the three-feed repro (control / mid-payload split / CR-boundary split → `[ready,status]` / `[ready,status]` / `[ready,status]` with errors=none) ported into test/operator-sse-reader.test.ts as a named case.
- evidence: both suites green; property suite green; repro ported; no change to record parsing for whole-chunk feeds.

### B2. Migrate App.tsx's poll onto useBoundedPoll; decide hidden-tab semantics once (rm-267)

- work: replace web/src/App.tsx:92-127's hand-rolled lifecycle with the shared hook; delete the stale "mirrors Listener.tsx" comment; encode the hidden-tab decision as a hook option (`pauseWhenHidden`) or document its deliberate absence; pin the config-frozen-at-mount contract (reactive config or doc comment + config-change test per the item's acceptance).
- acceptance: the only poll lifecycle under web/src is useBoundedPoll's (grep-verified); App.test.tsx + Monitoring/Listener suites green; the hidden-tab decision recorded in this batch doc's landing notes.
- evidence: grep over web/src for hand-rolled setInterval+AbortController poll copies returns the hook alone.

### B3. /static operator assets: explicit caching policy (rm-266)

- work: choose and land `no-cache` + ETag revalidation for `/static/*` (src/server.ts:955-975) — hashed filenames+immutable rejected this cycle because they require an Operator.tsx loader change and the files are the unhashable operator twins; add Cache-Control/ETag assertions to test/static-assets.test.ts.
- acceptance: an explicit recorded policy (the chosen header set) pinned by static-assets assertions so it cannot silently regress; no change to the SPA-shell (rm-172) or SW kill-switch behavior.
- evidence: curl -I on /static/operator-stream.js shows the chosen headers in the ephemeral-PR validation; static-assets suite green.

### R1. Fix the stale `public/static/operator-stream.js` citations (rm-268, rider)

- work: correct ROADMAP.md:361-362 and docs/ideation/2026-09-22-repository-extensions-research.md:97 to the real path (`public/operator-stream.js`, served at /static/ by src/server.ts:963).
- acceptance: repo-wide `grep -rn "public/static" ROADMAP.md docs/` returns zero hits; no code change.
- evidence: the grep output; ROADMAP eslint still RC=0.

## Landing notes (filled 2026-09-29, run dbe8fb1696ea implement 8951609c — all four units landed, pending integrate/commit)

- Hidden-tab decision (B2): **`pauseWhenHidden: false` default = old App.tsx parity** — hidden tabs keep polling (read-only unread-count polling is cheap and matches the pre-batch behavior users saw), and returning to visible triggers one immediate fresh poll. `true` opts a view into pause-on-hidden (Monitoring/Listener keep their landed rm-251 wiring unchanged).
- Caching policy (B3): **`Cache-Control: no-cache` + strong `ETag` (sha256 of the served file) + 304 on `If-None-Match`** via the new `operatorRuntimeCaching` middleware on all three `/static` runtime-JS mounts. Hashed-immutable was declined: the operator runtime files are unversioned URL paths, so a content-hash policy requires a loader/rollout change (a different work unit), while no-cache+ETag gives correct revalidation semantics at the existing URLs with zero rollout risk.
- B1 repro provenance: the CR-split scratch script (`/tmp/d060ece7-sse-cr-split.mjs`) survived and its exact fixtures were ported into the reader suite as deterministic cases — pre-fix red (`[ready]` vs `[ready, status]`, errors=none), post-fix green. Property placement: the chunking-invariance property lives in `test/operator-sse-reader.test.ts` (where the fake-fetch loop harness lives) and mirrors a seam-level fold-vs-whole property in the twin suite via the exported `appendStreamChunk` — `test/sse-parser.property.test.ts` was left untouched because it properties the pure parser, which has no chunk seam.
- Buffer accounting note (B1): both loops now re-measure `bufferBytes = encoder.encode(buffer).length` per append instead of incrementally adding chunk bytes — the pending-CR hold makes incremental accounting subtly wrong at the junction, and the re-measure is exact and bounded by the cap.
