# 2026-10-19 · repository-maintenance cycle:1 · batch selection · run eb13ca8ab27c4ec99bb052b038f4fe86

Base: 5ab50da0 (7 behind origin/main 55aedc97 — main authoritative for evidence, base binding for implementability).
Inputs: assess 21617b944e98453481bcd0bd0687c5a7, research 22f961790c3549b58c2a3c4ec72c800c + sibling e29d7c5014864af88cf905a6ea5068d8, roadmap delta e229fa6ebd624334afcea24fdc62113c (+13/-0 riders-only, this tree).

## Method

1. Census: 285 defs at this base — 271 implemented / 13 in_progress / 1 verified → unresolved pool ranked by the file's own priorities.
2. Sibling pass-over probe (the double-implementation guard): content-level greps of every dirty `run-*` lane across the parent worktree fleet for each candidate surface (not just filename dirt — content diffs, hunk regions, and untracked files).
3. Base-completeness filter: every candidate's surface must exist at THIS worktree's base 5ab50da0 (7 commits behind main; src/pools.ts, .github/workflows/llm-maintenance.yaml, and 12 of rm-863's 15 cast sites exist only at main).
4. Congestion filter: single-line/hunk overlap against sibling lanes disqualifies (landing is first-landed-wins by content; duplicate hunks waste integrate bandwidth).
5. Residual ranking by impact / risk / effort / dependencies / strategic value; batch must be completable end-to-end this cycle with the full local battery (pnpm check-types, pnpm lint, pnpm test, actionlint for workflow edits).

## Selected batch

**Theme: verified-unclaimed tree hygiene — complete the egress API-version header, tighten env parsing, cure the live base-digest red. Three disjoint base-complete surfaces; zero sibling content collisions.**

### Anchor: rm-855 (security 22.0) — `X-GitHub-Api-Version` on every egress path

- Impact: real security/reliability hygiene — API-version pinning at Octokit construction makes deprecated-shape responses visible instead of silently parsed; closes a tracked low-tail security def.
- Surfaces at base (all verified by grep): `src/github/app-client.ts:21` + `:40` (App installation client construction), `src/github/aggregator.ts:82` (GraphQL client), `src/routes/auth.ts:49` (operator OAuth client). `src/auth/oauth.ts:143` already sends it (def's ":130" is line drift).
- Collision check: aggregator.ts:82 is disjoint from run-743f2e47's hunks (@@ -28/-129/-220/-346); no sibling lane touches app-client.ts, auth.ts, or oauth.ts.
- Effort: small (3-4 construction-site edits + assertions). Risk: low (header-only). Acceptance: header present on every egress path, full battery green.

### Rider A: rm-852 (maintainability 24.0) — `DASHBOARD_PORT` decimal-only parse

- Impact: house-convention consistency (`^\d+$` like the neighboring numeric envs) — `0x10`/`1e2`/spaced spellings currently bind surprise ports.
- Surface at base: `src/server.ts:1652` (`env.DASHBOARD_PORT?.trim()` in readServerBindConfig; def's ":1559" is main drift).
- Collision check: sibling src/server.ts lanes hunk at @@ -1279 (26b6e1ab) and @@ -19/-54/-1484/-1584/-1696 (743f2e47) — none inside the parse block.
- Effort: trivial + spellings test (`0x10`, `1e2`, ` 3000 `, `03000`, valid range). Risk: low; behavior change is fail-loud on previously-accepted garbage.

### Rider B: rm-648 leg (reliability / standing-red cure) — Dockerfile base-digest refresh

- Impact: cures the ONLY standing Main-reachable red — base-drift tripwire armed red since 2026-10-19 09:44Z (main digest 7f486cab vs live a5f4366e re-derived 2026-10-18).
- Surface at base: `Dockerfile:16` (`node:24-trixie-slim@sha256:7f486cab…` — verified present at this base).
- Collision check: 2 lanes dirty Dockerfile — run-475b46bc carries an older-shape stale diff (173f1258→7f486cab against its own older base; byte-different from, and superseded by, the needed change), run-0790be13 adds unrelated NODE_IMAGE lines at :18. Digest value must be re-derived LIVE at implement (drifts ~weekly; re-derive via the tripwire's own derivation command and record the output).
- Effort: trivial (1 line). Risk: low.

## Pass-over ledger (evidence-based, do not select this cycle)

| Candidate | Verdict | Evidence |
|---|---|---|
| rm-022 (100.0 OOM cap) | deferred — fog owner + runway | fold-side acceptance fog rm-253 (run-73bbab3d); only real-content operator-stream.js lane is 377dee0b's markdown port (568-line diff) — buffer-core rewrite would conflict with the flagship |
| rm-863 (94.0 casts) | partial-only at base | base has 3 of 15 `as unknown as` sites (app-client 1, installations 2); aggregator/query-registry/platform-status/snapshot-store exist only at main |
| rm-864 (93.0 pool-finalize) | unimplementable at base | src/pools.ts absent at 5ab50da0 (landed in the 7 ahead-commits) |
| rm-021 (90.0 resumption) | dependency chain | needs rm-021.1 sub-defs + rm-1016 (24.0) — multi-cycle |
| rm-876 (85.0), rm-879 (64.0) | next-cycle by design | analytics envelope defers |
| rm-1437 (78.0 dependabot) | claimed | a5970272 (live absorb-truth-hardening run) dirties .github/dependabot.yml |
| rm-850 (78.0 needs-collision) | unimplementable at base | .github/workflows/llm-maintenance.yaml absent at 5ab50da0 |
| rm-689 open follow-up (absorb-verify Bun gate) | claimed, live | a5970272 creating scripts/absorb-verify.ts + test/absorb-verify.test.ts (untracked) during this very probe window — status flipped clean→dirty mid-scan |
| rm-883 members react/plugin | 2-3× carried | run-5457d3ff (react+react-dom 19.3.1 + plugin 1.19.3), run-adb01769 (react 19.3.1); vitest 4.1.12 member rides their lockfile refresh at landing (rider rm-883 records it) |
| agent pin v0.123.1 | 3× carried | v0.123+ hunks in 307aa78e, 77d7cc3e, adb01769 |
| checkout v7.0.1 unification | 5× carried | d23441a→3d3c42e5 hunks in 2ce8fcb7, 307aa78e, 98b95e31, adb01769, eaf76a21 |
| rm-856 (50.0 event-pump) | 2× carried | 475b46bc + 77d7cc3e (fog rm-1478 double-implementation, prior-cycle verification) |
| rm-1446 (44.0 push-health) | contract-gated | needs OPERATOR_CONTRACT_VERSION 1.11.0 live on this fork (rm-252 window) + markdown-lane files |
| rm-1448 (28.0 key-mint fallback) | markdown-lane files | operator twin files overlap 377dee0b's 568-line rewrite |
| impeccable 3.2.1→3.6.1 (rm-271 leg) | single-line congestion | 377dee0b + adb01769 both rewrite the SAME `npx --yes impeccable@3.2.1` line (npx→bunx); 05696568 hunk @@ -78 overlaps the Design-Check region |
| web/src family (rm-140/1450/852-web) | 7-lane congestion | 377dee0b(17), f3a4bbb5(8), f376b019(7), +4 more lanes dirty web/src |
| rm-1451 (18.0 tsconfig matrix) | overflow (unclaimed, base-complete) | zero tsconfig lanes — first reserve if a selected item collapses |

## Verification for the implementer

- All collision probes re-runnable: parent worktree `git -C run-*/ status --porcelain` + `git diff HEAD -- <surface> | grep '^@@'`.
- Digest re-derive at implement time (do not trust a5f4366e blindly — probe date 2026-10-18).
- Full battery gates the batch; spellings test for rm-852 rides the server suite; header assertions ride the github suite.
- Re-probe sibling lanes immediately before editing — this fleet mutates mid-cycle (a5970272 flipped twice during this selection).
