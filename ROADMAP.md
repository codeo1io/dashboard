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
     decisions: docs/prioritization/2026-09-19-cycle-1-batch.md.
     manual-revision 2026-09-20 (run 779e7271, cycle-2 batch-2 implement — lineage reconciliation):
     the two divergent curated lineages were reconciled with this file (aa4ff9f) as base.
     Id-collision mapping applied verbatim from docs/prioritization/2026-09-20-cycle-2-batch-2.md:
     unlanded f4622d7e items renumbered rm-116 merge-hygiene, rm-117 security panel, rm-118 per-repo
     tokens, rm-119 gate-health roll-up, rm-120 gateway watch, rm-121 binding-docs sync (implemented
     this batch), and its rm-118 aggregator-hygiene folded into landed rm-112; this run's items
     renumbered rm-122 port upstream #481 (implemented this batch), rm-123 digest-drift, rm-124
     server/docs hygiene (implemented this batch). Landed-id meanings (rm-112..rm-115 at 916783f)
     unchanged. rm-100/rm-110/rm-113 closed against aa4ff9f outcomes (Main 35490785353 green,
     CodeQL 35490785207 green); rm-111 CLOSED at compound time — Release 35491419600 completed
     success at aa4ff9f with the '🚦 Enforce fixed HIGH/CRITICAL' Trivy step green (image 9e6cbb41,
     zero enforceable findings). cycle-2 outcome (2026-09-20, run 779e7271 compound): batch-2
     (B0/B2/B3/B4/B5) implemented and validated pre-review in this tree (lint/check-types/test
     3026/3026, actionlint container 0); review/shipping outcomes follow this phase and carry into
     the next cycle's assessment. Next-cycle candidates queued: rm-116, rm-119, rm-123, rm-117,
     rm-118, rm-120. Cycle lessons compounded to
     docs/solutions/workflow-issues/parallel-conductor-campaigns-frame-movement-collisions-2026-09-20.md,
     docs/solutions/best-practices/binding-doc-consistency-greps-avoid-pathspec-miss-2026-09-20.md, and
     docs/solutions/workflow-issues/codeql-semmle-typescript-home-2026-09-20.md -->
<!-- manual-revision 2026-09-20 (run a7ca0303, cycle-3, attempt 65d479e7):
  Re-applied the roadmap-phase hand extension that was lost to a session fault:
  the cbb47922 attempt returned a summary but its file/spool/breadcrumb writes
  did not survive (verified: empty git diff on ROADMAP.md, absent progress
  ndjson, absent delegate spool JSON).
  - Added open items rm-125..rm-131, evidence-backed this run (assess findings
    F1-F3 at 7de0de3; repository-extensions research pass 2 at
    docs/ideation/2026-09-20-repository-extensions-research-2.md).
  - Closed rm-121 / rm-122 / rm-124 as landed at 7de0de3, re-verified live:
    README.md:65 + AGENTS.md:18 name codeo1io/.github with zero fro-bot/.github
    metadata claims outside historical plan docs (rm-121); onError redaction +
    safe-detail at src/server.ts:478 (rm-122; worktree :486 after B2 edits); skippedMalformedCount
    warning + devAutoLogin allowlist + timingSafeEqual state compare at
    src/server.ts:354-377 (Guard A) and src/routes/auth.ts:110-115 (state compare; rm-124).
    Suite 3026 green at 7de0de3.
  - Cycle-3 batch selection + rationale:
    docs/prioritization/2026-09-20-cycle-3-batch.md (B0-B4).
  ## Directive to the render
  - Absorb rm-125..rm-131 and the three closures into the registry.
  - Keep the open queue priority-descending as interleaved below.
  - Do not drop Completed items or prior revision blocks.
-->
<!-- manual-revision 2026-09-20 (run a7ca0303, cycle-3, compound phase, attempt 31bab88b):
  Pre-review outcome fold (implementation + targeted-tests evidence only):
  - B1/B2/B3/B4 implemented in the run worktree at 7de0de3 (uncommitted,
    review/landing follow): rm-125 guard test, rm-112+rm-128 aggregator
    hardening, rm-129 metadata counter, rm-130 healthz real contract.
  - Gates at fold time: check-types exit 0, lint exit 0, suite 3040/3040
    (3026 at assess baseline +14 new), actionlint exit 0 (no workflow edits).
  - rm-102 rider executed: .github/renovate.json5 deleted (dead config since
    PR #1 removed renovate.yaml); dependabot.yml header rewritten to past
    tense; no binding doc carries a live renovate.json5 claim.
  - Statuses below updated to "implemented ... pending landing" with
    worktree+run evidence pointers so the next assess can verify cheaply
    instead of re-deriving (the rm-121/122/124 staleness lesson from B0).
  ## Directive to the render
  - Update the five status fields; keep priorities and queue order unchanged.
  - Do not move implemented items to Completed yet — landing follows review.
-->

**Vision**: A reliable, customer-friendly repository advanced by evidence-cited roadmap cycles owned by the autonomy loop

**Pillars**: reliability work outranks customer-experience work; every roadmap item cites reproducible codebase signals; acceptance is proven by cited evidence, never claimed

## Open items

### Harden the roadmap render (vendored-path exclusion, stack-correct evidence, lint-clean output)
- id: `rm-104` | track: reliability | priority: 98.0 | status: candidate (ESCALATED: failure recurred 2026-09-20)
- signals: the 2026-09-20 fleet render (2f3a884) repeated every defect class rm-104 predicted: bare-array prose broke `pnpm lint` at ROADMAP.md:20:32 (main unlandable; run 35479225529), pytest/ast evidence strings re-cited in a Node 24/pnpm/Vitest repo, all 21 signals again under vendored `.agents/skills/impeccable/**`, and — new this time — the manual-revision directive, superseded section, and all tracked open items rm-100/102/103/104/105/106/107/108/109/110 were silently deleted (88 deletions in `git show 2f3a884 -- ROADMAP.md`)
- acceptance:
  - next hermes-roadmap render emits zero signals under `.agents/skills/impeccable/**` (vendored-path exclusion)
  - rendered evidence strings reference repo-native commands only (`pnpm lint`, `pnpm check-types`, `pnpm test`, `gh run ...`), never pytest/ast tooling
  - `pnpm lint` exits 0 immediately after a render (generator lints its own output before commit)
  - manual-revision, superseded, and completed sections survive a render verbatim unless explicitly superseded; tracked items may only close with an explicit superseded marker citing evidence
- evidence: diff of ROADMAP.md across the next sync commit; `pnpm lint` exit 0 at that commit; upstream fro-bot tracking issue/PR link for the generator fix; delegate-side recovery recipe documented at `docs/solutions/workflow-issues/fleet-roadmap-render-clobber-recovery-2026-09-20.md` (compound-phase 2026-09-20)

### Land fork dependency automation — first-PR proof
- id: `rm-102` | track: reliability | priority: 90.0 | status: in-progress (config landed 3075f4a 2026-09-19; dead sibling .github/renovate.json5 deleted cycle-3 run a7ca0303; first dependabot PR evidence pending ~2026-10-03)
- signals: `.github/dependabot.yml` present on origin/main (landed at 3075f4a — verified by `git log origin/main -- .github/dependabot.yml`); Renovate never runs here (PR #1 deleted renovate.yaml; inert .github/renovate.json5 removed in the cycle-3 batch B2 tree — dead config deleted rather than documented); weekly cadence, first window opened 2026-09-19
- acceptance: first dependabot-authored PR visible within 14 days of 2026-09-19; grouped updates honored (npm, docker digests, github-actions; `open-pull-requests-limit: 3` for the single serialized runner); `pnpm test` green after the first merged automated bump
- evidence: `gh pr list --author "app/dependabot"` non-empty; merge commit's Main run green

### Automated upstream-absorb cadence with drift gate
- id: `rm-103` | track: reliability | priority: 85.0 | status: candidate
- signals: drift recurs by design — 2 commits behind on 2026-09-19, 6 behind on 2026-09-20 (node digests churn ~daily; two tag rebuilds in 24h); absorption is manual-only; upstream PR #481 (redaction chokepoint) MERGED upstream 2026-09-19 and ported by rm-122; upstream #493 (clonedeps-skill removal) must be SKIPPED on absorb — the fork keeps its clonedep artifacts deliberately as the v0.78.0 reference source (rm-120)
- implementation note (2026-09-20, f4622d7e lineage): the 2026-09-20 absorb's CONTENT (hono 4.13.8 + base digest 0e0ff40) landed as direct edits via rm-111 rather than a history merge, so upstream history stays ahead while content converged — a future history absorb must not double-apply (Dockerfile pins and pnpm-lock.yaml already sit at the upstream values)
- acceptance: scheduled workflow compares HEAD to `autonomy-upstream/main` and opens a human-approved merge PR when behind (auto-prepare + gate, never auto-push — fork exclusions demand human review); drift past a documented threshold opens an alert issue; #481 fast-followed within one cycle of merging upstream
- evidence: workflow run logs showing the compare step; merge PR links; `git rev-list --count HEAD..autonomy-upstream/main` → 0 (or ≤ threshold with an open alert)

### Wiki-writer exclusion guard: fail the build if upstream's write package ever lands
- id: `rm-125` | track: security | priority: 82.0 | status: implemented (cycle-3 run a7ca0303 batch B1; test/wiki-writer-guard.test.ts 4/4, gates green in run worktree at 7de0de3; pending landing)
- signals: upstream fro-bot/dashboard now ships a full `wiki-writer/` write-capable workspace package (research 2026-09-20: 20 package files plus references in 7 non-package files — configs, lockfile, test setup) — the fork's invariant-1 exclusion surface ballooned; today nothing fails if a manual upstream merge imports any of it (invariant: never a GitHub write code path)
- acceptance: a repo guard (test and/or script) fails when any `wiki-writer` path or reference lands outside the documented-mention allowlist (this roadmap, solutions docs, the guard itself); residue sweeps run WITHOUT file-extension filters (the extension-less Dockerfile hid COPY lines in past sweeps); guard green on the current tree, red on a seeded violation
- evidence: `pnpm test` includes the guard (green on the tree, red demonstrated against a scratch violation); upstream drift inventory in docs/ideation/2026-09-20-repository-extensions-research-2.md

### Supply-chain baseline v2: SBOM + build provenance in Release
- id: `rm-105` | track: security | priority: 80.0 | status: candidate
- signals: `.github/workflows/release.yaml` has no sbom/attest/provenance/cosign step (verified by grep, 2026-09-19) while Scorecard v2.4.4 is already green — attestations are the missing next rung of the 2026-07-31 security-workflow-baseline lineage
- acceptance: Release publishes the GHCR image with SBOM (syft) artifact and build provenance (`actions/attest-build-provenance`); verification reads the digest via the Digest line (`awk '/^Digest:/{print $2; exit}'` — the `--format` template is silently ignored for attestation-bearing indexes on this buildx) and confirms the attestation manifest exists
- evidence: release run log showing SBOM + attest steps green; registry manifest for the released digest shows attestation layer; docs note how an operator verifies (`docker buildx imagetools inspect` or `gh attestation verify`)

### Aggregator degradation and staleness semantics
- id: `rm-112` | track: reliability | priority: 75.0 | status: implemented — partial scope, descope recorded (cycle-3 run a7ca0303 batch B2 with rm-128 folded; aggregator.test.ts 56/56, gates green in run worktree at 7de0de3; pending landing)
- descoped (2026-09-20, review b8d2297d, registry-integrity amendment): of the original acceptance, cycle-3 B2 delivered the fail-closed/warm-empty core — silent per-repo drop now counted (unresolvedCount + negative cache), warm-empty preserve on enumeration failure with staleBanner (aggregator.ts:763/793/855). NOT delivered, deferred to the rm-107/rm-119 operator-facing remediation: per-repo absence entries, stale marker on partial (non-enumeration) resolver failure, MonitoringDto degradation signal (src/routes/api.ts:71-84 unchanged), and the operator-view staleBanner consumer (zero hits in web/src). Known residual feeding the same remediation: warm-empty preserve triggers only on enumerationFailed, so a zero-install enumeration with all-resolver-failure still serves fresh-empty without a banner (privacy-safe, reliability gap only). The registry must not read as acceptance-met.
- signals: `src/github/aggregator.ts` silently drops repos on resolver failure (line 686) and a warm-empty working set replaces `lastGoodSnapshot` with fresh-empty without a stale banner (lines 704-706), contradicting the file's own fail-closed cold-start path (lines 624-641); no test covers either branch (verified 2026-09-20); the operator cannot distinguish "all quiet" from "data lost"
- absorbed signals (2026-09-20, from the f4622d7e lineage item formerly rm-118 — aggregator hygiene batch): the snapshot cache TTL equals the refresh interval (60s) so the cache never serves between refreshes (dead weight plus a false sense of caching); the denylistComplete doc comment and its code disagree; failed installation resolution has no negative caching so a dead install re-hits the GitHub API every cycle; `.github/renovate.json5` persists with nothing invoking it since PR #1 deleted renovate.yaml — undocumented dead config inviting confusion with the landed dependabot (rm-102)
- acceptance: partial resolver failure serves last-good with an explicit stale marker and per-repo absence entries instead of silent drop; warm-empty never replaces last-good without a banner; MonitoringDto gains a degradation signal consumed by the operator view; both branches tested
- evidence: new aggregator tests in `pnpm test` covering resolver-failure and warm-empty paths; operator view renders a stale banner against a seeded degraded snapshot
- absorbed acceptance (f4622d7e lineage rm-118): cache TTL raised above the refresh interval or the cache removed with a comment recording why; denylistComplete comment corrected or code aligned — one truth; failed-installation resolution negatively cached with a short TTL and tested; renovate.json5 deleted or an AGENTS.md line documents its inert state

### Aggregator bounded concurrency and cycle telemetry
- id: `rm-128` | track: reliability | priority: 74.0 | status: implemented (folded into rm-112's cycle-3 B2 scope: bounded pool + cycleMs/skippedCycles/unresolvedCount telemetry; 56/56 green in run worktree at 7de0de3; pending landing)
- signals: per-repo status fetches run in a sequential for-loop (`src/github/aggregator.ts:714-731` at 7de0de3) against a fixed 60s interval (:789-795) and a 60s cache TTL (:717) that can never bridge a skipped cycle; at fleet scale ticks get skipped by the in-flight guard with no deadline awareness and no slow-cycle telemetry (run a7ca0303 assess F2)
- acceptance: per-repo fetches execute through a bounded concurrency pool (cap injectable for tests); each cycle logs its duration and repo count, warning when a cycle exceeds a slow-cycle threshold; pool cap documented; fake-timer test proves pooled behavior and the slow-cycle warning
- evidence: `pnpm test` new cases (pool bound honored, cycle-duration log fields, slow-cycle warning at threshold); diff of the aggregator refresh loop

### Operator push privacy-policy absorb; unblock listener digest push
- id: `rm-126` | track: security | priority: 72.0 | status: candidate (deferred to the absorb cycle, sequenced after rm-125 — its guard must land first)
- signals: upstream merged the public operator-push privacy policy (#495/#496, research 2026-09-20) — the precondition rm-106 names for listener digest push is now absorbable; otherwise the fork's listener channel keeps messages silent past retention
- acceptance: privacy policy ported with fork-accurate scope wording (read-only monitoring dashboard, no writes); rm-106's push/digest design may then proceed on a published policy; the absorb keeps the wiki-writer exclusion (rm-125 guard green through the merge)
- evidence: policy doc diff citing upstream PRs; guard test green at the absorb landing; rm-106 unblocked note

### Listener digest push
- id: `rm-106` | track: operator-experience | priority: 70.0 | status: candidate
- signals: VAPID push infra is live for run events while listener messages (deploy-health, autoheal, Daily Maintenance Report per `docs/contracts/operator-listener-channel.md`) age out silently under the 500-row/30-day retention — the channel replaced GitHub issues but kept a "must watch a surface" burden
- acceptance: push (rate-capped) or daily digest delivered on listener messages; noise calibration documented (what triggers immediate vs digest); upstream #238-style public push privacy policy published first or in the same change
- evidence: integration test covering the notify path in `pnpm test`; one live verified delivery to the operator's subscription; policy doc merged

### Metadata denylist: count object entries that fail the public predicate
- id: `rm-129` | track: reliability | priority: 66.0 | status: implemented (cycle-3 run a7ca0303 batch B3; metadata.test.ts 42/42, gates green in run worktree at 7de0de3; pending landing)
- signals: the public-entry classifier has no trailing else (`src/github/metadata.ts:331-343` at 7de0de3) — malformed object entries failing the field predicate are silently dropped uncounted, while the skippedMalformedCount warning (:275-282, :346-348) covers only non-object junk; contradicts its own silent-drops-are-never-invisible claim (run a7ca0303 assess F1)
- acceptance: object entries failing the predicate increment the same skippedMalformedCount (one counter, one truth); test covers wrong-typed and missing-field object entries alongside the existing scalar/array cases; no behavior change for valid or private/redacted entries
- evidence: `pnpm test` metadata case asserting skippedCount includes object junk; grep shows no uncounted drop path remains in the classifier

### Operator system-status panel
- id: `rm-107` | track: operator-experience | priority: 65.0 | status: candidate
- signals: monitoring-of-monitoring signals exist but scattered — `refreshedAt`/`staleBanner` in the MonitoringDto, GitHub rate-limit hooks live but log-only (`src/github/app-client.ts:73-79` `onRateLimit`/`onSecondaryRateLimit`), listener store depth, nothing composes them; the 2026-09-20 assess needed out-of-band `gh` commands to learn CI was red
- acceptance: one status surface composes snapshot freshness, rate-limit budget, listener store depth/age, and last refresh failures (fail-closed events); each composed signal has a test; no duplication of `/healthz` liveness semantics
- evidence: `pnpm test` includes tests for each composed signal; operator verification against a seeded stale snapshot renders the panel correctly

### PWA offline router absorb: replace the kill-switch service worker
- id: `rm-127` | track: reliability | priority: 62.0 | status: candidate (deferred to the absorb cycle, sequenced after rm-125)
- signals: upstream replaced the kill-switch `sw.ts` with a real deny-by-default PWA fetch router (research 2026-09-20) — gives the fork's vestigial workbox precache (vite.config.ts) a concrete absorb path instead of removing the wiring
- acceptance: upstream router absorbed with the operator-first fail-state rules preserved (docs/solutions/best-practices/operator-first-pwa-routing-and-fail-states-2026-06-26.md); offline behavior tested; no write capability introduced
- evidence: sw.ts diff citing upstream commit; web suite green; workbox wiring either used by the router or removed with a recorded decision

### Dated major-upgrade decision matrix
- id: `rm-108` | track: reliability | priority: 60.0 | status: candidate (reframed 2026-09-20 from open-ended watchlist)
- signals: measured 2026-09-20 — typescript 6.0.3 → 7.0.2 (native compiler, announced 2026-07-08; 7.0 ships no programmatic API — typescript-eslint still needs 6.x via the `@typescript/typescript6` side-by-side package); vitest 4.1.11 → 5.0.1 (the 3→4 migration already cost a cycle; flags/`basic`-reporter breaks documented in solutions docs); jsdom 29.1.1 → 30.1.0; Node 26 enters LTS 2026-10 under the new annual schedule (every release LTS 30 months) while the image pins node:24-slim; everything else measured current (octokit modular, vite 8.3.0, react 19.3.0, tailwind 4.3.3, workbox 7.4.1)
- acceptance: this roadmap or a linked doc carries an adopted-vs-available table refreshed each maintenance cycle, each row with a trigger date, blast radius, and go/no-go decision recorded at the date; majors absorb via upstream merges where possible, otherwise explicit upgrade PRs — never a silent ride; REST API-version pin (`X-GitHub-Api-Version: 2022-11-28`, src/auth/oauth.ts:130) reviewed on the same cadence (protective pin — 2026-03-10 REST removals verified unexposed)
- evidence: `npm view <pkg> version` outputs cited at each refresh; each adopted-major bump shows a green Main run before merge

### Merge-hygiene baseline: required checks on main plus drift alert
- id: `rm-116` | track: reliability | priority: 58.0 | status: candidate
- signals: `gh api /repos/codeo1io/dashboard/branches/main/protection` returns 404 "Branch not protected" and `/rulesets` is empty (probed 2026-09-20); nothing structurally blocks red-check merges — PR #4 merged 2026-09-19 17:51Z with TWO red checks on its own run (35459324430) and its defects became the cycle's P1 findings (rm-100); repo is public on a User account, where required status checks and rulesets are available; SECOND INSTANCE 2026-09-20 (f4622d7e review): the fleet render 2f3a884 landed by direct push with its own run already red — a second red landing after PR #4's red merge
- acceptance:
  - main protected (classic branch protection or a ruleset) with required status checks covering the Main workflow's job set (Test, Check Types, Check Workflows, Lint, Test Scripts Load, Design Check) plus CodeQL; strict-on-required-context where feasible
  - a periodic (weekly) workflow snapshots the protection/ruleset API state and alerts (open issue or failing check) on drift from the codified baseline
  - the hotfix override path documented in AGENTS.md (an admin merge over red checks becomes an explicit, visible decision, not a default)
- evidence: `gh api /repos/codeo1io/dashboard/branches/main/protection` returns the configured object post-change; drift-check workflow run log on first run; AGENTS.md note merged; PR #4-style merge attempt with red checks is blocked (observed on a throwaway branch)

### healthz: honor the documented contract
- id: `rm-130` | track: reliability | priority: 56.0 | status: implemented (cycle-3 run a7ca0303 batch B4; healthz populates lastFetch/rateLimit, dashboard.test.ts 46/46 green in run worktree at 7de0de3; pending landing)
- signals: README.md:48 documents `/api/healthz` returning `lastFetch` and `rateLimit`, but the handler hardcodes nulls (`src/routes/api.ts:79-81` at 7de0de3) — documented contract and implementation disagree (run a7ca0303 assess F3); no consumer reads the fields today, so the direction is free: populate from real state (default) or fix the doc
- acceptance: populate lastFetch from the aggregator snapshot's refreshedAt and rateLimit from the app-client rate hooks; single truth with README.md (no field documented-but-null); tests assert populated values against a seeded snapshot
- evidence: `pnpm test` healthz assertions; README.md:48 unchanged (code now matches it); grep shows no other doc repeating the old null contract

### Gate-health roll-up: workflow-run conclusions per repo
- id: `rm-119` | track: operator-experience | priority: 52.0 | status: candidate
- signals: REST actions/runs probed 2026-09-20 returning exactly the needed shape (latest runs at 5b8a2b3: Main=failure, CodeQL=failure, Scorecard=success); the 2026-09-19/20 gate reds sat invisible to operator-facing surfaces for ~26h (merged 17:51Z, found only by out-of-band assess); the dashboard renders check runs on commits but not workflow-level conclusions — and the week's failures lived at the workflow level (schema rejection before any check run existed)
- acceptance:
  - snapshot carries the latest conclusion per workflow at the default-branch tip (dedupe by workflow name, REST pagination with a documented ceiling — rm-110 discipline)
  - any red required-gate at the tip triggers the existing needs-attention surface
  - designed jointly with rm-107 as ONE status surface (repo gate health + monitor health), not two parallel panels — the joint-design decision recorded at plan time
- evidence: pnpm test for the roll-up path; fixture with multiple runs per workflow; manual verification against the live red Main/CodeQL state shows both surfaced

### Listener live stream over SSE
- id: `rm-131` | track: operator-experience | priority: 50.0 | status: candidate (deferred: needs a design pass; not in cycle-3)
- signals: the listener channel has polling only; the repo already runs two SSE implementations (server-side reader + browser parser) and an operator-stream precedent — a live tail is the natural extension (research 2026-09-20)
- acceptance: authenticated SSE endpoint streams listener events with backpressure/heartbeat semantics documented; browser consumer reuses the existing parser discipline; no listener content exposed beyond what the store already serves
- evidence: integration test with a seeded event; operator verification of a live tail; contract note in docs/contracts/operator-listener-channel.md

### Base-digest drift visibility: weekly read-only pin check
- id: `rm-123` | track: reliability | priority: 48.0 | status: candidate
- signals: node:24-slim moved through four digests in ~8 days (2fe369e → a9d7043 #491 → 0e0ff40 #492 (the pin since rm-111 landed) → live 5cbc7cab at 2026-09-20, `docker manifest inspect`); dependabot docker updates are weekly (rm-102), so the pin can silently trail a rebuilt, security-fixed base for days — drift is detectable today only by hand-run manifest inspection (exactly how the 779e7271 assess found the old pinned 2fe369e shipping libpcre2 10.42-1 while the live base shipped 10.42-1+deb12u1)
- acceptance: weekly scheduled workflow compares each Dockerfile pin to the live tag digest and opens/updates ONE tracking issue on drift (title carries pinned→live digests); GITHUB_TOKEN only — the fork has no secrets; strictly read-only — it never bumps the pin itself (dependabot owns bump PRs, rm-102); the workflow passes the actionlint container gate
- evidence: actionlint container exit 0 on the new workflow; first run log shows pinned digest, live digest, drift verdict; a dry-run mode prints the issue text verbatim for review

### Single-source the SSE parser invariants
- id: `rm-114` | track: reliability | priority: 45.0 | status: candidate (from run 270220e7 assess F5/F6)
- signals: the server reader and the browser parser are maintained by hand in parallel and share a live bug — the buffer cap counts UTF-16 code units against a BYTES-named constant (`src/gateway/operator-sse-reader.ts:35,526` and `public/operator-stream.js:44,2473`); the first-frame timeout park (operator-stream.js:2505) mirrors the same duplication
- acceptance: cap constant and normalization rules extracted to one shared source consumed by both the server reader and the browser bundle (shared module or build-time generation); divergence becomes a build/type failure rather than a live parser bug; multi-byte frame tests cover the corrected cap semantics
- evidence: single definition site; `pnpm test` includes multi-byte boundary-frame tests; grep shows no remaining duplicated literal

### Security-posture panel: Dependabot and code-scanning alerts per repo
- id: `rm-117` | track: security | priority: 44.0 | status: candidate
- signals: live probes 2026-09-20 — REST `/repos/codeo1io/dashboard/code-scanning/alerts?state=open` returns 10 OPEN alerts on this fork's main (1 critical CVE-2023-45853 + 9 high, created 2026-09-16, refs/heads/main) that no operator-facing surface shows, while the 2026-09-19 Release Trivy gate was green — alert triage lags the release state; GraphQL `vulnerabilityAlerts(states:OPEN)` works (0 open / 28 historical here) but GraphQL has NO code-scanning field (probed — REST only); the token mint already requests security_events and vulnerability_alerts read with graceful fallback (src/github/installations.ts FULL_READ_PERMISSIONS), so the permission plumbing predates the feature
- acceptance:
  - aggregator snapshot carries per-repo open-alert counts — Dependabot via GraphQL `vulnerabilityAlerts(states:OPEN)`, code-scanning via one REST call per repo — both behind the existing optional-permission graceful degradation (absent permission ⇒ field omitted, never an error)
  - counts render per repo with a needs-attention trigger; only counts and severity buckets are stored/rendered — no alert content beyond that
  - the 10 standing open code-scanning alerts are triaged (dismissed with reason or routed to fix work) and the panel reflects the triaged state — surfacing is the feature, triage is the operator decision it enables
  - rate-limit cost documented: one REST call per repo per cycle, batched with the same pagination/ceiling discipline as the check-suite query (rm-110 family)
- evidence: pnpm test coverage for both alert paths including the graceful-fallback case; seeded fixture with alert counts; operator verification against live data shows the triaged state

### Per-repo scoped installation tokens
- id: `rm-118` | track: security | priority: 42.0 | status: candidate
- signals: mintReadOnlyToken (src/github/installations.ts) mints installation-WIDE tokens — the redaction denylist constrains queries (aggregator excludes denylisted repos before any per-repo query) but a minted token's capability still spans the whole installation including denylisted/private repos; GitHub's create-installation-access-token endpoint accepts a repositories array to scope a token to named repos, so capability can be made to match query intent
- acceptance:
  - per-repo GraphQL/REST status queries use a token scoped to just that repo (repositories array param at mint); installation enumeration keeps the installation-wide token
  - per-repo tokens cached with the existing 55-min pattern; the 5000-mints-per-hour-per-installation cap documented as the budget ceiling (fleet size is far below it)
  - a test proves the scoping: the client seam rejects a repo-scoped token used against a sibling repo
- evidence: pnpm test includes the scoping/rejection test; code diff extends the mint signature and call sites; AGENTS.md security-invariant block notes the capability-scoping layer

### Gateway-contract drift watch for the mirrored agent source
- id: `rm-120` | track: reliability | priority: 36.0 | status: candidate
- signals: the cloned dependency source pins fro-bot/agent at v0.78.0 while upstream is at v0.113.2 — 75 releases of drift, with release bodies at v0.113.1, v0.113.0, v0.109.3, v0.107.1, v0.106.2 touching operator/gateway surfaces (gh api repos/fro-bot/agent/releases, 2026-09-20); AGENTS.md names this clone as the reference for the operator OAuth return path, GitHub App client, secret readers, and logger/Result primitives this app mirrors — and no process notices when that contract moves underneath the conformance tests
- acceptance: a periodic watch (checklist item in the maintenance cycle or a small workflow) compares the clonedep pin to the upstream latest tag; on drift, diffs the mirrored contract surfaces and records a short delta note (docs/solutions/ or the cycle batch doc) flagging conformance-test impact explicitly; the clonedep is refreshed on cadence, never auto-merged
- evidence: first watch output showing the v0.78.0→v0.113.2 delta summary with the operator/gateway-touching releases called out; the checklist/workflow merged

### CSRF tokens for listener ack mutations
- id: `rm-115` | track: security | priority: 30.0 | status: candidate (hardening; low severity)
- signals: `src/routes/listener.ts:121,130` accept session-authenticated state-changing POSTs (`/messages/:id/ack`, `/ack-all`) protected only by SameSite=Lax cookies, while logout already implements an explicit CSRF-token dance (`src/routes/auth.ts:168-190`) — an asymmetry; exploit window is narrow (Lax blocks cross-site POSTs except the fresh-cookie grace period) and impact bounded (ack state)
- acceptance: ack mutations require the same csrf-token pattern as logout (or equivalent origin check), with tests for the rejected cross-origin case; no behavior change for the operator's own client
- evidence: route tests in `pnpm test` covering token-missing rejection; manual operator flow unchanged

## Completed items

### Upstream absorb batch 2026-09-20 (node 0e0ff40, hono 4.13.8, retire in-image patch)
- id: `rm-111` | track: reliability | priority: 92.0 | status: completed (2026-09-20; landed at 916783f, Trivy proof at aa4ff9f)
- acceptance was: upstream content absorbed with fork exclusions preserved (no write code path; stricter read-only doc wording); all three Dockerfile pins at 0e0ff40; in-image libpcre2 patch removed; frozen-lockfile install clean; Release Trivy zero HIGH at the pushed sha
- completion evidence: pins at 0e0ff40 + patch retired in 916783f (content absorbed as direct edits, upstream history intentionally still ahead — see rm-116's double-apply note); Release run 35491419600 completed success at aa4ff9f with '🚦 Enforce fixed HIGH/CRITICAL vulnerabilities' conclusion=success (image ghcr.io/codeo1io/dashboard@sha256:9e6cbb41…, exit-code:1 fail-on-findings mode, zero enforceable findings); suite 3018 green at landing; absorb recipe at `docs/solutions/workflow-issues/upstream-lockfile-content-merge-2026-09-20.md`

### Restore required gates green at HEAD on main
- id: `rm-100` | track: reliability | priority: 100.0 | status: completed (2026-09-20; cycle-2 arc closed at aa4ff9f)
- acceptance was: Lint, Check Workflows (fro-bot.yaml job-env gate), and CodeQL Analyze green at HEAD on main via the self-hosted posture
- completion evidence: Main green at aa4ff9f (run 35490785353 — Lint + Check Workflows + full suite); CodeQL green (run 35490785207, SEMMLE_TYPESCRIPT_HOME round 2 landed aa4ff9f); the gates fixes landed at 916783f/aa4ff9f (runs 270220e7); root-cause solution doc `docs/solutions/workflow-issues/codeql-semmle-typescript-home-2026-09-20.md`

### Aggregate complete check-suite counts
- id: `rm-110` | track: reliability | priority: 55.0 | status: completed (2026-09-20; landed at 916783f)
- acceptance was: checkSuites raised past 10 with a fixture proving full counting
- completion evidence: `checkSuites(first: 100)` in both query variants at src/github/aggregator.ts:137/:174 with a 12-suite regression test in test/aggregator.test.ts; suite count 3018 at the landing tree; Main green at aa4ff9f (35490785353); page-ceiling comment rider (f4622d7e IR-6) applied at both query sites in the run-779e7271 batch-2 tree

### CI pin hygiene micro-batch
- id: `rm-113` | track: reliability | priority: 40.0 | status: completed (2026-09-20; landed at 916783f)
- acceptance was: setup-node at v7.0.0; single checkout pin repo-wide; container actionlint exit 0; Main green at the pushed sha
- completion evidence: checkout unified at v7.0.1 and setup-node at v7.0.0 incl. the setup composite (916783f); Main green at aa4ff9f (run 35490785353)

### Document the Fro Bot workflow disable state
- id: `rm-109` | track: reliability | priority: 50.0 | status: completed (2026-09-19; landed on origin/main at 3075f4a)
- acceptance was: an ops note in binding docs records the disabled state, the reason (missing secret), and the re-enable prerequisites
- completion evidence: `AGENTS.md` Fro Bot ops-conventions block (line 68) cites `disabled_manually`, the missing `FRO_BOT_PAT`, and the re-enable precondition; present at origin/main HEAD

### Port upstream security fix #481 — global redaction chokepoint
- id: `rm-122` | track: security | priority: 76.0 | status: completed (2026-09-20; landed on origin/main at 7de0de3)
- acceptance was: fork's buildDashboardApp registers `app.onError` (sanitized log line + generic 500 body, upstream parity); ported test intent — a secret-shaped throw never reaches the response body nor the log raw; existing handler behavior unchanged; full suite green
- completion evidence: `src/server.ts:478` at 7de0de3 registers onError with `logger.error` + `sanitizeErrorMessage` and a generic 500 with safe detail (486 in the cycle-3 worktree after B2 edits); ported redaction tests in test/dashboard.test.ts; re-verified live 2026-09-20 by run a7ca0303 assess; suite 3026 green at 7de0de3

### Binding-docs metadata-source sync
- id: `rm-121` | track: reliability | priority: 63.0 | status: completed (2026-09-20; landed on origin/main at 7de0de3)
- acceptance was: all binding docs name `codeo1io/.github` as the metadata denylist source; a grep over binding docs for the fro-bot/.github metadata claim returns nothing; metadata.ts doc comments and tests aligned in the same change
- completion evidence: README.md:65 and AGENTS.md:18 read `codeo1io/.github` at 7de0de3 (re-verified live run a7ca0303); repo-wide fro-bot/.github grep leaves only historical plan-doc references to the upstream repo itself (12 hits, all docs/plans/); suite 3026 green at 7de0de3

### Server and docs hygiene batch
- id: `rm-124` | track: reliability | priority: 26.0 | status: completed (2026-09-20; landed on origin/main at 7de0de3)
- acceptance was: devAutoLogin allowlist matches its comment; the malformed-entry count is logged as promised; the state comparison is timing-safe; the stale doc sentence corrected; gates green
- completion evidence: src/server.ts:354-377 (Guard A explicit development/test allowlist) and src/routes/auth.ts:110-115 (timingSafeEqual state compare) at 7de0de3; metadata.ts:275-282 and :346-348 skippedMalformedCount warning (re-verified live run a7ca0303); line refs corrected 2026-09-20 (review b8d2297d P2 drift fix); suite 3026 green at 7de0de3

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
