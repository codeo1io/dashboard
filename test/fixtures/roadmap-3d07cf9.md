# dashboard — Roadmap

> Autonomously maintained by the roadmap sync (reliability-first). Items cite reproducible codebase signals; acceptance is proven by cited evidence.

**Vision**: A reliable, customer-friendly repository advanced by evidence-cited roadmap cycles owned by the autonomy loop

**Pillars**: reliability work outranks customer-experience work; every roadmap item cites reproducible codebase signals; acceptance is proven by cited evidence, never claimed

## Fleet context

- upstreams (this repo builds on): .github
- graph: evidence-derived (imports/refs/deploy surfaces); advisory

## Open items

### Add test coverage for 20 untested module(s)
- id: `rm-022` | track: reliability | priority: 100.0 | status: candidate
- signals: reliability.no_tests:.agents/skills/impeccable/scripts/context-signals.mjs, reliability.no_tests:.agents/skills/impeccable/scripts/critique-storage.mjs, reliability.no_tests:.agents/skills/impeccable/scripts/detect-csp.mjs, reliability.no_tests:.agents/skills/impeccable/scripts/detector/design-system.mjs, reliability.no_tests:.agents/skills/impeccable/scripts/detector/detect-antipatterns-browser.js (+15 more)
- acceptance: Every module in ['.agents/skills/impeccable/scripts/context-signals.mjs', '.agents/skills/impeccable/scripts/critique-storage.mjs', '.agents/skills/impeccable/scripts/detect-csp.mjs', '.agents/skills/impeccable/scripts/detector/design-system.mjs', '.agents/skills/impeccable/scripts/detector/detect-antipatterns-browser.js', '.agents/skills/impeccable/scripts/detector/detect-antipatterns.mjs', '.agents/skills/impeccable/scripts/detector/engines/browser/detect-url.mjs', '.agents/skills/impeccable/scripts/detector/engines/regex/detect-text.mjs', '.agents/skills/impeccable/scripts/detector/engines/static-html/css-cascade.mjs', '.agents/skills/impeccable/scripts/detector/engines/static-html/detect-html.mjs', '.agents/skills/impeccable/scripts/detector/engines/visual/screenshot-contrast.mjs', '.agents/skills/impeccable/scripts/detector/node/file-system.mjs', '.agents/skills/impeccable/scripts/detector/profile/profiler.mjs', '.agents/skills/impeccable/scripts/detector/registry/antipatterns.mjs', '.agents/skills/impeccable/scripts/detector/shared/inline-ignores.mjs', '.agents/skills/impeccable/scripts/hook-admin.mjs', '.agents/skills/impeccable/scripts/hook-before-edit.mjs', '.agents/skills/impeccable/scripts/hook-lib.mjs', '.agents/skills/impeccable/scripts/lib/design-parser.mjs', '.agents/skills/impeccable/scripts/lib/impeccable-config.mjs'] has a corresponding test file with at least one passing test
- evidence: full suite green (python -m pytest -q) at HEAD; conductor validation digest validation:v1:<sha> recorded in the shipping PR

### Restore required gates green at HEAD on main
- id: `rm-100` | track: reliability | priority: 100.0 | status: in_progress
- acceptance: recorded from dashboard ROADMAP.md by campaign ingest
- evidence: campaign-recorded in dashboard ROADMAP.md

### Aggregator GraphQL queries are a live syntax error (//-comments inside templates)
- id: `rm-177` | track: reliability | priority: 97.0 | status: in_progress
- acceptance: the two comments become `#`-style or move outside the templates (the rm-110 ceiling note survives in valid form); a structural guard test asserts no exported query template contains a `//`-prefixed line (negative-verified); full suite green; the board's live data path recovers — proven by rm-179's canary or one recorded live query
- evidence: campaign-recorded in dashboard ROADMAP.md

### Lint gate blocked on main: ROADMAP paragraph-length cliff (rm-103 and rm-157 signals paragraphs)
- id: `rm-284` | track: reliability | priority: 97.0 | status: in_progress
- acceptance: the two paragraphs are split into blank-line-separated sub-paragraphs (blank line + 2-space indent, same list item) at plain-text boundaries into fragments ~2.4K chars, content byte-exact on rejoin — the proven cure measured 7317ch→14s rc=0 and 7967ch→13s rc=0 (run c06f7bf3d796, same attempt); CI Lint completes green well under the 35m timeout on the landing tree (post-fix reference: 53s); a length scan (awk 'length($0)>5000') finds no non-HTML-comment line above ~4K chars in ROADMAP.md; the rule errors masked beneath the timeout are fixed in the same pass — markdown/no-missing-label-refs fires on bracketed lists like `tags: [security, …]` (proven instance: docs/prioritization/2026-09-29-cycle-19-batch.md:4, landed bbc5b55 — backtick-wrap cures)
- evidence: campaign-recorded in dashboard ROADMAP.md

### Main Lint job times out on every push-to-main run — decompose it and defuse the ROADMAP signals-line pathology
- id: `rm-279` | track: reliability | priority: 96.0 | status: in_progress
- acceptance: (a) the Lint job decomposed so no single step can hit the ceiling — a repo-wide eslint step that EXCLUDES ROADMAP.md with a bounded timeout, plus a dedicated ROADMAP.md step linting the file per-line (or per-block) through a stdin-fed eslint invocation with a per-line timeout so one pathological line fails visibly instead of hanging the job; AND (b) a companion ledger refactor splitting the rm-103-class mega signals lines into multi-line lists so the pathology cannot regrow (coordinated with rm-104's render hygiene so the generator emits the split shape); proof = a green push-to-main Lint run at the new shape plus one follow-up push run green (not luck)
- evidence: campaign-recorded in dashboard ROADMAP.md

### Merge the stranded cycle-4 batch (PR #9) — drift detector, doc truth, supply-chain gate
- id: `rm-135` | track: reliability | priority: 95.0 | status: in_progress
- acceptance: PR #9 merged (or its payload cherry-picked) with the four-file conflict set resolved; ROADMAP rm numbering reconciled in the merge (the landed rm-131/rm-132/rm-133 keep their landed meaning, stranded duplicates renumbered); base-drift.yaml on main passes the actionlint container gate and its first scheduled run logs pinned and live digests; `minimumReleaseAge: 1440` active alongside the existing Exclude list; README badges resolve against codeo1io/dashboard and the endpoints list names /privacy and the listener routes; full suite green at the merge sha (the rm-126 lock test takes the count 3115 to 3116)
- evidence: campaign-recorded in dashboard ROADMAP.md

### Upstream absorb batch 2026-09-20 (node 0e0ff40, hono 4.13.8, retire in-image patch)
- id: `rm-111` | track: reliability | priority: 92.0 | status: in_progress
- acceptance: recorded from dashboard ROADMAP.md by campaign ingest
- evidence: campaign-recorded in dashboard ROADMAP.md

### Security floors + the audit-invisible hono pair: one lockfile refresh to audit-zero (GHSA-hrr3 hardens the fast-uri floor to 3.1.8)
- id: `rm-285` | track: reliability | priority: 92.0 | status: in_progress
- acceptance: floors go brace-expansion@2 >=2.1.7, brace-expansion@5 >=5.0.12, fast-uri@3 >=3.1.8 <4.0.0, undici@7 >=7.29.1 <8.0.0; the lockfile re-resolves to fast-uri 3.1.8, brace-expansion 2.1.7 + 5.0.12, undici 7.29.1, hono 4.13.11, @hono/node-server 2.1.3 — every one in-range for the package.json specifiers (no manifest edit); `pnpm audit -r` exits 0 re-probed LIVE at implement time; dependabot alerts #29/#30 close after the push; hono 4.13.12 (published 2026-09-30T09:43:03Z, routine — NOT the security line) is an optional in-range rider only after minimumReleaseAge maturity 2026-10-01T09:43Z
- evidence: campaign-recorded in dashboard ROADMAP.md

### base-drift digest extraction yields empty (gate can never pass)
- id: `rm-178` | track: reliability | priority: 91.0 | status: in_progress
- acceptance: extraction switched to the repo's proven convention (release.yaml's `docker buildx imagetools inspect` default pretty-dump `Digest:` line — the 2026-09-19 digest-parse solution doc family) OR a token-authed registry HEAD probe reading Docker-Content-Digest; empty extraction hard-fails as `extraction error`, never as drift; a manual dispatch goes green at parity (pin == live) before the 2026-09-28 cron; actionlint container-form gate passes
- evidence: campaign-recorded in dashboard ROADMAP.md

### Refactor 20 high-complexity function(s)
- id: `rm-021` | track: reliability | priority: 90.0 | status: candidate
- signals: reliability.complexity_hot:web/dist-fixture/assets/index-Vbpk-JbK.js::L1, reliability.complexity_hot:web/dist-fixture/assets/index-Vbpk-JbK.js::L1, reliability.complexity_hot:web/dist-fixture/assets/index-Vbpk-JbK.js::L1, reliability.complexity_hot:web/dist-fixture/assets/index-Vbpk-JbK.js::L1, reliability.complexity_hot:web/dist-fixture/assets/index-Vbpk-JbK.js::L1 (+15 more)
- acceptance: Each flagged function is decomposed below the branch threshold with behavior locked by characterization tests
- evidence: ast-based branch-count check passes at HEAD (full suite green; conductor validation digest validation:v1:<sha> recorded in the shipping PR)

### Land fork dependency automation — first-PR proof
- id: `rm-102` | track: reliability | priority: 90.0 | status: in_progress
- acceptance: first dependabot-authored PR visible within 14 days of 2026-09-19; grouped updates honored (npm, docker digests, github-actions; `open-pull-requests-limit: 3` for the single serialized runner); `pnpm test` green after the first merged automated bump
- evidence: campaign-recorded in dashboard ROADMAP.md

### Merge-residue guard test: assert the wiki-writer and renovate exclusions
- id: `rm-131` | track: reliability | priority: 88.0 | status: in_progress
- acceptance: a vitest test with no file-extension filters (the Dockerfile is extension-less) asserts zero occurrences of `wiki-writer` in Dockerfile, README.md, AGENTS.md, .github/copilot-instructions.md, vitest.config.ts, pnpm-workspace.yaml; asserts package-manager pnpm pinned 11.27.0 (upstream carries 11.8.0); asserts `.github/workflows/renovate.yaml` absent; asserts no `.conductor/` path is tracked; the test runs in Main so the class fails at PR time, not on push
- evidence: campaign-recorded in dashboard ROADMAP.md

### Repair the base-drift digest readback (broken sentinel) + digest-parse guard test
- id: `rm-166` | track: reliability | priority: 88.0 | status: in_progress
- acceptance: the live-digest readback switches to the proven form (`docker buildx imagetools inspect node:24-slim | awk '/^Digest:/{print $2; exit}'`) with an explicit empty-guard that fails with its own message distinguishing read-failure from drift; a re-dispatch run at the pushed sha logs BOTH digests and exits 0 at parity; rider (research C9): a workflow-statics guard test (pattern: test/release-trigger-paths.test.ts) fails any `manifest inspect` piped into a `/^Digest:/` awk across .github/workflows/ with a pointer to the buildx form — actionlint cannot catch this class
- evidence: campaign-recorded in dashboard ROADMAP.md

### Deterministic visual gate: pinned Playwright container image
- id: `rm-142` | track: reliability | priority: 86.0 | status: in_progress
- acceptance: visual job runs inside the mcr Playwright image matching the repo pin (or the documented lighter form: runs-on ubuntu-24.04 plus a written baseline-regen procedure); no runtime browser-install step remains; all three dark baselines regenerated once inside that image with provenance recorded in the visual spec header
- evidence: campaign-recorded in dashboard ROADMAP.md

### Port the rm-155 bounded-poll pattern to Monitoring.tsx (poll wedge fix)
- id: `rm-251` | track: reliability | priority: 85.0 | status: in_progress
- acceptance: the rm-155 pattern is extracted into a shared bounded-poll hook (useBoundedPoll or equivalent) consumed by BOTH Listener.tsx and Monitoring.tsx — fetch gains an internal deadline or the view races a ~15s abort, the latch releases in a finally on every path including rejection, and unmount aborts the in-flight controller; a web test pins that a never-settling fetch (deferred promise) cannot hold the latch past the bound and that unmount aborts
- evidence: campaign-recorded in dashboard ROADMAP.md

### PR-side Dockerfile validity gate: parse COPY sources before merge
- id: `rm-132` | track: reliability | priority: 84.0 | status: in_progress
- acceptance: a fast Node test parses Dockerfile COPY/ADD sources across both stages and fails when a referenced path does not exist in the tree — catching missing-context breakage in seconds without a docker build; runs in Main so the class fails at PR time; complements rm-131 (content exclusion) with structural validity
- evidence: campaign-recorded in dashboard ROADMAP.md

### GraphQL canary is born-broken in CI — no install step; its only-ever run was the cron's first fire, red and unwatched
- id: `rm-280` | track: reliability | priority: 84.0 | status: in_progress
- acceptance: EITHER canary.yaml gains `pnpm install --frozen-lockfile --ignore-scripts` OR the two Result helpers are inlined into the canary script so it stays genuinely zero-install — choice recorded in the workflow's comments; one workflow_dispatch run then executes every registered template green; the next weekly cron slot fires and goes green (closes rm-179's first-scheduled-fire watch and finally runs rm-225's live acceptance)
- evidence: campaign-recorded in dashboard ROADMAP.md

### Gateway contract forward-support: 1.7.0/1.8.0 fields, v0.116.0 401 semantics, and the v0.117.0 absorb riders (grows rm-157)
- id: `rm-252` | track: reliability | priority: 80.0 | status: in_progress
- acceptance: the operator contract version accepted extends additively to 1.8.0 (1.6.0/1.7.0/1.8.0); run-status renders checkout-advance provenance and distinguishes workspace-preparation failures from run failures and incomplete invocation (rm-157's acceptance rides here); 401 from a gateway at v0.116.0+ maps to an operator-actionable workspace-unavailable state rather than auth-required; BOTH parsers (src/gateway/operator-sse-reader.ts and public/operator-stream.js — see rm-253's wire-or-fold decision) grow the new fields exactly once; the workflow pin bumps to the absorbed agent version with the riders above
- evidence: campaign-recorded in dashboard ROADMAP.md

### Transitive override floors sit below every patched line — fast-uri carries two live high alerts
- id: `rm-276` | track: reliability | priority: 80.0 | status: in_progress
- acceptance: all four floors raised with GHSA rationale comments in the existing toml-override style — fast-uri@3 '>=3.1.8 <4.0.0', brace-expansion@2 '>=2.1.7 <3.0.0', brace-expansion@5 '>=5.0.12 <6.0.0', undici@7 '>=7.29.1 <8.0.0' (pnpm-workspace.yaml:25-33); lockfile re-resolved so every advisory-listed resolution moves to a patched line; `pnpm audit --recursive` reports 0 advisories; Dependabot alerts #29/#30 close after GitHub re-indexes; the lockfile diff touches only the four packages' resolution subtrees; the majors-cap question is recorded as a named follow-on (rm-252's absorb chain or rm-271's window), not silently widened
- evidence: campaign-recorded in dashboard ROADMAP.md

### Release-trigger completeness: pnpm-workspace.yaml is build-behavior input
- id: `rm-154` | track: reliability | priority: 78.0 | status: in_progress
- acceptance: pnpm-workspace.yaml listed in release.yaml push paths AND isHardReleasePath with a rationale comment; a structural sync-guard test parses the Dockerfile build-context sources and fails when any COPY source lacks a release-trigger surface (no file-extension or path filters — the Dockerfile is extension-less); negative-verified by removing the trigger and watching the guard redden; cross-gate consistency asserted (every hard-release literal reachable through the workflow filter)
- evidence: campaign-recorded in dashboard ROADMAP.md

### Tool/security pin refresh (codeql-action digest, pnpm, agent pin)
- id: `rm-191` | track: reliability | priority: 78.0 | status: in_progress
- acceptance: all codeql-action refs across .github/workflows equal 2892aa5; package.json packageManager pnpm@11.27.1 with `pnpm install --frozen-lockfile` clean; adopted by cherry-picking upstream commit content with fork exclusions preserved (never a wholesale merge — invariants #3206/#3210), no renovate/wiki-writer paths reintroduced (fork-exclusion-guard test green)
- evidence: campaign-recorded in dashboard ROADMAP.md

### Port upstream security fix #481 — global redaction chokepoint
- id: `rm-122` | track: reliability | priority: 76.0 | status: in_progress
- acceptance: recorded from dashboard ROADMAP.md by campaign ingest
- evidence: campaign-recorded in dashboard ROADMAP.md

### GraphQL canary coverage-completeness (every shipped template runs live)
- id: `rm-225` | track: reliability | priority: 76.0 | status: in_progress
- acceptance: the canary iterates EVERY exported query template — templates move behind an exported registry (array) in src/github/aggregator.ts so adding a template auto-extends coverage — each executing once read-only against a public repo with its sha256 logged; a suite guard asserts the canary's template set equals the exported registry (the completeness dual of rm-179's structural guard); a workflow_dispatch trigger enables on-demand firing; a deliberate broken-query dry-run reddens it (carried over from rm-179's evidence half)
- evidence: campaign-recorded in dashboard ROADMAP.md

### Absorb the upstream operator-push privacy policy (#495/#496)
- id: `rm-125` | track: reliability | priority: 74.0 | status: in_progress
- acceptance: the policy feature is hand-ported with fork layout — the fork's server.ts and web app have diverged, so port intent, not a line merge (same discipline as rm-122): a `/privacy` route serves the static policy page in fork chrome, the claims module and its tests are ported and green, the AppShell link lands, and the upstream drift accounting reflects #495/#496 absorbed while #493 stays skipped per rm-103
- evidence: campaign-recorded in dashboard ROADMAP.md

### Pin dependabot major versions until migrations are planned
- id: `rm-133` | track: reliability | priority: 74.0 | status: in_progress
- acceptance: dependabot.yml ignore rules for major-version updates of vitest, typescript and pnpm with a dated re-evaluation comment naming the migration owner; a docs decision note recording which majors are deliberately deferred and why; minor and patch updates stay open
- evidence: campaign-recorded in dashboard ROADMAP.md

### Push reconcile sweep hangs forever with no service-worker registration; the opt-in dead-end claims to be temporary
- id: `rm-272` | track: reliability | priority: 74.0 | status: in_progress
- acceptance: the sweep's getLocalSubscription path is bounded by the same withTimeout discipline as :325/:426 (or resolves a registration-absent state explicitly); a test with no SW registration and a never-settling serviceWorker.ready proves the sweep completes, reports not-subscribed, and does not leak a pending promise per focus event; the 'sw-not-ready' copy distinguishes permanent unavailability (no registration / flag off) from initializing, or the UI derives the state from registration presence instead of a pending promise
- evidence: campaign-recorded in dashboard ROADMAP.md

### Override-floor refresh to the publishable set, gated only on `pnpm audit -r == 0`
- id: `rm-282` | track: reliability | priority: 74.0 | status: in_progress
- acceptance: floors raised — fast-uri@3 `>=3.1.8 <4.0.0` (stays 3.x unless a deliberate fast-uri@4 escape is chosen), brace-expansion@2 `>=2.1.7 <3.0.0`, brace-expansion@5 `>=5.0.12 <6.0.0`, undici either interim `>=7.29.1 <8.0.0` (resolves 7.30.0, OSV-clean but audit still nonzero) or DURABLE `>=8.10.2 <9.0.0` paired with jsdom 29.1.1→30.1.1 (jsdom 30.1.1's undici dep is `^8.10.2`) — the durable pair is the only path to the gate `pnpm audit -r == 0`, re-probed at implement time and re-confirmed by per-advisory OSV reads on the final resolved set; lockfile re-resolved on the raised floors with `minimumReleaseAge: 1440` respected; the brace-expansion alert re-checked after the rescan push (auto-close expected; manual dismiss only if it sticks)
- evidence: campaign-recorded in dashboard ROADMAP.md

### Absorb fro-bot/agent v0.115.0 (operator-contract drift)
- id: `rm-157` | track: reliability | priority: 72.0 | status: in_progress
- acceptance: pin bump to v0.115.0 or later rides a gateway-verified change — GATEWAY_OPERATOR_TRUSTED_PROXIES documented in docs/runbooks/gateway-access.md alongside the proxy topology it assumes, local mirror surfaces (operator-client, sse-reader conformance tests) re-checked against the v0.115.0 contract, full suite plus a live gateway login regression before merge; concrete 1.7.0 surface work (added 2026-09-24, run 41c7d471 roadmap): PINNED_CONTRACT_VERSION -> 1.7.0, parser/Dto plumbing for checkoutProvenance (commit / branch-or-detached / dirty / mid-git-op) and the two new failureKinds, fixture-harness parity fixtures for both new shapes, and the operator run detail rendering the provenance — the release's own payoff: readers see which code a persistent workspace actually ran; the pnpm 11.27.1 rider lands in the same batch
- evidence: campaign-recorded in dashboard ROADMAP.md

### Restore client push delivery via a minimal push-only service worker
- id: `rm-249` | track: reliability | priority: 72.0 | status: in_progress
- acceptance: a minimal push-only service worker registered alongside the existing shell (no fetch handler, no precache manifest — compatible with either rm-138 outcome), wired through sw-notification.ts's orphaned helpers; subscribe.ts reaches a real subscription or a distinguishable failure state; the joint decision with rm-138 recorded in the cycle batch doc; rm-106's digest/push delivery rides it once the gateway-side send contract (rm-106's first dependency discovery) exists
- evidence: campaign-recorded in dashboard ROADMAP.md

### rm-225 canary born-broken at module resolution — isolate the query registry so the canary needs no install
- id: `rm-288` | track: reliability | priority: 72.0 | status: in_progress
- acceptance: PREFERRED shape — isolate the registry: move REPO_STATUS_QUERY_REGISTRY and its templates into a dependency-free module (types + template strings only, zero imports — e.g. src/github/query-registry.ts) imported by both aggregator.ts and the canary, so the canary imports zero runtime deps and the CLASS is fixed; test/query-shape-guard.test.ts completeness tests re-target the new module; the canary executes every registered template green in CI on the first scheduled fire or a manual dispatch after landing; rejected alternatives recorded in the entry — an install step (cold pnpm ~1min per weekly cron, cures only this instance) and inlining src/result.ts (REJECTED: the runtime re-export is the documented extraction seam 'same source as the gateway runtime', src/result.ts:1-10)
- evidence: campaign-recorded in dashboard ROADMAP.md

### Reality canary for the GitHub data path (verify the real transport contract)
- id: `rm-179` | track: reliability | priority: 71.0 | status: in_progress
- acceptance: (c) lands with rm-177; (a) OR (b) lands as a scheduled canary (weekly, read-only, GITHUB_TOKEN only, never writes) whose red means the real API would reject our query today; the canary log shows a hash of the exact query text it executed; alert route documented (run conclusion + issue)
- evidence: campaign-recorded in dashboard ROADMAP.md

### serveStatic double-decode advisories: land @hono/node-server 2.1.3 + hono 4.13.12 with a bypass regression test
- id: `rm-498` | track: reliability | priority: 70.0 | status: in_progress
- acceptance: 
- evidence: campaign-recorded in dashboard ROADMAP.md

### failingChecks drill-down: workflow title + attempt via additive GraphQL fields
- id: `rm-192` | track: reliability | priority: 68.0 | status: in_progress
- acceptance: query adds checkSuites.nodes.workflowRun { displayTitle runAttempt } and checkRuns node name/detailsUrl; query remains strictly read-only (zero mutations); exported-query guard + weekly canary (rm-177/179) updated to cover the new selection and green against the live API; RepoCiStatus DTO gains the fields with mapper tests; the SPA renders workflow title/attempts for red repos with a pinned snapshot test
- evidence: campaign-recorded in dashboard ROADMAP.md

### Release-trigger corpus: single source for hard-release paths, locked both ways
- id: `rm-248` | track: reliability | priority: 68.0 | status: in_progress
- acceptance: one corpus module (scripts/release-paths.ts) consumed by the guard and locked BIDIRECTIONALLY against the workflow's on.push.paths filter by test/should-release.test.ts (yaml-parsed; every corpus entry appears in the filter AND every filter entry is either corpus or explicitly whitelisted trigger-only — package.json, pnpm-lock.yaml; additions AND removals red); .github/actions/setup/** recorded as deliberately outside the corpus (release.yaml invokes actions/setup-node but never the ./.github/actions/setup composite — main.yaml/codeql.yaml/fro-bot.yaml do — and a change there cannot alter the shipped image)
- evidence: campaign-recorded in dashboard ROADMAP.md

### OAuth PKCE (S256) for the operator login flow
- id: `rm-149` | track: reliability | priority: 66.0 | status: in_progress
- acceptance: the authorization redirect carries state AND an S256 code_challenge; the verifier lives in a short-lived HttpOnly SameSite=Lax cookie mirroring the state pattern; the token exchange sends code_verifier and rejects mismatches; tests cover challenge-absent rejection at exchange, verifier-mismatch rejection, and the happy path; grep shows code_challenge wired at the single redirect builder
- evidence: campaign-recorded in dashboard ROADMAP.md

### Bound the installations enumeration transport (rm-156 fetch seam)
- id: `rm-267` | track: reliability | priority: 66.0 | status: in_progress
- acceptance: the enumeration Octokit gets `fetch: createBoundedFetch(...)` at installations.ts:338; the transport-timeout contract regex tightened so a bare `timeout:` WITHOUT a fetch seam fails the suite; hung-upstream regression fixtures prove the BOUND (not the inert timeout) terminates the walk; the deadline inversion documented or corrected in the same change
- evidence: campaign-recorded in dashboard ROADMAP.md

### Bound the /auth/logout body read for real (the rm-268 cap is post-hoc)
- id: `rm-497` | track: reliability | priority: 66.0 | status: in_progress
- acceptance: 
- evidence: campaign-recorded in dashboard ROADMAP.md

### Operator 401 remap: workspace-unavailable is not session-expiry on gateway ≥v0.116.0
- id: `rm-265` | track: reliability | priority: 64.0 | status: in_progress
- acceptance: recorded from dashboard ROADMAP.md by campaign ingest
- evidence: campaign-recorded in dashboard ROADMAP.md

### Binding-docs metadata-source sync
- id: `rm-121` | track: reliability | priority: 63.0 | status: in_progress
- acceptance: recorded from dashboard ROADMAP.md by campaign ingest
- evidence: campaign-recorded in dashboard ROADMAP.md

### Gateway v0.114.1 trusted-proxy contract: runbook and config pairing
- id: `rm-150` | track: reliability | priority: 62.0 | status: in_progress
- acceptance: docs/runbooks/gateway-access.md documents the env, the header contract, and the failure signature (operator surfaces failing closed after a gateway upgrade); a verification recipe lands (curl sequence or log signature) an operator can run before/after a gateway upgrade; the AGENTS.md gateway-topology note references the requirement
- evidence: campaign-recorded in dashboard ROADMAP.md

### CodeQL default-setup false positive on the PKCE S256 test digest (recurring landing-pipeline hazard)
- id: `rm-281` | track: reliability | priority: 62.0 | status: in_progress
- acceptance: at the 2ee1c4841e9d landing (or before, on that lineage) the carrying PR's CodeQL check is green with the annotation addressed by suppression-or-refactor, recorded in the landing batch doc; the ledger carries the recipe so it is never re-derived a third time: test-only PKCE/token digests take `// codeql[js/insufficient-password-hash]` on the line immediately above the site (test-only edits keep validation_digest invariant when the digest derives from changed src surfaces) OR the no-direct-hash refactor, chosen once and cited thereafter
- evidence: campaign-recorded in dashboard ROADMAP.md

### SSE readers: CRLF split across read chunks forges a phantom record boundary
- id: `rm-477` | track: reliability | priority: 62.0 | status: in_progress
- acceptance: both parsers carry pending-CR state across chunks (or defer normalization until after boundary search) — the fix lands in BOTH src/gateway/operator-sse-reader.ts and public/operator-stream.js exactly once, riding rm-253's wire-or-fold decision (if the twin is folded, the browser parser is the only one to fix); regression tests in both suites splitting a CRLF frame exactly at the CR and exactly at the LF; the rm-114 property suite gains a chunk-boundary-split generator case; LF-only streams keep byte-identical behavior (no new record emission)
- evidence: campaign-recorded in dashboard ROADMAP.md

### Outbound HTTP timeouts and refresh watchdog
- id: `rm-156` | track: reliability | priority: 60.0 | status: in_progress
- acceptance: every outbound client carries an explicit timeout sized per call class (metadata read, GraphQL, gateway proxy, token mint) — the @octokit request timeout option and AbortSignal.timeout() on raw fetches are the standard primitives; the aggregator records refresh duration and a watchdog marks the snapshot degraded when a refresh exceeds a documented ceiling, feeding rm-107's composed status surface; tests inject a hung upstream and assert bounded cycle time plus the degradation marker
- evidence: campaign-recorded in dashboard ROADMAP.md

### Per-cycle GitHub API budget: memoize installation resolution, add conditional reads
- id: `rm-162` | track: reliability | priority: 60.0 | status: in_progress
- acceptance: installation resolution memoized with an explicit invalidation path (404 or cache TTL) so steady-state cycles make zero resolver calls; the metadata contents read and repo-list pagination carry If-None-Match from a stored ETag and treat 304 as unchanged; before/after per-cycle request counts recorded
- evidence: campaign-recorded in dashboard ROADMAP.md

### serveStatic middleware-bypass security releases sit in-range and audit-invisible (@hono/node-server 2.1.3 + hono 4.13.11+)
- id: `rm-277` | track: reliability | priority: 60.0 | status: in_progress
- acceptance: lockfile re-resolve moves @hono/node-server to 2.1.3+ and hono to 4.13.11+ (4.13.12 measured latest 2026-09-30) with package.json ranges unchanged; the stale hono@4.13.9 minimumReleaseAgeExclude entry is removed in the same change; `pnpm audit -r` re-run on the moved versions confirms zero NEW indexed advisories (and the entry records that the bump's security rationale is release-notes-based, pending a GHSA); gates green
- evidence: campaign-recorded in dashboard ROADMAP.md

### Aggregator cold-start in-flight degradation contract
- id: `rm-197` | track: reliability | priority: 59.0 | status: in_progress
- acceptance: (1) cold getSnapshot serves bannered empty (explicit not-fresh) while any refresh may be in flight; (2) every GitHub transport call time-bounded (request.timeout via the AppClientOptions seam, default 30s); (3) interval installed independently of the first refresh completing; (4) stalled transport trips the existing FAILED-refresh banner path
- evidence: campaign-recorded in dashboard ROADMAP.md

### Denylist-telemetry integrity: make the cross-format warning mean what it says
- id: `rm-161` | track: reliability | priority: 58.0 | status: in_progress
- acceptance: denylistComplete computed as the comment stated (membership of every redacted entry in the derived databaseId set) or the warning reworded to match implemented semantics; both channels apply the same node_id OR database_id check; tests cover legacy-format and R_-format redacted entries plus a cross-format leak attempt
- evidence: campaign-recorded in dashboard ROADMAP.md

### rm-182
- id: `rm-182` | track: reliability | priority: 57.0 | status: in_progress
- acceptance: (1) empty LIVE digest fails the job with a DISTINCT message naming extraction failure (never a drift verdict); (2) a curl-based fallback (Docker Hub token auth + registry HEAD, or `crane digest`) runs when the primary extraction yields nothing — recipe verified working from this environment this run; (3) a drift verdict requires BOTH digests non-empty in the run log; (4) actionlint clean
- evidence: campaign-recorded in dashboard ROADMAP.md

### Int64-safe denylist membership against Octokit type widening
- id: `rm-151` | track: reliability | priority: 56.0 | status: in_progress
- acceptance: denylist membership checks accept both number and bigint forms via a single normalization helper (or the guard re-keys on the string node_id only, with the database guard normalized); a regression test constructs a bigint database id and asserts the deny still matches; a comment at the Set declaration cites the upstream precedent
- evidence: campaign-recorded in dashboard ROADMAP.md

### should-release rule 2 must consult lockfile changes (devDep-only skip can ship a changed runtime image)
- id: `rm-167` | track: reliability | priority: 56.0 | status: in_progress
- acceptance: rule 2 skips ONLY when the diff is devDeps-only AND pnpm-lock.yaml is unchanged; a lockfile change in a devDep-only PR forces the release-decision path; a table-driven test covers the four quadrants (devDep/runtime x lockfile-unchanged/changed) including an in-range runtime-resolution move inside a devDep-only diff
- evidence: campaign-recorded in dashboard ROADMAP.md

### In-range lockfile refresh (hono, @hono/node-server, vite patch)
- id: `rm-196` | track: reliability | priority: 56.0 | status: in_progress
- acceptance: `pnpm update hono @hono/node-server vite` within declared ranges only — majors excluded (those are rm-108/rm-133 territory); manifest edits limited to same-major floor-raises and the vite exact-pin patch 8.3.0→8.3.1 (amended 2026-09-25 review fix c8b926e6: the implement batch did legitimately raise floors hono ^4.7.11→^4.13.8 and @hono/node-server ^2.0.0→^2.1.1, which the original wording forbade); full suite + `pnpm build:web` green; `pnpm outdated` shows those three at in-range latest
- evidence: campaign-recorded in dashboard ROADMAP.md

### Stranded SSE connections on drift and first-frame-timeout exits
- id: `rm-261` | track: reliability | priority: 56.0 | status: in_progress
- acceptance: every non-close exit from the read loop either cancels the reader or aborts the controller (drift, submitted-unobservable, and the http-status paths audited in the same pass); connect() aborts any prior live controller before replacing it; a regression test drives first-frame-timeout then manual retry repeatedly and asserts the number of live connections stays at one (fetch/abort spy counts)
- evidence: campaign-recorded in dashboard ROADMAP.md

### Aggregate complete check-suite counts
- id: `rm-110` | track: reliability | priority: 55.0 | status: in_progress
- acceptance: recorded from dashboard ROADMAP.md by campaign ingest
- evidence: campaign-recorded in dashboard ROADMAP.md

### Fork-truth the fro-bot maintenance prompt's dependency-ownership claims
- id: `rm-136` | track: reliability | priority: 55.0 | status: in_progress
- acceptance: the ownership paragraph names dependabot (weekly window, rm-102) as the bump owner and notes the major pins (rm-133); the dead .github/renovate.json5 either deleted in the same change (folding rm-112's fourth absorbed acceptance) or explicitly documented as inert; the absence-claim sweep rule from rm-124 applied — any doc sentence asserting a tool's absence changes in the same change that alters the fact
- evidence: campaign-recorded in dashboard ROADMAP.md

### Triage the standing container critical: zlib1g CVE-2023-45853 (no fix ships)
- id: `rm-205` | track: reliability | priority: 55.0 | status: in_progress
- acceptance: alert #67 annotated with the disputed/no-fix rationale and links; a docs/solutions entry records the triage decision and the re-check trigger; the next base-digest bump re-scans and either closes the alert (if Debian ships a fixed zlib1g) or re-documents it — dismissal-without-rebuild is explicitly out of scope
- evidence: campaign-recorded in dashboard ROADMAP.md

### Cookie-key canonical-format enforcement
- id: `rm-206` | track: reliability | priority: 55.0 | status: in_progress
- acceptance: the encoded key form must be the exact canonical encoding of its decoded bytes — hex at 2 chars/byte or padded base64 at 4 chars per 3 bytes, decoding to ≥32 bytes; non-canonical encodings, degenerate (single-repeated-byte) keys, and raw passphrases throw fail-fast with specific messages at load; documented in README.md's Configuration section
- evidence: campaign-recorded in dashboard ROADMAP.md

### Security-posture transparency: name the by-design Scorecard deviations
- id: `rm-143` | track: reliability | priority: 54.0 | status: in_progress
- acceptance: one posture surface (README section or docs/runbooks/security-posture.md) lists every sub-score below 8 with its reason and owner; once stranded rm-134's payload lands, the badge resolves to the fork's own score
- evidence: campaign-recorded in dashboard ROADMAP.md

### Push-subscription lifecycle correctness: abort windows and metadata validation
- id: `rm-163` | track: reliability | priority: 54.0 | status: in_progress
- acceptance: post-success abort either moves the check before the POST or compensates with unsubscribe + gateway delete; malformed metadata surfaces a distinguishable, logged, testable state instead of folding into absence; tests cover the abort-race window with a deferred signal and the malformed-metadata branch
- evidence: campaign-recorded in dashboard ROADMAP.md

### Release build context ships git state and local secrets to the daemon (.dockerignore absent)
- id: `rm-186` | track: reliability | priority: 54.0 | status: in_progress
- acceptance: 
- evidence: campaign-recorded in dashboard ROADMAP.md

### Runtime parsers for operator-client approval/run responses
- id: `rm-193` | track: reliability | priority: 52.0 | status: in_progress
- acceptance: operator-contract gains parsers for the four responses with malformed-input fail-closed tests (missing/typed-wrong fields → Result error, never undefined deref); boundary casts stay `as unknown as X` at the fetch seam only; check-types + lint green
- evidence: campaign-recorded in dashboard ROADMAP.md

### Transitive dev-dep vulnerability detection has no automation path (no audit gate; version-updates are direct-only; floors beat enabled security updates)
- id: `rm-278` | track: reliability | priority: 52.0 | status: in_progress
- acceptance: a scheduled `pnpm audit --recursive` gate exists (design respects the epoch constraint — no heavyweight CI rider: e.g. a weekly low-timeout job that files a visible signal on findings, not a new required check) OR a recorded decision declines it and names the manual cadence that replaces it; dependabot.yml's header comment states the floor limitation (security updates cannot re-resolve past a satisfying override) instead of presuming coverage; the dependabot_security_updates toggle state is recorded in the ledger with a dated probe so the next assess does not re-litigate the crossed-read history
- evidence: campaign-recorded in dashboard ROADMAP.md

### Cache gateway-mode session validation (bounded revocation-latency decision)
- id: `rm-419` | track: reliability | priority: 52.0 | status: in_progress
- acceptance: 
- evidence: campaign-recorded in dashboard ROADMAP.md

### Workflow duration and flakiness trends per repo
- id: `rm-216` | track: reliability | priority: 51.0 | status: in_progress
- acceptance: 
- evidence: campaign-recorded in dashboard ROADMAP.md

### Document the Fro Bot workflow disable state
- id: `rm-109` | track: reliability | priority: 50.0 | status: in_progress
- acceptance: recorded from dashboard ROADMAP.md by campaign ingest
- evidence: campaign-recorded in dashboard ROADMAP.md

### Property-based tests for the SSE parsers and listener ingest
- id: `rm-144` | track: reliability | priority: 50.0 | status: in_progress
- acceptance: fast-check property suites cover arbitrary SSE fragmentations (multi-byte splits, CRLF/LF mixes, comment lines, retry fields) for both parsers plus round-trip and rejection properties for ingest payloads; suites run inside `pnpm test`; a seeded counterexample demonstrates one caught regression
- evidence: campaign-recorded in dashboard ROADMAP.md

### Approvals aging + attention ordering on the operator surface
- id: `rm-194` | track: reliability | priority: 50.0 | status: in_progress
- acceptance: createdAt bucketing (fresh / >24h / >72h) with visual emphasis; unread-first then age-descending ordering pinned by a test; SSE live appends preserve the ordering invariant
- evidence: campaign-recorded in dashboard ROADMAP.md

### Operator stream stall watchdog and a Last-Event-ID resume decision
- id: `rm-220` | track: reliability | priority: 50.0 | status: in_progress
- acceptance: an idle-frame watchdog (missed-heartbeat or wall-clock) marks the stream stale visibly in the UI; an explicit decision recorded on resume — adopt Last-Event-ID end-to-end (gateway reader support required) or decline with a written rationale and a reconnect-gap bound; tests cover stall detection and the chosen reconnect behavior
- evidence: campaign-recorded in dashboard ROADMAP.md

### operator-sse-reader.ts: wire it or fold it (zero production callers, and 1.8.0 doubles the cost of a dead twin)
- id: `rm-253` | track: reliability | priority: 50.0 | status: in_progress
- acceptance: a recorded decision — either the server-side reader becomes the single parsing source (public/operator-stream.js becomes a thin served consumer or is replaced by a module built from the reader), or the dead twin is folded into the public parser's test surface and the extraction seam (rm-114/rm-220) is closed; the chosen shape carries rm-252's new fields exactly once with the property suite green
- evidence: campaign-recorded in dashboard ROADMAP.md

### Gateway session-validation roundtrip: cache or consciously keep per-request
- id: `rm-153` | track: reliability | priority: 48.0 | status: in_progress
- acceptance: a recorded decision — either a short-TTL (15-30s) session-validation cache with the revocation trade-off documented against the existing logout CSRF dance, or an explicit keep-per-request note with the reasoning; if cached: a test shows a gateway outage inside the TTL degrades gracefully while logout still wins; a latency note records the measured roundtrip cost
- evidence: campaign-recorded in dashboard ROADMAP.md

### Filter-free prose-residue guard test (live self-hosted claims, wiki-writer, absent-tool claims)
- id: `rm-164` | track: reliability | priority: 48.0 | status: in_progress
- acceptance: one vitest guard asserts zero LIVE claims about this repository's own CI/runners/tooling — self-hosted-runner claims, wiki-writer references, and absence-claims naming tools the repo no longer runs — sweeping the tree with NO file-extension filter and NO path-scope filter; the only exclusions an explicit allowlist of known-historical or external-deployment trees (docs/solutions/, docs/prioritization/, docs/ideation/, .agents/, node_modules/, web/dist/, .git/, .conductor/), each with a one-line justification comment, and prose that merely describes external deployments (the gateway runbook's topology) explicitly allowlisted rather than swept; the term list lives in one exported constant so future lessons extend one array; negative-verified by injecting a violation and watching the guard redden; green in pnpm test and Main
- evidence: campaign-recorded in dashboard ROADMAP.md

### Aggregator: match the generic FORBIDDEN message in the vulnerability-alerts permission-error path
- id: `rm-168` | track: reliability | priority: 48.0 | status: in_progress
- acceptance: the matcher covers the generic message while staying narrow (anchored to the alerts call site, never a global 403 swallow); a fixture test feeds the generic-message 403 and asserts the repo renders the permission-denied degradation rather than stale; a companion test confirms genuine failures still fail visible (rm-112 semantics)
- evidence: campaign-recorded in dashboard ROADMAP.md

### Fleet PR review-request / triage inbox
- id: `rm-224` | track: reliability | priority: 48.0 | status: in_progress
- acceptance: 
- evidence: campaign-recorded in dashboard ROADMAP.md

### Bounded-concurrency fleet refresh in the aggregator
- id: `rm-141` | track: reliability | priority: 47.0 | status: in_progress
- acceptance: per-repo fetches run under a bounded concurrency limit chosen against the rate-limit budget; snapshot ordering stays deterministic (the driftCount lock test and the staleness semantics from rm-112/rm-126 unchanged); suite green
- evidence: campaign-recorded in dashboard ROADMAP.md

### One corrupt links cell bricks the listener messages endpoint
- id: `rm-187` | track: reliability | priority: 47.0 | status: in_progress
- acceptance: 
- evidence: campaign-recorded in dashboard ROADMAP.md

### pnpm-store caching for hosted CI
- id: `rm-145` | track: reliability | priority: 46.0 | status: in_progress
- acceptance: the setup composite action enables setup-node cache pnpm (or an explicit actions/cache step keyed on pnpm-lock.yaml); the stale self-hosted rationale rewritten to hosted-runner reality; before/after install-step timings recorded
- evidence: campaign-recorded in dashboard ROADMAP.md

### Private-flag YAML robustness: quoted strings fail open
- id: `rm-152` | track: reliability | priority: 46.0 | status: in_progress
- acceptance: recorded from dashboard ROADMAP.md by campaign ingest
- evidence: campaign-recorded in dashboard ROADMAP.md

### Fleet rulesets-coverage panel (read-only, zero permission additions)
- id: `rm-218` | track: reliability | priority: 46.0 | status: in_progress
- acceptance: the aggregator's per-repo fetch gains a rulesets summary (count + whether any ruleset targets the default branch, includes_parents=true); repos without default-branch coverage surface in the attention view; redaction/denylist semantics unchanged (denylisted repos never queried, fail-closed preserved); REST read-only path only, no new permission in FULL_READ_PERMISSIONS; tests cover the covered/uncovered/error matrix (the error path fail-closes to unknown)
- evidence: campaign-recorded in dashboard ROADMAP.md

### Direct test coverage for the src/secrets.ts hardening branches
- id: `rm-228` | track: reliability | priority: 46.0 | status: in_progress
- acceptance: `test/secrets.test.ts` covers each branch — happy path + trailing-newline strip, PEM multiline preservation, ENOENT fall-through, optional-null, whitespace-only null, required-missing error naming both lookup paths, symlink refusal, directory, character device, FIFO (write end held by a detached child so openSync rendezvous instead of hanging), oversize abort, exactly-at-cap acceptance, embedded newline from file and from env — with ZERO executable changes to `src/secrets.ts`
- evidence: campaign-recorded in dashboard ROADMAP.md

### .dockerignore local-artifact seal (rm-186 completion rider)
- id: `rm-242` | track: reliability | priority: 46.0 | status: in_progress
- acceptance: .dockerignore carries test-results, playwright-report, .pnpm-store (unanchored); guard asserts the entry set AND matches dockerignore any-level semantics; no Dockerfile COPY source is excluded by the new entries
- evidence: campaign-recorded in dashboard ROADMAP.md

### Rate-limiter doc-vs-behavior truth: the static-asset operator budget is unreachable
- id: `rm-262` | track: reliability | priority: 46.0 | status: in_progress
- acceptance: one of two convergent ends — the comment tells the truth (static assets deliberately unthrottled at this layer, Caddy owns them, with the reason stated) or the gate classification actually covers them — backed by an assertion that fails on divergence: a static-path rate-limit test mirroring the /api/* shape, or a doc-guard test comparing the comment's claim against isSensitive
- evidence: campaign-recorded in dashboard ROADMAP.md

### 401 collapses into reason 'network' in the Listener and Monitoring fetchers
- id: `rm-273` | track: reliability | priority: 46.0 | status: in_progress
- acceptance: the fetch-error reason union gains 'unauthenticated' for 401 (distinct from transport failure) across listener.ts and monitoring.ts; Listener and Monitoring render an auth-expired affordance consistent with rm-208's badge design instead of a network error; web tests feed ok/401/rejected mocks per fetcher
- evidence: campaign-recorded in dashboard ROADMAP.md

### /auth/logout body cap must be enforced BEFORE buffering, and the post-read check must count BYTES — finished by rm-497
- id: `rm-512` | track: reliability | priority: 46.0 | status: in_progress
- acceptance: cap enforced at the wire BEFORE buffering (route-scoped middleware or a streaming byte counter) so chunked/absent-CL requests are cut at the 16 KiB boundary; the post-read comparison counts BYTES (Buffer.byteLength / value.byteLength) not UTF-16 units; chunked-TE and multibyte cases green in pnpm test.
- evidence: campaign-recorded in dashboard ROADMAP.md

### Endpoint-parity guard: README's Endpoints list must match the live Hono route table
- id: `rm-556` | track: reliability | priority: 46.0 | status: in_progress
- acceptance: 
- evidence: campaign-recorded in dashboard ROADMAP.md

### Listener replay upsert un-acks notifications
- id: `rm-169` | track: reliability | priority: 44.0 | status: in_progress
- acceptance: a replayed delivery preserves read_at and any operator-set mutable state — the upsert separates identity fields from mutable state; a test replays an acked webhook and asserts read_at survives; the replay-vs-redelivery distinction documented at the site
- evidence: campaign-recorded in dashboard ROADMAP.md

### Extend the weekly drift watch from base digests to dependency and action pins
- id: `rm-204` | track: reliability | priority: 44.0 | status: in_progress
- acceptance: the weekly workflow also diffs the fork's packageManager pin, workflow action pins, and key npm pins against upstream's values and npm latest, reporting divergence in the same single-tracking-issue discipline; strictly read-only — it never bumps (dependabot owns bumps, rm-102/rm-146); actionlint container gate green; first run logs the full drift table (digests + pins) for review (issues are disabled on this fork — the single-tracking-issue clause is recorded N/A-on-fork per review 584624d6 finding 4; the shipped discipline is the weekly report-only summary + warning annotations with dependabot the sole pin-mover; the clause revives only if issues are ever enabled)
- evidence: campaign-recorded in dashboard ROADMAP.md

### Decouple fleet-data availability from gateway availability in gateway-session mode
- id: `rm-226` | track: reliability | priority: 44.0 | status: in_progress
- acceptance: EITHER a short-TTL single-flight session cache (30-60s, invalidated on 401) with tests pinning the cache hit/expiry/invalidate paths, OR a recorded decision that per-request forwarding is the trust-boundary requirement and the coupling is accepted — in both cases the choice and rationale land in the trust-boundary doc, and fleet data in gateway-session mode serves from the aggregator cache regardless of gateway reachability
- evidence: campaign-recorded in dashboard ROADMAP.md

### Cache-Control: no-store consistency for token and listener-content GETs
- id: `rm-263` | track: reliability | priority: 44.0 | status: in_progress
- acceptance: all three routes (and any sibling authenticated JSON GET returning tokens or operator content, found by the same sweep) send Cache-Control: no-store; assertions pin the header per route so a new token/content route without it fails
- evidence: campaign-recorded in dashboard ROADMAP.md

### Rate-limit store admission cap (RATE_LIMIT_MAX_KEYS) — re-home the archived PR #233 U3
- id: `rm-286` | track: reliability | priority: 44.0 | status: in_progress
- acceptance: admission cap + stale-window sweep + fail-closed 429 land with tests (reusing the archived red test where it still compiles); RATE_LIMIT_MAX_KEYS documented in README's env table, counted by test/env-docs-guard.test.ts, and invalid values fall back to the default per the house env convention
- evidence: campaign-recorded in dashboard ROADMAP.md

### /static operator assets ship with no client-caching policy
- id: `rm-478` | track: reliability | priority: 44.0 | status: in_progress
- acceptance: an explicit recorded policy for /static/* — either no-cache + ETag revalidation middleware or content-hash filenames + immutable (rm-172's SPA-shell handler is the in-repo precedent for an explicit header policy; hashed filenames require updating the Operator.tsx loader to the hashed names); test/static-assets.test.ts gains Cache-Control/ETag assertions pinning the chosen policy so the choice cannot silently regress
- evidence: campaign-recorded in dashboard ROADMAP.md

### Unbounded operator client fetches: listener acks and the logout chain can wedge the UI
- id: `rm-501` | track: reliability | priority: 44.0 | status: in_progress
- acceptance: 
- evidence: campaign-recorded in dashboard ROADMAP.md

### Client polling hygiene batch (listener latch, unread-poll guard)
- id: `rm-155` | track: reliability | priority: 42.0 | status: in_progress
- acceptance: the Listener poll releases its latch in a finally block and aborts in-flight fetches on unmount (controller wired to the request signal), with a regression test seeding a never-settling fetch and asserting the next tick still polls; the App poll gains an in-flight guard, surfaces poll failure once (silent recovery allowed), and pauses while document.hidden (visibilitychange resumes with an immediate poll); no behavior change on the happy path
- evidence: campaign-recorded in dashboard ROADMAP.md

### CodeQL PinnedDependencies alert on the base-drift unpinned download
- id: `rm-209` | track: reliability | priority: 42.0 | status: in_progress
- acceptance: the step fetches pinned content — either download + sha256-verify against a digest constant recorded in the workflow, or an actions/github-script step reading the file via the GitHub API (no unpiped remote execute; landed form 2026-09-25: in-node fetch() + JSON.parse — bytes are parsed, never executed, so no digest constant is required); actionlint container-form gate stays green; the alert is dismissed-with-link once the fix lands; compound 2026-09-25 (run 71991cb3 compound d730c0da): the in-node fetch() replacement rode both engine full-gate greens (ephemeral PRs #170/#174, CodeQL Analyze SUCCESS each time — the pattern is clean at CI on the batch tree); the open alert object itself only updates on the default-branch scan AFTER landing, so the dismissal-with-link step stays queued for final_validation/landing
- evidence: campaign-recorded in dashboard ROADMAP.md

### Push subscribe abort windows before the POST strand the local subscription
- id: `rm-264` | track: reliability | priority: 42.0 | status: in_progress
- acceptance: both pre-POST abort windows unsubscribe the just-created browser subscription, or an explicit recorded decision why not (e.g. logout-purge ownership — then a comment plus a test pin that ownership); resubscribeStaleKey's window gets the same treatment
- evidence: campaign-recorded in dashboard ROADMAP.md

### Redaction single-char token boundary
- id: `rm-200` | track: reliability | priority: 41.0 | status: in_progress
- acceptance: boundary-anchored replacement covers tokens of length 1+ without mangling adjacent prose; nameArb widened to min length 1; regression test with 1-char owner and name proving standalone tokens scrub while embedded occurrences survive
- evidence: campaign-recorded in dashboard ROADMAP.md

### CI pin hygiene micro-batch
- id: `rm-113` | track: reliability | priority: 40.0 | status: in_progress
- acceptance: recorded from dashboard ROADMAP.md by campaign ingest
- evidence: campaign-recorded in dashboard ROADMAP.md

### Workflow pin-consistency and minor-bump batch
- id: `rm-137` | track: reliability | priority: 40.0 | status: in_progress
- acceptance: single sha-pinned discipline for checkout and upload-artifact across all workflows including visual.yaml; the three npm minors ride the first dependabot window (~2026-10-03) where possible rather than manual same-day adoption while minimumReleaseAge is inactive on main (activate it via rm-135 first); gates green at the pushed sha
- evidence: campaign-recorded in dashboard ROADMAP.md

### Mint fallback scopes transient errors out of the permission-subset degradation
- id: `rm-170` | track: reliability | priority: 40.0 | status: in_progress
- acceptance: the fallback triggers only on permission-shaped errors (403 with the App-permissions shape); transient errors retry or fail the refresh visibly without caching a scope-less token; tests cover both error classes; a log marker distinguishes fallback-by-permission from mint-failure
- evidence: campaign-recorded in dashboard ROADMAP.md

### Snapshot trend sparkline (failingChecks/openPr history)
- id: `rm-195` | track: reliability | priority: 40.0 | status: in_progress
- acceptance: history source + retention window defined and tested (single-point, empty, and window-boundary cases); small SVG/CSS sparkline (no new chart dependency) in the monitoring surface rm-107 selects; DTO documented
- evidence: campaign-recorded in dashboard ROADMAP.md

### Fork-exclusion guard misses the re-injectable .github/renovate.json5
- id: `rm-213` | track: reliability | priority: 40.0 | status: in_progress
- acceptance: 
- evidence: campaign-recorded in dashboard ROADMAP.md

### gateway-access runbook: v0.116.0 deployment coupling and bearer-token facts
- id: `rm-254` | track: reliability | priority: 40.0 | status: in_progress
- acceptance: gateway-access.md gains a v0.116.0+ upgrade section: image coupling, bearer-token-on-every-route, the 401→workspace-unavailable semantic, and a pre-upgrade checklist item requiring the dashboard's contract support (rm-252) to be at or past the target gateway version before the pin moves (2026-09-29 integrate fold, ex rm-266: the section also carries a pin-parity table naming the deployed gateway version, the fork workflow pin, and the mirror contract version)
- evidence: campaign-recorded in dashboard ROADMAP.md

### Cap the /auth/logout body (public-path buffer parity)
- id: `rm-268` | track: reliability | priority: 40.0 | status: in_progress
- acceptance: /auth/logout caps its body (the readBodyCapped pattern or Hono bodyLimit) returning 413 BEFORE parsing; a test pins oversized-body rejection on /auth/logout; a repo-wide guard (test or lint rule) that no other public route parses an uncapped body
- evidence: campaign-recorded in dashboard ROADMAP.md

### Migrate the last hand-rolled poll (App.tsx) onto useBoundedPoll and decide hidden-tab semantics once
- id: `rm-479` | track: reliability | priority: 40.0 | status: in_progress
- acceptance: the only poll lifecycle under web/src is useBoundedPoll's (grep-verified: no remaining hand-rolled setInterval+AbortController poll copies); hidden-tab behavior decided ONCE and encoded as a hook option (pauseWhenHidden, defaulting to the semantics the views need) or documented as deliberately absent; the config-frozen-at-mount contract either made reactive or pinned by the hook's doc comment plus a config-change test
- evidence: campaign-recorded in dashboard ROADMAP.md

### Publish /.well-known/security.txt
- id: `rm-245` | track: reliability | priority: 39.5 | status: in_progress
- acceptance: 
- evidence: campaign-recorded in dashboard ROADMAP.md

### Dependabot auto-merge for grouped patch/minor PRs
- id: `rm-146` | track: reliability | priority: 38.0 | status: in_progress
- acceptance: only after rm-116 lands, dependabot.yml sets automerge with target patch then minor on the npm and docker groups; majors stay manual (rm-133); the first auto-merged PR shows green required checks before merge
- evidence: campaign-recorded in dashboard ROADMAP.md

### rm-183
- id: `rm-183` | track: reliability | priority: 38.0 | status: in_progress
- acceptance: (1) with trusted-proxy off, the limiter emits exactly ONE warning per process lifetime once it observes multiple distinct XFF values against a single direct address (the detector itself rate-limited); (2) docs/runbooks/gateway-access.md gains a verification step (two-source curl through the proxy, confirm distinct buckets); (3) suite covers the log-once behavior
- evidence: campaign-recorded in dashboard ROADMAP.md

### Scheduled-workflow failures have no watch path — rm-179's promised alert route never landed
- id: `rm-289` | track: reliability | priority: 38.0 | status: in_progress
- acceptance: a documented, negative-proven alert route for scheduled-workflow failures — either (a) a GITHUB_TOKEN-only self-watch (scheduled or piggybacked on an existing cron: query each guard workflow's latest conclusion via the Actions API and open/update ONE tracked issue on red, close on green) or (b) a dashboard surface (panel or /api/__status field) surfacing guard-workflow conclusions to the operator; the chosen route is documented in a docs/runbooks/ section; a forced-red dry-run (workflow_dispatch of the canary with a deliberately broken GITHUB_REPOSITORY) demonstrably surfaces through the route within one scheduled cycle
- evidence: campaign-recorded in dashboard ROADMAP.md

### Rate limiter coverage decision: the logout pair sits outside every class
- id: `rm-500` | track: reliability | priority: 38.0 | status: in_progress
- acceptance: 
- evidence: campaign-recorded in dashboard ROADMAP.md

### Graceful shutdown: handle SIGTERM/SIGINT
- id: `rm-171` | track: reliability | priority: 36.0 | status: in_progress
- acceptance: the server installs SIGTERM/SIGINT handlers that stop accepting, drain in-flight work (bounded), close the listener store, and log the shutdown reason; a container stop during a streaming request logs the drain instead of dying mid-frame; the drain path is tested or evidenced by a documented procedure
- evidence: campaign-recorded in dashboard ROADMAP.md

### Visual gate never fires on the operator runtime (paths filter gap)
- id: `rm-207` | track: reliability | priority: 36.0 | status: in_progress
- acceptance: pull_request paths gain `public/**`, `web/index.html`, and `web/vite.config.ts`; a guard test (or lint rule) asserts the paths filter covers every non-test surface the fixture server serves, so a new public/ file cannot silently escape the gate; a PR touching only `public/operator-stream.js` shows the visual check as required — demonstrator OUTSTANDING at landing (review 2026-09-25 b310d051: no pr/ci tool ran it this cycle; backstop = the unfiltered push trigger on main fires the gate on every landing push; verify on this batch's landing PR before closing)
- evidence: campaign-recorded in dashboard ROADMAP.md

### Gateway-session auth: pin the single-operator allowlist
- id: `rm-219` | track: reliability | priority: 36.0 | status: in_progress
- acceptance: the gateway-session branch requires the session's operator identity to be in the configured operator allowlist, failing closed on mismatch; a test covers foreign-operator session rejection
- evidence: campaign-recorded in dashboard ROADMAP.md

### Surface per-repo preflight-pin verification from the Daily Maintenance Report
- id: `rm-250` | track: reliability | priority: 36.0 | status: in_progress
- acceptance: once the deployed gateway pins past v0.112.0, DMR rows carry the per-repo preflight-verification state rendered distinctly from pass/absent; contract tests cover the new payload fields; docs/runbooks note the failure signature
- evidence: campaign-recorded in dashboard ROADMAP.md

### Both SSE parsers keep only the last `data:` line of a record (spec: concatenate with \n)
- id: `rm-484` | track: reliability | priority: 36.0 | status: in_progress
- acceptance: both parsers concatenate consecutive data lines with \n in ONE change (src/gateway/operator-sse-reader.ts + public/operator-stream.js, per the both-parsers discipline); test/operator-sse-reader.test.ts and test/operator-stream-core.test.ts each gain a record whose JSON payload is split across two data lines and assert the reassembled frame parses; test/sse-parser.property.test.ts extends its generator to emit multi-line data records; existing single-line fixtures stay green unchanged
- evidence: campaign-recorded in dashboard ROADMAP.md

### fast-uri floor is stale: '>=3.1.5' admits the GHSA-58mr-gqgx-xq4g version
- id: `rm-499` | track: reliability | priority: 36.0 | status: in_progress
- acceptance: 
- evidence: campaign-recorded in dashboard ROADMAP.md

### Container deploy hardening: VOLUME for the listener store, HEALTHCHECK, and a loud missing-/data failure mode
- id: `rm-513` | track: reliability | priority: 36.0 | status: in_progress
- acceptance: Dockerfile declares VOLUME for the listener db directory and a HEALTHCHECK hitting /api/healthz via a node one-liner (no curl/wget dependency on the slim image); server startup FAILS LOUD (non-zero exit) when the listener store cannot initialize, or /api/healthz reports the degraded store state — one chosen and recorded in the entry; a runbook snippet shows the failure mode observable from outside the container; README deploy section updated to match the actual behavior.
- evidence: campaign-recorded in dashboard ROADMAP.md

### Shared test fixtures must be field-complete for required payload fields
- id: `rm-190` | track: reliability | priority: 35.0 | status: in_progress
- acceptance: shared fixture factories (makeEnumerateResult and kin) carry every required field with a comment tying fields to the payload type, or construct from a typed literal so adding a required field breaks the fixture at check-types time; a repo convention line (AGENTS.md or the solutions doc) states that a phase's claimed test counts are not evidence for the next phase — the gate re-runs the authoritative command
- evidence: campaign-recorded in dashboard ROADMAP.md

### eslint --cache: make the local lint gate practical
- id: `rm-256` | track: reliability | priority: 35.0 | status: in_progress
- acceptance: the lint script gains --cache --cache-location node_modules/.cache/eslint (under node_modules — no .gitignore churn); a warm repeat run on an untouched tree completes in a small fraction of the cold run; CI behavior unchanged (fresh checkout, cold path)
- evidence: campaign-recorded in dashboard ROADMAP.md

### Approval-surface fetch bound: timeout the decide/CSRF mutation fetches
- id: `rm-594` | track: reliability | priority: 35.0 | status: in_progress
- acceptance: decide/refreshCsrf/listRunApprovals fetches carry a signal bounded by a named constant (10s parity with CANCEL_FETCH_TIMEOUT_MS) behind the same feature-detect; a never-resolving decide fetch returns controls to actionable within the bound and renders a bounded error state (keep the never-resolving branch unit-level, like the SSE reader precedent; fixture-harness E2E variant optional since buildApprovalClient already takes fixtureSessionId); zero behavior change on healthy paths.
- evidence: campaign-recorded in dashboard ROADMAP.md

### Drop the eight unused workbox runtime dependencies
- id: `rm-128` | track: reliability | priority: 34.0 | status: in_progress
- acceptance: the eight direct `workbox-*` devDependencies are removed (`vite-plugin-pwa` retained only if the vite config still consumes it — verify first); frozen-lockfile install clean; `pnpm lint`, `pnpm check-types`, and `pnpm test` green; the repo-wide grep still shows zero workbox imports
- evidence: campaign-recorded in dashboard ROADMAP.md

### Boot-time last-known snapshot bridge
- id: `rm-198` | track: reliability | priority: 34.0 | status: in_progress
- acceptance: persist the last good snapshot (node:sqlite mirroring the listener-store pattern) and serve it at boot bannered-stale until the first refresh completes; decision frame: restart-only semantics with no intra-cycle TTL, no API-budget motive, explicit supersession of the rm-112 rationale recorded in the implementing batch doc
- evidence: campaign-recorded in dashboard ROADMAP.md

### Deadline racing + stall watchdog on the aggregator refresh cycle
- id: `rm-222` | track: reliability | priority: 34.0 | status: in_progress
- acceptance: 
- evidence: campaign-recorded in dashboard ROADMAP.md

### DASHBOARD_MONITORING_REFRESH gate (bounded monitoring refresh)
- id: `rm-223` | track: reliability | priority: 34.0 | status: in_progress
- acceptance: 
- evidence: campaign-recorded in dashboard ROADMAP.md

### Surface gateway run-status checkout provenance
- id: `rm-247` | track: reliability | priority: 34.0 | status: in_progress
- acceptance: on/after the agent pin passes v0.115.0, the operator run view renders starting-checkout provenance (commit, branch, dirty flag) and distinguishes workspace-preparation failures from run failures; stream/status rendering handles the incomplete-invocation terminal state explicitly (never displayed as success); the vendored contract types in src/gateway/ extend with tests; docs/runbooks note the new fields
- evidence: campaign-recorded in dashboard ROADMAP.md

### Runbook: gateway/workspace image-upgrade coupling and pin-parity note
- id: `rm-266` | track: reliability | priority: 34.0 | status: in_progress
- acceptance: recorded from dashboard ROADMAP.md by campaign ingest
- evidence: campaign-recorded in dashboard ROADMAP.md

### Toolchain majors window: vitest 5, jsdom 30, pnpm 12 (TS 7 rides rm-133's re-eval); in-range refreshes and the impeccable@4 decision
- id: `rm-271` | track: reliability | priority: 34.0 | status: in_progress
- acceptance: one deliberate pass — vitest 5 evaluated on the full suite (46 server files + web) with breaking changes named or the bump declined in the entry; jsdom 30 and pnpm 12 evaluated with their migration notes; impeccable@4 tried against .impeccable/config.json (bump both or record why not); the in-range trio lands as a lockfile refresh rider; no bundled mega-PR — each major is its own landing
- evidence: campaign-recorded in dashboard ROADMAP.md

### ubuntu-latest alias-flip guard for non-containerized jobs
- id: `rm-188` | track: reliability | priority: 33.0 | status: in_progress
- acceptance: 
- evidence: campaign-recorded in dashboard ROADMAP.md

### Binding-docs truth batch 2 (README badge/endpoints, dependabot comment, vite kill-switch comment)
- id: `rm-134` | track: reliability | priority: 32.0 | status: in_progress
- acceptance: README badge resolves against codeo1io/dashboard; endpoints inventory names /privacy + listener routes; dependabot comment states the post-deletion truth; vite comment documents the fork divergence — verified in the cherry-picked worktree files (targeted_tests: actionlint/lint/types green)
- evidence: campaign-recorded in dashboard ROADMAP.md

### Origin validation-residue sweep (push-gated)
- id: `rm-159` | track: reliability | priority: 32.0 | status: in_progress
- acceptance: one push-authorized change closes stale `conductor/ci-base` PRs (`gh pr close`) and deletes stale `conductor/ci-*` and `conductor/ci-base-*` refs (`git push origin --delete`), leaving only refs for in-flight runs; the sweep checklist recorded in a solutions doc so future landing phases clean their own residue at push time
- evidence: campaign-recorded in dashboard ROADMAP.md

### Unread badge silently freezes on auth expiry or network failure
- id: `rm-208` | track: reliability | priority: 32.0 | status: in_progress
- acceptance: a 401 stops the poll loop and renders an auth-expired state (badge cleared, re-auth affordance consistent with existing session UX); a network-failure streak of ≥2 marks the badge stale (aria + title with last-good timestamp) instead of freezing silently; focused tests in web/src/App.test.tsx cover ok/401/network-resolved mocks for the poll loop
- evidence: campaign-recorded in dashboard ROADMAP.md

### launchRun lacks the stale-CSRF refresh-and-retry its three siblings and the browser twin implement
- id: `rm-485` | track: reliability | priority: 32.0 | status: in_progress
- acceptance: launchRun runs the same refresh-then-resend-once retry as its siblings (or a recorded decision declines it, corrects the asymmetry documentation, and names why the browser twin suffices for every current caller); test/operator-client.test.ts pins: 400-then-refresh-200 retries once with the SAME idempotency key, a failed token refresh surfaces the ORIGINAL error, and non-400 errors never retry; the four mutating methods' interface docs state their retry contract symmetrically
- evidence: campaign-recorded in dashboard ROADMAP.md

### web monitoring client misclassifies auth-expiry redirects as network failures — redirect twin added (timeout half already covered)
- id: `rm-515` | track: reliability | priority: 32.0 | status: in_progress
- acceptance: fetchMonitoring gains the redirect-followed guard BEFORE the JSON read (res.redirected maps to the unauthenticated reason), mirroring listener.ts:116's shape — inline twin chosen over a shared helper (the two fetchers' error unions and contract checks differ, and the cycle-1 stewardship contract keeps listener.ts out of the diff); a monitoring.test.ts case emulates the post-redirect Response shape (mirroring listener.test.ts's rm-421b case); NO listener.ts change; no client-internal timeout added (the useBoundedPoll race owns that half — disposition recorded).
- evidence: campaign-recorded in dashboard ROADMAP.md

### Degradation delivery (triggers for stale/degraded snapshots)
- id: `rm-199` | track: reliability | priority: 31.0 | status: in_progress
- acceptance: a chosen delivery form fires on snapshot degradation: fork-owned VAPID send, client-side SW local notification, or a gateway-contract extension ask (blocked-external, pairs with rm-157); the choice recorded with its trade-offs before implementation
- evidence: campaign-recorded in dashboard ROADMAP.md

### Listener client parse-drift visibility (dropped-message notice)
- id: `rm-243` | track: reliability | priority: 31.0 | status: in_progress
- acceptance: the parse layer exposes a dropped count; the Listener surface renders a visible notice whenever dropped > 0; a test feeds a drifted payload (one valid + one malformed message) and pins the notice text
- evidence: campaign-recorded in dashboard ROADMAP.md

### Resolve the PWA kill-switch vestige (decision: strip precache wiring or implement offline)
- id: `rm-138` | track: reliability | priority: 30.0 | status: in_progress
- acceptance: a recorded decision — strip: vite-plugin-pwa removed or reduced to the injectManifest kill-switch minimum with grep showing no precache configuration and web build output shrinking; or implement: a true offline shell with an explicit cache-policy note reconciled against the privacy claims; either way the decision and its privacy reasoning land in the cycle batch doc
- evidence: campaign-recorded in dashboard ROADMAP.md

### Stop re-reading the kill-switch file per request
- id: `rm-172` | track: reliability | priority: 30.0 | status: in_progress
- acceptance: the kill-switch state is read once at startup or cached behind a short mtime/stat guard; the '/' path performs no synchronous file I/O; a test covers the cached semantics (a flip honored within the documented bound or at restart)
- evidence: campaign-recorded in dashboard ROADMAP.md

### Docs-truth micro-batch 3: README stack list, vite precache comments, ideation exclusion set
- id: `rm-203` | track: reliability | priority: 30.0 | status: in_progress
- acceptance: README stack list describes the kill-switch service worker truthfully (binding-docs consistency invariant); vite.config comments state the kill-switch reality explicitly (independent of rm-138's architecture decision — comment truth does not wait on it); the ideation residue either reworded to read-only/exclusion wording or the ideation tree added to the documented exclusion set with the canonical grep form updated in the same change; pnpm lint green
- evidence: campaign-recorded in dashboard ROADMAP.md

### Fleet license and release columns at zero new scopes
- id: `rm-227` | track: reliability | priority: 30.0 | status: in_progress
- acceptance: the two fields added to BOTH exported query templates (riding rm-225's registry so the canary covers them); per-repo DTO and operator table gain license and last-release columns, absent-tolerant rendering; denylist and fail-closed semantics unchanged; no new permission in FULL_READ_PERMISSIONS; tests cover the present/null/error matrix; a note records what the fork's own null readings mean for rm-147; 2026-09-26 DEDUPE (integrate of run 8f151ba4, candidate 678fd6d, conflict case a911e1e1): the sibling cycle-7 batch independently proposed the latest-release half as its rm-144 (per-repo `releases(first: 1)` — name/tag/publishedAt/isLatest, introspection-verified under `contents:read`) — the SAME capability this item's `latestRelease{tagName,publishedAt}` already specifies, so no separate item is carried and the batch's acceptance wording folds here; this item remains the single owner of the release column, and the license column remains its own half
- evidence: campaign-recorded in dashboard ROADMAP.md

### aggregator installByDatabaseId: dead index or wire the join
- id: `rm-255` | track: reliability | priority: 30.0 | status: in_progress
- acceptance: either the join consults the database_id index (closing the silent skew path) or the map is deleted with a comment recording the node_id-only join rationale; a test pins whichever semantics is chosen (skew fixture for the wired case; absence-of-dead-code for the deleted case)
- evidence: campaign-recorded in dashboard ROADMAP.md

### rm-155 signals prune: the ledger must not point at landed code
- id: `rm-258` | track: reliability | priority: 30.0 | status: in_progress
- acceptance: rm-155's signals rewritten to the live api/listener.ts remainder with the landed Listener/App halves moved into its status as landed provenance; the wedge-class half is superseded by rm-251; the rewritten entry cites HEAD-verified line numbers
- evidence: campaign-recorded in dashboard ROADMAP.md

### pwa/ residue: logout-purge messages a SW that has no handler and purges caches nothing writes
- id: `rm-274` | track: reliability | priority: 30.0 | status: in_progress
- acceptance: either the residue is removed (purge reduced to what has an owner — e.g. the legacy-cache sweep only — with cache-names claims trued and tests shrunk to match) or a recorded decision keeps it as deliberate forward-wiring for rm-249's push-only SW, with a comment at the site and a test that pins the decision; no module doc claims an importer that does not exist
- evidence: campaign-recorded in dashboard ROADMAP.md

### env-docs guard census: widen to GATEWAY_* (GATEWAY_ALLOWED_OPERATOR_LOGINS is read live but absent from README)
- id: `rm-287` | track: reliability | priority: 30.0 | status: in_progress
- acceptance: the guard's census widens to include GATEWAY_* variables read in src/ (each must appear in README's env table); README gains the GATEWAY_ALLOWED_OPERATOR_LOGINS row (opt-in, unset/blank ⇒ no restriction — rm-219 semantics — cross-referencing the gateway-access runbook for the adjacent gateway-side vars that live out-of-repo); guard green
- evidence: campaign-recorded in dashboard ROADMAP.md

### rm-481
- id: `rm-481` | track: reliability | priority: 30.0 | status: in_progress
- acceptance: two concurrent full_tests phases both end ok=true (or the engine provably serializes them); no Lint CANCELLED attributable to poll-deadline contention
- evidence: campaign-recorded in dashboard ROADMAP.md

### Push idempotency key must fail closed, never fall back to randomness
- id: `rm-482` | track: reliability | priority: 30.0 | status: in_progress
- acceptance: mintIdempotencyKey returns null when the environment cannot mint securely and subscribeOptIn checks BEFORE any side effect (no browser subscription is started); no Math.random fallback remains anywhere in the push path
- evidence: campaign-recorded in dashboard ROADMAP.md

### Metadata validation parity: public entries enforce the same non-empty constraints as redacted ones
- id: `rm-483` | track: reliability | priority: 30.0 | status: in_progress
- acceptance: public entries enforce non-empty required strings; an entry failing parity falls through to the counted malformed-skip branch (skippedCount warning) instead of entering publicRepos as garbage
- evidence: campaign-recorded in dashboard ROADMAP.md

### upstream-drift gate can SIGPIPE itself before opening its alert issue — sed consumer swapped in
- id: `rm-516` | track: reliability | priority: 30.0 | status: in_progress
- acceptance: the log pipeline's consumer becomes sed -n '1,15p' (reads the whole stream, cannot SIGPIPE the producer) — a local replica of the exact pipeline at a large behind-count exits 0 with the intended truncated listing (transcript in the cycle batch doc); actionlint + pnpm lint green; the Monday 2026-10-05 05:17Z first scheduled fire (RED-by-design at 24 behind, rm-103's alert half) lands as exit-1-with-issue, not 141.
- evidence: campaign-recorded in dashboard ROADMAP.md

### Complete persist-credentials on the remaining unhardened workflow checkouts
- id: `rm-527` | track: reliability | priority: 30.0 | status: in_progress
- acceptance: all five sites set persist-credentials: false; a structural guard (test/workflow-persist-credentials-guard.test.ts, landed with this item) fails if any actions/checkout step in .github/workflows/ lacks the key, with a scan-liveness floor (>=16 steps) so it cannot pass vacuously
- evidence: campaign-recorded in dashboard ROADMAP.md

### Response compression posture (decision-first, proxy-verified)
- id: `rm-602` | track: reliability | priority: 30.0 | status: in_progress
- acceptance: decision recorded FIRST — verify the production Caddyfile's encode posture via the marcusrbrown/infra checkout (runbook dependency) and if the proxy already compresses, record that citation and close; otherwise app-layer implementation: post-build zlib/gzip sidecar step, serveStatic precompressed:true, and a static-assets test pinning Vary: Accept-Encoding + variant selection on the sidecar; compression MUST NOT apply to SSE streams (operator-stream) — that exclusion is part of the acceptance
- evidence: campaign-recorded in dashboard ROADMAP.md

### rm-184
- id: `rm-184` | track: reliability | priority: 29.0 | status: in_progress
- acceptance: metadata validation treats every non-false, non-absent private value as private (fail-closed), routes such entries into redactedNodeIds BEFORE any GraphQL query, counts malformed private values in the existing skip counter, and tests cover string/number/null variants
- evidence: campaign-recorded in dashboard ROADMAP.md

### Aggregator/shutdown lifecycle re-entry hardening
- id: `rm-201` | track: reliability | priority: 29.0 | status: in_progress
- acceptance: start() re-entry is a documented no-op returning the existing lifecycle; stop() idempotent; shutdown claim matches behavior
- evidence: campaign-recorded in dashboard ROADMAP.md

### Listener retention prune-overflow visibility (aged-out count)
- id: `rm-244` | track: reliability | priority: 29.0 | status: in_progress
- acceptance: the store counts rows evicted by retention; the messages DTO carries the count; the Listener surface renders it; tests seed the overflow and pin count + notice
- evidence: campaign-recorded in dashboard ROADMAP.md

### Hosted-era comment-truth micro-batch
- id: `rm-148` | track: reliability | priority: 28.0 | status: in_progress
- acceptance: all five lines rewritten to hosted-runner reality in one batch; no live self-hosted claim remains anywhere in workflows or AGENTS.md (historical notes either deleted or explicitly marked historical)
- evidence: campaign-recorded in dashboard ROADMAP.md

### Octokit client hygiene: throttle/retry coverage and token-cache scoping
- id: `rm-221` | track: reliability | priority: 28.0 | status: in_progress
- acceptance: pagination requests routed through a client carrying the throttle/retry plugins (or an equivalent explicit retry policy documented); tokenCache keyed/scoped per client instance (or injected) and evicted on installation removal, with an injectable clock; tests cover a transient-5xx retry and cache eviction
- evidence: campaign-recorded in dashboard ROADMAP.md

### Visual gate PR-trigger completeness (render-affecting inputs)
- id: `rm-420` | track: reliability | priority: 28.0 | status: in_progress
- acceptance: 
- evidence: campaign-recorded in dashboard ROADMAP.md

### The Inbox badge poll never re-arms after a cross-tab re-login while the rm-273 loops self-heal
- id: `rm-487` | track: reliability | priority: 28.0 | status: in_progress
- acceptance: either the badge poll re-arms on an auth-restored signal (focus re-probe or a storage/session event — the poll already runs behind a focus listener, so a cheap re-probe-on-focus closes the gap) or a recorded decision keeps remount-only recovery with the comment corrected to name it deliberate; either way the false "full-page navigation" claim is deleted; the web App test pins the chosen semantics including the cross-tab case the comment currently denies
- evidence: campaign-recorded in dashboard ROADMAP.md

### Ops-hygiene micro-batch, dispositioned: ghost Audit workflow cured-by-content, stale conductor-CI PR sweep at the pr gate, canary comment folded
- id: `rm-517` | track: reliability | priority: 28.0 | status: in_progress
- acceptance: (a) disposition-only — verify the first scheduled audit run lands green Mon 2026-10-05T03:37Z (never disable 372028564 now that it fronts real content); (b) each stale conductor-CI PR closed with a one-line disposition comment pointing at its landed-or-superseded lineage (closures only — no force-pushes, no merges) riding run 2365e728's pr gate; (c) FOLDED to stewardship run 3058794f's U2 (the sibling formalization owns the canary.yaml comment edit — verify its landing, do not duplicate); PR census before/after recorded in the cycle batch doc.
- evidence: campaign-recorded in dashboard ROADMAP.md

### Re-entry for dismissed push cards
- id: `rm-596` | track: reliability | priority: 28.0 | status: in_progress
- acceptance: a re-entry affordance exists in the AppShell (footer anchor beside Privacy covering BOTH keys — notifications + install), restoring the card(s) by clearing the localStorage latch and re-entering the state machine at not-requested; unit test asserts the key cleared + card visible after re-entry; localStorage key names unchanged (no data migration); the dismissal persistence itself stays deliberate (documented in InstallPrompt's docstring) — only the missing way back is cured.
- evidence: campaign-recorded in dashboard ROADMAP.md

### rm-185
- id: `rm-185` | track: reliability | priority: 27.0 | status: in_progress
- acceptance: the cached token entry stores the API-provided expiry (now+55min cap only as fallback when absent), refresh triggers on real expiry with a small safety margin, and a test proves the cache honors a short expiresAt fixture rather than the 55-minute guess
- evidence: campaign-recorded in dashboard ROADMAP.md

### Server and docs hygiene batch
- id: `rm-124` | track: reliability | priority: 26.0 | status: in_progress
- acceptance: recorded from dashboard ROADMAP.md by campaign ingest
- evidence: campaign-recorded in dashboard ROADMAP.md

### Conductor phase-worktrees base at origin/main tip (stale-frame cost)
- id: `rm-165` | track: reliability | priority: 26.0 | status: in_progress
- acceptance: campaign dispatch pins each phase worktree at the origin/main tip at dispatch time (re-fetch immediately before creating the worktree), or a phase-0 freshness check aborts and re-creates the worktree when HEAD trails origin/main; the convention recorded in the conductor campaign config or its AGENTS note citing the cycle-9 rm-148..rm-153 reconciliation as the cost case
- evidence: campaign-recorded in dashboard ROADMAP.md

### Listener per-message parse failures vanish against the unread count
- id: `rm-215` | track: reliability | priority: 26.0 | status: in_progress
- acceptance: 
- evidence: campaign-recorded in dashboard ROADMAP.md

### No root ErrorBoundary: a render-time exception unmounts the whole SPA
- id: `rm-514` | track: reliability | priority: 26.0 | status: in_progress
- acceptance: a root ErrorBoundary renders a minimal fallback (error digest + reload affordance, no sensitive detail — server URLs, run ids, repo names stay out of the fallback); a component test pins a throwing view to the fallback instead of a blank document; pnpm test + pnpm check-types green.
- evidence: campaign-recorded in dashboard ROADMAP.md

### Server-side GitHub fetches refuse redirects at the transport seam
- id: `rm-528` | track: reliability | priority: 26.0 | status: in_progress
- acceptance: createBoundedFetch defaults redirect:'error' unless a caller overrides (spread places init.redirect after the default) and fetchGitHubUserLogin carries redirect:'error'; a 302-responding local-fixture suite (test/bounded-fetch-redirect.test.ts, landed with this item) pins all four postures — default rejection, caller-override honored (redirect:'manual' still returns the 302), installation-token Octokit request rejection, and unchanged non-redirecting behavior
- evidence: campaign-recorded in dashboard ROADMAP.md

### Aggregator union join is single-key where the denylist is dual-key
- id: `rm-601` | track: reliability | priority: 26.0 | status: in_progress
- acceptance: union membership consults the dual-key set (node_id OR databaseId) or a recorded corpus analysis shows node_id skew is impossible for the data-branch corpus; extend the property/identity tests with a skewed-node_id denylisted entry asserting union count-stability under skew
- evidence: campaign-recorded in dashboard ROADMAP.md

### web/** client lint coverage (currently globally ignored)
- id: `rm-257` | track: reliability | priority: 25.0 | status: in_progress
- acceptance: a web-scoped eslint config (or overrides entry) lints web/src/** and web/*.ts with erasableSyntaxOnly off and the Vite/React idiom accommodated; pnpm lint covers it end to end; any surfaced findings are triaged (fixed or explicitly waived) in the batch doc rather than suppressed wholesale
- evidence: campaign-recorded in dashboard ROADMAP.md

### Server and CI hygiene batch 3
- id: `rm-130` | track: reliability | priority: 24.0 | status: in_progress
- acceptance: one web build per test job (drop the redundant step; pretest stays the single build path) with job time measured before/after; metadata skip counting extended to object-shape failures with a test; the CSRF-400 retry either re-fetches a fresh token via the existing seam before retrying or does not retry token rejections, with a test pinning the chosen behavior; all gates green
- evidence: campaign-recorded in dashboard ROADMAP.md

### Node 26 LTS adoption gate (time-gated)
- id: `rm-139` | track: reliability | priority: 24.0 | status: in_progress
- acceptance: when 26 promotes to LTS (~late 2026-10): a go/no-go recorded in rm-108's matrix covering engines >=24, the node:24-slim tag choice, the @types/node major, and runner tool-cache impact; adoption, if approved, lands as one reviewed change with all gates green
- evidence: campaign-recorded in dashboard ROADMAP.md

### Origin validation-residue sweep: cycle-1 batch landing rider
- id: `rm-217` | track: reliability | priority: 24.0 | status: in_progress
- acceptance: a post-landing probe shows PR #43 closed-as-merged (or closed with the landed-verbatim note per rm-246's superseded-batch runbook) and no stale conductor/ci-base-* ref from run 6cbc2a1d's lineage remains on origin; the fleet-wide sweep of ALL stale refs stays rm-159's push-gated scope, not this item's
- evidence: campaign-recorded in dashboard ROADMAP.md

### Deployments column (permission-gated capability)
- id: `rm-230` | track: reliability | priority: 24.0 | status: in_progress
- acceptance: mint-map diff adds `deployments:read` with graceful degradation when an installation lacks it (empty column, no error surface, no staleBanner movement); UI column + README/API docs; aggregator + canary suites green riding rm-225's query registry
- evidence: campaign-recorded in dashboard ROADMAP.md

### Rate-limit budget docstring truth (static assets consume no budget)
- id: `rm-269` | track: reliability | priority: 24.0 | status: in_progress
- acceptance: recorded from dashboard ROADMAP.md by campaign ingest
- evidence: campaign-recorded in dashboard ROADMAP.md

### Doc-truth pair: README's rate-limit class claim and the listener contract's prunedCount
- id: `rm-275` | track: reliability | priority: 24.0 | status: in_progress
- acceptance: README's class description names exactly the gated paths (or the gate is widened to match the claim — a behavior decision recorded in the entry); the contract doc's messages example carries prunedCount with the same semantics as src/listener/contract.ts; the existing env-docs guard stays green
- evidence: campaign-recorded in dashboard ROADMAP.md

### main.yaml's rm-13640 rider comment contradicts the actual timeouts (claims 20/40; code says 35/20)
- id: `rm-486` | track: reliability | priority: 24.0 | status: in_progress
- acceptance: the comment states 35 (Lint) and 20 (Test) with the poll-window rationale in one place; NO timeout-minutes value changes in this item; a grep across .github/workflows finds no other comment citing a timeout value that contradicts its job
- evidence: campaign-recorded in dashboard ROADMAP.md

### Permissions-Policy header: deny-by-default powerful features on every response
- id: `rm-557` | track: reliability | priority: 24.0 | status: in_progress
- acceptance: 
- evidence: campaign-recorded in dashboard ROADMAP.md

### VAPID stale-key handoff wire is production-dead
- id: `rm-600` | track: reliability | priority: 24.0 | status: in_progress
- acceptance: either Notifications supplies getCurrentKeyVersion (sourced from the push-metadata response the view already renders) so a key-version skew drives the stale_key UX, or the dead dep is removed with the rotation-detection contract recorded as deliberately out of scope; a view-level test drives keyVersion skew and asserts the resubscribe path renders (the existing subscribe tests alone cannot catch the omission — that is the finding)
- evidence: campaign-recorded in dashboard ROADMAP.md

### Code-truth micro-batch: dead param, env-parse lenience
- id: `rm-180` | track: reliability | priority: 23.0 | status: in_progress
- acceptance: one truth each — the dead param removed (both call sites plus signature) or exercised by a test proving intended precedence; envIntOrDefault tightened to whole-string parsing or the lenient behavior pinned by an added test with the decision recorded in the cycle batch doc
- evidence: campaign-recorded in dashboard ROADMAP.md

### rm-181
- id: `rm-181` | track: reliability | priority: 23.0 | status: in_progress
- acceptance: a documented disposition — close-with-comment (pointing at the recorded validation evidence) for drafts older than N days, or a small GITHUB_TOKEN-only workflow that auto-closes stale conductor-draft PRs past N days with a standard comment; the choice recorded in docs/runbooks; `gh pr list` open count reflects real work only
- evidence: campaign-recorded in dashboard ROADMAP.md

### pnpm 12 evaluation (pin guarded by rm-131)
- id: `rm-140` | track: reliability | priority: 22.0 | status: candidate
- acceptance: a dated changelog review of 11-to-12 breaking changes recorded in the cycle batch doc; if adopted: packageManager pin, Dockerfile corepack pin, and the rm-131 guard assertion move in ONE change; if deferred: a dated re-evaluation comment lands next to the guard assertion
- evidence: campaign-recorded in dashboard ROADMAP.md

### Document the operator environment variables (README table + structural coverage guard)
- id: `rm-214` | track: reliability | priority: 22.0 | status: in_progress
- acceptance: 
- evidence: campaign-recorded in dashboard ROADMAP.md

### Client-truth micro-batch (five verified-live sites)
- id: `rm-421` | track: reliability | priority: 22.0 | status: in_progress
- acceptance: 
- evidence: campaign-recorded in dashboard ROADMAP.md

### Parity guard for the three validateDynamicId copies
- id: `rm-595` | track: reliability | priority: 22.0 | status: in_progress
- acceptance: one shared-corpus parity suite (the server test tree importing all three implementations by path — test/operator-stream-core.test.ts already proves the cross-tree import of public/ works) runs a hostile-id corpus (blank, / and \, %2F/%5C case-insensitive, %00/%0D/%0A, control chars, decodeURIComponent-throwers, . and .. segments) through all three and asserts identical verdicts; mutation demo in the implementing PR shows the suite red when any single copy drifts; codegen/single-source deliberately rejected (public/ ships as a no-build standalone module, web/ must never import src/ — the Docker builder stage copies only web/).
- evidence: campaign-recorded in dashboard ROADMAP.md

### .github/copilot-instructions.md still teaches the pre-PWA SSR architecture
- id: `rm-612` | track: reliability | priority: 22.0 | status: in_progress
- acceptance: 
- evidence: campaign-recorded in dashboard ROADMAP.md

### License decision (blocked-external)
- id: `rm-147` | track: reliability | priority: 20.0 | status: in_progress
- acceptance: upstream picks a license and the fork mirrors it in the same absorb cycle (rm-103 cadence); until then the README documents the deliberate no-license internal-tooling posture (pairs with rm-143)
- evidence: campaign-recorded in dashboard ROADMAP.md

### Superseded batch-PR disposition (open non-draft PRs whose payload landed elsewhere)
- id: `rm-246` | track: reliability | priority: 20.0 | status: in_progress
- acceptance: a runbook defines the two supersession tests (per-file blob identity against origin/main via a fetched PR head, never a local-HEAD diff; ROADMAP mooting context), mandates exactly one action per PR (close-with-comment — never merge, never force-push, never branch-delete-before-close), and requires each closure recorded in that cycle's batch doc under a landing-queue hygiene note
- evidence: campaign-recorded in dashboard ROADMAP.md

### Record the wiki-write identity divergence disposition
- id: `rm-259` | track: reliability | priority: 20.0 | status: in_progress
- acceptance: a one-paragraph disposition note (AGENTS.md absorb-traps section or the next cycle batch doc) recording: this fork stays read-only, wiki-write paths stay excluded at absorb under the fork-exclusion-guard invariants, and the description field is a known permanent diff — not drift to reconcile
- evidence: campaign-recorded in dashboard ROADMAP.md

### Dead-surface micro-batch: operator compatibility router + run-relative prose
- id: `rm-270` | track: reliability | priority: 20.0 | status: in_progress
- acceptance: routes/operator.ts deleted or actually wired (a recorded decision which); api.ts:13 reworded to run-independent phrasing; grep shows no run-relative "this run branched" phrasing remaining in src/
- evidence: campaign-recorded in dashboard ROADMAP.md

### Stale `public/static/operator-stream.js` citations in ROADMAP and the ideation doc
- id: `rm-480` | track: reliability | priority: 20.0 | status: in_progress
- acceptance: both citations corrected to the real path (the ROADMAP signal text amended in place with the correction visible, the ideation doc line fixed); repo-wide grep for `public/static` returns zero hits
- evidence: campaign-recorded in dashboard ROADMAP.md

### App badge for unread listener notifications
- id: `rm-158` | track: reliability | priority: 18.0 | status: in_progress
- acceptance: the unread poll sets/clears the app badge behind a feature check (guarded navigator.setAppBadge, no-op where unsupported); badge state syncs with the poll including the error path (badge cleared after consecutive poll failures — pairs with rm-155's error surfacing); a unit test pins the call sequence against a stubbed navigator
- evidence: campaign-recorded in dashboard ROADMAP.md

### AGENTS.md check-types gate description
- id: `rm-202` | track: reliability | priority: 18.0 | status: in_progress
- acceptance: the description lists all three surfaces; pnpm check-types itself unmodified (description-only)
- evidence: campaign-recorded in dashboard ROADMAP.md

### Release image multi-arch (linux/arm64): BUILDPLATFORM builders, arch-neutral final stages
- id: `rm-558` | track: reliability | priority: 18.0 | status: in_progress
- acceptance: 
- evidence: campaign-recorded in dashboard ROADMAP.md

### operator-stream runtime: module-singleton stream handle vs StrictMode double-mount (dev-only today)
- id: `rm-283` | track: reliability | priority: 16.0 | status: in_progress
- acceptance: stream ownership scoped per instance (or the late-resolving cleanup made idempotent against a handle it no longer owns), plus a test that mounts two runtimes and asserts mount2's stream survives mount1's cleanup; the singleton comment updated to state the invariant
- evidence: campaign-recorded in dashboard ROADMAP.md

### X-Forwarded-Proto Secure-cookie trust without opt-in (decision-first)
- id: `rm-604` | track: reliability | priority: 16.0 | status: in_progress
- acceptance: decision recorded — either mirror the opt-in convention (XFP trust env-gated, reusing the rm-129 semantics, README + runbook rows updated) or keep header-trusting with the asymmetry documented in the auth code comment and README security notes; either way tests pin the chosen semantics at BOTH cookie sites (oauth state cookie and session cookie) across the three topologies: direct http, direct https, proxy with XFP
- evidence: campaign-recorded in dashboard ROADMAP.md

### logger info-level routing: structured stdout sink or embrace stderr
- id: `rm-260` | track: reliability | priority: 15.0 | status: in_progress
- acceptance: a recorded decision — either a structured stdout JSON sink lands (and info/debug route there) or the comment/routing is trued to reality (info→console.info, stderr reserved for warn+); no silent behavior change to the listener/ingest paths' error surfacing
- evidence: campaign-recorded in dashboard ROADMAP.md

### Startup banner through the structured logger
- id: `rm-229` | track: reliability | priority: 14.0 | status: in_progress
- acceptance: the bind banner emits via `logger.info`; no bare `console.*` call remains in `src/`; no behavior change to binding, ordering, or shutdown wiring; suite green
- evidence: campaign-recorded in dashboard ROADMAP.md

### Route-level code splitting for the SPA bundle (recorded LOW with counters)
- id: `rm-559` | track: reliability | priority: 12.0 | status: in_progress
- acceptance: only if still worth it after the rm-553-class compression/caching siblings land and a fresh cold-load measure says otherwise: per-view React.lazy + Suspense boundaries; initial route chunk measurably smaller (before/after first-load JS numbers recorded); no PWA/offline regression (sw precache list still complete); web suite green
- evidence: campaign-recorded in dashboard ROADMAP.md

### Four workflows carry no timeout-minutes
- id: `rm-603` | track: reliability | priority: 12.0 | status: in_progress
- acceptance: each of the four gains a timeout-minutes with a one-line rationale comment sized from OBSERVED Actions durations recorded in the cycle doc (not guesses), actionlint clean
- evidence: campaign-recorded in dashboard ROADMAP.md

### healthz Cache-Control residual (micro)
- id: `rm-599` | track: reliability | priority: 10.0 | status: in_progress
- acceptance: /api/healthz sets Cache-Control: no-store (or a recorded decision explaining why a shared-cached health body is acceptable) — test/routes or api-level test pins the header on both the 200 and degraded (503) shapes
- evidence: campaign-recorded in dashboard ROADMAP.md

### HSTS max-age is 180d on every response (secure-headers ramp window overdue)
- id: `rm-613` | track: reliability | priority: 10.0 | status: in_progress
- acceptance: 
- evidence: campaign-recorded in dashboard ROADMAP.md

### DASHBOARD_VISUAL_PORT parses to NaN silently (micro)
- id: `rm-605` | track: reliability | priority: 8.0 | status: in_progress
- acceptance: port resolution validates whole-string digits (fallback 4311 with a one-line warning naming the bad value, or fail-fast with a clear message); behavior pinned by a small unit test on the extraction helper or a documented manual check in the cycle doc
- evidence: campaign-recorded in dashboard ROADMAP.md

### Fixture session fetch is unbounded (dev-only micro)
- id: `rm-606` | track: reliability | priority: 6.0 | status: in_progress
- acceptance: AbortSignal.timeout(bounded) added with the bound named in a comment; web test pins the abort path; cycle doc updates the family census (which members remain open)
- evidence: campaign-recorded in dashboard ROADMAP.md

## Closed items

- `rm-001` Refactor 20 high-complexity function(s) — superseded
- `rm-002` Add test coverage for 20 untested module(s) — superseded
- `rm-104` Harden the roadmap render (vendored-path exclusion, stack-correct evidence, lint-clean output) — done
- `rm-103` Automated upstream-absorb cadence with drift gate — superseded
- `rm-105` Supply-chain baseline v2: SBOM + build provenance in Release — superseded
- `rm-112` Aggregator degradation and staleness semantics — superseded
- `rm-126` Reconcile drift-identity reporting: count-only promise vs full_name on discovered repos — superseded
- `rm-106` Listener digest push — superseded
- `rm-107` Operator system-status panel — superseded
- `rm-108` Dated major-upgrade decision matrix — superseded
- `rm-116` Merge-hygiene baseline: required checks on main plus drift alert — superseded
- `rm-127` Make the gateway login-redirect topology assumption explicit — superseded
- `rm-119` Gate-health roll-up: workflow-run conclusions per repo — superseded
- `rm-123` Base-digest drift visibility: weekly read-only pin check — superseded
- `rm-114` Single-source the SSE parser invariants — superseded
- `rm-117` Security-posture panel: Dependabot and code-scanning alerts per repo — superseded
- `rm-118` Per-repo scoped installation tokens — superseded
- `rm-129` Optional trusted-proxy mode for the ingest rate limiter — superseded
- `rm-120` Gateway-contract drift watch for the mirrored agent source — superseded
- `rm-115` CSRF tokens for listener ack mutations — superseded

<!-- managed by hermes-roadmap render; do not edit by hand -->
