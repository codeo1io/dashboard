# Dashboard maintenance batch (2026-10-09, run d823703c)

Repository-maintenance ee09aa2628914784a08df0efcdf2b730 cycle:1, prioritize attempt 043c124202364f60a65fdbdd0b00d1ea. Composed at base 88e423a (== origin/main at this run's own fetch; 0 movement since assess). Working ledger = base 247 defs / max rm-780 + THIS RUN's roadmap deliverable (spool diff `1d8db60c-roadmap-extension.diff`, applied report-only for composition): mint rm-833 + rm-252/rm-139 riders + extension #37 → 248 defs / 0 dups / max rm-833 (census re-run green below).

Pre-selection diligence (all first-hand this attempt):

- Upstream drift 27 commits, head 1ecbb81 2026-10-09T06:46Z — ambiguous-ref trap corrected (probe `refs/remotes/autonomy-upstream/main`, never the shadowing local branch). Absorb decision stays the 2026-10-13 package (my rm-252 rider pairs run-ba5f6d7ddd67's ext #41 rider by content).
- Gateway fro-bot/agent latest v0.118.3 (2026-10-08T22:57Z) shipping #1743 — SSE status-frame projection fix closing upstream #1737; unblocks the rm-247 checkout-detail display half once the absorb passes v0.118.3. Upstream's own dashboard pins v0.118.3 (fro-bot.yaml:313).
- Dependency floor: `corepack pnpm audit -r` clean (rc=0); upstream's security wave already fixed in our lockfile (undici 7.30.0, fast-uri 3.1.8, source-map-js 1.2.2, brace-expansion 5.0.12); katex 0.18.10 advisory-free; all runtime deps at latest; majors unmoved (vitest 5 / jsdom 30 / typescript 7 / pnpm 12 latest-but-far; @types/node 24.19.1 in-range).
- Live platform constraint re-verified this session: repo Actions GitHub-side DISABLED (workflow_dispatch → 422; 0 runs since 02:00Z). Every CI-evidence-gated def stays excluded; the two selected items need local evidence only.
- Live PRs: #479 (conductor/ci-17b348378aa9, draft) carries run-91776e259752's implemented 'security visibility at flat API cost' (rm-117/rm-162) — PENDING-CONTENT, not this batch's seam. #480 (conductor/ci-8b63d...3faa, draft) — fresh d8fdf8b7 lane content, same class.
- Node: v24.21.0 still newest Krypton LTS (no v24.22); v26.11.1 Current lts=false; rm-139 window edges unchanged (10-20 / 10-28).

## Fleet census (parallel walls at this attempt, dashboard lineage only)

| Lane | Batch (latest) | State |
| --- | --- | --- |
| run-122a693028b8 (wall 822) | 'operator-client hardening — launchRun retry parity + fetchJson size cap' | implemented 3 |
| run-155f9770c (2026-10-08) | 'oauth-pkce-hardening' (cycle:3) | implemented 3 |
| run-1930644ac | 'scheduled-workflow red watch: alert route for the Monday guard layer' | implemented 3 |
| run-32f33f1b | 'pre-Monday tripwire parity + stalled detailsUrl re-author' | in-flight (porcelain 9) |
| run-3eea27cb | 'push-metadata distinguishability + bounded logout' | implemented 3 |
| run-438dea88 | 'main-gate hardening and security-signal recovery' | selected |
| run-493bbbf2 | 'dep + action-digest currency refresh' | implemented 2 |
| run-5989eb97 (wall 821) | 'shell-cache-waitFor-sse-parity hardening' | implemented 3 |
| run-6a97d6f7 | 'non-push shell cache policy' | implemented 3 |
| run-8134eb2e6b13 (wall 829) | 'silent-state truth hardening' (rm-825/826/827 + rm-828 flex-dropped) | implemented 3 |
| run-84133641 | (failed/recoverable lane; 5 flips, porcelain 14) | recoverable |
| run-91776e259 | 'security visibility at flat API cost' (rm-117/rm-162) | implemented, rides draft PR #479 |
| run-ab16a466 | 'action-pin digest parity + operator-contract runbook' | selected |
| run-ba5f6d7ddd67 (wall 831) | 'oauth-pkce-and-pnpm-pin' (cycle:2) | implemented 3 |
| run-c4617181 (rm-797/rm-799) | pnpm sha512 pin + zizmor gate | implemented, dirty tree (porcelain 11) |
| run-d1a0b216 | 'gate-health + operator-lifecycle' | in-flight |
| run-e8c99e0e | 'client network-bound truth' | selected |
| run-f510a33e | 'lint-job-decomposition' | selected |
| run-d823703c (this run) | 'pwa-major-disposition-and-appshell-flake-root-cause' | selected (this doc) |

Raced-content verdicts (why my rm-252 rider's implementables are NOT batched here): codeql-action v4.38.3 digest re-pin is covered by ab16a466 (selected, action-pin digest parity) + 493bbbf2 (implemented, dep + action-digest currency); pnpm 11.28.5 + the sha512-pin lineage are covered by ba5f6d7d + c4617181. Both stay recorded in my rm-252 decision-package rider for the 10-13 fold — re-implementing them here would create fold debt against three live lanes.

## Five-axis selection (impact / risk / effort / dependencies / strategic; 1–5)

| Candidate | I | R | E | D | S | Σ | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| rm-833 vite-plugin-pwa 2.0.0 disposition (this run's mint) | 3 | 1 | 1 | 0 | 3 | 8 | SELECT — closes the unowned major the rm-108 rider scheduled for fold; zero collisions |
| rm-651 web-suite test isolation (rm-596 AppShell flake) | 4 | 2 | 2 | 0 | 3 | 11 | SELECT — deterministic suite is regression-truth for every future batch; 122a6930 deferred it as 'separate theme', no content claim |
| rm-257 web/src lint coverage | 4 | 2 | 4 | 0 | 3 | 13 | FLEX — first to drop; open-ended surfaced-findings fixup exceeds a cycle-clean seam |
| rm-149 (66.0) | 5 | 2 | 2 | 1 | 4 | 14 | EXCLUDE — selected by THREE lanes today; join late = fold debt |
| rm-249 PWA/Push joint decision | 4 | 3 | 3 | 2 | 4 | 16 | EXCLUDE — dedicated-cycle convention (post-hoc PWA/Push decision, pairs rm-138) |
| rm-252 absorb-window decision | 5 | 3 | 3 | 2 | 5 | 18 | EXCLUDE — decision due 2026-10-13, pairs ext #41's rider by content; not this cycle's seam |
| rm-674 Monday consolidation / rm-681 conductor-residue census / rm-279 lint-job (f510a33e has it) | 3–4 | 2 | 3 | 5 | 3 | — | EXCLUDE — CI-evidence-gated while Actions stays platform-disabled |
| rm-693 contract 1.8.0 absorption | 3 | 2 | 3 | 2 | 4 | 14 | EXCLUDE — rides the rm-252 absorb window |
| rm-117 / rm-162 | 4 | 2 | 3 | 2 | 4 | 15 | EXCLUDE — implemented content rides draft PR #479 (PENDING-CONTENT fold, not re-implement) |
| rm-513 Dockerfile VOLUME/HEALTHCHECK | 3 | 2 | 3 | 1 | 3 | 12 | EXCLUDE — container-transcript evidence class, weak theme fit |
| rm-181 stale conductor-PR closure sweep | 2 | 3 | 2 | 1 | 2 | 10 | EXCLUDE — mutates live PRs; must not touch #479/#480 while they carry pending content |

## Selected batch: 'pwa-major-disposition-and-appshell-flake-root-cause'

**B1 (anchor) rm-833 — vite-plugin-pwa 2.0.0 disposition, DEFER branch.** 1.3.0→2.0.0 (2026-10-03) is peers-only breaking (assets-generator ^2, not installed); wiring is injectManifest + hand-written `web/src/sw.ts`, so a bump is functionally inert today. But rm-138's PWA strip-or-implement decision (still open, candidate, decision required) moots a bump if it lands on strip — so the recorded disposition is: (a) fold the 2.0 decision row into rm-108's owner-driver matrix (the fold its 2026-10-04 rider explicitly scheduled for 'the next refresh', jointly with rm-138); (b) add a `vite-plugin-pwa` semver-major ignore to `.github/dependabot.yml` beside rm-133's vitest/typescript entries, dated and citing rm-833 + rm-138 with a re-evaluate window; (c) a dated rider on rm-833 recording the deferral rationale (BUILD-ARTIFACT PROOF rider on rm-138: the npm-ls-g provenance question is still open — do not treat 2.0.0 bump as trivial while it is). Acceptance (rm-833's own, defer branch): ignore entry cites the def id; matrix row present; rider recorded. All static-evidence — no CI dependency.

**B2 rm-651 — rm-596 AppShell restore-test determinism.** The sole full-suite fail class on main's cured tree (1179/1180; same test flaked 1/1172 on green 227375247 and passed on rerun — localStorage/dismiss-latch leakage between tests under jsdom). Root-cause fix or self-contained fixture per the def's own acceptance: 3 consecutive full-suite runs green BOTH isolated and in order + a docs/solutions/workflow-issues entry for the node-26 host + `--localstorage-file` recipe. Local evidence only. Premise re-verified this attempt: full suite green at HEAD (33 files/1212 tests server + web suites pass) — the flake is intermittent exactly as its signals describe.

**FLEX rm-257 (first to drop).** web/src has zero lint coverage (eslint ignores web/**); the 2026-10-07 rider holds the toolchain precondition. Take only if B1+B2 land with cycle budget left; the surfaced-findings fixup is open-ended.

Phase gates for implement: `pnpm check-types`, `pnpm lint`, `pnpm test` (pretest builds web/dist) green; census 248 defs / 0 dups / max rm-833 unchanged; guards green (pin 833); eslint on ROADMAP.md; batch doc + ledger flips ride this run's landing alongside the roadmap-phase diff.

Reconcile pointers: (1) rm-108 matrix row add = the fold its rider scheduled — cite rm-578/rm-579 (unlanded 6729d6a7 lineage) as the row's origin per that rider; (2) rm-133's ignore block gains the vpwa entry in place (dated comment, re-evaluate aligned to rm-138's decision); (3) rm-138 stays untouched — B1 defers to it; (4) rm-252's codeql/pnpm implementables stay with ab16a466/493bbbf2/ba5f6d7d/c4617181 per the fleet table; (5) 122a6930's B2 rider (AppShell rm-596 re-probe purge) is client-behavior, NOT test-determinism — material-adjacent only.
