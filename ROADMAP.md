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
- acceptance: Every module in \['.agents/skills/impeccable/scripts/context-signals.mjs', '.agents/skills/impeccable/scripts/critique-storage.mjs', '.agents/skills/impeccable/scripts/detect-csp.mjs', '.agents/skills/impeccable/scripts/detector/design-system.mjs', '.agents/skills/impeccable/scripts/detector/detect-antipatterns-browser.js', '.agents/skills/impeccable/scripts/detector/detect-antipatterns.mjs', '.agents/skills/impeccable/scripts/detector/engines/browser/detect-url.mjs', '.agents/skills/impeccable/scripts/detector/engines/regex/detect-text.mjs', '.agents/skills/impeccable/scripts/detector/engines/static-html/css-cascade.mjs', '.agents/skills/impeccable/scripts/detector/engines/static-html/detect-html.mjs', '.agents/skills/impeccable/scripts/detector/engines/visual/screenshot-contrast.mjs', '.agents/skills/impeccable/scripts/detector/profile/profiler.mjs', '.agents/skills/impeccable/scripts/detector/registry/antipatterns.mjs', '.agents/skills/impeccable/scripts/detector/shared/inline-ignores.mjs', '.agents/skills/impeccable/scripts/hook-admin.mjs', '.agents/skills/impeccable/scripts/hook-before-edit.mjs', '.agents/skills/impeccable/scripts/hook-lib.mjs', '.agents/skills/impeccable/scripts/lib/design-parser.mjs', '.agents/skills/impeccable/scripts/lib/impeccable-config.mjs', '.agents/skills/impeccable/scripts/lib/impeccable-paths.mjs'\] has a corresponding test file with at least one passing test
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

### Release image carries a fixed HIGH in the pinned base's libpcre2 — in-image upgrade + comment truth (bundled-npm half already stripped wholesale)
- id: `rm-647` | track: reliability | priority: 85.0 | status: in_progress
- acceptance:
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
- evidence: campaign-recorded in dashboard ROADMAP.md; 2026-10-15 rider (run ccde661ea990 cycle:1 roadmap fe5d7f42, from research 035cd3de R1): window WIDENED — upstream published releases 2026.10.26 and 2026.10.27 (both 2026-10-14, first push past the fork's absorb point #676/2026.10.25): PR #619 merged 2026-10-14T21:46:18Z is the CANONICAL contract-1.11.0 adoption (45 files — waiting-run collapsed cards, notification jumps, vendored session push:{ready|degraded|unknown} health + push trigger kinds, always-current run list) and supersedes-in-scope the fork's unlanded home-grown 1.10/1.11 twin (sibling run 76d7977a, 18 files, gate-green but unlanded); PR #620 bumps the node image digest 173f125 to 7f486ca (feeds rm-139); PR #618 dev-dep @opencode-ai/plugin 1.19.0; upstream quiescent since (no commits after 2026-10-20). Disposition for the next absorb: absorb canonical OVER landing the twin — the canonical implementation carries capabilities the twin lacks; the twin retires or rebases onto the absorb; new mints rm-1446 (push-health UI) + rm-1449 (dependency majors) sequence behind this disposition. INTEGRATE CORRECTION (prioritize attempt 4241e547, recorded for integrate and applied at this merge): the rider's original 'deploy-together constraint (gateway >= v0.122.1) already satisfied by the deployed agent' phrasing CONFLATED the fro-bot.yaml workflow agent pin (v0.122.1, CI-side) with the infra gateway deployment — the estate of record has the deployed gateway (v0.119.2) speaking contract 1.9.0 == the fork pin, so absorbing 1.11.0 acceptance now would fail-close the operator stream to 'drift' (operator-stream.js:1022, no reconnect) against the LIVE gateway; the absorb is dependency-blocked on a gateway-side estate verdict, not code-ready, and rm-1446 rides behind that same gate.

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

### Release pipeline unfreeze — early-exit-awk digest readback SIGPIPEs the producer under pipefail
- id: `rm-708` | track: reliability | priority: 78.0 | status: in_progress
- acceptance: TWO consecutive green `release.yaml` runs end-to-end past '🏷️ Promote latest image tag' with 'Dispatch infra deploy' firing — a single green run is the documented race (37463802355), not closure; the rm-166 guard extension green on main (repo-wide fence + END-block pin); actionlint clean on the repaired workflow
- evidence: campaign-recorded in dashboard ROADMAP.md

### Port upstream security fix #481 — global redaction chokepoint
- id: `rm-122` | track: reliability | priority: 76.0 | status: in_progress
- acceptance: recorded from dashboard ROADMAP.md by campaign ingest
- evidence: campaign-recorded in dashboard ROADMAP.md

### GraphQL canary coverage-completeness (every shipped template runs live)
- id: `rm-225` | track: reliability | priority: 76.0 | status: in_progress
- acceptance: the canary iterates EVERY exported query template — templates move behind an exported registry (array) in src/github/aggregator.ts so adding a template auto-extends coverage — each executing once read-only against a public repo with its sha256 logged; a suite guard asserts the canary's template set equals the exported registry (the completeness dual of rm-179's structural guard); a workflow_dispatch trigger enables on-demand firing; a deliberate broken-query dry-run reddens it (carried over from rm-179's evidence half)
- evidence: campaign-recorded in dashboard ROADMAP.md

### release.yaml digest-readback SIGPIPE: the only ungated publication step fails under pipefail even on digest match
- id: `rm-703` | track: reliability | priority: 76.0 | status: in_progress
- acceptance: both release.yaml readback sites (:480 and :518) read the digest without an early-exit pipe (END-block `awk '/^Digest:/{d=$2} END{print d}'` or read-into-variable form) and a repo-grep proves no `| awk '{…; exit}'` readback remains under the pipefail defaults shell; test/base-drift-digest-readback.test.ts is extended to pin BOTH release.yaml forms (it currently pins only base-drift's guarded form); actionlint container-form green; the next real release run is green at the promote step with captured digest == build digest AND `Dispatch infra deploy` no longer skipped — sustained green across consecutive runs, because the 1-in-8 race means one green run alone is not proof; base-drift.yaml:68/:81 stay untouched
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

### rm-779
- id: `rm-779` | track: reliability | priority: 72.0 | status: in_progress
- acceptance:
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
- id: `rm-149` | track: reliability | priority: 66.0 | status: done
- acceptance: the authorization redirect carries state AND an S256 code_challenge; the verifier lives in a short-lived HttpOnly SameSite=Lax cookie mirroring the state pattern; the token exchange sends code_verifier and rejects mismatches; tests cover challenge-absent rejection at exchange, verifier-mismatch rejection, and the happy path; grep shows code_challenge wired at the single redirect builder
- evidence: campaign-recorded in dashboard ROADMAP.md
- rider: adopted from parked run ba5f6d7ddd67 (commit 8f42afb, batch rm-149/281) via the PR #295 review; the CodeQL js/insufficient-password-hash hits on validation PRs #232/#237/#295/#298 are false positives cured in-test per RFC 7636 §4.2 (challenge = BASE64URL(SHA-256(verifier)) is the mandated S256 transform over a one-time random verifier, not password storage); alert #75 is the same false positive — its dismissal rides the PR #295 review response

### Bound the installations enumeration transport (rm-156 fetch seam)
- id: `rm-267` | track: reliability | priority: 66.0 | status: in_progress
- acceptance: the enumeration Octokit gets `fetch: createBoundedFetch(...)` at installations.ts:338; the transport-timeout contract regex tightened so a bare `timeout:` WITHOUT a fetch seam fails the suite; hung-upstream regression fixtures prove the BOUND (not the inert timeout) terminates the walk; the deadline inversion documented or corrected in the same change
- evidence: campaign-recorded in dashboard ROADMAP.md

### Bound the /auth/logout body read for real (the rm-268 cap is post-hoc)
- id: `rm-497` | track: reliability | priority: 66.0 | status: in_progress
- acceptance:
- evidence: campaign-recorded in dashboard ROADMAP.md

### detailsUrl https://-only contract at the failing-check boundary (assess F1)
- id: `rm-709` | track: reliability | priority: 66.0 | status: in_progress
- acceptance: aggregator fixtures with javascript:/data:/relative details_url extract as `''` (`test/aggregator.test.ts`, failing-check-details suite); the client parse drops a feed to contract-drift on a non-https non-empty detailsUrl and keeps `''` legal (`web/src/api/monitoring.test.ts`); both suites green on the delivered tree
- evidence: campaign-recorded in dashboard ROADMAP.md

### Pre-Release CVE tripwire: weekly trivy scan of the pinned base digest (the layer no detector covers)
- id: `rm-648` | track: reliability | priority: 65.0 | status: in_progress
- acceptance:
  - the land-or-retire decision is recorded: EITHER the weekly trivy-of-pinned-digest lane lands as a workflow — scan job, digest extracted per the base-drift readback contract, alert-only posture with no auto-bump — OR this def closes superseded-by-decision with the rationale recorded
  - if landed, the cron slot does not sit inside the release-channel cluster on a phantom premise: release-channel.yaml's cron-collision comment cites a cve-tripwire lane on main that has never existed on disk or live (12 workflow files, 13 live workflows, none named cve-tripwire) — the citation is fixed to name the real lane or deleted in the same landing
  - the alert path is read-only — security_events or vulnerability_alerts or a job summary; no write surface rides in
- evidence: campaign-recorded in dashboard ROADMAP.md; 2026-10-16 acceptance fill (run 21222e003a45 cycle:4 roadmap 783592071ee6496ca1f1f7d8c5b9ca70, from assess a9a65f1c F5 + research 4c4c291b candidate 4): this def has sat in_progress with an empty acceptance while 43 Trivy HIGHs accumulated unalerted since 2026-09-16 — the phantom citation is the dangling promise of a sibling lane that never landed; the CVE-posture ledger rows are minted at rm-1472 and the digest refresh rides the contract-independent absorb batch; 2026-10-17 implement rider (run 21222e003a45 cycle:4 implement be893b98): land-or-retire resolved LAND — .github/workflows/cve-tripwire.yaml landed in the weekly Monday 06:53Z slot the release-channel cron-cluster comment has cited since 2026-10-05, making that citation true with no edit to release-channel.yaml; alert-only (permissions contents: read only, findings render to the job summary, non-zero exit only on operational failure — a dead pinned digest is exactly the red it exists to raise); trivy pinned 0.76.0 by digest; inert on main while Actions stay dark (rm-1450 estate) — first post-recovery fire owed and reads RED by design until the digest bump lands; per-rule dispositions live in the rm-1472 batch doc; 2026-10-17 compound rider (run 21222e003a45 cycle:4 compound 69b759e177254669bac53549df829147): pre-review validation consumed as recorded evidence — targeted guard-domain suites 97/97 (c8d4cd0b) and full validation ok:true via ephemeral PR #829 (commit 0cf64753, 10 checks ALL SUCCESS, Fro Bot SKIPPED by design, 664s); the lane is green from a PR head while the Monday 06:53Z cron has not fired yet, so the first scheduled RED-by-design observation is still owed post-landing; FOLD FACT (live-probed at edf948de): origin/main landed its own cve-tripwire.yaml at the same path (142 lines, aquasecurity/trivy-action@ed142fd v0.36.0 mirroring release.yaml's Enforce idiom, ignorelist-as-gate jq summary, same `'53 6 * * 1'` cron) vs this cycle's 93-line docker-run digest-pinned form — same-path textual conflict plus duplicate cron; variant convergence owned by rm-1499, this def keeps the land-or-retire truth

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

### OS-base CVE posture is unowned ledger truth: 43 open HIGH alerts across 8 rules, and the pinned base manifest is GC'd from the registry
- id: `rm-1472` | track: reliability | priority: 61.0 | status: in_progress (added 2026-10-16, repository-maintenance cycle:4 run 21222e003a454200a41d886c25934199 roadmap 783592071ee6496ca1f1f7d8c5b9ca70, from assess a9a65f1c F3 + research 4c4c291b candidate 1; minted above the unlanded spool frontier rm-1471 (run 7708ee2a cyc:1 roadmap 24cde84d) and rm-1465..rm-1470 (run 6f9b600f cyc:2 roadmap a24cef68) and rm-1464..rm-1467 (run 0772bfc2 cyc:1 roadmap 34685733/8d3c450a) and the origin/main wall ceiling rm-1452 at 7b4d425 — first-landed-wins, landing gates re-derive id occupancy; verified unowned — ledger greps for the CVE ids and for manual-until-restored/Class-B return nothing, and this def deliberately does NOT own the digest bump: that rides the unlanded contract-independent absorb batch, sibling id rm-1467 lineage — this mint owns the security-debt ledger truth and the reconciliation discipline)
- signals: live 2026-10-16 — 49 open code-scanning alerts of which 43 are Trivy HIGH across 8 distinct rules: the 2026-10-08 util-linux batch CVE-2026-78410, CVE-2026-78409, CVE-2026-78408, CVE-2026-76642 at 9 alert instances each, plus a 2026-09-16 batch CVE-2025-69720 (3), CVE-2026-16742 (2), CVE-2026-9538 (1), CVE-2026-54369 (1); zero ledger rows track any rule. Dockerfile:16 pins node:24-trixie-slim at digest 173f1258, and a direct docker pull of that digest returns not-found while the live tag digest 7f486ca pulls seconds later on the same daemon — the manifest is GC'd from Docker Hub, so a cold-cache release build fails at FROM today. A fresh trivy scan of the NEW digest still reads Total 43 (HIGH 43, CRITICAL 0), the util-linux family shows an empty fixed-version column (unfixable at the Debian trixie base today), and the fresh DB surfaces 4 rules code-scanning has never alerted (CVE-2026-93748, CVE-2026-19534, CVE-2026-102278, CVE-2026-102276) — the digest refresh is buildability work, not CVE remediation. pnpm audit --prod is clean: the exposure is OS-layer image content, invisible to the npm gate. With Actions dark since 2026-10-09 the alert set is a stale snapshot no lane can refresh.
- acceptance:
  - the digest bump lands via the absorb batch that owns it and a cold-cache build is re-proven past FROM: docker pull of the shipped digest, then a release-path build with no local cache
  - every distinct open rule carries a disposition row or dated annotation — accept-with-rationale, track-upstream with its Debian reference, or fixed-by-rebuild — with zero rules un-owned and the 2026-09-16 batch not silently dropped; the util-linux unfixable-in-base posture recorded once with its tracker reference
  - a post-landing trivy of the shipped image reconciles the code-scanning set with reality — the 4 fresh-DB rules either alert-and-get-dispositioned or are recorded as DB-noise with the scan date attached
  - the recurring freshness lane is decided by rm-648's filled acceptance in the same cycle; this def does not mint a second scan lane
- evidence: campaign-recorded in dashboard ROADMAP.md; code-scanning census in assess delegate/a9a65f1ceeae40deac91c82fd1ab64bf.json; trivy table of the new digest at delegate/4c4c291b563a439a9043e8e7d45615ef-trivy-7f486ca.txt; both docker pull probes in research delegate/4c4c291b563a439a9043e8e7d45615ef-research.md; 2026-10-17 implement rider (run 21222e003a45 cycle:4 implement be893b98): disposition rows recorded for every open rule in docs/prioritization/2026-10-17-repository-maintenance-cycle-4-batch-run-21222e003a45.md — the 2026-10-08 util-linux batch (CVE-2026-78410, CVE-2026-78409, CVE-2026-78408, CVE-2026-76642; 9 alert instances each across bsdutils, libblkid1, liblastlog2-2, libmount1, libsmartcols1, libuuid1, login, mount, util-linux at 2.41.5-0+deb13u1) and the 2026-09-16 batch (CVE-2025-69720 ncurses, CVE-2026-16742 systemd, CVE-2026-9538 perl fix_deferred, CVE-2026-54369 libacl1) all track-upstream with empty fixed-version in trixie today, Debian security-tracker reference attached per rule; the 4 fresh-DB rules (CVE-2026-93748, CVE-2026-19534, CVE-2026-102278, CVE-2026-102276 — base-image bundled npm tooling, not the app lockfile; pnpm audit --prod clean) recorded with the 2026-10-16 scan date pending the post-landing reconciliation; def stays in_progress pending the sibling-owned digest bump (rm-1467 lineage) with the cold-cache FROM proof; 2026-10-17 compound rider (run 21222e003a45 cycle:4 compound 69b759e177254669bac53549df829147): disposition table carried green through both recorded validation legs — targeted 97/97 (c8d4cd0b) and full validation ok:true via ephemeral PR #829 (commit 0cf64753, 10 checks SUCCESS incl. CodeQL and Dependency Review on the tree carrying this ledger truth); def stays in_progress pending the sibling-owned digest bump (rm-1467 lineage absorb batch) — nothing in this cycle's evidence changes the track-upstream dispositions

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

### Machine-check the read-only invariant: static guard test against write-capability imports and Octokit write call sites
- id: `rm-649` | track: reliability | priority: 60.0 | status: in_progress
- acceptance:
- evidence: campaign-recorded in dashboard ROADMAP.md

### Aggregator cold-start in-flight degradation contract
- id: `rm-197` | track: reliability | priority: 59.0 | status: in_progress
- acceptance: (1) cold getSnapshot serves bannered empty (explicit not-fresh) while any refresh may be in flight; (2) every GitHub transport call time-bounded (request.timeout via the AppClientOptions seam, default 30s); (3) interval installed independently of the first refresh completing; (4) stalled transport trips the existing FAILED-refresh banner path
- evidence: campaign-recorded in dashboard ROADMAP.md

### Denylist-telemetry integrity: make the cross-format warning mean what it says
- id: `rm-161` | track: reliability | priority: 58.0 | status: in_progress
- acceptance: denylistComplete computed as the comment stated (membership of every redacted entry in the derived databaseId set) or the warning reworded to match implemented semantics; both channels apply the same node_id OR database_id check; tests cover legacy-format and R_-format redacted entries plus a cross-format leak attempt
- evidence: campaign-recorded in dashboard ROADMAP.md

### Operator stream seq-gap surfacing — parse-drop invisibility (client-only gap detection)
- id: `rm-853` | track: reliability | priority: 58.0 | status: in_progress
- acceptance:
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

### Repo settings hardening — restrict allowed_actions and require SHA pinning
- id: `rm-843` | track: reliability | priority: 52.0 | status: in_progress
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

### base-drift tag literal derives from the Dockerfile ARG (rm-779 class, second site)
- id: `rm-856` | track: reliability | priority: 50.0 | status: in_progress
- acceptance:
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

### Cycle-4 fold reconciliation: converge the double-landed cve-tripwire lane and merge the parallel main-side edits
- id: `rm-1499` | track: reliability | priority: 48.0 | status: candidate (added 2026-10-17, repository-maintenance cycle:4 run 21222e003a454200a41d886c25934199 compound 69b759e177254669bac53549df829147, from this run's full_tests 51471977 divergence probe re-verified live at edf948de at mint time; minted above the full unlanded frontier — rm-1498 (run d495512f roadmap), rm-1478/rm-1479 (run e178a946 compound), rm-1472..rm-1477 (this run's roadmap band) — and the origin/main wall ceiling rm-1456 at edf948de; first-landed-wins, landing gates re-derive id occupancy; verified unowned — rm-1478 owns the Actions-outage recovery census, no open def owns the workflow-variant convergence or the band merge)
- signals: live 2026-10-17 at origin/main edf948de — .github/workflows/cve-tripwire.yaml exists on main (142 lines, aquasecurity/trivy-action@ed142fd v0.36.0 action-pipeline mirroring release.yaml's Enforce invocation, ignorelist-as-gate jq summary, cron `'53 6 * * 1'`) while this cycle's rm-648 lane holds the same path at 93 lines (docker-run aquasec/trivy pinned by image digest, same cron) — same-path double-landing: textual conflict at fold plus a duplicate Monday cron if both survive; main carries no lockfile-guard.yaml and no .nvmrc (unique carriers, land clean); main's AGENTS.md:105 holds a shorter-form v0.122.1 clonedeps bullet vs this cycle's fuller rm-1477 form (textual merge owed); main's ROADMAP has zero rm-1472-through-1499 text (no id collision) with band ceiling rm-1456 vs this tree's mints through rm-1499 — renumber-on-landing applies; main advanced 4x inside this cycle (7042635 to 7b4d425 to 98cfdd52 to edf948de) so the fold's rehearsal base must be re-derived at fold time
- acceptance:
  - ONE cve-tripwire variant survives the fold with the decision rationale recorded on this def: the docker-run digest-pinned form (matches the actionlint container-form and digest-pinning conventions, zero runner-toolchain dependency) vs main's trivy-action form (mirrors release.yaml's existing Enforce idiom) — the release-channel.yaml cron-cluster citation names the surviving lane and the loser's evidence riders migrate to the winner
  - the AGENTS.md clonedeps bullet merges to a single form retaining the tracks-the-agent-pin rule and the fresh-worktree absence note
  - lockfile-guard.yaml and .nvmrc land as unique carriers; the ROADMAP band renumbers above main's ceiling at the landing gate; the fold runs a true per-file 3-way rehearsal against the re-derived main, never hunk-range overlap heuristics
- evidence: this run's full_tests artifact delegate/514719779a9247dea7a25446e3713ebc.json (divergence probe at 98cfdd52); compound-time re-probe at edf948de: wc -l 142 vs 93, trivy-action grep, cat-file -e absence probes for lockfile-guard.yaml and .nvmrc, AGENTS.md v0.122.1 grep, ROADMAP band grep 0 hits

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

### Operator contract 1.8.0 browser display half — checkout provenance + preparation on the expanded run card
- id: `rm-842` | track: reliability | priority: 46.0 | status: in_progress
- acceptance:
- evidence: campaign-recorded in dashboard ROADMAP.md

### Release-channel observability: staleness check that separates designed-dormant from broken
- id: `rm-740` | track: reliability | priority: 46.0 | status: implemented 2026-10-08/09, validated pre-review, landed at this integrate (run 405e9004bd5a424aad06019cc342efa6 terminal-salvage, conflict case 5eb4cb85; implement e3e009f1 + targeted_tests 759/759 over the engine-named 22 files + full_tests green on ephemeral draft PR #456 — all 10 checks; review-fix bf4dbff9 corrected the cron to Monday 07:23Z and the permissions record to contents: read; the workflow triggers schedule/workflow_dispatch only, so PR CI proved its lint/actionlint surface but never a live fire — the first scheduled fire is owed post-landing and reads RED by design while the rm-714 dormancy decision stays undecided; batch doc docs/prioritization/2026-10-08-repository-maintenance-cycle-2-batch-run-405e9004bd5a.md)
- signals: live 2026-10-08 — actions secrets total_count=0 so HAS_RELEASE_APP=false skips the tag/promote/Release/dispatch gates, yet a green Main run says nothing about the release channel; newest calver tag 2026.08.15, 59d old at mint (earlier 2026.08.9 readings were a refname string-sort artifact, corrected by the module's numeric compare); nothing anywhere distinguishes designed-dormant from broken — unlanded sibling rm-714 (2ca90eb1 ext#19 spool) owns the dormant-vs-active DECISION and prove-one-release acceptance; this def owns only the observability surface, which survives either branch of that decision
- acceptance: a weekly scheduled workflow fails when the newest calver tag on origin is older than a stated 45-day threshold unless a recorded dormancy decision explicitly marks the channel retired-with-owner; the step summary names the owning def id so a human landing on the red knows where the decision lives; actionlint-clean; the check reads only public refs, no new secrets
- evidence: scripts/release-channel-staleness.ts (verdict core parseCalverTag/selectNewestCalverTag/parseDormancyDecision/evaluateReleaseChannelStaleness + buildSummaryLines naming rm-740 and decision owner rm-714) + .github/workflows/release-channel.yaml (weekly Mon 07:23Z + workflow_dispatch, contents: read, fetch-depth:0, persist-credentials: false) + test/release-channel-staleness.test.ts 19/19; pristine-origin smoke (fresh clone of origin): status stale, rc=1 — the designed red while rm-714 is undecided

### Release-pipeline failure triage: promote-readback exhaustion and build-and-push
- id: `rm-691` | track: reliability | priority: 45.0 | status: in_progress
- acceptance: root-cause each class with run-log citations (promote-readback: the GHCR propagation-latency hypothesis tested against the readback target + timing, not assumed; build-and-push: distinguish transient registry/daemon failure from systematic); if propagation latency is confirmed, the promote step gains graduated backoff or a manifest-registry-API digest assertion (never a blind re-push that could race the CalVer tag), behind the existing tag-race guards; a triage row (run ids + decision) lands in the release runbook or the batch doc; the next release run at main is green OR the residual class is documented with an infra/upstream reference; guard/smoke/Trivy layers untouched.
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

### rm-780
- id: `rm-780` | track: reliability | priority: 44.0 | status: in_progress
- acceptance:
- evidence: campaign-recorded in dashboard ROADMAP.md

### Render the vendored session push-health field (ready/degraded/unknown)
- id: `rm-1446` | track: operator-experience | priority: 44.0 | status: candidate (added 2026-10-15, repository-maintenance cycle:1 run ccde661ea9904de6b483c1fb8713c95f roadmap fe5d7f42, from research 035cd3de R2; minted above the all-lineage unlanded ceiling — 2026-10-15 re-probe across all 277 origin refs puts the def-line max at rm-1414 and the known unlanded spool frontier at rm-1445; verified unowned — no def covers push-health rendering, the string is absent from the ledger)
- signals: upstream PR #619 (merged 2026-10-14, release 2026.10.26) vendors the optional session push health field and the push trigger kinds into the session parse, and its notes state verbatim "There is no UI for push health yet"; this fork absorbed the push-notification client itself in 2026.10.25 (web/src/push/subscribe.ts, reconcile.ts, web/src/components/Notifications.tsx, web/src/sw.ts) yet renders nothing about subscription health — the loop stays open at exactly the point the upstream author flagged
- acceptance:
  - once contract 1.11.0 is live on this fork (rm-252 disposition — absorb 2026.10.26 or the local twin), the operator session surface renders push health ready/degraded/unknown with degraded visually distinct from ready
  - a degraded or unknown push state never blocks session rendering (fail-open, mirroring the parser's malformed-push strip semantics)
  - twin parity: public/operator-run-index.js and the web runtime agree on the health vocabulary (static list tested on both sides)
- evidence: PR #619 body sentence (github api); the vendored field in the absorbed tree; focused tests green

### Restore the Lockfile Guard workflow dropped as October adoption collateral (Class-B lockfile-pair check is manual today)
- id: `rm-1473` | track: reliability | priority: 43.0 | status: in_progress (added 2026-10-16, repository-maintenance cycle:4 run 21222e003a454200a41d886c25934199 roadmap 783592071ee6496ca1f1f7d8c5b9ca70, from assess a9a65f1c F6 + research 4c4c291b candidate 3; minted above the unlanded spool frontier rm-1471 (run 7708ee2a cyc:1 roadmap 24cde84d) and rm-1465..rm-1470 (run 6f9b600f cyc:2 roadmap a24cef68) and rm-1464..rm-1467 (run 0772bfc2 cyc:1 roadmap 34685733/8d3c450a) and the origin/main wall ceiling rm-1452 at 7b4d425 — first-landed-wins, landing gates re-derive id occupancy; verified unowned — ledger greps for the guarded class and for manual-until-restored return no owning row, only the runbook records it, matching the rm-701/rm-759/rm-743 restore idiom for October-adoption collateral)
- signals: docs/runbooks/release.md's Class-B row records that the lockfile-pair gate runs pnpm install --frozen-lockfile --lockfile-only and was later dropped by the October upstream-adoption lineage, leaving the check manual until it is restored; the guarded failure class has 5 red release runs on record (2026-10-04, ERR_PNPM_LOCKFILE_CONFIG_MISMATCH); no workflow in .github/workflows carries the guard today, and with Actions dark since 2026-10-09 the manual check is the only line between a lockfile/workspace-pair mismatch and the release build
- acceptance:
  - the workflow is restored gating main — frozen-lockfile lockfile-only pair check, single-quoted yml values per house rule, actionlint container-form clean
  - the release runbook's Class-B row flips from manual-until-restored to citing the restored lane by name
  - a deliberate red proves the lane catches the class — a lockfile/workspace mismatch on a throwaway branch is flagged (or, while Actions stay dark, the local mirror recipe from the outage-validation runbook catches it, with the run recorded)
- evidence: campaign-recorded in dashboard ROADMAP.md; the 5 red 2026-10-04 run ids and the runbook row cited at landing; 2026-10-17 implement rider (run 21222e003a45 cycle:4 implement be893b98): .github/workflows/lockfile-guard.yaml restored verbatim from salvage commit 70440c0 (addendum-only header edit) gating main and pull_request, the release runbook Class-B row flipped from manual-until-restored to citing the restored lane, and the deliberate red proven locally under dark Actions — the exact gate command on a throwaway broken lockfile/workspace pair flags ERR_PNPM_LOCKFILE_CONFIG_MISMATCH (command + output recorded in the batch doc); lane inert until Actions recover, first live red owed post-recovery; 2026-10-17 compound rider (run 21222e003a45 cycle:4 compound 69b759e177254669bac53549df829147): the live-green debt is PAID — Lockfile Guard ran its first live green run 38981411688 (2026-10-17, PR head e69ba4961ad4 of ephemeral PR #807) and ran green again inside full-validation PR #829 (10/10 SUCCESS); the Actions outage broke during the cycle (recovery census owned by rm-1478, run e178a946), and the Class-B runbook row's replacement is validated by the Lint check in #829; def stays in_progress pending fold — first main-branch fire of the restored lane still owed

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

### codeql-action pin refresh to current v4.38.x — was the lone stale action pin
- id: `rm-650` | track: reliability | priority: 40.0 | status: in_progress
- acceptance:
- evidence: campaign-recorded in dashboard ROADMAP.md

### Consolidate the five Monday-morning crons into one scheduled workflow (single queue slot)
- id: `rm-674` | track: reliability | priority: 40.0 | status: in_progress
- acceptance:
- evidence: campaign-recorded in dashboard ROADMAP.md

### GitHub-availability awareness: annotate CI-blind windows from the public status feed
- id: `rm-1447` | track: operator-experience | priority: 40.0 | status: implemented 2026-10-15, validated pre-review, landed at this integrate (run ccde661ea9904de6b483c1fb8713c95f cycle:1 implement 6b00a66f / targeted_tests c2917a16 / full_tests d8fe1ca0; NEW src/github/platform-status.ts — fail-open fetchPlatformStatus with injected-fetch seams, short timeout, once-per-snapshot-cycle cache, null on any failure — plus an OPTIONAL platformStatus snapshot field wired in createAggregator (additive: every existing getSnapshot stub stayed valid), an additive MonitoringDto field via toMonitoringDto, and the Actions-component banner beside the staleBanner block in Monitoring.tsx; targeted fast-mode 945 root + 103 web tests green with the dispatch digest validation:v1:b448a97cbc782644d9c3dbf86ff0e9c9d8bd1b4225c78c564880872c5fb34d89 re-proven equal pre/post; full gates green via the dark-Actions runbook (rm-1452) — the reaped predecessor's PR #713 execution adopted after byte-identity proofs plus the local mirror of every CI job; minted 2026-10-15 roadmap fe5d7f42 from research 035cd3de R6, verified unowned)
- signals: during the Actions run-creation outage (dark since 2026-10-09T01:59:31Z, run 37872407109) the dashboard's per-repo rollup states cannot distinguish "checks passing" from "checks cannot register" — the operator sees a green-looking fleet while no run can be created; the public status API at www.githubstatus.com/api/v2/status.json is unauthenticated, was verified live 2026-10-15 returning valid status JSON, and carries per-component detail including the Actions component
- acceptance:
  - an aggregator-side fail-open fetch of the status feed (short timeout, server-side, keyed to the existing snapshot cycle — banner data rides the snapshot DTO, no new public endpoint, no new auth surface)
  - when the Actions component reports degraded/major-outage, the fleet rollup surfaces an availability annotation; a fetch failure produces no banner and never blocks the snapshot (fail-open both ways)
  - read-only invariant untouched: outbound GET only, no new token scope, nothing cached longer than the snapshot cycle
- evidence: the live curl probe (status JSON 200); a fixture test pinning banner-on, banner-off, and silent-fetch-failure paths

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

### Immutable Cache-Control for content-hashed static assets
- id: `rm-690` | track: reliability | priority: 38.0 | status: in_progress
- acceptance: `/assets/*` responses carry `Cache-Control: public, max-age=31536000, immutable` set by a wrapping middleware registered before the `/assets/*` serveStatic (after-next() header set, the /registerSW.js pattern); unhashed static surfaces (/icon-*, sw.js, manifest.webmanifest) get an explicit no-cache-family policy in the same middleware (registerSW.js's existing no-store stays); a red-first guard test pins the immutable header on a hashed-fixture request AND the no-cache family on each unhashed surface; the adapter's Last-Modified-only behavior (no ETag/304) documented in a code comment at the middleware so the next adapter bump knows what to re-check; lint/check-types/test green; zero dependency movement and no PWA entanglement (SW precache stays stripped per rm-138).
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

### Actions run-history deletion of the audit-cron first-red — adjudicate the dispute, establish run-history integrity
- id: `rm-659` | track: reliability | priority: 36.0 | status: in_progress
- acceptance:
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

### Web-suite test isolation: the rm-596 dismiss-latch test is order/host-flaky and the node-26 localStorage recipe is undocumented
- id: `rm-651` | track: reliability | priority: 35.0 | status: in_progress
- acceptance:
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

### Pre-gate base-digest and tool-pin sweep ahead of the Monday 2026-10-12 layer
- id: `rm-689` | track: reliability | priority: 34.0 | status: in_progress
- acceptance:
- evidence: campaign-recorded in dashboard ROADMAP.md

### snapshot-store byte bound counts UTF-16 code units
- id: `rm-701` | track: reliability | priority: 34.0 | status: implemented (restored 2026-10-15 at the integrate of run d8fdf8b79ad5, conflict case 70b938272a—utf8ByteLength + astral/CJK property coverage landed 2026-10-07/08 and were dropped as adoption collateral by the October upstream-adoption lineage; this merge restores the landed mechanics with rm-802 structured-payload logging composed on top)
- acceptance: both cap comparisons measure bytes (Buffer.byteLength or an equivalent single-site helper); a round-trip property test with astral-plane and CJK payloads pins the bound at exactly 1_048_576 bytes; the constant's name and its comment agree with the measured unit
- evidence: campaign-recorded in dashboard ROADMAP.md

### Container health truth: HEALTHCHECK directive wired to a truthful probe
- id: `rm-743` | track: reliability | priority: 34.0 | status: implemented 2026-10-08/09, validated pre-review, landed at this integrate (run 405e9004bd5a424aad06019cc342efa6 terminal-salvage, conflict case 5eb4cb85; local docker smoke: image built, container healthy with probe exit 0, and the same image on DASHBOARD_PORT=3001 flips unhealthy after the retry budget — the probe demonstrably gates on r.ok, never always-0; docs/runbooks/release.md restored at this integrate with the orchestration-expectation note — the runbook had been dropped as October upstream-adoption collateral while the landed Dockerfile comment and guard suite cite it, so the restore is required for the mechanics to stay self-consistent)
- signals: the Dockerfile shipped no HEALTHCHECK directive and no build-identity ENV while /api/healthz is a constant-200 liveness endpoint — a wedged-but-listening container was indistinguishable from a healthy one at every layer; the HTTP healthz FIELD truth stays rm-708's scope (disjoint acceptance, not folded here); this def owns the container layer only
- acceptance: Dockerfile gains HEALTHCHECK (interval/timeout/start-period/retries stated, tuned to the 60s aggregator cadence) hitting /api/healthz and gating on r.ok ONLY — never failing on staleness alone (liveness, not readiness), so a slow upstream never restart-loops the container; the release runbook records the orchestration expectation (external probes may additionally gate on staleness once rm-708's fields exist) and the DASHBOARD_PORT override coupling; a Dockerfile guard test asserts the directive exists and targets /api/healthz
- evidence: Dockerfile HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 with a node fetch one-liner against 127.0.0.1:3000/api/healthz (no curl/wget added to node:24-slim — the Trivy surface stays flat); test/dockerfile-healthcheck-guard.test.ts 7/7 (exactly-one directive, the four tuning flags, healthz target + r.ok gate with forbidden staleness tokens, node exec form, rm-743 citation, runbook notes); docs/runbooks/release.md orchestration-expectation section

### ubuntu-latest alias-flip guard for non-containerized jobs
- id: `rm-188` | track: reliability | priority: 33.0 | status: in_progress
- acceptance:
- evidence: campaign-recorded in dashboard ROADMAP.md

### Major-upgrade decision matrix v2: dated go/no-go records for the 2026 major wave, a Node-26 flip record, and a .nvmrc
- id: `rm-1475` | track: reliability | priority: 32.5 | status: in_progress (added 2026-10-16, repository-maintenance cycle:4 run 21222e003a454200a41d886c25934199 roadmap 783592071ee6496ca1f1f7d8c5b9ca70, from research 4c4c291b candidate 6; minted above the unlanded spool frontier rm-1471 (run 7708ee2a cyc:1 roadmap 24cde84d) and rm-1465..rm-1470 (run 6f9b600f cyc:2 roadmap a24cef68) and rm-1464..rm-1467 (run 0772bfc2 cyc:1 roadmap 34685733/8d3c450a) and the origin/main wall ceiling rm-1452 at 7b4d425 — first-landed-wins, landing gates re-derive id occupancy; verified unowned — rm-108 closed superseded with no successor while the Node-line def's acceptance still defers to rm-108's matrix, and the per-major dependency-freshness riders record data, not decisions)
- signals: measured 2026-10-16 — vitest 5.0.5 against lock 4.1.11 (the targeted-runner vitest-5 fallback trap must be audited before any bump), typescript 7.0.2 against 6.0.3 (tsgo-era native compile, unproven against the erasableSyntaxOnly lint), pnpm 12.14.0 against the pinned 11.28.5 plus Dockerfile corepack (rm-140 owns that evaluation's mechanics), vite-plugin-pwa 2.0.0 against 1.3.0, jsdom 30.1.3 against 29.1.1; Node 26 LTS flip is due ~2026-10-28 per nodejs/Release while v24 Krypton carries support to 2028-04-30; the host dev env runs v22.22.0 against engines >=24 (warn-only) and the repo carries no .nvmrc or .node-version, so local dev and engines disagree silently; upstream carries the same majors, so absorb is no relief
- acceptance:
  - one dated decision doc seeds the matrix with the measurements above — one row per major with a go/no-go, a trigger or review date, and the owning def for each go
  - the Node-26 row records the flip decision against engines, the node:24 image tag, the @types/node ceiling, and runner tool-cache impact; the dangling rm-108 reference in the Node-line def's acceptance re-points at this def
  - a .nvmrc pinning node 24 lands so local dev matches engines; every upgrade that flips to go lands per its own acceptance with full gates green
- evidence: campaign-recorded in dashboard ROADMAP.md; pnpm outdated and npm view outputs in research delegate/4c4c291b563a439a9043e8e7d45615ef-research.md; 2026-10-17 implement rider (run 21222e003a45 cycle:4 implement be893b98): matrix seeded at docs/plans/2026-10-17-001-upgrade-decision-matrix-v2-plan.md — one dated row per major with go/no-go, trigger or review date, and owning def; .nvmrc landing 24 so local dev matches engines >=24 and the node:24 image line; rm-139's acceptance re-pointed from the superseded rm-108 matrix to this def's matrix doc; 2026-10-17 compound rider (run 21222e003a45 cycle:4 compound 69b759e177254669bac53549df829147): .nvmrc, the matrix doc, and the rm-139 re-point all carried green through full validation PR #829 (10 checks SUCCESS incl. Check Types and Lint) plus targeted 97/97 (c8d4cd0b); .nvmrc remains a unique carrier vs origin/main (absent at edf948de) so it lands clean; next maintenance cycle's assessment should run the Node 26 LTS go/no-go against this def's matrix — the 2026-10-28 gate falls inside that cycle's window

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

### Render-landing channel governance — managed roadmap renders arrive as PRs, never direct pushes
- id: `rm-680` | track: reliability | priority: 31.0 | status: in_progress
- acceptance: managed ROADMAP renders open a PR and never push main directly; each render PR carries a pre/post id-census delta (defs added = mints with provenance, defs removed = explicit supersede references only), a provenance-comment delta or explicit supersede note, and lint-green plus rm-678 guard-green (the ledger-integrity guard, both halves) on the rendered tree; a direct main push of ROADMAP.md by the emitter is treated as a security-class regression in postmortem terms; with rm-116 filled and admin-enforced the channel becomes structurally blocked rather than conventionally avoided.
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

### Audit-run self-description: per-state Dependabot census in the weekly audit job
- id: `rm-672` | track: reliability | priority: 30.0 | status: in_progress
- acceptance: audit.yaml gains a census step whose run summary prints per-state counts (open / fixed / dismissed / total) derived from paginated `repos/codeo1io/dashboard/dependabot/alerts?state=<s>` queries pinned by full endpoint path (no `-R` flag: gh 2.86.0 rejects `-R` before the `api` subcommand, and flag-less gh once resolved to the upstream fork); the census step never fails the job (reporting-only) so it cannot widen the audit gate; multi-page state slices are summed, not last-page; workflow validated with actionlint container-form
- evidence: campaign-recorded in dashboard ROADMAP.md

### Scheduled conductor-ref census guard (fail-visible residue growth without push authority)
- id: `rm-681` | track: reliability | priority: 30.0 | status: in_progress
- acceptance:
- evidence: campaign-recorded in dashboard ROADMAP.md

### eslint-plugin-erasable-syntax-only 0.4.2 → 0.7.x + enable the new export-aliases rule (fork-first)
- id: `rm-682` | track: reliability | priority: 30.0 | status: in_progress
- acceptance: devDeps floor raised to 0.7.2 (or newest <1.0 clearing minimumReleaseAge 1440); the export-aliases rule confirmed ON in eslint.config.js — explicitly or via the preset's default, with WHICH documented; a repo-wide scan shows zero pre-existing violations or the flagged sites triaged with the invariant intact; pnpm lint + check-types + test green
- evidence: campaign-recorded in dashboard ROADMAP.md

### ESM entry-point check fails on URL-encodable path characters
- id: `rm-702` | track: reliability | priority: 30.0 | status: in_progress
- acceptance: the entry-point test compares via `url.pathToFileURL(process.argv[1]).href === import.meta.url` (or an equivalent pathToFileURL normalization); a regression test pins entry-detection TRUE under a space-containing path; no behavior change for plain paths
- evidence: campaign-recorded in dashboard ROADMAP.md

### SSE multi-line data join per WHATWG 9.2.6 on both parser twins
- id: `rm-854` | track: reliability | priority: 30.0 | status: in_progress
- acceptance:
- evidence: campaign-recorded in dashboard ROADMAP.md

### snapshot-store logPersistProblem flattens structured payloads to `'[object Object]'`
- id: `rm-802` | track: reliability | priority: 30.0 | status: implemented 2026-10-09, validated pre-review, landed at this integrate (run d8fdf8b79ad54a68883810c1fc29a2da cycle:3 implement 2852b2bf; targeted_tests 921/921 on the engine-named 12 surfaces + full_tests via the supervisor-approved six-job local mirror under the account-level Actions outage; batch doc docs/prioritization/2026-10-09-repository-maintenance-cycle-3-batch-run-d8fdf8b79ad5.md)
- acceptance: the persistence-problem logger emits plain-object payloads as structured fields (the size-bound `{bytes}` value lands as a field, never a stringified `'[object Object]'`), keeps Error-instance message extraction for real errors, and the rm-701/rm-759 describes carry spy tests asserting a single warning record with the exact numeric byte value and no `error` field (red before, green after); load()'s fail-open return semantics unchanged
- evidence: vitest run of test/snapshot-store.test.ts (17/17 = 15 pre-existing at the batch base + 2 new); RED pre-fix log in the run's spool scratch; composed on the rm-701/rm-759 mechanics this same integrate restored after their adoption-lineage drop

### Stale remote-ref sweep (push-gated)
- id: `rm-742` | track: maintainability | priority: 30.0 | status: implemented 2026-10-08/09, validated pre-review, landed at this integrate (run 405e9004bd5a424aad06019cc342efa6 terminal-salvage, conflict case 5eb4cb85; the --apply execution stays owed to a sanctioned push gate by this def's own acceptance — no push in an implement turn, and origin/main moved twice during the cycle so the before/after counts must be re-derived at that gate; the fleet-wide sweep of ALL stale conductor refs stays rm-159's push-gated scope — this def converges there, not into it)
- signals: origin carried 136 `conductor/*` heads at mint (88 run-* + 48 ci/ci-base, counted 2026-10-08; 50 ci heads / 161 total by the 2026-10-09 probe) — landed batches leave validation refs behind with no automated reaper; ref bloat slows every fetch and buries in-flight lanes in listing noise
- acceptance: a sweep script with --dry-run default and explicit --apply deletes `conductor/ci-*` and `conductor/ci-base-*` refs older than a stated cutoff while honoring named exclusions; a fixture suite pins cutoff + exclusion behavior (boundary errs toward keeping, zero deletions of young refs); execution only at a sanctioned push gate, with before/after ls-remote counts recorded
- evidence: scripts/sweep-stale-conductor-refs.ts + test/sweep-stale-conductor-refs.test.ts 13/13 (namespace filter, cutoff boundary, exclude globs incl. mid-path '*', malformed for-each-ref rows skipped); live dry-run smoke against origin: 48 ci-namespace refs, 28 stale at the 14d default cutoff, zero deletions, rc=0, and the throwaway refs/conductor-sweep/* namespace empty after every run; disclosed acceptance delta — the whitelist mechanism is --exclude globs plus the dominant 14d cutoff

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

### Public robots.txt: a well-known disallow for the authenticated surface
- id: `rm-713` | track: reliability | priority: 28.0 | status: in_progress
- acceptance:
- evidence: campaign-recorded in dashboard ROADMAP.md

### Absorb upstream #570: operator launch-card anatomy (repo label, cancel region, role=button, expansion retention)
- id: `rm-744` | track: reliability | priority: 28.0 | status: in_progress
- acceptance: the absorb reconciles upstream's anatomy onto this fork's generation-counter lineage — optimistic launch cards carry a repo label (data-role run-repo) and cancel region (run-cancel) with role=button; expansion state survives adoption via the pickerRepo/ensureRunCardAnatomy wiring reconciled with this fork's markCardExpandedForLaunch; the async-interleaving hazard recorded on rm-283's 2026-10-07 rider is not re-introduced; upstream's operator-run-index-core tests are ported or reconciled (the +447-line expansion is the acceptance shape); the read-only invariant is byte-preserved (no write path, no wiki-write surface per rm-259); post-absorb, git diff upstream/main over the three files shows a residual delta that is explained line-by-line
- evidence: campaign-recorded in dashboard ROADMAP.md

### Idempotency-key mint policy + login-fetch User-Agent consistency across twin surfaces
- id: `rm-1448` | track: correctness | priority: 28.0 | status: candidate (added 2026-10-15, repository-maintenance cycle:1 run ccde661ea9904de6b483c1fb8713c95f roadmap fe5d7f42, from assess a280db81 F4/F5; minted clear of the rm-1414 wall ceiling and the rm-1445 spool frontier; verified unowned — no def covers idempotency-key mint policy or the oauth UA site)
- signals: web/src/push/subscribe.ts:229-236 rejects a Math.random fallback (comment: "a predictable key would defeat the gateway's zero-duplicate-subscription retry invariant") while the operator twins silently fall back to Date.now().toString(36) + Math.random() for the SAME gateway idempotency machinery — public/operator-launch.js:69-78 (run-launch keys), public/operator-stream.js:2745-2749 (approval-decision keys), :3081-3085 (cancel keys); separately src/auth/oauth.ts:127-135 sends no explicit user-agent on the login-identity fetch while :87 pins one (undici's injected default "node" verified sufficient 2026-10-15 — consistency only, not a live 403 risk)
- acceptance:
  - the three operator twin sites adopt the push client's fail-closed mint policy (null key omits the idempotency header), or a dated justification comment lands at each site explaining why the weaker fallback is acceptable there
  - oauth.ts sends the same explicit user-agent on fetchGitHubUserLogin as validateAuthorizationCode already does
  - tests pin the fail-closed behavior in a fixture where crypto.randomUUID is absent; no behavior change in production secure contexts (randomUUID always present there)
- evidence: the shared-helper or per-site diff; focused twin + oauth tests green

### Rate-limit 429s carry no Retry-After
- id: `rm-741` | track: developer-experience | priority: 28.0 | status: implemented 2026-10-08/09, validated pre-review, landed at this integrate (run 405e9004bd5a424aad06019cc342efa6 terminal-salvage, conflict case 5eb4cb85; red-first — the suite was proven 8/8 RED before the edit, 8/8 GREEN after; targeted_tests 759/759 incl. the companion rate-limit-class/config/key-cap suites; full_tests green on ephemeral draft PR #456; the src/server.ts executable surface proven unchanged across phases by digest parity validation:v1:b0988520)
- signals: the shared per-path-class limiter (public/operator/ingest, 60 req/min default, RATE_LIMIT_MAX_* overrides) returned bare 429 text with no Retry-After header — bursty SPA pollers and listener senders could not compute backoff and re-hit the window edge
- acceptance: every 429 from the shared limiter carries Retry-After as integer seconds-to-window-reset (ceil, clamped to at least 1, never more than the full window) computed from the per-class window; a focused test pins header presence + value bounds for each of the three classes; README's rate-limit section documents the header
- evidence: src/server.ts exports rateLimitRetryAfterSeconds (shared window per key — the budgets are per-class but the window resets together, so the reset is a property of the key; a key with no window state, the rm-286 capacity fail-closed denial, answers the minimal honest 1s) and the single 429 site sets Retry-After for every class; test/rate-limit-retry-after.test.ts 8/8 pins the ceil arithmetic and middleware presence/bounds on /auth/login, /api/status, /api/listener/ingest; README's rate-limit section documents the header

### rm-185
- id: `rm-185` | track: reliability | priority: 27.0 | status: in_progress
- acceptance: the cached token entry stores the API-provided expiry (now+55min cap only as fallback when absent), refresh triggers on real expiry with a small safety margin, and a test proves the cache honors a short expiresAt fixture rather than the 55-minute guess
- evidence: campaign-recorded in dashboard ROADMAP.md

### Snapshot-store load buffers the full cache file before the byte-bound rejection
- id: `rm-759` | track: reliability | priority: 27.0 | status: implemented (restored 2026-10-15 at the integrate of run d8fdf8b79ad5, conflict case 70b938272a—the statSync pre-read size gate + spy-proven ordering tests landed 2026-10-08/09 and were dropped as adoption collateral by the October upstream-adoption lineage; restored here with rm-802 structured-payload logging composed on top)
- acceptance:
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

### Security.txt refresh-freshness guard — automate the quarterly obligation
- id: `rm-673` | track: reliability | priority: 26.0 | status: in_progress
- acceptance: the existing security.txt test block gains a runway assertion — Expires must be at least 60 days in the future — with the bound chosen so one missed quarterly cycle fails CI well before the field can approach expiry; assertion red-first proven by temporarily pinning a soon-to-expire value (test red, restore, test green); no change to the served security.txt itself
- evidence: campaign-recorded in dashboard ROADMAP.md

### Dependency major-version sweep: typescript 7, vitest 5, vite-plugin-pwa 2, jsdom 30, jest-dom 7
- id: `rm-1449` | track: reliability | priority: 26.0 | status: candidate (added 2026-10-15, repository-maintenance cycle:1 run ccde661ea9904de6b483c1fb8713c95f roadmap fe5d7f42, from research 035cd3de R4; minted clear of the rm-1414 wall ceiling and the rm-1445 spool frontier; verified unowned — vite-plugin-pwa 2.0 was screened to rm-138 per the 2026-10-10 ext #38 comment, but rm-138's def covers that one package; this mint owns the sweep as a batch class; fast-check/@hono node-server/playwright bumps ride the unlanded 9c5a7d191 batch and are NOT re-minted here)
- signals: pnpm outdated on main a385ca5 (2026-10-15) — typescript 6.0.3 to 7.0.2, vitest 4.1.11 to 5.0.4, vite-plugin-pwa 1.3.0 to 2.0.0, jsdom 29.1.1 to 30.1.2, @testing-library/jest-dom 6.9.1 to 7.0.1, eslint-plugin-erasable-syntax-only 0.4.2 to 0.7.2, @types/node 24.13.3 to 26.6.5 (pairs with rm-139's Node-26 gate); TS 7 is the native-compiler port (check-types latency win) with an unproven erasable-syntax lint interplay in this repo; vitest 5 moves the 4270-test battery; vite-plugin-pwa 2 rides the just-absorbed PWA/push surface
- acceptance:
  - each major lands as its own reviewed change with the full battery green and audit at 0 advisories (TS 7: check-types + erasableSyntaxOnly lint interplay proven; vitest 5: all suites migrate; vite-plugin-pwa 2: the push/PWA surface re-verified end to end)
  - no two majors in one change; sequencing respects the 9c5a7d191 lockfile lineage and the rm-252 absorb disposition to avoid base collisions
- evidence: per-change diffs + green gate logs; pnpm outdated showing the remaining set shrinking

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
- acceptance: when 26 promotes to LTS (~late 2026-10): a go/no-go recorded in rm-1475's matrix (docs/plans/2026-10-17-001-upgrade-decision-matrix-v2-plan.md) covering engines >=24, the node:24-slim tag choice, the @types/node major, and runner tool-cache impact; adoption, if approved, lands as one reviewed change with all gates green
- evidence: campaign-recorded in dashboard ROADMAP.md; 2026-10-15 rider (run ccde661ea990 cycle:1 roadmap fe5d7f42, from research 035cd3de R3): gate-week evidence — nodejs releases API shows v26.12.0 and v24.22.0 both published 2026-10-14 (v26 twelve minors into the line); v24 active support ends 2026-10-20 per the prior rider; @types/node 26.6.5 available (pnpm outdated at a385ca5); upstream's 2026.10.27 already bumped its node image digest (PR #620) — run the go/no-go matrix on schedule so the 2026-10-28 gate lands as a decision, not a scramble. The @types/node 26 pairing rides rm-1449's sweep.

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

### Push health states in the Notifications surface (gateway contract 1.8.0 inactive-reason ladder)
- id: `rm-693` | track: reliability | priority: 24.0 | status: in_progress
- acceptance: the Notifications surface renders all four inactive reasons distinctly, each with the recovery affordance it implies (resubscribe vs dead-device purge vs session re-auth); the enum renders ONLY behind the contract-1.8.0 gate — no fabricated states against a pre-1.8.0 gateway; the reconcile.ts stale_key special case is absorbed into the ladder or documented as its own rung
- evidence: campaign-recorded in dashboard ROADMAP.md

### In-window dependency refresh — vite 8.3.4, eslint 10.12.0, @hono/node-server 2.1.4, @playwright/test 1.64.0, @opencode-ai/plugin 1.18.35
- id: `rm-760` | track: reliability | priority: 24.0 | status: in_progress
- acceptance:
- evidence: campaign-recorded in dashboard ROADMAP.md

### Code-truth micro-batch: dead param, env-parse lenience
- id: `rm-180` | track: reliability | priority: 23.0 | status: in_progress
- acceptance: one truth each — the dead param removed (both call sites plus signature) or exercised by a test proving intended precedence; envIntOrDefault tightened to whole-string parsing or the lenient behavior pinned by an added test with the decision recorded in the cycle batch doc
- evidence: campaign-recorded in dashboard ROADMAP.md

### rm-181
- id: `rm-181` | track: reliability | priority: 23.0 | status: in_progress
- acceptance: a documented disposition — close-with-comment (pointing at the recorded validation evidence) for drafts older than N days, or a small GITHUB_TOKEN-only workflow that auto-closes stale conductor-draft PRs past N days with a standard comment; the choice recorded in docs/runbooks; `gh pr list` open count reflects real work only
- evidence: campaign-recorded in dashboard ROADMAP.md

### Aggregator cache eviction on working-set diff: departed repos accumulate forever
- id: `rm-1476` | track: reliability | priority: 23.0 | status: candidate (added 2026-10-16, repository-maintenance cycle:4 run 21222e003a454200a41d886c25934199 roadmap 783592071ee6496ca1f1f7d8c5b9ca70, from research 4c4c291b candidate 7, carried open from the 2026-09-24 ideation doc idea 7 and re-verified unowned 2026-10-16; minted above the unlanded spool frontier rm-1471 (run 7708ee2a cyc:1 roadmap 24cde84d) and rm-1465..rm-1470 (run 6f9b600f cyc:2 roadmap a24cef68) and rm-1464..rm-1467 (run 0772bfc2 cyc:1 roadmap 34685733/8d3c450a) and the origin/main wall ceiling rm-1452 at 7b4d425 — first-landed-wins, landing gates re-derive id occupancy)
- signals: src/github/aggregator.ts has no delete, prune, or evict path — grep finds only stale-marking at :747 and :763 — so a long-uptime process accumulates departed repos in its cache forever; a redaction denylist change hides a repo from queries but never removes its cache entry; the growth class is invisible in tests because fixtures never model de-installation
- acceptance:
  - cache entries whose repos are absent from the current installation-enumerated working set are pruned on refresh, with fail-closed preserved: an enumeration failure serves stale and evicts nothing
  - a test seeds a departed repo and pins its eviction, and a second test proves an enumeration error does NOT evict (fail-closed on the eviction path itself)
  - the eviction decision (working-set diff versus TTL) is recorded in the module header comment with the chosen semantics
- evidence: campaign-recorded in dashboard ROADMAP.md; the aggregator diff plus the two tests at landing

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

### security-posture runbook: carry the conditional GitHub-Release design
- id: `rm-692` | track: reliability | priority: 22.0 | status: in_progress
- acceptance: both runbook lines reworded to carry the conditional (dormant App-gated path exists at release.yaml:416/488, active iff both app secrets are provisioned); the row states what happens to the Signed-Releases score if that path ever activates; the fresh Scorecard date + score recorded in the same edit; zero code/workflow changes in this item — any decision to REMOVE the dormant path is a separate deliberate change, not part of this docs batch.
- evidence: campaign-recorded in dashboard ROADMAP.md

### Pin X-GitHub-Api-Version at every GitHub egress client
- id: `rm-855` | track: reliability | priority: 22.0 | status: in_progress
- acceptance:
- evidence: campaign-recorded in dashboard ROADMAP.md

### Fro Bot workflow enablement truth: live state active vs documented disabled_manually
- id: `rm-1450` | track: reliability | priority: 22.0 | status: candidate (added 2026-10-15, repository-maintenance cycle:1 run ccde661ea9904de6b483c1fb8713c95f roadmap fe5d7f42, from assess a280db81 F3; minted clear of the rm-1414 wall ceiling and the rm-1445 spool frontier; verified unowned — no main-side def covers the workflow live-state reconciliation; deliberately NARROW: the unlanded rm-1410 tail owns the comment/mirror flip text (fro-bot.yaml:270-285 + AGENTS.md wording), this mint owns the enable/disable decision + secret-provisioning check, so the two reconcile by content at integrate; full_tests d8fe1ca0 same-day datum: gh workflow run main.yaml --ref main returned HTTP 422 'Actions has been disabled for this repository' (probed twice 2026-10-15) while gh run list still worked and zero runs exist since 37872407109 @ 2026-10-09T01:59:31Z — this CONTRADICTS the assess-day actions/permissions readback (enabled:true, allowed_actions:selected), so the darkness may be repo- or org-level disablement rather than a pure platform incident; the next estate probe MUST distinguish platform status (rendered by rm-1447's banner) from repo actions/permissions state (and any org-level disable) BEFORE the enable/disable decision executes; the decision stays deferred per the prioritize-recorded reconciliation)
- signals: gh api 2026-10-15 — workflow "Fro Bot" (id 330819996) reports state active; gh secret list returns EMPTY (no FRO_BOT_PAT); last Fro Bot run 2026-09-18T03:11:51Z (a failure); yet AGENTS.md and fro-bot.yaml:270,276-285 assert disabled_manually with PAT-gated skip semantics; the re-enable left no run records because Actions run creation has been dark since 2026-10-09 — when the outage lifts, the daily 00:00 UTC cron resumes creating runs against a missing PAT
- acceptance:
  - a recorded decision: re-disable (gh workflow disable) until FRO_BOT_PAT is provisioned, OR keep active and land the documented active+gated semantics (AGENTS.md claim + workflow comment truth-flipped, riding the rm-1410 tail)
  - if kept active: the first post-recovery scheduled run is observed skipping cleanly at the PAT gate (skipped/neutral, not failed), with the observation recorded as a rider
- evidence: the decision line in the cycle batch doc; a gh api readback showing state matches the documented intent; 2026-10-17 compound rider (run 21222e003a45 cycle:4 compound 69b759e177254669bac53549df829147): the darkness BROKE during this cycle — run creation and completion both work again (this run's ephemeral PRs #807 and #829 created and completed 10+ check workflows 2026-10-17; Lockfile Guard 38981411688 green; sibling observation rm-1478 run e178a946 saw the same via PR #828), so the enable/disable decision is no longer racing an active outage — the platform-vs-repo-disablement distinction probe is still owed before executing it, and the during-darkness dead-lane census is rm-1478's, not this def's

### Fill the branch-protection shell: rm-116's successor with required checks, strict, admin-enforced — sequenced behind the Actions enable decision
- id: `rm-1474` | track: reliability | priority: 21.0 | status: candidate (added 2026-10-16, repository-maintenance cycle:4 run 21222e003a454200a41d886c25934199 roadmap 783592071ee6496ca1f1f7d8c5b9ca70, from assess a9a65f1c F4 + research 4c4c291b candidate 5; minted above the unlanded spool frontier rm-1471 (run 7708ee2a cyc:1 roadmap 24cde84d) and rm-1465..rm-1470 (run 6f9b600f cyc:2 roadmap a24cef68) and rm-1464..rm-1467 (run 0772bfc2 cyc:1 roadmap 34685733/8d3c450a) and the origin/main wall ceiling rm-1452 at 7b4d425 — first-landed-wins, landing gates re-derive id occupancy; verified unowned — rm-116 closed superseded with no successor while two open acceptance clauses still cite it, and no open def owns filling the live object)
- signals: live probe 2026-10-16 — required_status_checks contexts empty, strict false, enforce_admins disabled: the protection object on main is an empty shell; rm-116 sits closed superseded with no successor def while the dependabot-automerge acceptance defers to rm-116 landing and the managed-render acceptance defers to rm-116 filled and admin-enforced — both clauses dangle on a def that no longer owns anything; 6 open Scorecard alerts (CodeReviewID and Maintained at HIGH, SASTID medium, per assess) are exactly the posture filling protection closes; required checks cannot run while Actions are dark, so this is sequenced behind rm-1450's enable decision
- acceptance:
  - once rm-1450's decision restores run creation, protection on main carries the Main job conclusions plus CodeQL per the original rm-116 shape, strict true, enforce_admins enabled — applied via the body-preserving PUT recipe from AGENTS.md landing-pipeline traps, never by deleting the object
  - the two dangling acceptance citations re-point at this def in the same landing, so no acceptance clause references a def without an owner
  - the live protection object is probed and recorded post-fill; the Scorecard CodeReviewID/Maintained alerts re-checked after the default-branch scan next runs
- evidence: campaign-recorded in dashboard ROADMAP.md; gh api branches/main/protection probe output in assess delegate/a9a65f1ceeae40deac91c82fd1ab64bf.json and research delegate/4c4c291b563a439a9043e8e7d45615ef.json

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

### Ledger repair: recovery path from the lossy 2026-10-06 roadmap-sync render
- id: `rm-675` | track: reliability | priority: 20.0 | status: in_progress
- acceptance: emitter obligations land in the external roadmap-sync renderer BEFORE any next managed render (no trailing spaces on empty acceptance lines, backticked bracket lists, HTML-comment and id-def preservation, byte-identical status round-trip); a diff-based ledger census guard (defs/comments/statuses) gates render commits; full pre-sync-ledger restoration vs compose-forward is decided and executed — deliberately deferred out of the 2026-10-06 cure landing as must_remain_separate.
- evidence: campaign-recorded in dashboard ROADMAP.md

### Re-pin pnpm/action-setup v6.0.10 → v6.1.0 at its three workflow sites
- id: `rm-761` | track: reliability | priority: 20.0 | status: in_progress
- acceptance:
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

### Actions pin drift sweep: setup-qemu one major behind plus six minor drifts (outage-gated)
- id: `rm-1451` | track: reliability | priority: 18.0 | status: candidate (added 2026-10-15, repository-maintenance cycle:1 run ccde661ea9904de6b483c1fb8713c95f roadmap fe5d7f42, from research 035cd3de R5; minted clear of the rm-1414 wall ceiling and the rm-1445 spool frontier; verified unowned — rm-856 owns the base-drift tag derivation site, rm-108's orphan rider owns re-pin history; this mint owns the sweep content itself; distinct from the unlanded rm-1445 guard test, which only enforces digest pinning shape)
- signals: SHA-to-tag resolution 2026-10-15 (gh api matching-refs + releases/latest) — docker/setup-qemu-action pinned v3 vs latest v4.4.0 (one MAJOR behind); actions/checkout v7 to v7.0.1, actions/setup-node v7.0.0 to v7.1.0, actions/upload-artifact v7 to v7.0.2, docker/setup-buildx-action v4 to v4.4.1, docker/login-action v4 to v4.6.0, actions/create-github-app-token v3 to v3.3.0; pins live in .github/workflows/ AND .github/actions/setup/action.yaml (the composite action carries its own copies — sweeps that grep only workflows undercount)
- acceptance:
  - one re-pin sweep including the composite action copies, every digest re-derived from its release tag; actionlint container-form green locally
  - CI validation gated on Actions recovery (the local outage pattern documents the interim evidence form)
- evidence: the re-pin diff (both directories); actionlint output; gh api tag/digest pairs

### operator-stream runtime: module-singleton stream handle vs StrictMode double-mount (dev-only today)
- id: `rm-283` | track: reliability | priority: 16.0 | status: in_progress
- acceptance: stream ownership scoped per instance (or the late-resolving cleanup made idempotent against a handle it no longer owns), plus a test that mounts two runtimes and asserts mount2's stream survives mount1's cleanup; the singleton comment updated to state the invariant
- evidence: campaign-recorded in dashboard ROADMAP.md

### X-Forwarded-Proto Secure-cookie trust without opt-in (decision-first)
- id: `rm-604` | track: reliability | priority: 16.0 | status: in_progress
- acceptance: decision recorded — either mirror the opt-in convention (XFP trust env-gated, reusing the rm-129 semantics, README + runbook rows updated) or keep header-trusting with the asymmetry documented in the auth code comment and README security notes; either way tests pin the chosen semantics at BOTH cookie sites (oauth state cookie and session cookie) across the three topologies: direct http, direct https, proxy with XFP
- evidence: campaign-recorded in dashboard ROADMAP.md

### Dark-Actions validation runbook: encode the local CI-equivalent gate recipe
- id: `rm-1452` | track: reliability | priority: 16.0 | status: implemented 2026-10-15, validated pre-review, landed at this integrate (run ccde661ea9904de6b483c1fb8713c95f cycle:1 implement 6b00a66f / full_tests d8fe1ca0; docs/runbooks/outage-validation.md authored with the full recipe — own-refs-only cleanup including the conductor/ci-base parent-ref deletion and ls-remote-zero proof, the mirror-jobs gate set with expected-green baselines, the digest-verbatim declaration rule, and the stranded-sibling rule — and VALIDATED END-TO-END the same day by the run's own full_tests phase, which satisfied the authoritative github_ci_validate dispatch exactly per the recipe: adopted the reaped predecessor's (dfaa1113) PR #713 execution after byte-identity proofs, probed both sides of the outage (see rm-1450's status datum for the 422 contradiction), cleaned only its own refs (PR #713 closed; conductor/ci-5f027949f1ae + ci-base-05a5af9f262c deleted; ls-remote count 0), and ran the content-identical local mirror of every CI job green, provenance section appended to the runbook; minted 2026-10-15 roadmap fe5d7f42 from research 035cd3de R7)
- signals: the outage workaround — clean up ONLY this run's stranded conductor/ci PR + refs, run the local gate set (pnpm check-types, lint, audit, test — 4270/4270 proven 2026-10-15 at a385ca5), then declare the phase outcome with the dispatch validation digest verbatim — currently exists only as engine-side knowledge, re-derived ad hoc by every dark-window run; the recipe's discipline points (own-refs-only cleanup, no re-running with longer timeouts, digest verbatim) are exactly what a runbook pins
- acceptance:
  - a docs/runbooks/outage-validation.md encoding the full recipe (own-refs-only cleanup, the four local gates with their expected-green baselines, the verbatim-digest declaration rule, and the stranded-sibling rule — never sweep another run's PRs)
  - cross-checked against conductor policy so the runbook states engine truth rather than guessing it; zero repo behavior change (docs-only)
- evidence: the runbook file; a citation of it by the next dark-window full_tests phase

### logger info-level routing: structured stdout sink or embrace stderr
- id: `rm-260` | track: reliability | priority: 15.0 | status: in_progress
- acceptance: a recorded decision — either a structured stdout JSON sink lands (and info/debug route there) or the comment/routing is trued to reality (info→console.info, stderr reserved for warn+); no silent behavior change to the listener/ingest paths' error surfacing
- evidence: campaign-recorded in dashboard ROADMAP.md

### AGENTS.md clonedeps version truth: the doc says v0.78.0, the canonical clone is v0.122.1
- id: `rm-1477` | track: maintainability | priority: 14.5 | status: in_progress (added 2026-10-16, repository-maintenance cycle:4 run 21222e003a454200a41d886c25934199 roadmap 783592071ee6496ca1f1f7d8c5b9ca70, from assess a9a65f1c F10; minted above the unlanded spool frontier rm-1471 (run 7708ee2a cyc:1 roadmap 24cde84d) and rm-1465..rm-1470 (run 6f9b600f cyc:2 roadmap a24cef68) and rm-1464..rm-1467 (run 0772bfc2 cyc:1 roadmap 34685733/8d3c450a) and the origin/main wall ceiling rm-1452 at 7b4d425 — first-landed-wins, landing gates re-derive id occupancy; verified unowned — no ledger row tracks the clonedeps doc, and the Fro Bot workflow-state bullet on the same page is separately owned by the unlanded rm-1410 lineage per rm-1450's status note, so this def owns only the clonedeps version truth)
- signals: AGENTS.md:104 documents the clonedeps source as fro-bot/agent at v0.78.0 while the canonical checkout's clone at .slim/clonedeps/repos/fro-bot__agent describes itself v0.122.1 (first-hand 2026-10-16) — 44 minors of drift between the doc and the artifact it describes; the clone is absent in fresh worktrees, .slim being untracked, so the stale version claim is the only description an agent sees
- acceptance:
  - the bullet states the live clone version and the rule that it tracks the workflow agent pin (v0.122.1 today, refreshing with it), noting the checkout-relative absence in fresh worktrees
  - no other AGENTS.md claim changes in this def — the Fro Bot state bullet stays with the rm-1410 lineage
- evidence: campaign-recorded in dashboard ROADMAP.md; git describe in the canonical clone; the workflow agent pin; 2026-10-17 implement rider (run 21222e003a45 cycle:4 implement be893b98): AGENTS.md bullet now states v0.122.1 (git describe first-hand, equal to the fro-bot.yaml:347 pin comment) with the tracks-the-agent-pin rule and the fresh-worktree absence note; no other AGENTS.md claim touched; 2026-10-17 compound rider (run 21222e003a45 cycle:4 compound 69b759e177254669bac53549df829147): the AGENTS.md edit carried green through Lint in full-validation PR #829 (10 checks SUCCESS); FOLD FACT (live-probed at edf948de): main landed its own shorter-form v0.122.1 bullet (AGENTS.md:105, pin-source-and-mirror phrasing) — textual merge owed at fold, keeping the tracks-the-agent-pin rule and the fresh-worktree note from this form; band merge owned by rm-1499

### Startup banner through the structured logger
- id: `rm-229` | track: reliability | priority: 14.0 | status: in_progress
- acceptance: the bind banner emits via `logger.info`; no bare `console.*` call remains in `src/`; no behavior change to binding, ordering, or shutdown wiring; suite green
- evidence: campaign-recorded in dashboard ROADMAP.md

### pnpm auto-install rewrites pnpm-lock.yaml on script runs — evidence-integrity hazard, kill-switch proven
- id: `rm-656` | track: reliability | priority: 14.0 | status: in_progress
- acceptance:
- evidence: campaign-recorded in dashboard ROADMAP.md

### docs/solutions frontmatter convention has no machine check; one shipped lesson already evades it
- id: `rm-803` | track: docs | priority: 14.0 | status: implemented 2026-10-09, validated pre-review, landed at this integrate (run d8fdf8b79ad54a68883810c1fc29a2da cycle:3 implement 2852b2bf; same gate record as rm-802—targeted_tests 921/921 + full_tests via the supervisor-approved local mirror; batch doc docs/prioritization/2026-10-09-repository-maintenance-cycle-3-batch-run-d8fdf8b79ad5.md)
- acceptance: every docs/solutions markdown file carries a frontmatter block (opens at line 1, closes, carries `module:` + `problem_type:`), enforced by test/docs-solutions-frontmatter-guard.test.ts which fails on any gap or never-closing drift file; lesson bodies unchanged beyond the header
- evidence: the guard went red against the unfixed tree (surfacing the census gap file plus two never-close drift files beyond the assess census, all three cured: frontmatter added, missing closing fences inserted) and green after; rode the same targeted/full gate record as rm-802

### Route-level code splitting for the SPA bundle (recorded LOW with counters)
- id: `rm-559` | track: reliability | priority: 12.0 | status: in_progress
- acceptance: only if still worth it after the rm-553-class compression/caching siblings land and a fresh cold-load measure says otherwise: per-view React.lazy + Suspense boundaries; initial route chunk measurably smaller (before/after first-load JS numbers recorded); no PWA/offline regression (sw precache list still complete); web suite green
- evidence: campaign-recorded in dashboard ROADMAP.md

### Four workflows carry no timeout-minutes
- id: `rm-603` | track: reliability | priority: 12.0 | status: in_progress
- acceptance: each of the four gains a timeout-minutes with a one-line rationale comment sized from OBSERVED Actions durations recorded in the cycle doc (not guesses), actionlint clean
- evidence: campaign-recorded in dashboard ROADMAP.md

### Ephemeral-validation refs accumulate stale conductor/ci-* heads on origin
- id: `rm-778` | track: reliability | priority: 12.0 | status: in_progress
- acceptance:
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

<!-- run 21222e003a454200a41d886c25934199 roadmap extension 2026-10-16, attempt 783592071ee6496ca1f1f7d8c5b9ca70: minted rm-1472..rm-1477 above the known unlanded spool frontier rm-1471 (run 7708ee2a cyc:1 roadmap 24cde84d) and rm-1465..rm-1470 (run 6f9b600f cyc:2 roadmap a24cef68) and rm-1464..rm-1467 (run 0772bfc2 cyc:1 roadmap 34685733/8d3c450a) and the origin/main wall ceiling rm-1452 at 7b4d425 — first-landed-wins, landing gates re-derive id occupancy per convention; same-edit ledger repair — rm-648's empty acceptance filled (cve-tripwire land-or-retire plus the phantom citation in release-channel.yaml). Fold-declared, NOT re-minted: rm-740 staleness repair (sibling mints rm-1465 a24cef68 / rm-1468 24cde84d), the 2026-10-16 absorb window incl. the UX tail (sibling rm-1467 a24cef68 plus the rm-252 estate gate plus rm-1469/rm-1471 lineages), the Fro Bot AGENTS.md wording (rm-1410 lineage per rm-1450's status note), conductor-ref census riders (rm-742 already double-ridden 2026-10-16). Sources: assess delegate/a9a65f1ceeae40deac91c82fd1ab64bf.json, research delegate/4c4c291b563a439a9043e8e7d45615ef-research.md. -->

<!-- run 21222e003a454200a41d886c25934199 compound 2026-10-17, attempt 69b759e177254669bac53549df829147: consumed pre-review cycle evidence only — validation riders appended to rm-648, rm-1472, rm-1473, rm-1475, rm-1477 (targeted 97/97 c8d4cd0b; full validation ok:true ephemeral PR #829 commit 0cf64753, 10 checks SUCCESS) and rm-1450 (outage-broke datum); minted rm-1499 (cycle-4 fold reconciliation, above the rm-1498 unlanded frontier); statuses stay in_progress pending the landing fold per the implemented-at-integrate convention; prior compound attempt f6f2c8fb reaped at message_count=2 with no durable trail — nothing to adopt, phase redone from scratch; cycle-5 context at docs/prioritization/2026-10-17-repository-maintenance-cycle-4-compound-run-21222e003a45.md -->

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
