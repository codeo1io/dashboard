# Repository maintenance cycle 2 — implementation batch (run 33ede5dafe0044408cb35318e54ae9bf)

- selected: 2026-10-10, prioritize attempt 07fe7e16fb944927b020054bb83a12b0
- batch name: contract-readiness observability micro-batch
- base: cb4da55 (worktree); origin/main had advanced to e6b6a94 — integrate unions by chronological order

## Inputs

- assess 5cfdeb1c (fresh adversarial whole-repo review; battery green; one fresh LOW oauth.ts finding; dedupe map for the built-unlanded sibling set)
- research b001b0ae (4 ranked survivors; upstream window re-measured delta-29; contract 1.9.0 released in agent v0.119.0, verified first-hand by tag clone)
- roadmap dc8e1756 (mints rm-870/871/872 + six dated riders incl. the rm-157/rm-252 1.9.0 INTERLOCK; delivered report-only as spool patch)

## Selection floor

Selected ids carry concrete implementation scope, offline-verifiable acceptance (fixture tests; targeted auth tests), and no dependency on dark CI surfaces. rm-870 is the cycle's top-priority fresh mint (68.0) and directly feeds the rm-252 absorb decision due 2026-10-13 (the observed-version instrument is the deploy-truth input that decision lacks). rm-872 (29.0) rides the same landing at trivial cost.

## Claimed and excluded (congestion audit)

| candidate | disposition | owner / reason |
|---|---|---|
| rm-870 observed-contract-version instrument | SELECTED | this run, cycle:2; verified unbuilt fleet-wide (only ledger text mentions it) |
| rm-872 oauth.ts User-Agent symmetry | SELECTED | this run, cycle:2; verified no unlanded implement patch adds the header |
| rm-871 machine-classified upstream digest | DEFERRED | workflow-touching while Actions run-creation is dark (local-mirror validation burden); maintainability 62.0 but Medium effort |
| 1.9.0 window extension + agent pin v0.119.0 (rm-157/rm-252 interlock; rm-850 claim) | EXCLUDED — built unlanded | lane cb6061a358f2 (repository-maintenance cycle:3, same campaign) implemented window widen + waiting_for_question vendoring + pin bump as implement-cb6061a358f2-0805faf1.patch (1251 lines, 19 files, tree restored pristine); adopt by content at integrate, never rebuild |
| rm-874/875/876 (CSP stale, operator-copy orphan, OAuth empty-credentials fail-fast) | EXCLUDED — foreign lane | minted by run 4c0ec7a5 roadmap fe481375 (report-only, unlanded); its lane owns the implementation |
| rm-865 snapshot inner-fields, rm-866/867 stream-closed, rm-868 walkers, rm-187 listener hardening, rm-842 deps bump | EXCLUDED — built unlanded | sibling spool carriers (0979098f, 461586feaf7d, b0ad7444 et al.); adopt by content at integrate per landed riders |
| monitoring view render (driftCount/enumerationIncomplete) | EXCLUDED — decision-gated | rm-107/rm-199, regression-guarded by web/src/App.test.tsx:73-85 |
| rm-102/139/140/108 ecosystem riders | rider-only | dated signals landed this cycle; no implementation scope |
| rm-252 absorb decision | decision work, not implementation | due 2026-10-13; this batch FEEDS it (rm-870), does not preempt it |

## Selection risk

- public/operator-stream.js is the fleet's hottest file — FIVE unlanded spool carriers (implement-08a0abac9453, implement-386aafb1395f, implement-8134eb2e6b13, implement-cb6061a358f2, implement-e5b718478274) touch it. Mitigation: rm-870's required scope is SERVER-side only; the optional DOM append is gated on per-carrier hunk inspection and additive-only edits (recorded in the rm-870 selection rider).
- Claim space verified clean at selection time: zero 'status: open (selected' defs across all sibling worktrees, HEAD, and origin/main (e6b6a94); zero open-PR file overlap on oauth.ts / operator-sse-reader.ts / operator-stream.js / operator-contract/version.ts (15 open PRs diffed by name).
- Status flips live on unlanded-mint defs (rm-870/871/872 are in the roadmap spool patch, not on main): the prioritize delivery composes roadmap patch + flips + this doc into ONE apply-ready patch; if a sibling lands first, integrate re-anchors by content.

## Verification

- def-line flips: `status: open (selected 2026-10-10, run 33ede5dafe0044408cb35318e54ae9bf cycle:2 prioritize 07fe7e16fb944927b020054bb83a12b0, 'contract-readiness observability micro-batch')` on rm-870 and rm-872 (first parseable status token = open)
- selection riders at both def blocks' last content lines
- battery on the staged tree: census 251 defs / 0 dups / max rm-872; roadmap guards 9/9; pnpm lint 0 errors / 10 warnings (baseline)
- delivery report-only: composed patch at delegate/prioritize-07fe7e16fb944927b020054bb83a12b0.patch supersedes roadmap-dc8e1756 (contains it); worktree restored porcelain 0

## Implementation (2026-10-10, implement db7a91f22e254c4f95de5dc597aab31e)

Starting state: the prior attempt ebfa16cb2f0f45fe975162002485938b (provider reap, typed artifact absent, heartbeats-only event log) had already applied the prioritize delivery in-tree — verified before any authoring by `git apply --reverse --check` of delegate/prioritize-07fe7e16fb944927b020054bb83a12b0.patch against the dirty tree (clean, so the dirt was exactly the batch input, nothing else). Implementation authored on top; node_modules had been swept and was restored first with `corepack pnpm install --frozen-lockfile`.

### Changed files (this phase's delta)

| file | change |
|---|---|
| src/gateway/operator-sse-reader.ts | rm-870: new exported `OperatorStreamStatus` interface + optional `SseReaderOpenOptions.onStreamStatus` receiver; the ready-frame gate now (b) logs `sse-reader: stream ready` with route + observedContractVersion at stream start, (a) hands the observed value to the stream-status consumer, and the mismatch error log carries observedContractVersion (what proves which side drifted) — onError message strings unchanged, no-oracle preserved |
| src/auth/oauth.ts | rm-872: `fetchGitHubUserLogin` now sends `'User-Agent': 'fro-bot-dashboard'` symmetric with the sibling token-exchange call; comment records the live 403-without-UA verification (2026-10-10: 403 without UA vs 200 with UA on /user) |
| test/operator-sse-reader.test.ts | 4 new tests in a dedicated rm-870 describe: surfaced value at matching 1.6.0 and at window edge 1.8.0 (payload + log field both pinned), drift (mismatch log carries observed version, onError message stays fixed, no payload), and runId never surfaces in instrument logs |
| test/auth.test.ts | 1 new test in a new `fetchGitHubUserLogin` describe: stubs globalThis.fetch and asserts the full /user header set including user-agent |
| ROADMAP.md | def-line flips rm-870 + rm-872 open-selected -> `implemented 2026-10-10 (… implement db7a91f22e254c4f95de5dc597aab31e, pending landing — …)` with the selection text preserved as prior; new implement rider under rm-870 recording the carrier-inspection adjudication and the unreachable live observation |
| this doc | this section |

Not touched: public/operator-stream.js + operator-launch.js + operator-run-index.js (the DOM append deferred — three of five unlanded carriers overlap the append regions: 31a7ab3c init/initOperatorStream + parser regions, cb6061a358f2 parser + init + PINNED_CONTRACT_VERSION, e5b718478274 stream + launch + run-index AND the server reader itself; c1df55e7 exists but is 0 bytes; 8134eb2e6b13 touches operator-stream.js only at renderApprovalPrompt :1610; 386aafb1395f's reader hunks sit on the buffer loop, not the gate block this instrument edits — full adjudication in the rm-870 implement rider). src/server.ts untouched — the isPublicPath allowlist is unchanged, the observed value never reaches a public path.

### How to verify

- focused battery: `corepack pnpm exec vitest run test/operator-sse-reader.test.ts test/auth.test.ts` -> 2 files / 220 tests green (reader 151 incl. the 4 new; auth 69 incl. the 1 new)
- new tests in isolation: `… vitest run test/operator-sse-reader.test.ts -t 'rm-870'` -> 4 passed; `… vitest run test/auth.test.ts -t 'rm-872'` -> 1 passed
- `corepack pnpm run check-types` -> rc 0 (server + web + .opencode tsconfigs)
- `corepack pnpm exec eslint src/gateway/operator-sse-reader.ts src/auth/oauth.ts test/operator-sse-reader.test.ts test/auth.test.ts` -> clean
- census + roadmap guards + full lint on the final tree: see the implement PhaseResult evidence
- deliverable chain: delegate/implement-33ede5dafe0044408cb35318e54ae9bf-db7a91f22e254c4f95de5dc597aab31e.patch applies at cb4da55 AFTER delegate/prioritize-07fe7e16fb944927b020054bb83a12b0.patch and reproduces this tree byte-identically (chain-proof below)

### Live-observation honesty note

rm-870's evidence list names one live stream observation against the dev gateway. That surface is proxied to fro-bot/agent and reachable only with the marcusrbrown/infra checkout (docs/runbooks/gateway-access.md); no infra checkout exists under /work/projects, so this delegate cannot produce the observation. The fixture tests + the structured log field are the recorded evidence; the live observation moves to the landing batch's ops follow-up (recorded in the rm-870 implement rider, not fabricated here).
