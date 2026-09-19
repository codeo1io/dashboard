# dashboard — Roadmap

> Autonomously maintained by the roadmap sync (reliability-first). Items cite reproducible codebase signals; acceptance is proven by cited evidence.

<!-- manual-revision 2026-09-19: extended by maintenance cycle run cf5527c1 (roadmap phase)
     from the cycle's assess findings and researched candidates (docs/ideation/2026-09-19-repository-extensions-ideation.md).
     rm-001/rm-002 preserved under "Superseded items" with rationale — nothing deleted.
     hermes-roadmap render: preserve or explicitly supersede these items on the next render; do not silently drop them.
     cycle-1 outcome (2026-09-19, run cf5527c1, implement phase): rm-100 (container actionlint +
     codeql-action digest 1c5b675), rm-102 (.github/dependabot.yml), rm-109 (fro-bot disable-state
     ops note) implemented in the run worktree — staged for the cycle's landing gate; CI proof at the
     pushed sha is the remaining acceptance evidence. Suite proven locally: pnpm lint exit 0,
     3017/3017 tests green, actionlint container exit 0. Batch decisions:
     docs/prioritization/2026-09-19-cycle-1-batch.md. -->

**Vision**: A reliable, customer-friendly repository advanced by evidence-cited roadmap cycles owned by the autonomy loop

**Pillars**: reliability work outranks customer-experience work; every roadmap item cites reproducible codebase signals; acceptance is proven by cited evidence, never claimed

## Open items

### Restore required gates green at HEAD on main
- id: `rm-100` | track: reliability | priority: 100.0 | status: in-progress (cycle 1 implementation staged 2026-09-19, run cf5527c1; CI proof pending landing)
- signals: Main workflow run 35413084207 red at 0bc9a32 (Lint: `markdown/no-missing-label-refs` at ROADMAP.md:14:32; Check Workflows: `Unable to locate executable file: pipx` in raven-actions/actionlint@3d39aea with `pyflakes: true`); CodeQL run 35413084216 red since 6ffbe89 (`package.json: Main file not found` in autobuild despite `build-mode: none`; runner CodeQL CLI 2.27.0 is the current bundle — failure is runner-environment-specific, not CLI staleness)
- acceptance:
  - `pnpm lint` exits 0 at HEAD — satisfied by this roadmap revision (the bare-array construct at old ROADMAP.md:14 is gone); re-prove after every subsequent edit
  - Check Workflows job green on the self-hosted runner via the container form `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12 -no-color` (pinned tag — the rhysd image line has no v2 tags and `:latest` is mutable; repo-validated at this exact tag) or by provisioning pipx on the runner; raven-actions/actionlint v2.2.0 is pinned-latest and offers no fix
  - CodeQL Analyze green on origin/main after merging upstream digest 1c5b675 (fro-bot/dashboard#489); if still red, root-cause the runner's autobuild environment (npm/node on runner vs GitHub-hosted) and pin `build-mode: none` end-to-end
- evidence: `gh run list --workflow main.yaml --branch main -L 1` → completed/success and `gh run list --workflow codeql.yaml --branch main -L 1` → completed/success at the pushed sha; `pnpm lint` exit 0 locally
- implementation note (2026-09-19, run cf5527c1): actionlint step swapped to `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12 -no-color` (pinned tag, not `latest` — the image line tops out at 1.7.12 and has no v2 tags); digest swap applied 4/4 to codeql/release/scorecard yamls mirroring upstream 54a5669; lint sub-acceptance already satisfied repo-wide. Solution doc: `docs/solutions/workflow-issues/actionlint-pipx-missing-container-form-2026-09-19.md`

### Harden the roadmap render (vendored-path exclusion, stack-correct evidence, lint-clean output)
- id: `rm-104` | track: reliability | priority: 95.0 | status: candidate
- signals: this file's generator produced a lint-breaking artifact at 0bc9a32 (bare array prose → `markdown/no-missing-label-refs`), cited `pytest`/`ast-based` CI evidence in a Node 24/pnpm/Vitest repo whose runner lacks pip, and targeted only `.agents/skills/impeccable/**` — 105 tracked files that `eslint.config.ts` itself designates as vendored
- acceptance:
  - next hermes-roadmap render emits zero signals under `.agents/skills/impeccable/**` (vendored-path exclusion)
  - rendered evidence strings reference repo-native commands only (`pnpm lint`, `pnpm check-types`, `pnpm test`, `gh run ...`), never pytest/ast tooling
  - `pnpm lint` exits 0 immediately after a render (generator lints its own output before commit)
  - manual-revision and superseded sections survive a render verbatim unless explicitly superseded
- evidence: diff of ROADMAP.md across the next sync commit; `pnpm lint` exit 0 at that commit; upstream fro-bot tracking issue/PR link for the generator fix

### Land fork dependency automation
- id: `rm-102` | track: reliability | priority: 90.0 | status: in-progress (config written 2026-09-19, run cf5527c1; landing + first dependabot PR pending)
- signals: no dependabot.yml in the fork's entire git history or on live main (the cycle-1 fix never landed); Renovate has never run here (1 lifetime PR, manual — fork of fro-bot/dashboard where Renovate files #478–#489 daily); `Dockerfile:40-41` documents "renovate is absent in this fork so pins move only by hand"
- acceptance: `.github/dependabot.yml` merged to origin/main covering npm, docker (digests), and github-actions ecosystems with grouped updates (single runner, serialized jobs — grouping is required, not cosmetic)
- evidence: `gh api repos/codeo1io/dashboard/contents/.github/dependabot.yml` → 200; first dependabot-authored PR visible via `gh pr list --author "app/dependabot"` within 14 days; `pnpm test` still 3000+ passing after first automated bump
- implementation note (2026-09-19, run cf5527c1): `.github/dependabot.yml` written — grouped github-actions/npm/docker, weekly, `open-pull-requests-limit: 3` (single serialized runner); yml/quotes single-quote rule satisfied

### Automated upstream-absorb cadence with drift gate
- id: `rm-103` | track: reliability | priority: 85.0 | status: candidate
- signals: fork sits 2 dependency commits behind `autonomy-upstream/main` (`7fab758` hono 4.13.8 #488, `54a5669` codeql-action digest 1c5b675 #489); absorption is manual-only; upstream open PR #481 (route unhandled errors through the redacting logger) is security-relevant to this fork's session middleware surface
- acceptance: scheduled workflow compares HEAD to `autonomy-upstream/main` and opens a human-approved merge PR when behind (auto-prepare + gate, never auto-push — fork exclusions (the upstream write-capability block — read-only invariant #1 — and the stricter doc wording) demand human review); drift past a documented threshold opens an alert issue; #481 fast-followed within one cycle of merging upstream
- evidence: workflow run logs showing the compare step; merge PR links; `git rev-list --count HEAD..autonomy-upstream/main` → 0 (or ≤ threshold with an open alert)

### Supply-chain baseline v2: SBOM + build provenance in Release
- id: `rm-105` | track: security | priority: 80.0 | status: candidate
- signals: `.github/workflows/release.yaml` has no sbom/attest/provenance/cosign step (verified by grep, 2026-09-19) while Scorecard v2.4.4 is already green — attestations are the missing next rung of the 2026-07-31 security-workflow-baseline lineage
- acceptance: Release publishes the GHCR image with SBOM (syft) artifact and build provenance (`actions/attest-build-provenance`); verification reads the digest via the Digest line (`awk '/^Digest:/{print $2; exit}'` — the `--format` template is silently ignored for attestation-bearing indexes on this buildx) and confirms the attestation manifest exists
- evidence: release run log showing SBOM + attest steps green; registry manifest for the released digest shows attestation layer; docs note how an operator verifies (`docker buildx imagetools inspect` or `gh attestation verify`)

### Listener digest push
- id: `rm-106` | track: operator-experience | priority: 70.0 | status: candidate
- signals: VAPID push infra is live for run events (2026-07-08 plan) while listener messages (deploy-health, autoheal, Daily Maintenance Report per `docs/contracts/operator-listener-channel.md`) age out silently under the 500-row/30-day retention — the channel replaced GitHub issues but kept a "must watch a surface" burden
- acceptance: push (rate-capped) or daily digest delivered on listener messages; noise calibration documented (what triggers immediate vs digest); upstream #238-style public push privacy policy published first or in the same change
- evidence: integration test covering the notify path in `pnpm test`; one live verified delivery to the operator's subscription; policy doc merged

### Operator system-status panel
- id: `rm-107` | track: operator-experience | priority: 65.0 | status: candidate
- signals: monitoring-of-monitoring signals exist but scattered — `refreshedAt`/`staleBanner` in the MonitoringDto, GitHub rate-limit budget visible to the app client, listener store depth — nothing composes them; the cycle's assess needed out-of-band `gh` commands to learn CI was red
- acceptance: one status surface composes snapshot freshness, rate-limit budget, listener store depth/age, and last refresh failures (fail-closed events); each composed signal has a test; no duplication of `/healthz` liveness semantics
- evidence: `pnpm test` includes tests for each composed signal; operator verification against a seeded stale snapshot renders the panel correctly

### Major-upgrade watchlist with explicit policy
- id: `rm-108` | track: reliability | priority: 60.0 | status: candidate
- signals: npm registry 2026-09-19 — vitest 4.1.11→5.0.1 available, typescript 6.0.3→7.0.2 (native compiler line) available, jsdom 29.1.1→30.1.0 available; fork is current within every adopted major; upstream absorbs majors via Renovate
- acceptance: this roadmap carries an adopted-vs-available majors table refreshed each maintenance cycle; policy line: majors absorb via upstream merges where possible, otherwise explicit upgrade PRs — never a silent ride
- evidence: `npm view <pkg> version` outputs cited at each refresh; each adopted-major bump shows a green Main run before merge

### Document the Fro Bot workflow disable state
- id: `rm-109` | track: reliability | priority: 50.0 | status: in-progress (ops note added to AGENTS.md 2026-09-19, run cf5527c1; landing pending)
- signals: fro-bot workflow disabled_manually on the fork (no FRO_BOT_PAT) — state lives only in GitHub settings, documented nowhere in-repo; re-enable would silently resume a broken daily cron
- acceptance: an ops note in binding docs records the disabled state, the reason (missing secret), and the re-enable prerequisites
- evidence: doc merged; a re-enable attempt following the note does not produce a failing run
- implementation note (2026-09-19, run cf5527c1): note added to the Fro Bot ops-conventions block in `AGENTS.md` (binding docs), citing `disabled_manually`, the missing `FRO_BOT_PAT`, and the re-enable precondition

### Aggregate complete check-suite counts
- id: `rm-110` | track: reliability | priority: 50.0 | status: candidate
- signals: `src/github/aggregator.ts` requests `checkSuites(first: 10)` per commit — repos with more than 10 suites understate `failingChecks`; the failure-conclusion filtering itself is correct (verified against the GraphQL query)
- acceptance: paginate `checkSuites` (or raise the page with a documented ceiling) with a test fixture containing more than 10 suites proving full counting; MonitoringDto behavior unchanged otherwise
- evidence: new/updated aggregator test in `pnpm test`; fixture demonstrates >10 suites counted

## Superseded items

### Add test coverage for 21 untested module(s)
- id: `rm-002` | track: reliability | priority: 100.0 | status: superseded (2026-09-19, run cf5527c1)
- original acceptance: every flagged module has a corresponding test file with at least one passing test; original evidence cited "CI: pytest collects the new test files"
- supersession rationale: all 21 flagged paths are under `.agents/skills/impeccable/scripts/**`, designated vendored by `eslint.config.ts` — work there is discarded on reinstall; the cited pytest evidence cannot exist in this Node 24/pnpm/Vitest repository. First-party coverage is not flagged as gapped by this cycle's assess (3017 tests passing; listener/aggregator paths covered directly or indirectly). Replaced by the vendored-path exclusion in `rm-104`; first-party coverage signals should regenerate from the fixed render.

### Refactor 21 high-complexity function(s)
- id: `rm-001` | track: reliability | priority: 90.0 | status: superseded (2026-09-19, run cf5527c1)
- original acceptance: each flagged function decomposed below the branch threshold with behavior locked by characterization tests; original evidence cited an "ast-based branch-count check in CI"
- supersession rationale: every flagged site is in vendored `.agents/skills/impeccable/scripts/live-browser.js` and siblings (same discard-on-reinstall problem); no ast-based CI check exists in this repository's stack. Replaced by `rm-104`; first-party complexity signals should regenerate from the fixed render.

<!-- managed by hermes-roadmap render; do not edit by hand -->
