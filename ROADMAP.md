# dashboard — Roadmap

> Autonomously maintained by the roadmap sync (reliability-first). Items cite reproducible codebase signals; acceptance is proven by cited evidence.

<!-- manual-revision 2026-09-20: restored + extended by maintenance cycle run 270220e7 (roadmap phase)
     after the 2026-09-20 fleet render (2f3a884) regressed: it re-introduced the exact bare-array
     lint failure rm-104 predicted (ROADMAP.md:20:32, Main run 35479225529 Lint red), resurrected
     superseded rm-001/rm-002 with pytest/ast evidence on vendored .agents/skills/impeccable paths,
     deleted every tracked open item and this directive, and added a Fleet context section naming
     hermes-agent as upstream (not this repo's upstream; removed). This revision restores the
     3075f4a content, updates cycle-1 items against what landed at 3075f4a (dependabot.yml present;
     actionlint container form in main.yaml; AGENTS.md Fro Bot note present — rm-109 completed),
     and adds cycle-2 items from run 270220e7 assess findings and
     docs/ideation/2026-09-20-repository-extensions-ideation.md.
     hermes-roadmap render: preserve or explicitly supersede these items on the next render; do not
     silently drop them. rm-001/rm-002 remain superseded — do not resurrect vendored-path signals.
     cycle-1 outcome (2026-09-19, run cf5527c1): rm-100 (container actionlint + codeql-action digest
     1c5b675), rm-102 (.github/dependabot.yml), rm-109 (AGENTS.md Fro Bot ops note) landed on
     origin/main at 3075f4a. CodeQL green at the pushed sha remains open (see rm-100). Batch
     decisions: docs/prioritization/2026-09-19-cycle-1-batch.md. -->

**Vision**: A reliable, customer-friendly repository advanced by evidence-cited roadmap cycles owned by the autonomy loop

**Pillars**: reliability work outranks customer-experience work; every roadmap item cites reproducible codebase signals; acceptance is proven by cited evidence, never claimed

## Open items

### Restore required gates green at HEAD on main
- id: `rm-100` | track: reliability | priority: 100.0 | status: in-progress (cycle 2: all three fixes applied in the run-270220e7 worktree 2026-09-20 — lint restored, fro-bot.yaml job-env gate, codeql deps-install; pending landing + CI proof at the pushed sha)
- signals: Lint job red at 2f3a884 only (run 35479225529; `markdown/no-missing-label-refs` at ROADMAP.md:20:32 — introduced by the fleet render itself; parent 5b8a2b3 Lint green via run 35459361435; this revision removes the construct, re-prove after every edit); Check Workflows red on the self-hosted runner (fro-bot.yaml:266 — step-level `if:` referencing the `secrets` context invalidates the whole workflow file; schema-level, actionlint detects it); CodeQL Analyze red since 6ffbe89 (`Cannot find module typescript` in autobuild under build-mode none — checkout's git-clean wipes node_modules before analyze)
- acceptance:
  - `pnpm lint` exits 0 at HEAD — satisfied by this roadmap revision (the bare-array construct at ROADMAP.md:20 is gone); re-prove after every subsequent edit
  - Check Workflows green: fro-bot.yaml gate rewritten to job-level env (`env.HAS_TOKEN == 'true'` pattern, mirroring the in-tree dispatch-job contract at release.yaml) instead of step-level `secrets` references; container actionlint exit 0 on all workflows
  - CodeQL Analyze green on origin/main via the self-hosted posture: `pnpm install --frozen-lockfile` before codeql-init in codeql.yaml (runs-on stays self-hosted per PR #1 policy — no hosted runners)
- evidence: `gh run list --workflow main.yaml --branch main -L 1` → completed/success, same for codeql.yaml, at the pushed sha; local `pnpm lint` exit 0; container actionlint (`docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12 -no-color`) exit 0
- implementation note (2026-09-19/20): actionlint container form + codeql-action digest 1c5b675 landed at 3075f4a (sub-acceptance met for the actionlint step form). The run-333ad19e worktree holds proven pnpm-install-before-init codeql.yaml and Dockerfile absorb edits that never landed — re-apply from that diagnosis, do not re-derive. Solution doc: `docs/solutions/workflow-issues/actionlint-pipx-missing-container-form-2026-09-19.md`; policy doc: `docs/solutions/workflow-issues/ci-policy-lived-only-in-pr-body-2026-09-19.md`

### Harden the roadmap render (vendored-path exclusion, stack-correct evidence, lint-clean output)
- id: `rm-104` | track: reliability | priority: 98.0 | status: candidate (ESCALATED: failure recurred 2026-09-20)
- signals: the 2026-09-20 fleet render (2f3a884) repeated every defect class rm-104 predicted: bare-array prose broke `pnpm lint` at ROADMAP.md:20:32 (main unlandable; run 35479225529), pytest/ast evidence strings re-cited in a Node 24/pnpm/Vitest repo, all 21 signals again under vendored `.agents/skills/impeccable/**`, and — new this time — the manual-revision directive, superseded section, and all tracked open items rm-100/102/103/104/105/106/107/108/109/110 were silently deleted (88 deletions in `git show 2f3a884 -- ROADMAP.md`)
- acceptance:
  - next hermes-roadmap render emits zero signals under `.agents/skills/impeccable/**` (vendored-path exclusion)
  - rendered evidence strings reference repo-native commands only (`pnpm lint`, `pnpm check-types`, `pnpm test`, `gh run ...`), never pytest/ast tooling
  - `pnpm lint` exits 0 immediately after a render (generator lints its own output before commit)
  - manual-revision, superseded, and completed sections survive a render verbatim unless explicitly superseded; tracked items may only close with an explicit superseded marker citing evidence
- evidence: diff of ROADMAP.md across the next sync commit; `pnpm lint` exit 0 at that commit; upstream fro-bot tracking issue/PR link for the generator fix; delegate-side recovery recipe documented at `docs/solutions/workflow-issues/fleet-roadmap-render-clobber-recovery-2026-09-20.md` (compound-phase 2026-09-20)

### Upstream absorb batch 2026-09-20 (node 0e0ff40, hono 4.13.8, retire in-image patch)
- id: `rm-111` | track: reliability | priority: 92.0 | status: in-progress (absorbed as content-merge in the run-270220e7 worktree 2026-09-20 — pins at 0e0ff40, hono 4.13.8, patch retired; pending landing + Release Trivy proof)
- signals: fork is 4 commits behind `autonomy-upstream/main` (merge-base 6f4e620; measured 2026-09-20): node digest 0e0ff40 (#86c1e6a, #492) superseding a9d7043 (#3efa4b1, #491), hono 4.13.8 (#7fab758, #488) — codeql-action 1c5b675 (#54a5669) already absorbed at 3075f4a; Dockerfile pins 2fe369e at lines 1/21/35 (two digest generations stale); live `node:24-slim` tag = 0e0ff40 (2026-09-19) and ships libpcre2-8-0 10.42-1+deb12u1, so the in-image `apt-get install --only-upgrade libpcre2-8-0` patch (Dockerfile:37-46) retires on absorb and Trivy HIGHs clear at the base; lockfile hono resolves 4.13.7 vs upstream 4.13.8
- acceptance: upstream merge absorbed to origin/main with fork exclusions preserved (no write code path; stricter read-only doc wording); all three Dockerfile pins at 0e0ff40; in-image libpcre2 patch removed; `pnpm frozen-lockfile` install clean; Release Trivy step reports zero HIGH at the pushed sha
- evidence: `git rev-list --count HEAD..autonomy-upstream/main` → 0; `docker run --rm node:24-slim@sha256:0e0ff40... dpkg -s libpcre2-8-0` → 10.42-1+deb12u1; Release run log Trivy step zero HIGH; tests green (3017 at base; expect 3018 if the rm-110 fixture rides along); lockfile absorb recipe documented at `docs/solutions/workflow-issues/upstream-lockfile-content-merge-2026-09-20.md` (compound-phase 2026-09-20)

### Land fork dependency automation — first-PR proof
- id: `rm-102` | track: reliability | priority: 90.0 | status: in-progress (config landed 3075f4a 2026-09-19; first dependabot PR evidence pending ~2026-10-03)
- signals: `.github/dependabot.yml` present on origin/main (landed at 3075f4a — verified by `git log origin/main -- .github/dependabot.yml`); Renovate never runs here (PR #1 deleted renovate.yaml; config .github/renovate.json5 persists uninvoked); weekly cadence, first window opened 2026-09-19
- acceptance: first dependabot-authored PR visible within 14 days of 2026-09-19; grouped updates honored (npm, docker digests, github-actions; `open-pull-requests-limit: 3` for the single serialized runner); `pnpm test` green after the first merged automated bump
- evidence: `gh pr list --author "app/dependabot"` non-empty; merge commit's Main run green

### Automated upstream-absorb cadence with drift gate
- id: `rm-103` | track: reliability | priority: 85.0 | status: candidate
- signals: drift recurs by design — 2 commits behind on 2026-09-19, 4 behind on 2026-09-20 (node digests churn ~daily; two tag rebuilds in 24h); absorption is manual-only; upstream open PR #481 (route unhandled request errors through the redacting logger, 2026-09-16) is security-relevant to this fork's session middleware surface and unmerged upstream
- acceptance: scheduled workflow compares HEAD to `autonomy-upstream/main` and opens a human-approved merge PR when behind (auto-prepare + gate, never auto-push — fork exclusions demand human review); drift past a documented threshold opens an alert issue; #481 fast-followed within one cycle of merging upstream
- evidence: workflow run logs showing the compare step; merge PR links; `git rev-list --count HEAD..autonomy-upstream/main` → 0 (or ≤ threshold with an open alert)

### Supply-chain baseline v2: SBOM + build provenance in Release
- id: `rm-105` | track: security | priority: 80.0 | status: candidate
- signals: `.github/workflows/release.yaml` has no sbom/attest/provenance/cosign step (verified by grep, 2026-09-19) while Scorecard v2.4.4 is already green — attestations are the missing next rung of the 2026-07-31 security-workflow-baseline lineage
- acceptance: Release publishes the GHCR image with SBOM (syft) artifact and build provenance (`actions/attest-build-provenance`); verification reads the digest via the Digest line (`awk '/^Digest:/{print $2; exit}'` — the `--format` template is silently ignored for attestation-bearing indexes on this buildx) and confirms the attestation manifest exists
- evidence: release run log showing SBOM + attest steps green; registry manifest for the released digest shows attestation layer; docs note how an operator verifies (`docker buildx imagetools inspect` or `gh attestation verify`)

### Aggregator degradation and staleness semantics
- id: `rm-112` | track: reliability | priority: 75.0 | status: candidate (from run 270220e7 assess F3)
- signals: `src/github/aggregator.ts` silently drops repos on resolver failure (line 686) and a warm-empty working set replaces `lastGoodSnapshot` with fresh-empty without a stale banner (lines 704-706), contradicting the file's own fail-closed cold-start path (lines 624-641); no test covers either branch (verified 2026-09-20); the operator cannot distinguish "all quiet" from "data lost"
- acceptance: partial resolver failure serves last-good with an explicit stale marker and per-repo absence entries instead of silent drop; warm-empty never replaces last-good without a banner; MonitoringDto gains a degradation signal consumed by the operator view; both branches tested
- evidence: new aggregator tests in `pnpm test` covering resolver-failure and warm-empty paths; operator view renders a stale banner against a seeded degraded snapshot

### Listener digest push
- id: `rm-106` | track: operator-experience | priority: 70.0 | status: candidate
- signals: VAPID push infra is live for run events while listener messages (deploy-health, autoheal, Daily Maintenance Report per `docs/contracts/operator-listener-channel.md`) age out silently under the 500-row/30-day retention — the channel replaced GitHub issues but kept a "must watch a surface" burden
- acceptance: push (rate-capped) or daily digest delivered on listener messages; noise calibration documented (what triggers immediate vs digest); upstream #238-style public push privacy policy published first or in the same change
- evidence: integration test covering the notify path in `pnpm test`; one live verified delivery to the operator's subscription; policy doc merged

### Operator system-status panel
- id: `rm-107` | track: operator-experience | priority: 65.0 | status: candidate
- signals: monitoring-of-monitoring signals exist but scattered — `refreshedAt`/`staleBanner` in the MonitoringDto, GitHub rate-limit hooks live but log-only (`src/github/app-client.ts:73-79` `onRateLimit`/`onSecondaryRateLimit`), listener store depth, nothing composes them; the 2026-09-20 assess needed out-of-band `gh` commands to learn CI was red
- acceptance: one status surface composes snapshot freshness, rate-limit budget, listener store depth/age, and last refresh failures (fail-closed events); each composed signal has a test; no duplication of `/healthz` liveness semantics
- evidence: `pnpm test` includes tests for each composed signal; operator verification against a seeded stale snapshot renders the panel correctly

### Dated major-upgrade decision matrix
- id: `rm-108` | track: reliability | priority: 60.0 | status: candidate (reframed 2026-09-20 from open-ended watchlist)
- signals: measured 2026-09-20 — typescript 6.0.3 → 7.0.2 (native compiler, announced 2026-07-08; 7.0 ships no programmatic API — typescript-eslint still needs 6.x via the `@typescript/typescript6` side-by-side package); vitest 4.1.11 → 5.0.1 (the 3→4 migration already cost a cycle; flags/`basic`-reporter breaks documented in solutions docs); jsdom 29.1.1 → 30.1.0; Node 26 enters LTS 2026-10 under the new annual schedule (every release LTS 30 months) while the image pins node:24-slim; everything else measured current (octokit modular, vite 8.3.0, react 19.3.0, tailwind 4.3.3, workbox 7.4.1)
- acceptance: this roadmap or a linked doc carries an adopted-vs-available table refreshed each maintenance cycle, each row with a trigger date, blast radius, and go/no-go decision recorded at the date; majors absorb via upstream merges where possible, otherwise explicit upgrade PRs — never a silent ride; REST API-version pin (`X-GitHub-Api-Version: 2022-11-28`, src/auth/oauth.ts:130) reviewed on the same cadence (protective pin — 2026-03-10 REST removals verified unexposed)
- evidence: `npm view <pkg> version` outputs cited at each refresh; each adopted-major bump shows a green Main run before merge

### Aggregate complete check-suite counts
- id: `rm-110` | track: reliability | priority: 55.0 | status: in-progress (first: 100 in both query variants + 12-suite fixture applied in the run-270220e7 worktree 2026-09-20; suite count 3018 local; pending landing)
- signals: `src/github/aggregator.ts` requests `checkSuites(first: 10)` per commit (line 137) — repos with more than 10 suites understate `failingChecks`; the failure-conclusion filtering itself is correct (verified against the GraphQL query)
- acceptance: paginate `checkSuites` (or raise the page with a documented ceiling) with a test fixture containing more than 10 suites proving full counting; MonitoringDto behavior unchanged otherwise
- evidence: new/updated aggregator test in `pnpm test`; fixture demonstrates >10 suites counted; suite count 3018 at the landing tree

### Single-source the SSE parser invariants
- id: `rm-114` | track: reliability | priority: 45.0 | status: candidate (from run 270220e7 assess F5/F6)
- signals: the server reader and the browser parser are maintained by hand in parallel and share a live bug — the buffer cap counts UTF-16 code units against a BYTES-named constant (`src/gateway/operator-sse-reader.ts:35,526` and `public/operator-stream.js:44,2473`); the first-frame timeout park (operator-stream.js:2505) mirrors the same duplication
- acceptance: cap constant and normalization rules extracted to one shared source consumed by both the server reader and the browser bundle (shared module or build-time generation); divergence becomes a build/type failure rather than a live parser bug; multi-byte frame tests cover the corrected cap semantics
- evidence: single definition site; `pnpm test` includes multi-byte boundary-frame tests; grep shows no remaining duplicated literal

### CI pin hygiene micro-batch
- id: `rm-113` | track: reliability | priority: 40.0 | status: in-progress (checkout unified at v7.0.1 and setup-node at v7.0.0 incl. the setup composite in the run-270220e7 worktree 2026-09-20; pending landing + Main proof)
- signals: `actions/setup-node` pinned v6 while v7.0.0 is latest (measured via `gh api repos/actions/setup-node/releases/latest`, 2026-09-20); `actions/checkout` dual-pinned at v6.1.0 in one workflow and v7.0.1 elsewhere (`grep 'uses: actions/checkout' .github/workflows/`); all other measured action pins current
- acceptance: setup-node at v7.0.0; single checkout pin repo-wide; container actionlint exit 0; Main green at the pushed sha
- evidence: `grep -r 'uses: actions/checkout' .github/workflows | sort -u` shows one digest; Main run green

### CSRF tokens for listener ack mutations
- id: `rm-115` | track: security | priority: 30.0 | status: candidate (hardening; low severity)
- signals: `src/routes/listener.ts:121,130` accept session-authenticated state-changing POSTs (`/messages/:id/ack`, `/ack-all`) protected only by SameSite=Lax cookies, while logout already implements an explicit CSRF-token dance (`src/routes/auth.ts:168-190`) — an asymmetry; exploit window is narrow (Lax blocks cross-site POSTs except the fresh-cookie grace period) and impact bounded (ack state)
- acceptance: ack mutations require the same csrf-token pattern as logout (or equivalent origin check), with tests for the rejected cross-origin case; no behavior change for the operator's own client
- evidence: route tests in `pnpm test` covering token-missing rejection; manual operator flow unchanged

## Completed items

### Document the Fro Bot workflow disable state
- id: `rm-109` | track: reliability | priority: 50.0 | status: completed (2026-09-19; landed on origin/main at 3075f4a)
- acceptance was: an ops note in binding docs records the disabled state, the reason (missing secret), and the re-enable prerequisites
- completion evidence: `AGENTS.md` Fro Bot ops-conventions block (line 68) cites `disabled_manually`, the missing `FRO_BOT_PAT`, and the re-enable precondition; present at origin/main HEAD

## Superseded items

### Add test coverage for 21 untested module(s)
- id: `rm-002` | track: reliability | priority: 100.0 | status: superseded (2026-09-19, run cf5527c1; resurrection by the 2026-09-20 fleet render reverted 2026-09-20, run 270220e7)
- original acceptance: every flagged module has a corresponding test file with at least one passing test; original evidence cited "CI: pytest collects the new test files"
- supersession rationale: all 21 flagged paths are under `.agents/skills/impeccable/scripts/**`, designated vendored by `eslint.config.ts` — work there is discarded on reinstall; the cited pytest evidence cannot exist in this Node 24/pnpm/Vitest repository. First-party coverage is not flagged as gapped by the assess cycles (3017 tests passing at 2f3a884; listener/aggregator paths covered directly or indirectly). Replaced by the vendored-path exclusion in `rm-104`; first-party coverage signals should regenerate from the fixed render.

### Refactor 21 high-complexity function(s)
- id: `rm-001` | track: reliability | priority: 90.0 | status: superseded (2026-09-19, run cf5527c1; resurrection by the 2026-09-20 fleet render reverted 2026-09-20, run 270220e7)
- original acceptance: each flagged function decomposed below the branch threshold with behavior locked by characterization tests; original evidence cited an "ast-based branch-count check in CI"
- supersession rationale: every flagged site is in vendored `.agents/skills/impeccable/scripts/live-browser.js` and siblings (same discard-on-reinstall problem); no ast-based CI check exists in this repository's stack. Replaced by `rm-104`; first-party complexity signals should regenerate from the fixed render.

<!-- managed by hermes-roadmap render; do not edit by hand -->
