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
<!-- manual-revision 2026-09-20: extended by maintenance cycle run f4622d7e (roadmap phase)
     from the run's assess findings (attempt 62e9eb24) and research pass 2
     (docs/ideation/2026-09-20-repository-extensions-research.md). Added rm-111..rm-118; status
     updates only to rm-100 (new Main failure mode: fro-bot.yaml:266 secrets-context job-if from
     PR #4; CodeQL fix still unlanded), rm-102 (config landed at 3075f4a; first dependabot PR
     pending), rm-103 (drift now 4 commits, absorb target 0e0ff40), rm-108 (majors re-probed
     2026-09-20, unchanged), rm-110 (unlanded-implementation note), rm-109 (completed — first
     completed item, kept in place to preserve history). Nothing deleted; superseded items
     untouched. hermes-roadmap render: preserve or explicitly supersede these items on the next
     render; do not silently drop them. -->
<!-- manual-revision 2026-09-20 (implement outcome, run f4622d7e): the selected cycle-2 batch
     (rm-100a needs-gate rewrite of fro-bot.yaml's job-if, rm-100b codeql deps-install step,
     rm-111 base 0e0ff40 + patch retirement + hono 4.13.8, rm-110 checkSuites first: 100 +
     fixture, rm-117 binding-docs sync) is implemented in the run worktree — uncommitted, staged
     for the landing gate. Local proofs: actionlint container exit 0 (was 1 at fro-bot.yaml:266:47),
     lint 0, check-types 0, suite 3018/3018, frozen-lockfile exit 0. CI proofs at the pushed sha
     remain the outstanding acceptance evidence. Correction recorded below: the job-env gate
     pattern named in rm-100's original acceptance is INVALID at job level (see rm-100). -->

**Vision**: A reliable, customer-friendly repository advanced by evidence-cited roadmap cycles owned by the autonomy loop

**Pillars**: reliability work outranks customer-experience work; every roadmap item cites reproducible codebase signals; acceptance is proven by cited evidence, never claimed

## Open items

### Restore required gates green at HEAD on main
- id: `rm-100` | track: reliability | priority: 100.0 | status: in-progress (2026-09-19 actionlint fix landed at 3075f4a and Main went green; 2026-09-20 re-audit by run f4622d7e: PR #4 re-broke Main with a job-level secrets-context `if:` at fro-bot.yaml:266 — merged 5b8a2b3 with two red checks on its own run (35459324430); CodeQL still red, the 333ad19e fix never landed)
- signals: Main workflow run 35413084207 red at 0bc9a32 (Lint: `markdown/no-missing-label-refs` at ROADMAP.md:14:32; Check Workflows: `Unable to locate executable file: pipx` in raven-actions/actionlint@3d39aea with `pyflakes: true`); CodeQL run 35413084216 red since 6ffbe89 (`package.json: Main file not found` in autobuild despite `build-mode: none`; runner CodeQL CLI 2.27.0 is the current bundle — failure is runner-environment-specific, not CLI staleness); re-audited 2026-09-20 (run f4622d7e): Main red AGAIN at 5b8a2b3 — fro-bot.yaml:266 job-level `if:` references the `secrets` context, which the workflow schema rejects wholesale (actionlint container rhysd/actionlint:1.7.12 exits 1 at fro-bot.yaml:266:47, reproducing CI exactly); CodeQL red at 5b8a2b3 with autobuild `Cannot find module 'typescript'` — the deps-install fix implemented in run-333ad19e's worktree was never landed on origin/main
- acceptance:
  - `pnpm lint` exits 0 at HEAD — satisfied by this roadmap revision (the bare-array construct at old ROADMAP.md:14 is gone); re-prove after every subsequent edit
  - Check Workflows job green on the self-hosted runner via the container form `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12 -no-color` (pinned tag — the rhysd image line has no v2 tags and `:latest` is mutable; repo-validated at this exact tag) or by provisioning pipx on the runner; raven-actions/actionlint v2.2.0 is pinned-latest and offers no fix
  - fro-bot.yaml job-if must reference neither `secrets` nor `env` — a job-level `if:` admits only the github/inputs/needs/vars contexts (corrected 2026-09-20 by the implement phase: the release.yaml 886c28e env-gate works only at step level, and local actionlint rejected the job-level env form too). Shipped form is the needs-gate: a tiny `secret-gate` job reads the secret into step-level env and exports `has_pat`, and the fro-bot job tests `needs.secret-gate.outputs.has_pat == 'true'` — solution doc `docs/solutions/workflow-issues/job-level-if-cannot-read-secrets-or-env-needs-gate-2026-09-20.md`
  - CodeQL Analyze green on origin/main via the deps-install fix (posture b, run-333ad19e design: `pnpm install --frozen-lockfile` between checkout and codeql-init, bare-pnpm form matching the runner's Main jobs; runs-on stays self-hosted per PR #1 policy — AGENTS.md codifies it); root cause pinned 2026-09-19: autobuild under build-mode:none needs node_modules/typescript and checkout git-clean wipes it; digest merges do not fix this
- evidence: `gh run list --workflow main.yaml --branch main -L 1` → completed/success and `gh run list --workflow codeql.yaml --branch main -L 1` → completed/success at the pushed sha; `pnpm lint` exit 0 locally
- implementation note (2026-09-19, run cf5527c1): actionlint step swapped to `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12 -no-color` (pinned tag, not `latest` — the image line tops out at 1.7.12 and has no v2 tags); digest swap applied 4/4 to codeql/release/scorecard yamls mirroring upstream 54a5669; lint sub-acceptance already satisfied repo-wide. Solution doc: `docs/solutions/workflow-issues/actionlint-pipx-missing-container-form-2026-09-19.md`
- implementation note (2026-09-20, run f4622d7e assess): both reds re-verified live at 5b8a2b3 — Main run 35459361435 (Check Workflows fails on the schema-invalid fro-bot.yaml, Lint/Test jobs green) and CodeQL run 35459361364 (`Cannot find module 'typescript'`); local gates at the assess tree were green (check-types exit 0, lint exit 0, tests 3017/3017), so both fixes are workflow-file edits, not source changes; PR #4 also merged with a red Check Types job on run 35459324430 — see rm-112 for the structural enabler
- implementation note (2026-09-20, run f4622d7e implement): rm-100a + rm-100b shipped in the run worktree (uncommitted, staged for the landing gate) — fro-bot.yaml rewritten to the needs-gate form above (actionlint container exits 0 at the tree, previously 1 at fro-bot.yaml:266:47; the workflow gains a tiny `secret-gate` job — single-runner serialization and Check-Workflows job expectations should account for it), and codeql.yaml gained `Setup build environment` (`./.github/actions/setup`, mirroring Main's jobs) between checkout and codeql-init; local gates green (lint 0, check-types 0, tests 3018/3018). Outstanding: Main + CodeQL green at the pushed sha

### Harden the roadmap render (vendored-path exclusion, stack-correct evidence, lint-clean output)
- id: `rm-104` | track: reliability | priority: 95.0 | status: candidate
- signals: this file's generator produced a lint-breaking artifact at 0bc9a32 (bare array prose → `markdown/no-missing-label-refs`), cited `pytest`/`ast-based` CI evidence in a Node 24/pnpm/Vitest repo whose runner lacks pip, and targeted only `.agents/skills/impeccable/**` — 105 tracked files that `eslint.config.ts` itself designates as vendored; SECOND INSTANCE 2026-09-20 (run f4622d7e review, IR-2): the fleet render at 2f3a884 (pushed 00:36:41Z, between this cycle's stewardship and implement phases) violated the render-preservation contract wholesale — deleted the manual-revision comment block and ALL ten curated items rm-100..rm-110, reverted rm-001/rm-002 from superseded back to candidate with pytest/ast acceptance prose, reintroduced the exact bare-array construct that fails `markdown/no-missing-label-refs`, and direct-pushed red (Main run 35479225529: Lint red at its own ROADMAP.md:20:32). Escalation: the next prioritize pass must treat rm-104 as a standing reliability hazard, not a one-off
- acceptance:
  - next hermes-roadmap render emits zero signals under `.agents/skills/impeccable/**` (vendored-path exclusion)
  - rendered evidence strings reference repo-native commands only (`pnpm lint`, `pnpm check-types`, `pnpm test`, `gh run ...`), never pytest/ast tooling
  - `pnpm lint` exits 0 immediately after a render (generator lints its own output before commit)
  - manual-revision and superseded sections survive a render verbatim unless explicitly superseded
- evidence: diff of ROADMAP.md across the next sync commit; `pnpm lint` exit 0 at that commit; upstream fro-bot tracking issue/PR link for the generator fix

### Land fork dependency automation
- id: `rm-102` | track: reliability | priority: 90.0 | status: in-progress (config landed on origin/main at 3075f4a, 2026-09-19, run cf5527c1 — first dependabot PR pending: weekly cadence, window opened 2026-09-19, zero dependabot PRs as of 2026-09-20, first expected by ~2026-10-03)
- signals: no dependabot.yml in the fork's entire git history or on live main (the cycle-1 fix never landed); Renovate has never run here (1 lifetime PR, manual — fork of fro-bot/dashboard where Renovate files #478–#489 daily); `Dockerfile:40-41` documents "renovate is absent in this fork so pins move only by hand"
- acceptance: `.github/dependabot.yml` merged to origin/main covering npm, docker (digests), and github-actions ecosystems with grouped updates (single runner, serialized jobs — grouping is required, not cosmetic)
- evidence: `gh api repos/codeo1io/dashboard/contents/.github/dependabot.yml` → 200; first dependabot-authored PR visible via `gh pr list --author "app/dependabot"` within 14 days; `pnpm test` still 3000+ passing after first automated bump
- implementation note (2026-09-19, run cf5527c1): `.github/dependabot.yml` written — grouped github-actions/npm/docker, weekly, `open-pull-requests-limit: 3` (single serialized runner); yml/quotes single-quote rule satisfied

### Absorb the rebuilt node base and finish hono convergence
- id: `rm-111` | track: reliability | priority: 88.0 | status: in-progress (implemented in run f4622d7e's worktree 2026-09-20 — staged for the landing gate; an earlier 2026-09-19 implementation in run-333ad19e's worktree never landed; target superseded to the latest upstream base 0e0ff40)
- signals: fork Dockerfile pins node:24-slim at digest 2fe369e whose base ships libpcre2-8-0 10.42-1 (the historical Trivy HIGH driver, patched in-image today); upstream moved the SAME pin twice within ~24h — #491 (a9d7043) then #492 (0e0ff40, latest) — and both rebuilt bases ship libpcre2-8-0 10.42-1+deb12u1 (docker-run dpkg verified 2026-09-19); hono 4.13.7→4.13.8 (upstream #488) is pure convergence — the GitHub Advisory DB probed 2026-09-20 shows every published hono GHSA fixed by 4.13.5 or earlier, so 4.13.7 carries no known exposure
- acceptance:
  - Dockerfile base pin moved to the 0e0ff40-equivalent digest and the in-image `apt-get install --only-upgrade libpcre2-8-0` patch block retired in the same change (state-change rule: the Dockerfile comment describing the in-image patch is updated in the same commit)
  - hono lockfile at 4.13.8 (upstream #488 parity)
  - Release Trivy step reports zero HIGH/CRITICAL findings at the pushed sha with the in-image patch gone
- evidence: diff showing pin move + patch retirement together; `gh run view` of the Release run at the pushed sha with Trivy zero-HIGH; local gates green (pnpm lint, pnpm check-types, pnpm test 3000+) at the change tree
- implementation note (2026-09-20, run f4622d7e implement): all three Dockerfile FROM pins moved to sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 (== upstream 86c1e6a); the in-image `apt-get --only-upgrade libpcre2-8-0` block retired with its comment rewritten in-commit (state-change rule); hono 4.13.8 in pnpm-lock.yaml with package.json deliberately kept at ^4.7.11 — `pnpm update` rewrites the manifest range (^4.7.11 to ^4.13.8), which was reverted to preserve upstream parity, correcting the lockfile importer specifier instead (`pnpm install --frozen-lockfile` exit 0). Outstanding: Release Trivy zero-HIGH at the pushed sha

### Automated upstream-absorb cadence with drift gate
- id: `rm-103` | track: reliability | priority: 85.0 | status: candidate
- signals: fork sits 4 commits behind `autonomy-upstream/main` in history (`7fab758` hono 4.13.8 #488, `54a5669` codeql-action digest 1c5b675 #489, `3efa4b1` base a9d7043 #491, `86c1e6a` base 0e0ff40 #492 — fetched 2026-09-20); content-wise the 54a5669 digest swap was already applied directly at 3075f4a, so the outstanding absorb is hono 4.13.8 plus the latest base digest 0e0ff40 (tracked as rm-111); absorption is manual-only; upstream open PR #481 (route unhandled errors through the redacting logger) is security-relevant to this fork's session middleware surface
- implementation note (2026-09-20, run f4622d7e): the absorb's CONTENT (hono 4.13.8 + base digest 0e0ff40) landed as direct edits via rm-111 rather than a history merge, so upstream history remains 4 ahead while the worktree content is converged — a future history absorb must not double-apply (Dockerfile pins and pnpm-lock.yaml are already at the upstream values)
- acceptance: scheduled workflow compares HEAD to `autonomy-upstream/main` and opens a human-approved merge PR when behind (auto-prepare + gate, never auto-push — fork exclusions (the upstream write-capability block — read-only invariant #1 — and the stricter doc wording) demand human review); drift past a documented threshold opens an alert issue; #481 fast-followed within one cycle of merging upstream
- evidence: workflow run logs showing the compare step; merge PR links; `git rev-list --count HEAD..autonomy-upstream/main` → 0 (or ≤ threshold with an open alert)

### Merge-hygiene baseline: required checks on main plus drift alert
- id: `rm-112` | track: reliability | priority: 84.0 | status: candidate
- signals: `gh api /repos/codeo1io/dashboard/branches/main/protection` returns 404 "Branch not protected" and `/rulesets` is empty (probed 2026-09-20); nothing structurally blocks red-check merges — PR #4 merged 2026-09-19 17:51Z with TWO red checks on its own run (35459324430) and its defects became this cycle's P1 findings (rm-100); repo is public on a User account (owner.type User), where required status checks and rulesets are available; SECOND INSTANCE 2026-09-20 (run f4622d7e review): the fleet render 2f3a884 landed by direct push with its own run already red — Main 35479225529 failing Lint (ROADMAP.md:20:32) AND Check Workflows (the pre-fix fro-bot.yaml:266 secrets-context if), CodeQL 35479225585 red — a second red direct-push landing after PR #4's red merge
- acceptance:
  - main protected (classic branch protection or a ruleset) with required status checks covering the Main workflow's job set (Test, Check Types, Check Workflows, Lint, Test Scripts Load, Design Check) plus CodeQL; strict-on-required-context where feasible
  - a periodic (weekly) workflow snapshots the protection/ruleset API state and alerts (open issue or failing check) on drift from the codified baseline
  - the hotfix override path documented in AGENTS.md (an admin merge over red checks becomes an explicit, visible decision, not a default)
- evidence: `gh api /repos/codeo1io/dashboard/branches/main/protection` returns the configured object post-change; drift-check workflow run log on first run; AGENTS.md note merged; PR #4-style merge attempt with red checks is blocked (observed on a throwaway branch)

### Supply-chain baseline v2: SBOM + build provenance in Release
- id: `rm-105` | track: security | priority: 80.0 | status: candidate
- signals: `.github/workflows/release.yaml` has no sbom/attest/provenance/cosign step (verified by grep, 2026-09-19) while Scorecard v2.4.4 is already green — attestations are the missing next rung of the 2026-07-31 security-workflow-baseline lineage
- acceptance: Release publishes the GHCR image with SBOM (syft) artifact and build provenance (`actions/attest-build-provenance`); verification reads the digest via the Digest line (`awk '/^Digest:/{print $2; exit}'` — the `--format` template is silently ignored for attestation-bearing indexes on this buildx) and confirms the attestation manifest exists
- evidence: release run log showing SBOM + attest steps green; registry manifest for the released digest shows attestation layer; docs note how an operator verifies (`docker buildx imagetools inspect` or `gh attestation verify`)

### Security-posture panel: Dependabot and code-scanning alerts per repo
- id: `rm-113` | track: security | priority: 78.0 | status: candidate
- signals: live probes 2026-09-20 — REST `/repos/codeo1io/dashboard/code-scanning/alerts?state=open` returns 10 OPEN alerts on this fork's main (1 critical CVE-2023-45853 + 9 high, created 2026-09-16, refs/heads/main) that no operator-facing surface shows, while the 2026-09-19 Release Trivy gate was green — alert triage lags the release state; GraphQL `vulnerabilityAlerts(states:OPEN)` works (0 open / 28 historical here) but GraphQL has NO code-scanning field (probed — REST only); the token mint already requests security_events and vulnerability_alerts read with graceful fallback (src/github/installations.ts FULL_READ_PERMISSIONS), so the permission plumbing predates the feature
- acceptance:
  - aggregator snapshot carries per-repo open-alert counts — Dependabot via GraphQL `vulnerabilityAlerts(states:OPEN)`, code-scanning via one REST call per repo — both behind the existing optional-permission graceful degradation (absent permission ⇒ field omitted, never an error)
  - counts render per repo with a needs-attention trigger; only counts and severity buckets are stored/rendered — no alert content beyond that
  - the 10 standing open code-scanning alerts are triaged (dismissed with reason or routed to fix work) and the panel reflects the triaged state — surfacing is the feature, triage is the operator decision it enables
  - rate-limit cost documented: one REST call per repo per cycle, batched with the same pagination/ceiling discipline as the check-suite query (rm-110 family)
- evidence: pnpm test coverage for both alert paths including the graceful-fallback case; seeded fixture with alert counts; operator verification against live data shows the triaged state

### Per-repo scoped installation tokens
- id: `rm-114` | track: security | priority: 74.0 | status: candidate
- signals: mintReadOnlyToken (src/github/installations.ts) mints installation-WIDE tokens — the redaction denylist constrains queries (aggregator excludes denylisted repos before any per-repo query) but a minted token's capability still spans the whole installation including denylisted/private repos; GitHub's create-installation-access-token endpoint accepts a repositories array to scope a token to named repos, so capability can be made to match query intent
- acceptance:
  - per-repo GraphQL/REST status queries use a token scoped to just that repo (repositories array param at mint); installation enumeration keeps the installation-wide token
  - per-repo tokens cached with the existing 55-min pattern; the 5000-mints-per-hour-per-installation cap documented as the budget ceiling (fleet size is far below it)
  - a test proves the scoping: the client seam rejects a repo-scoped token used against a sibling repo
- evidence: pnpm test includes the scoping/rejection test; code diff extends the mint signature and call sites; AGENTS.md security-invariant block notes the capability-scoping layer

### Listener digest push
- id: `rm-106` | track: operator-experience | priority: 70.0 | status: candidate
- signals: VAPID push infra is live for run events (2026-07-08 plan) while listener messages (deploy-health, autoheal, Daily Maintenance Report per `docs/contracts/operator-listener-channel.md`) age out silently under the 500-row/30-day retention — the channel replaced GitHub issues but kept a "must watch a surface" burden
- acceptance: push (rate-capped) or daily digest delivered on listener messages; noise calibration documented (what triggers immediate vs digest); upstream #238-style public push privacy policy published first or in the same change
- evidence: integration test covering the notify path in `pnpm test`; one live verified delivery to the operator's subscription; policy doc merged

### Gate-health roll-up: workflow-run conclusions per repo
- id: `rm-115` | track: operator-experience | priority: 68.0 | status: candidate
- signals: REST actions/runs probed 2026-09-20 returning exactly the needed shape (latest runs at 5b8a2b3: Main=failure, CodeQL=failure, Scorecard=success); the 2026-09-19/20 gate reds sat invisible to operator-facing surfaces for ~26h (merged 17:51Z, found only by this run's out-of-band assess); the dashboard already renders check runs on commits but not workflow-level conclusions — and this week's failure lived at the workflow level (schema rejection before any check run existed)
- acceptance:
  - snapshot carries the latest conclusion per workflow at the default-branch tip (dedupe by workflow name, REST pagination with a documented ceiling — rm-110 discipline)
  - any red required-gate at the tip triggers the existing needs-attention surface
  - designed jointly with rm-107 as ONE status surface (repo gate health + monitor health), not two parallel panels — the joint-design decision is recorded at plan time
- evidence: pnpm test for the roll-up path; fixture with multiple runs per workflow; manual verification against the live red Main/CodeQL state shows both surfaced

### Operator system-status panel
- id: `rm-107` | track: operator-experience | priority: 65.0 | status: candidate
- signals: monitoring-of-monitoring signals exist but scattered — `refreshedAt`/`staleBanner` in the MonitoringDto, GitHub rate-limit budget visible to the app client, listener store depth — nothing composes them; the cycle's assess needed out-of-band `gh` commands to learn CI was red
- acceptance: one status surface composes snapshot freshness, rate-limit budget, listener store depth/age, and last refresh failures (fail-closed events); each composed signal has a test; no duplication of `/healthz` liveness semantics
- evidence: `pnpm test` includes tests for each composed signal; operator verification against a seeded stale snapshot renders the panel correctly

### Major-upgrade watchlist with explicit policy
- id: `rm-108` | track: reliability | priority: 60.0 | status: candidate
- signals: npm registry 2026-09-19 — vitest 4.1.11→5.0.1 available, typescript 6.0.3→7.0.2 (native compiler line) available, jsdom 29.1.1→30.1.0 available; fork is current within every adopted major; upstream absorbs majors via Renovate
- acceptance: this roadmap carries an adopted-vs-available majors table refreshed each maintenance cycle; policy line: majors absorb via upstream merges where possible, otherwise explicit upgrade PRs — never a silent ride
- evidence: `npm view <pkg> version` outputs cited at each refresh; each adopted-major bump shows a green Main run before merge (re-probed 2026-09-20, run f4622d7e: available majors unchanged — vitest 5.0.1, typescript 7.0.2, jsdom 30.1.0; in-major current everywhere: react 19.3.0, vite 8.3.0, vite-plugin-pwa 1.3.0, tailwindcss 4.3.3, @octokit/app 16.1.4, arctic 3.7.0, @node-rs/argon2 2.2.1)

### Gateway-contract drift watch for the mirrored agent source
- id: `rm-116` | track: reliability | priority: 58.0 | status: candidate
- signals: the cloned dependency source pins fro-bot/agent at v0.78.0 while upstream is at v0.113.2 — 75 releases of drift, with release bodies at v0.113.1, v0.113.0, v0.109.3, v0.107.1, v0.106.2 touching operator/gateway surfaces (gh api repos/fro-bot/agent/releases, 2026-09-20); AGENTS.md names this clone as the reference for the operator OAuth return path, GitHub App client, secret readers, and logger/Result primitives this app mirrors — and no process notices when that contract moves underneath the conformance tests
- acceptance: a periodic watch (checklist item in the maintenance cycle or a small workflow) compares the clonedep pin to the upstream latest tag; on drift, diffs the mirrored contract surfaces and records a short delta note (docs/solutions/ or the cycle batch doc) flagging conformance-test impact explicitly; the clonedep is refreshed on cadence, never auto-merged
- evidence: first watch output showing the v0.78.0→v0.113.2 delta summary with the operator/gateway-touching releases called out; the checklist/workflow merged

### Binding-docs metadata-source sync
- id: `rm-117` | track: reliability | priority: 56.0 | status: in-progress (implemented in run f4622d7e's worktree 2026-09-20 — staged for the landing gate)
- signals: AGENTS.md, README.md, and copilot-instructions.md all say the redaction source repo is `fro-bot/.github` while src/server.ts has read `codeo1io/.github` since commit 4aa5d07 (2026-08-10) — even the metadata module's own doc comments and tests are stale; the fork's codeo1io/.github data branch holds a 219-byte repos.yaml with one repo and zero redacted entries, so the docs describe a stricter configuration than what actually runs (verified 2026-09-20)
- acceptance: all three binding docs name `codeo1io/.github` as the metadata denylist source (docs updated, not code — the code is correct); a grep over binding docs for the fro-bot/.github metadata claim returns nothing; metadata.ts doc comments and tests aligned in the same change
- evidence: grep output post-change across AGENTS.md, README.md, copilot-instructions.md, src/github/metadata.ts; pnpm lint exit 0; pnpm test green
- implementation note (2026-09-20, run f4622d7e implement): AGENTS.md:18, README.md:65, copilot-instructions.md:17, and the src/github/metadata.ts:4 doc comment now read `codeo1io/.github`; grep for the fro-bot/.github metadata claim returns nothing across the binding docs (metadata tests were already clean); pnpm lint exit 0, full suite 3018/3018. Outstanding: land
- review note (2026-09-20, IR-5): post-review residue — test/server.test.ts:210/248/254/288 test titles and comments still narrate `fro-bot/.github` (injection-based tests, assertions repo-agnostic — no functional impact, titles misstate production which reads codeo1io/.github since 4aa5d07); deferred to the next docs batch per the review's required action. NOT residue, leave untouched: `.github/renovate.json5:3` (shared renovate config repo — different semantics) and fro-bot.yaml:202 (agent prompt text)


### Document the Fro Bot workflow disable state
- id: `rm-109` | track: reliability | priority: 50.0 | status: completed (2026-09-19, run cf5527c1; landed on origin/main at 3075f4a — verified 2026-09-20: the AGENTS.md Fro Bot ops-conventions block records disabled_manually, the missing FRO_BOT_PAT, and the re-enable precondition; kept in place to preserve completed history)
- signals: fro-bot workflow disabled_manually on the fork (no FRO_BOT_PAT) — state lives only in GitHub settings, documented nowhere in-repo; re-enable would silently resume a broken daily cron
- acceptance: an ops note in binding docs records the disabled state, the reason (missing secret), and the re-enable prerequisites
- evidence: doc merged; a re-enable attempt following the note does not produce a failing run
- implementation note (2026-09-19, run cf5527c1): note added to the Fro Bot ops-conventions block in `AGENTS.md` (binding docs), citing `disabled_manually`, the missing `FRO_BOT_PAT`, and the re-enable precondition

### Aggregate complete check-suite counts
- id: `rm-110` | track: reliability | priority: 50.0 | status: in-progress (re-implemented 2026-09-20 in run f4622d7e's worktree — staged for the landing gate; the 2026-09-19 implementation in run-333ad19e's worktree never landed; origin/main still requests first: 10 with suite count 3017)
- signals: `src/github/aggregator.ts` requests `checkSuites(first: 10)` per commit — repos with more than 10 suites understate `failingChecks`; the failure-conclusion filtering itself is correct (verified against the GraphQL query)
- acceptance: paginate `checkSuites` (or raise the page with a documented ceiling) with a test fixture containing more than 10 suites proving full counting; MonitoringDto behavior unchanged otherwise
- evidence: new/updated aggregator test in `pnpm test`; fixture demonstrates >10 suites counted
- implementation note (2026-09-20, run f4622d7e implement): `checkSuites(first: 100)` at aggregator.ts:137/:174 plus a 12-suite regression test in test/aggregator.test.ts proving the sent query asks for 100 and that failingChecks sums all 12 suites (13, including the two past #10); local suite 1998 + 1020 = 3018/3018 and `first: 10` no longer appears anywhere in the file. Outstanding: land and prove suite 3018 on origin/main
- review note (2026-09-20, IR-6): the acceptance's `documented ceiling` currently lives only in the batch doc and the test comment — a one-line comment at aggregator.ts:137/:174 (GraphQL max page size; repos with >100 suites still understate failingChecks) is the accepted next-cycle rider where the next editor will look

### Aggregator hygiene batch
- id: `rm-118` | track: reliability | priority: 46.0 | status: candidate
- signals: four small verified defects in one file (src/github/aggregator.ts and neighbors) — the snapshot cache TTL equals the refresh interval so the cache never serves between refreshes (dead weight plus a false sense of caching); the denylistComplete doc comment and its code disagree; failed installation resolution has no negative caching so a dead install re-hits the GitHub API every cycle; and `.github/renovate.json5` persists with nothing invoking it since PR #1 deleted renovate.yaml — undocumented dead config inviting confusion with the landed dependabot (rm-102)
- acceptance:
  - cache TTL raised above the refresh interval or the cache removed with a comment recording why either is correct
  - denylistComplete comment corrected or the code aligned to the comment — one truth, tests unchanged in behavior
  - failed-installation resolution negatively cached with a short TTL and covered by a test
  - renovate.json5 deleted or an AGENTS.md line documents its inert state — no undocumented automation config remains
- evidence: pnpm test additions/updates for the TTL and negative-cache changes; pnpm lint exit 0; grep shows no undocumented renovate config

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
