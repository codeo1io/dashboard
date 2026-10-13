# dashboard — Roadmap

> Autonomously maintained by the roadmap sync (reliability-first). Items cite reproducible codebase signals; acceptance is proven by cited evidence.

**Vision**: A reliable, customer-friendly repository advanced by evidence-cited roadmap cycles owned by the autonomy loop

**Pillars**: reliability work outranks customer-experience work; every roadmap item cites reproducible codebase signals; acceptance is proven by cited evidence, never claimed

## Fleet context

- upstreams (this repo builds on): .github, agent, hermes-agent
- dependents (changes here affect): (host), hermes-control-ui
- graph: evidence-derived (imports/refs/deploy surfaces); advisory

## Open items

### Add test coverage for 20 untested module(s)
- id: `rm-022` | track: reliability | priority: 100.0 | status: candidate
- signals: reliability.no_tests:.agents/skills/impeccable/scripts/context-signals.mjs, reliability.no_tests:.agents/skills/impeccable/scripts/critique-storage.mjs, reliability.no_tests:.agents/skills/impeccable/scripts/detect-csp.mjs, reliability.no_tests:.agents/skills/impeccable/scripts/detector/design-system.mjs, reliability.no_tests:.agents/skills/impeccable/scripts/detector/detect-antipatterns-browser.js (+15 more)
- acceptance: Every module in \['.agents/skills/impeccable/scripts/context-signals.mjs', '.agents/skills/impeccable/scripts/critique-storage.mjs', '.agents/skills/impeccable/scripts/detect-csp.mjs', '.agents/skills/impeccable/scripts/detector/design-system.mjs', '.agents/skills/impeccable/scripts/detector/detect-antipatterns-browser.js', '.agents/skills/impeccable/scripts/detector/detect-antipatterns.mjs', '.agents/skills/impeccable/scripts/detector/engines/browser/detect-url.mjs', '.agents/skills/impeccable/scripts/detector/engines/regex/detect-text.mjs', '.agents/skills/impeccable/scripts/detector/engines/static-html/css-cascade.mjs', '.agents/skills/impeccable/scripts/detector/engines/static-html/detect-html.mjs', '.agents/skills/impeccable/scripts/detector/engines/visual/screenshot-contrast.mjs', '.agents/skills/impeccable/scripts/detector/node/file-system.mjs', '.agents/skills/impeccable/scripts/detector/profile/profiler.mjs', '.agents/skills/impeccable/scripts/detector/registry/antipatterns.mjs', '.agents/skills/impeccable/scripts/detector/shared/inline-ignores.mjs', '.agents/skills/impeccable/scripts/hook-admin.mjs', '.agents/skills/impeccable/scripts/hook-before-edit.mjs', '.agents/skills/impeccable/scripts/hook-lib.mjs', '.agents/skills/impeccable/scripts/lib/design-parser.mjs', '.agents/skills/impeccable/scripts/lib/impeccable-config.mjs'\] has a corresponding test file with at least one passing test
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
- rider (2026-10-10, run 08a0abac9453 roadmap a2555fa7, from assess 0b1bd864 posture): dependabot census 0 open / 47 fixed (10-06 census was 9 open / 30 fixed) — the floor strategy has cleared every open npm advisory first-hand; keep the audit-gate stance

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
- evidence: campaign-recorded in dashboard ROADMAP.md
- rider (2026-10-09, repository-maintenance cycle:2 run 493bbbf2227c4352b8e9dde32420d1f1 roadmap 224cff7852b341b9a86606161f339b91, from research 6e9b9be5916b4eda83a7b94df796905f, census via refs/remotes/autonomy-upstream/main per the trap above): window MOVED — 25 unabsorbed commits, tip 22e2e46 (fro-bot/agent v0.118.3 pin bump), merge-base c1f760e unchanged; the #573 contract-1.8.0 block (33 files, +5354/-158) is CONTENT-ABSORBED on this side — src/gateway/operator-contract/provenance.ts blob 394ad4b1 byte-identical to a82871d's, landed by 89c7398 under rm-157, and version.ts keeps primary 1.6.0 with 1.8.0 in the supported window; substantive remainder = #580 upload-artifact v7.0.2 + #589 codeql-action v4.38.3 (both folded to rm-137's 2026-10-09 rider as digest-refresh pairs), #577 trixie doc rewrite + #578 contract-consume doc (doc absorbs at the operator's discretion), and the fro-bot.yaml agent pin bump riding rm-689's live half; never-absorb disposition unchanged first-hand — upstream package.json description still reads 'isolated wiki-write capability' vs our 'Read-only' (rm-259); absorb decision still due 2026-10-13.
- rider (2026-10-10, run 08a0abac9453 roadmap a2555fa7, from research a2cbb8e9 B): window re-measured — merge-base c1f760e -> upstream tip 1ecbb81 = 27 commits, all classified; the live absorb set narrows to pnpm 11.28.5 (fork 11.28.4), fro-bot/agent action v0.118.3, actions/upload-artifact v7.0.2, and the docs recipe #578 — every upstream security floor is already fork-satisfied first-hand (fast-uri 3.1.8, undici 7.30.0, source-map-js 1.2.2, brace-expansion 5.0.12; toml@5.0.0 AHEAD of upstream's 4.3.0; katex 0.18.10 vs upstream 0.19.0 converges the unlanded rm-841 cap-lift); the 2026-10-13 decision due date stands
- rider (2026-10-10, run e5b71847827444268f9a5b54b9831322 cycle:3 roadmap 694f98d352f9, from research 1a534497: absorb window static — upstream tip 1ecbb81 (2026-10-09T06:46Z), 27 unabsorbed commits since c1f760e, content quantified pure dependabot chores (#580/#581/#582/#588/#589/#590/#592/#593) + trixie base (#576/#577) + launch-card fix (#570 family); agent #1737 (the 1.8.0 browser-display blocker) CLOSED/COMPLETED 2026-10-08T17:41Z, so the checkout-provenance display half this def's acceptance carries is now UNBLOCKED and still unowned on main; DECISION due 2026-10-13 per the window rider.

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
- rider (2026-10-10, run 08a0abac9453 roadmap a2555fa7, from research a2cbb8e9 A): agent steady — latest release v0.118.3 (upstream pinned it 2026-10-09; this fork's fro-bot.yaml still pins v0.117.5 and stays disabled_manually until FRO_BOT_PAT exists); the 1.8.0 browser DISPLAY half now has its own def rm-842 — this def keeps the version window plus the primary-flip trigger
- rider (2026-10-10, run e5b71847827444268f9a5b54b9831322 cycle:3 roadmap 694f98d352f9, from research 1a534497 live probes: agent main's packages/gateway/src/operator-contract/version.ts now literally exports '1.9.0' (GitHub contents-API read this turn) while latest release v0.118.3 (2026-10-08T22:57Z) still ships 1.8.0 and agent tip is unchanged since 1c5a350f (2026-10-09T16:10Z) — the cliff is COMMITTED-BUT-UNRELEASED; ext#37's unlanded rm-850 (run 633717c23b19) is honored as the owning claim for the readiness work, no re-mint here; escalation trigger unchanged: any agent release > v0.118.3.

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
- rider (2026-10-10, run e5b71847827444268f9a5b54b9831322 cycle:3 roadmap 694f98d352f9, from run e5b718478274 assess 83057abb + research 1a534497; fresh resolve-step simulation at base 88e423a: `grep -oE "node:24-slim@sha256:[0-9a-f]{64}" Dockerfile` -> EMPTY -> ::error + exit 1 (assess F1) — every scheduled fire (next 2026-10-12 06:53Z) errors at resolve while the account-level Actions disable masks it; cure still unlanded (sibling worktree 938d6033557a ARG-derivation). Sibling assess a794d381 (1fa748da, same day) corroborates and flags the same-class literals in base-drift.yaml NOT covered by that cure -> minted rm-856 this extension.

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

### detailsUrl https://-only contract at the failing-check boundary (assess F1)
- id: `rm-709` | track: reliability | priority: 66.0 | status: in_progress
- acceptance: aggregator fixtures with javascript:/data:/relative details_url extract as `''` (`test/aggregator.test.ts`, failing-check-details suite); the client parse drops a feed to contract-drift on a non-https non-empty detailsUrl and keeps `''` legal (`web/src/api/monitoring.test.ts`); both suites green on the delivered tree
- evidence: campaign-recorded in dashboard ROADMAP.md

### Pre-Release CVE tripwire: weekly trivy scan of the pinned base digest (the layer no detector covers)
- id: `rm-648` | track: reliability | priority: 65.0 | status: in_progress
- acceptance:
- evidence: campaign-recorded in dashboard ROADMAP.md
- rider (2026-10-10, run 08a0abac9453 roadmap a2555fa7, from assess 0b1bd864 F4): canary stale-red persistence — run 37308919388 failed 2026-10-05 (ERR_PNPM_LOCKFILE_CONFIG_MISMATCH) with the cause CURED on main (pnpm install --frozen-lockfile rc=0 first-hand at 88e423a); self-heal only via the Monday cron while workflow_dispatch stays outage-blocked

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
- id: `rm-853` | track: reliability | priority: 58.0 | status: implemented 2026-10-10 (run e5b718478274 implement 0c0ae673, pending landing; was: candidate added 2026-10-10 by roadmap 694f98d3, minted above the all-lineage unlanded def-line ceiling rm-852 — ext#37, run 633717c23b19, live spool/worktree/PR scan 2026-10-10: dashboard walls top at rm-849 (run-386aafb1395f), PRs carry no ROADMAP defs; foreign bands excluded with evidence — rm-871/872/873 = agenttrace run 2a5cdb9e (worktree agenttrace-80c75f65b7), rm-890+ = truth-family ledgers (zero-padded rm-011 ids, status 'done', 342 def rows); verified unowned by content — no def or open claim covers stream-gap surfacing)
- signals: src/gateway/operator-sse-reader.ts:490-494 — handleFrame on a parse failure (result.success false) logs and returns true, so the reader keeps consuming with NO client-visible signal; public/operator-stream.js's output reducer accepts strictly-increasing seq and silently drops stale/duplicate frames (validation/apply regions), grep 'gap' = 0 across all four twin surfaces — a truncated or corrupt mid-stream frame therefore loses output text with zero operator-visible trace (the browser twin's 15s first-frame timeout cannot see mid-stream drops)
- acceptance:
  - the output reducer detects expected-seq gaps (frame.seq > last-seen+1) and records a surfaced gap signal the operator UI renders (connection-state detail or a persistent stream notice) — client-only, no protocol change
  - all four vendored-twin surfaces stay byte-parity per the standing parity suite; the public twin's state machine owns the gap flag and web/src/operator consumes it
  - a red-first regression test seeds a gapped frame sequence and asserts the surfaced signal; a duplicate-frame case asserts no false gap
  - the server reader's parse-drop log line stays structured (existing logger.error) and is not converted into a protocol frame
  - lint / check-types / targeted suites green; no aggregator or contract-version surface touched
- evidence: this run's assess transcript (the :490-494 read + gap-grep-0 across twins); the twin parity suite green post-change; the new regression test diff
- trade-off: client-only detection cannot catch frames dropped before the reducer; an explicit server-side gap frame was rejected as a protocol change that would require a contract-version bump (rm-850 lane territory) and upstream co-design
- rider (2026-10-10, run e5b718478274 implement 0c0ae673): implemented red-first — public/operator-stream.js output reducer now latches outputGapDetected and accumulates outputGapMissing on non-final seq skips (first-seen delta above 0 exempt; final frames authoritative and never counted; duplicates/stale never flagged), surfaced via a fixed-label run-output-gap notice wired through operator-run-index.js + operator-launch.js card creation, runtime.ts discovery, index.css, and the twin .d.ts; 7 new reducer/render tests in test/operator-stream-core.test.ts + parity guards in test/operator-launch-core.test.ts; server parse-drop path unchanged (structured log only, no protocol frame).
- rider (2026-10-10, run e5b71847827444268f9a5b54b9831322 cycle:3 prioritize c5cd03a368eb4b92b7e536e2a90d7c79): SELECTED as co-head of this cycle's implement batch 'operator-stream parse-and-drop truth' with rm-854 — scored top of the 83-def composed open pool under the standing model (impact 50 / risk 25 / effort-inverse 15 / leverage 10): live operator-surface silent data loss (assess F3), client-only change touching no protocol/contract surface, red-first testable locally with the standing twin-parity suite, and ZERO sibling claims (ext#38 mint; spool/wall/PR scans clean) so no integrate-collision risk — unlike the cve-tripwire zone. Batch doc: docs/prioritization/2026-10-10-cycle-3-batch-run-e5b718478274.md.
- rider (2026-10-10, run e5b71847827444268f9a5b54b9831322 cycle:3 compound d1071ee27c5843b6a59be8a82ad6a23b, pre-review): acceptance evidence closed — targeted_tests 9a4337f2 validated the md5-verified applied patch (de8adfa6) with its focused local battery: 8 root files / 782 tests green, web operator pair 2 files / 84 tests, build:web rc=0, check-types rc=0, lint rc=0 (0 errors / 10 pre-existing warnings), census 251 defs / 0 dups / max rm-856 healthy, pristine-tree digest re-derived equal to the dispatch stamp — the engine targeted_command itself was NOT run (its github_ci_validate route needs an ephemeral PR, prohibited under the account-level Actions disablement; deferred per the c4a7010a precedent; corrected 2026-10-10 by independent_review:fix 2cca8cee after review 776bd0a9 caught this rider's original verbatim 13-suites / 561-tests engine-run claim as unsupported by any spool artifact — the real battery is larger), and full_tests bbbd1849 SUCCEEDED under the supervisor-accepted Actions-disablement fleet pattern: the verbatim detached validator over the pre-applied batch minted ephemeral draft PR #545 whose file list equals exactly the 14 batch paths, with zero checks at every observation (disablement, not batch failure — outage bracketed by fresh 422 dispatch probes both sides), while the content-identical six-job local mirror went green over the same tree (lint 0 errors / 10 pre-existing warnings, impeccable empty, check-types rc=0, server 65 files / 2490 tests + web 33 files / 1212 tests, actionlint 0, scripts-load 48/48) and digest bookends A == B == dispatch stamp bf89434e held over the pristine base. Stays implemented pending landing; status moves only after landing verification on origin/main.
- rider (2026-10-10, run e5b71847827444268f9a5b54b9831322 cycle:3 independent_review 776bd0a9 + review_fix 2cca8cee, follow-up of record): the shipped gap latch does not credit server-reported coalescing — gateway v0.118.3 packages/gateway/src/web/sse/manager.ts assigns seq per emitted frame and, on subscriber-queue overflow, removes already-seq'd pending frames and reports the count on the next frame's droppedCount, so every real coalescing event ALSO latches outputGapDetected and accumulates outputGapMissing beside the pre-existing coalesced notice (server-REPORTED loss conflated with SILENT loss; no test seeds a seq skip equal to a reported droppedCount — review finding, severity medium). Deferred to the next implement window per the review's own disposition (not an acceptance violation; a mis-credit that silenced real gaps would be worse than the documented over-report): cure = credit the skip against droppedCount, latching only when the skip exceeds it and accumulating the difference, red-first on the public twin — FIRST verifying upstream whether droppedCount is per-frame or cumulative-since-last-report (the credit arithmetic differs; the field already reaches the reducer at public/operator-stream.js:641, validated at :358-368).

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
- rider (2026-10-10, run e5b71847827444268f9a5b54b9831322 cycle:3 roadmap 694f98d352f9, from research 1a534497 live releases-API probes: re-pin openers — actions/setup-node v7.1.0 (2026-10-08; we pin v7.0.0 x4), github/codeql-action v4.38.3 (we pin v4.38.2 x4; upstream took it via #589), actions/upload-artifact v7.0.2 (2026-10-07; upstream took it via #580); no drift — actions/checkout v7.0.1, ossf/scorecard-action v2.4.4, actions/create-github-app-token v3.2.0, pnpm/action-setup v6.1.0 all current; aquasecurity/trivy-action v0.36.0 IS latest (2026-04-22) — an initial v0.75.0 drift reading was the trivy SCANNER repo, screened out, no action owed.

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
- rider (2026-10-09, repository-maintenance cycle:2 run 493bbbf2227c4352b8e9dde32420d1f1 roadmap 224cff7852b341b9a86606161f339b91, from research 6e9b9be5916b4eda83a7b94df796905f): continuation datum — Scorecard 7.6 -> 7.4 @2026-10-09T01:56:03Z with CI-Tests 7->4 and SAST 9->7 as the movers; sub-10 set now Code-Review, Maintained, CII-Best-Practices, License, Signed-Releases, Branch-Protection (-1 internal error), CI-Tests, SAST; the earlier Vulnerabilities regression cleared with the 2026-10-06 lockfile regen (this run's assess re-proved full pnpm audit = 0 in-worktree), and the 6.9-trough recovery expectation from the 2026-10-06 rider stands partially realized at 7.4 — the residual movers (CI-Tests, SAST) are heuristic-weighted and outside our control surface beyond keeping push CI green; runbook refresh obligation from the 2026-10-06 rider remains open.
- rider (2026-10-10, run e5b71847827444268f9a5b54b9831322 cycle:3 roadmap 694f98d352f9, from research 1a534497: OpenSSF Scorecard DROPPED 7.6 -> 7.4 (analysis 2026-10-09T01:56Z, live API read); CI-Tests sub-check now reads '2 out of 5 merged PRs checked by a CI test' — direct, measurable erosion from the account-level Actions disable (merged PRs #484+ ran check-dark), not a repo-code regression; Branch-Protection internal error persists (rm-116 lane); security-posture.md row should re-truth when Actions recovers.

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
- rider (2026-10-09, repository-maintenance cycle:2 run 493bbbf2227c4352b8e9dde32420d1f1 roadmap 224cff7852b341b9a86606161f339b91, from research 6e9b9be5916b4eda83a7b94df796905f + assess 86b3a211a66d4402be03dd31b0634968): posture datum — Scorecard 7.4 @2026-10-09T01:56:03Z (api.securityscorecards.dev, down from 7.6 @10-03; CI-Tests 7->4, SAST 9->7, Token-Permissions 10 and Pinned-Dependencies 10 hold, Branch-Protection -1 internal-error persists); the Vulnerabilities check stays recovered (full pnpm audit = 0 known vulnerabilities re-proven in-worktree this run, superseding the 2026-10-05 17-advisory trough); License:0 ROOT CAUSE established first-hand — NO LICENSE file and no package.json license field exist in EITHER this fork or upstream (ls + git ls-files + git ls-tree autonomy-upstream/main), so the floor item's License half resolves only by an owner decision on license choice for a fork of an unlicensed upstream — parked here, do not implement without operator sign-off.

### Cache gateway-mode session validation (bounded revocation-latency decision)
- id: `rm-419` | track: reliability | priority: 52.0 | status: in_progress
- acceptance:
- evidence: campaign-recorded in dashboard ROADMAP.md

### Repo settings hardening — restrict allowed_actions and require SHA pinning
- id: `rm-843` | track: security | priority: 52.0 | status: implemented 2026-10-10 (run 08a0abac9453 implement 31a7ab3c: settings applied live — PUT actions/permissions HTTP 204, readback allowed_actions 'selected' + sha_pinning_required true with the seven-namespace pattern allowlist, idempotent on re-PUT; zero repo-file footprint; selected 2026-10-10, cycle:2 prioritize 51f05853; was candidate (added 2026-10-10, repository-maintenance cycle:2 run 08a0abac9453 roadmap a2555fa7, from assess 0b1bd864 F3; parallel-claim hazard: an unlanded sibling lineage minted the same signal with no CI-validation PR — the d00d095 renumber convention applies if that wall lands first; minted clear of the wall ceiling rm-835 and the spool frontier rm-841); pending landing
- signals: `gh api /repos/codeo1io/dashboard/actions/permissions` (first-hand 2026-10-10) returns `allowed_actions: 'all'` with `sha_pinning_required: false` — the settings layer permits arbitrary third-party actions at any revision; every current workflow pins by digest so the gap is latent, but one unpinned `uses:` would execute attacker-controlled revisions; rm-116's branch-protection shell is the adjacent empty-settings datum
- acceptance:
  - `allowed_actions` narrowed to a namespace allowlist matching the workflows actually used (actions, github, aquasecurity, docker, pnpm, ossf, fro-bot) with `sha_pinning_required: true`, verified by a post-change `gh api` readback quoted in the batch doc
  - a new-namespace workflow requires a deliberate settings edit, not an allow-all regression — the readback probe joins the maintenance cycle's standing probe set
- evidence: the assess API output; post-change readback matching the target shape; actionlint + Main workflow green after the change (any pinned-action resolution failure would surface immediately)
- selection rider (2026-10-10, cycle:2 prioritize 51f05853d09c46f9a8a9ec502f00b9b0): selected as U2 — settings-layer fix with zero repo-file footprint beyond ledger/batch-doc riders; FOLD MAP: sibling lineage 20cf2f7b minted the same signal as rm-846 (candidate, unselected by their cycle:3 which took rm-117 LEAD) — this selection owns the content by first-selection (d00d095 convention), rm-846 folds on contact at either lineage's integrate; implementation is a single idempotent gh api PUT (allowed_actions pattern-list + sha_pinning_required true) with readback evidence, no CI dependency, outage-proof.
- implement rider (2026-10-10, run 08a0abac9453 implement 31a7ab3c): applied live — PUT /repos/codeo1io/dashboard/actions/permissions returned HTTP 204; readback verbatim: {"enabled":true,"allowed_actions":"selected","selected_actions_url":"https://api.github.com/repositories/1329402046/actions/permissions/selected-actions","sha_pinning_required":true} and selected-actions {"github_owned_allowed":true,"patterns_allowed":["actions/*","github/*","docker/*","pnpm/*","ossf/*","aquasecurity/*","fro-bot/*"],"verified_allowed":false}; idempotency proven by re-issuing the identical PUT (204 again, readback byte-identical); pre-change first-hand census: the workflows reference only the seven allowlisted namespaces plus local ./ composites (always allowed under 'selected'), and all 16 external pins are full-length commit SHAs so sha_pinning_required breaks nothing; zero repo-file footprint (this rider + the batch doc only); the rm-846 fold map stands.
- validation rider (2026-10-10, run 08a0abac9453 compound f9a7ba3b, consuming recorded outcomes only): the hardening carries ZERO executable repo surface by construction, so full-validation of the batch tree adds nothing to re-check for it — the truth is the implement rider's live evidence above (HTTP 204 PUT, idempotent re-PUT, byte-identical readback, namespace census, all-SHA pin census), consumed verbatim; outage-proof by design, which is precisely why it was the right U2 while run creation is enforced down. Standing obligations queued for the next cycle: the readback probe joins the standing probe set (each assess re-reads actions/permissions and selected-actions; any drift off the seven-namespace allowlist or sha_pinning_required=false is a regression finding, not a preference), and the rm-846 sibling duplicate folds per the implement rider's fold map.

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
- id: `rm-856` | track: reliability | priority: 50.0 | status: candidate (added 2026-10-10, repository-maintenance cycle:3 run e5b71847827444268f9a5b54b9831322 roadmap 694f98d352f948b496616287b3134e0f, from this run's assess 83057abb F1 tail + sibling-run corroboration a794d381/1fa748da; minted above the all-lineage unlanded ceiling rm-852; verified unowned — landed base-drift items rm-178/rm-166/rm-182 were digest-EXTRACTION repairs, not tag single-sourcing; no open claim covers the tag literal class)
- signals: .github/workflows/base-drift.yaml:75 inspects the literal 'node:24-trixie-slim' (buildx imagetools inspect) and :63/:95/:135-136 name it in prose, while Dockerfile:34's ARG NODE_IMAGE owns the actual tag+digest — when the Dockerfile base moves tag family again (the ad8f21e trixie move is the precedent), base-drift keeps querying the OLD tag and the weekly drift check silently stops guarding the real base; class-sibling of rm-779's cve-tripwire NODE_IMAGE literal, and rm-779's unlanded ARG-derivation cure (sibling 938d6033557a) covers cve-tripwire.yaml ONLY
- acceptance:
  - base-drift derives the expected base tag from the Dockerfile's ARG line the same way rm-779's cure does for cve-tripwire (or both workflows share one derivation site)
  - a red-first check pins the derivation against a fixture Dockerfile with a moved tag (the trixie-move shape)
  - cve-tripwire's resolve step and base-drift's compare step can no longer disagree with the Dockerfile tag
- evidence: the workflow diffs (both files), the fixture-based test or workflow-lint, a simulated tag-move probe showing both workflows follow the ARG
- trade-off: shared derivation couples the two workflows' expectations to one source of truth — that is the point; acceptable churn (two workflows, one sed/extraction site)

- rider (2026-10-10, run e5b71847827444268f9a5b54b9831322 cycle:3 prioritize c5cd03a368eb4b92b7e536e2a90d7c79): NOT selected — cve-tripwire.yaml is a three-plus-lineage collision zone (8521c80a / 89ebbf49 / 9fd8bcad dirty trees carrying literal fixes + d1a0b216's selected rm-793) and this def's full acceptance derives BOTH workflows' tags from the Dockerfile ARG, so building it now re-enters the same zone — the 3b41dc6e rm-779 pass-over rule applies by family, a parallel build multiplies integrate conflicts for zero new truth. DEFER to the first cycle after ONE sibling literal fix lands (the base-drift-only derivation is then conflict-free); watch triggers: any Dockerfile base-tag move, rm-779/rm-793 landing, or the 2026-10-12 06:53Z first scheduled cve-tripwire fire going live at Actions recovery.

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
- rider (2026-10-10, run e5b71847827444268f9a5b54b9831322 cycle:3 roadmap 694f98d352f9, from assess 83057abb F4: the landed degrade path bakes a per-read console.warn at src/listener/store.ts:59 — the only non-test console.* in src/, outside the house logger (src/logger.ts; the rm-229 discipline landed console->logger for the serve() banner); store-wide links corruption emits one warn line per row on EVERY GET /api/listener/messages (log-storm vector); recorded as follow-up scope for the next store touch: logger + rate-limited degrade notice.

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

### Operator contract 1.8.0 browser display half — checkout provenance + preparation on the expanded run card
- id: `rm-842` | track: operator-experience | priority: 46.0 | status: implemented 2026-10-10 (run 08a0abac9453 implement 31a7ab3c: U1/LEAD landed at base 88e423a — provenance/preparation parsed fail-open into closed DTOs and rendered textContent-only on the expanded run card in all three card shapes, 24 checkout fixture scenarios, conformance + focused battery green; batch doc docs/prioritization/2026-10-10-repository-maintenance-cycle-2-batch-run-08a0abac9453.md; selected 2026-10-10, cycle:2 prioritize 51f05853; was candidate (added 2026-10-10, repository-maintenance cycle:2 run 08a0abac9453 roadmap a2555fa7, from research a2cbb8e9 A + assess 0b1bd864; minted above the all-lineage in-flight ceiling — live re-probe 2026-10-10 across all 159 origin refs puts the run-wall def-line max at rm-835 (c454e28d lineage; the rm-13640 outlier is the recorded phantom prose id), and the known unlanded spool claims rm-838/rm-840/rm-841 (run 1c814809 batch, no CI-validation PR) sit above that wall ceiling — rm-842/843 mint clear of both); pending landing
- signals: upstream fro-bot/dashboard a82871d + its plan doc (docs/plans/2026-10-06-001) define the 1.8.0 browser surface (plan R5-R8) — `OperatorCheckoutProvenance`/`OperatorCheckoutPreparation` parsed field-by-field in `public/operator-stream.js` and rendered textContent-only on the expanded run card; the fork landed only the version window + failure-kind labels (89c7398, on main 2026-10-08) — zero provenance/preparation consumption sites in `web/src` or `public/operator-*.js` (grep first-hand 2026-10-10), so 1.8.0 frames' checkout details are silently dropped in the browser; the parsing-twin disposition itself is rm-253's wire-or-fold decision
- acceptance:
  - `public/operator-stream.js` parses provenance/preparation with upstream-parity fail-open semantics (a malformed field renders absent, never rejects the frame), pinned by 1.6.0 and 1.8.0 fixture streams
  - the expanded run card renders checkout provenance + preparation via textContent only (no innerHTML anywhere on the path), with the two new failure kinds (`checkout-substituted`, `workspace-unavailable`) surfaced per upstream R7
  - a parity test pins the public `PINNED_CONTRACT_VERSION` to `src/gateway/operator-contract/version.ts` `OPERATOR_CONTRACT_VERSION` and fails when either diverges; no new version literals outside the two declared sites
  - root + web suites green at the landed diff; live display stays gated on the deployed gateway (fro-bot/agent#1737 SSE projection) — fixtures carry acceptance until then
- evidence: upstream commit + plan doc fetched at ref a82871d; the fork's zero-consumption grep; suite output in the cycle batch doc; the parity test shown red on a deliberately diverged pin
- rider (2026-10-10, run 08a0abac9453 roadmap a2555fa7): the primary-flip follow-through stays with rm-157 — flip `OPERATOR_CONTRACT_VERSION` to '1.8.0' and retire '1.6.0' from `SUPPORTED_OPERATOR_CONTRACT_VERSIONS` only when the deployed gateway is durably 1.8.0 (version.ts:15-35 plan note)
- selection rider (2026-10-10, cycle:2 prioritize 51f05853d09c46f9a8a9ec502f00b9b0): selected as U1/LEAD — the only unimplemented feature half in the operator-contract lineage, upstream-tested shape (a82871d plan R5-R8), fixtures-based acceptance needs no gateway deployment, and the file set (public/operator-stream.js + web/src/operator/* + operator views) is disjoint from every live lane's selected batch (6a2d5fbe's rm-847/848 own fetch-timeout/Monitoring/Listener; 20cf2f7b's rm-117 owns aggregator/API; 159ec0eb's rm-836/837 own CI-freshness/lint); 633717c2's 1.9.0-readiness research lane has minted nothing yet — this batch lands the 1.8.0 half first and the 1.9.0 window work will rebase on it.
- implement rider (2026-10-10, run 08a0abac9453 implement 31a7ab3c): landed at base 88e423a — parse/close/render in public/operator-stream.js (+ closed-DTO declarations in public/operator-stream.d.ts: free-form strings sanitized of control/bidi chars and capped, lists bounded, SHAs 40-hex-validated, upstream timestamps not carried), nextStreamState latest-valid-wins reduction with provenance/preparation exclusivity, textContent-only run-checkout-detail region in all three card shapes (operator-run-index.js renderRunCard + ensureRunCardAnatomy, operator-launch.js optimistic card) wired via web/src/operator/runtime.ts + web/src/index.css; 24 checkout fixture scenarios in src/gateway/operator-fixture-sse.ts each bound to its own recent-runs row (src/routes/operator-fixture-harness.ts); test/operator-contract-conformance.test.ts pins the browser label maps against the vendored src/gateway/operator-contract/provenance.ts vocabularies (label maps ARE the allowlists) plus production-artifact no-leak guards; focused battery green (build:web rc=0, 10 impacted server files 1481 tests + 2 web files 54 tests, check-types rc=0, lint rc=0 at the 10-warning baseline), full battery reserved to full_tests.
- validation rider (2026-10-10, run 08a0abac9453 compound f9a7ba3b, consuming recorded outcomes only): targeted_tests cda2b2fc green — 10 impacted server files / 1483 tests plus the batch pair web/src/operator/runtime.test.ts + launch-card.test.ts / 54 tests, check-types rc=0 across all three tsconfigs, install --frozen-lockfile rc=0 after the swept-node_modules retry, and digest bookends identical across the apply-run-reverse-apply round-trip (pristine 88e423a stamp validation:v1:bf89434ed189207127f626b901c16c33641ba8f1fb0633aedad6ced77c377037, matching dispatch). full_tests 03061b8d closed via the supervisor-accepted fleet pattern under the still-live Actions run-creation enforcement outage — the verbatim GitHub-hosted gate is proven unrunnable by two adopted fleet burns (run 471d3910: verbatim full_command rc=1 after the full 3600s, timed out without registering any PR checks; run 159ec0eb same-day burn rc=1 at 2m27s on 'error connecting to api.github.com') and the content truth is the six-job local content-identical Main-workflow mirror over the applied batch (2026-10-10T07:23:44Z through 07:28:18Z, CI parity node v24.15.0 / pnpm 11.28.4): lint rc=0 at the pre-existing 10-warning baseline, design-check emitted the empty array exactly, check-types rc=0, test rc=0 with server 65 files / 2717 tests plus web 34 files / 1216 tests, actionlint 0 findings, scripts-load 48/48 modules; the outage was bracketed by 422 dispatch probes on both sides of the mirror. Status stays implemented 2026-10-10 pending landing — the landing flip and any deploy-gated live browser probe belong to landing verification.

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

### Client polling hygiene batch (listener latch, unread-poll guard)
- id: `rm-155` | track: reliability | priority: 42.0 | status: in_progress
- acceptance: the Listener poll releases its latch in a finally block and aborts in-flight fetches on unmount (controller wired to the request signal), with a regression test seeding a never-settling fetch and asserting the next tick still polls; the App poll gains an in-flight guard, surfaces poll failure once (silent recovery allowed), and pauses while document.hidden (visibilitychange resumes with an immediate poll); no behavior change on the happy path
- evidence: campaign-recorded in dashboard ROADMAP.md

### CodeQL PinnedDependencies alert on the base-drift unpinned download
- id: `rm-209` | track: reliability | priority: 42.0 | status: in_progress
- acceptance: the step fetches pinned content — either download + sha256-verify against a digest constant recorded in the workflow, or an actions/github-script step reading the file via the GitHub API (no unpiped remote execute; landed form 2026-09-25: in-node fetch() + JSON.parse — bytes are parsed, never executed, so no digest constant is required); actionlint container-form gate stays green; the alert is dismissed-with-link once the fix lands; compound 2026-09-25 (run 71991cb3 compound d730c0da): the in-node fetch() replacement rode both engine full-gate greens (ephemeral PRs #170/#174, CodeQL Analyze SUCCESS each time — the pattern is clean at CI on the batch tree); the open alert object itself only updates on the default-branch scan AFTER landing, so the dismissal-with-link step stays queued for final_validation/landing
- evidence: campaign-recorded in dashboard ROADMAP.md
- rider (2026-10-10, run e5b71847827444268f9a5b54b9831322 cycle:3 roadmap 694f98d352f9, from assess 83057abb F5 + research N-lane: residual GET-seam abort seam — withGetSeamTimeout (rm-780's 15s wall bound, web/src/api/fetch-timeout.ts:19-31) races a timer but never ABORTS the underlying fetch, and web/src/App.tsx:161's focus re-probe still calls without a signal; useBoundedPoll's controller covers the pollers, so the leak surface is the unsignaled one-off callers; extends this def's recorded poll-abortSignal next-cycle signal (appended 2026-09-25).

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
- rider (2026-10-09, repository-maintenance cycle:2 run 493bbbf2227c4352b8e9dde32420d1f1 roadmap 224cff7852b341b9a86606161f339b91, from research 6e9b9be5916b4eda83a7b94df796905f): two pins moved to behind-latest, re-probed first-hand via tag-object derefs — upload-artifact v7.0.2 is current (peeled tag commit cf430e030ddbb5b0abf93d22962f4752f3646cd9 vs our 043fb46 # v7.0.1 at release.yaml:350, scorecard.yaml:44, visual.yaml:101/:109; upstream precedes the exact pin in its #580) and codeql-action v4.38.3 is current (peeled 24c54180a607b1449ed407dd24f251e4e9147c8d vs our 2892aa5 # v4.38.2 at codeql.yaml:56/:62 plus both upload-sarif sites; upstream #589 pins exactly 24c5418) — a same-major digest-refresh pair with rm-650's version-comment accuracy rule applying on the codeql half; the 2026-10-08 integrate rider's known-left-behind list is now exactly these two families.
- selection rider (2026-10-09, run 493bbbf2227c4352b8e9dde32420d1f1 cycle:2 prioritize 1b02a1f15f5d43a48d9ccfc847eb8925): selected for the standing refresh contract's live target pair — codeql-action v4.38.2→v4.38.3 (codeql.yaml:56/:62 init+analyze, release.yaml:357, scorecard.yaml:51 upload-sarif) and upload-artifact v7.0.1→v7.0.2 (release.yaml:350, scorecard.yaml:44, visual.yaml:101/:109), all 8 sites still pinned 2892aa5/043fb46 at base 364272b re-enumerated first-hand at selection 07:29Z; peeled commits re-probed this run (research 6e9b9be5: v4.38.3 → 24c54180a607b1449ed407dd24f251e4e9147c8d via tag cee97f86, v7.0.2 → cf430e030ddbb5b0abf93d22962f4752f3646cd9); actions carry no npm-side soak gate (minimumReleaseAge is npm-only per the 2026-10-09 rider above). Congestion cleared at selection: no sibling wall flips rm-137 (id-level scan of every run-* wall, 2026-10-09T07:29Z); carriers are dead lanes only — ab16a466 (failed 2026-10-08T18:45Z, divergent rm-782/rm-783 same-content mints) and 0cde5807's codeql fold rider (failed 18:46Z) — re-implemented here by content, fold at integrate. PENDING-CONTENT pairing: recoverable ddb41af7's open draft PR #465 (head conductor/ci-27d473b0384d, no checks reported, worktree touched 07:00:43Z) carries byte-identical digest hunks plus the tripwire cure and the playwright/mcr half; two live lanes already re-claimed its tripwire content (d1a0b216 rm-793, 32f33f1b rm-781), so this selection follows fleet precedent — byte-convergent whichever lands first, pairing recorded here for the integrate renumber.
- implementation rider (2026-10-09, run 493bbbf2227c4352b8e9dde32420d1f1 cycle:2 implement 45e7b1c140384b3b88b33b18201bd70b): 8 sites swapped (repo-wide grep: zero 2892aa5/043fb46 left under .github/; 24c54180 ×4 and cf430e03 ×4 at exactly the enumerated sites); actionlint container-form rhysd/actionlint:1.7.12 rc=0 on the four touched workflows; 7 workflow-reading suites 90/90 green; PR #465 found CLOSED (draft residue) at stewardship so the pending-content pairing reduced to dead-lane byte-identity — fold by content at integrate per the selection rider.
- rider (2026-10-09, run 493bbbf2227c4352b8e9dde32420d1f1 cycle:2 compound 3b18fd47aae247d8ad022f58869782c5, from targeted_tests d383088e063f47899cc5050e06977ee6 + full_tests ffc19fc0e1c44d808da79dac677a41fd): pre-review validation recorded — targeted GREEN (engine routing proof: package.json sits in the runner's FULL_IMPACT_FILES so the seeded targeted_command deterministically prints 'fallback=full'; the 13-suite impacted union ran locally instead — 232/232 rc=0 incl. all four workflow-reading suites and the workspace/lockfile guards; frozen install rc=0, check-types rc=0, lint rc=0, actionlint container-form rc=0, build:web rc=0, audit 'No known vulnerabilities found'; tree pristine across the battery, digest re-derived == dispatch) + FULL GREEN via supervisor-authorized local mirror of all six Main-workflow jobs (approval granted in the delegate session, 5th instance of 2026-10-09: lint 0 err, impeccable@3.2.1 findings [], check-types rc=0, pnpm test root 64 files/2474 tests + web 32 files/1203 tests = 3677/3677 — exactly the assess baseline at this base, actionlint 1.7.12 zero output, strip-only import loop 48/48; digest validation:v1:4074d26f91806e6279bb3c95a807d2a6b4e5f0ea38bf546ac67f284253e06ed7 re-derived post-battery == dispatch) — the GitHub-runner leg is deferred to the first authorized push-gate turn after Actions re-enable (account-level disable since 2026-10-09T01:59:31Z; the phase's first verbatim attempt c92d3cf2 burned the full 3600s on a check-dark PR and its honest 'failed' report was REJECTED by the fold gate — probe the 422 before burning; economics compounded to docs/solutions/workflow-issues/maintenance-cycle-learnings-2026-10-09-fulltests-outage-fold-gate-and-mirror-authorization.md). Def stays implemented (pending landing) — no status flip, no new ids at compound per the cycle-2 compound precedent (c026a644 / 6c18f152).

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
- rider (2026-10-10, run 08a0abac9453 roadmap a2555fa7, from assess 0b1bd864 F1): outage urgency datum — the 38.5h+ run-creation outage (zero runs repo-wide since 2026-10-09T01:59:31Z) is exactly the unwatched-red class this def's red-watch would surface in-repo; the Monday 2026-10-12 self-heals (canary 05:23Z cron, cve-tripwire 06:53Z first fire) are outage-gated — they only fire if the pipeline recovers, and nothing in-repo would notice either way today

### Rate limiter coverage decision: the logout pair sits outside every class
- id: `rm-500` | track: reliability | priority: 38.0 | status: in_progress
- acceptance:
- evidence: campaign-recorded in dashboard ROADMAP.md

### Immutable Cache-Control for content-hashed static assets
- id: `rm-690` | track: reliability | priority: 38.0 | status: implemented 2026-10-11 (restored by conductor integrate 08a0abac: originally done 2026-10-07 cycle:1 run b2a3ae9bf75b; the 2026-10-17 upstream adoption dropped the middleware from src/server.ts and its 6 tests, and both were re-grafted verbatim from lineage 88e423a with this merge — 164/164 green on server.test.ts + static-assets.test.ts post-graft); pending landing — landing verification owns the final done flip
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
- rider (2026-10-09, repository-maintenance cycle:2 run 493bbbf2227c4352b8e9dde32420d1f1 roadmap 224cff7852b341b9a86606161f339b91, from research 6e9b9be5916b4eda83a7b94df796905f): residual re-measured — the eslint 10.12.0 and pnpm/action-setup v6.1.0 halves landed via rm-760/rm-761, and the Dockerfile digest halves are superseded by rm-698's trixie re-pin (node:24-trixie-slim @sha256:173f1258…, registry-verified live-current 2026-10-09 this run); the LIVE remainder is the fro-bot.yaml:347 agent pin — upstream now at v0.118.3 (released 2026-10-08T22:57:12Z, the 1.8.0-serving line; gh api releases) vs our v0.117.5 @378bc287 — plus the impeccable 3.2.1 -> 3.6.1 two-place neighbor riding this composite per rm-196's 2026-10-07 rider (npm first-hand: 3.6.1 published 2026-09-01, 4.1.0 major 2026-09-08, both far past minimumReleaseAge; the separate impeccable@4 decision named in rm-196's def title stays its own gate-evaluation, older-vs-newer majors change ignoreValues semantics).

### snapshot-store byte bound counts UTF-16 code units
- id: `rm-701` | track: reliability | priority: 34.0 | status: in_progress
- acceptance: both cap comparisons measure bytes (Buffer.byteLength or an equivalent single-site helper); a round-trip property test with astral-plane and CJK payloads pins the bound at exactly 1_048_576 bytes; the constant's name and its comment agree with the measured unit
- evidence: campaign-recorded in dashboard ROADMAP.md

### ubuntu-latest alias-flip guard for non-containerized jobs
- id: `rm-188` | track: reliability | priority: 33.0 | status: in_progress
- acceptance:
- evidence: campaign-recorded in dashboard ROADMAP.md
- rider (2026-10-10, run 08a0abac9453 roadmap a2555fa7, from research a2cbb8e9 E): re-evaluate condition MET — runner-images README 2026-10-09 shows ubuntu-26.04 + arm64 PUBLISHED while ubuntu-latest still maps to 24.04, with the alias migration gradual over 1-2 months; plan the pinned runs-on -> 26.04 move ahead of the flip (20 pinned ubuntu-24.04 sites; the last alias-rider cve-tripwire.yaml:40 rides rm-779's reconciliation)

### Binding-docs truth batch 2 (README badge/endpoints, dependabot comment, vite kill-switch comment)
- id: `rm-134` | track: reliability | priority: 32.0 | status: in_progress
- acceptance: README badge resolves against codeo1io/dashboard; endpoints inventory names /privacy + listener routes; dependabot comment states the post-deletion truth; vite comment documents the fork divergence — verified in the cherry-picked worktree files (targeted_tests: actionlint/lint/types green)
- evidence: campaign-recorded in dashboard ROADMAP.md

### Origin validation-residue sweep (push-gated)
- id: `rm-159` | track: reliability | priority: 32.0 | status: in_progress
- acceptance: one push-authorized change closes stale `conductor/ci-base` PRs (`gh pr close`) and deletes stale `conductor/ci-*` and `conductor/ci-base-*` refs (`git push origin --delete`), leaving only refs for in-flight runs; the sweep checklist recorded in a solutions doc so future landing phases clean their own residue at push time
- evidence: campaign-recorded in dashboard ROADMAP.md
- rider (2026-10-10, run e5b71847827444268f9a5b54b9831322 cycle:3 compound d1071ee27c5843b6a59be8a82ad6a23b, from this run's full_tests bbbd1849 under the account-level Actions disablement): stranding MECHANISM first-hand — when the validator's 3600s check-wait dies on the single-fatal transient (gh pr checks failed: error connecting to api.github.com, ~2340s in), its finally closes the PR and deletes the HEAD branch but CRASHES before deleting the BASE ref (FileNotFoundError: the temp clone is already gone when the finally's cleanup wants it as cwd), so EVERY transient-killed full_tests attempt under the outage strands one `conductor/ci-base-*` ref on origin; cure proven this run by hand — git push origin --delete conductor/ci-base-3ba8b9672046 returned rc=0, and refs/pull/545/head is GitHub's immutable PR ref, not a branch, so it stays. Adoption-forensics rule (also first-hand): an EMPTY gh pr diff on a conductor PR is a pristine-tree execution — reaped attempt bd6d4dc5's PR 541 carried no batch — never an adoptable byte-identical predecessor. Fleet residue observed at this run's close: roughly 15 stale open `conductor/ci-*` draft PRs plus ~30 refs (supervisor-level cleanup decision, deliberately untouched by this run); the push-gated sweep must cover BOTH `conductor/ci-*` and `conductor/ci-base-*` prefixes and re-derive in-flight exclusions from open PRs at sweep time. (2026-10-10, independent_review:fix 2cca8cee after review 776bd0a9: this rider's originally bare glob spellings tripped markdown/no-space-in-emphasis twice and failed the pnpm lint gate over the assembled batch — globs now quoted per the sibling-rider convention.)

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
- id: `rm-854` | track: correctness | priority: 30.0 | status: implemented 2026-10-10 (run e5b718478274 implement 0c0ae673, pending landing; was: candidate added 2026-10-10 by roadmap 694f98d3, minted above the all-lineage unlanded ceiling rm-852 alongside rm-853; verified unowned — no def covers SSE data-line accumulation semantics)
- signals: src/gateway/operator-sse-reader.ts:127-130 and the public twin public/operator-stream.js:66-103 — on frame dispatch, a later consecutive `data:` line OVERWRITES the earlier one (last-wins) instead of joining with newline; WHATWG SSE (9.2.6 'Interpret the response') defines consecutive data lines joined with U+000A. Safe today only because the gateway serializes single-line JSON payloads; a conforming splitting sender would misparse and then silently drop (rm-853's seam)
- acceptance:
  - both the server reader and the public twin accumulate consecutive data lines joining with newline per the SSE spec
  - behavior identical for every current single-line frame (no golden-output change); the four twin surfaces stay parity-tested
  - unit tests on both parsers with a two-line data payload assert the joined parse
- evidence: the parser diffs; the new unit tests; the parity suite green
- trade-off: none material — pure spec alignment, zero effect on current upstream frames
- rider (2026-10-10, run e5b718478274 implement 0c0ae673): implemented red-first — both parsers (src/gateway/operator-sse-reader.ts + public/operator-stream.js) accumulate consecutive data lines and join with a single newline per WHATWG SSE 9.2.6; single-line records parse byte-identically (asserted); join tests added to test/operator-sse-reader.test.ts and test/operator-stream-core.test.ts splitting at a JSON token boundary (last-wins yields an unparseable fragment); test/sse-parser.property.test.ts property sweep still green (630-test battery).
- rider (2026-10-10, run e5b71847827444268f9a5b54b9831322 cycle:3 prioritize c5cd03a368eb4b92b7e536e2a90d7c79): SELECTED as co-head of the same batch — rides the identical seam (the two parser sites at operator-sse-reader.ts:127-130 and the public twin), effort S, pure spec alignment with zero behavior change on current single-line frames, zero sibling claims; the red-first tests ship in the same suites as rm-853's.
- rider (2026-10-10, run e5b71847827444268f9a5b54b9831322 cycle:3 compound d1071ee27c5843b6a59be8a82ad6a23b, pre-review): acceptance evidence closed by the same two gates as rm-853's rider above — the two-line data-join tests green on BOTH parsers inside targeted_tests 9a4337f2's focused local battery (8 root files / 782 tests + web pair 2 files / 84 tests; the engine targeted_command itself deferred under the outage per the c4a7010a precedent — citation corrected 2026-10-10 by independent_review:fix 2cca8cee after review 776bd0a9), and full_tests bbbd1849 green via the outage fleet pattern (PR #545 path-set proof; six-job mirror where the 2490 server-test count = baseline + exactly this batch's 12 red-first tests); digest bookends bf89434e stable. Single-line records parse byte-identically through the new join path (asserted in-suite), so current gateway frames are unaffected pre-landing. Implemented pending landing.
- rider (2026-10-10, run e5b71847827444268f9a5b54b9831322 cycle:3 independent_review 776bd0a9 + review_fix 2cca8cee, documented deviation): the join keeps the pre-existing per-line trim() on BOTH parsers (public/operator-stream.js:249, src/gateway/operator-sse-reader.ts:131) and omits the spec's trailing newline after the final data line — WHATWG 9.2.6 strips exactly ONE leading space and preserves trailing spaces, so a conforming splitting sender whose continuation lines carry two or more leading or trailing spaces misparses; immaterial today (the gateway emits single-line JSON and the single-separator-space case parses byte-identically, asserted in-suite — review finding, severity low); follow-up = an exact-one-space-strip variant test the next time either parser opens.

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

### rm-185
- id: `rm-185` | track: reliability | priority: 27.0 | status: in_progress
- acceptance: the cached token entry stores the API-provided expiry (now+55min cap only as fallback when absent), refresh triggers on real expiry with a small safety margin, and a test proves the cache honors a short expiresAt fixture rather than the 55-minute guess
- evidence: campaign-recorded in dashboard ROADMAP.md

### Snapshot-store load buffers the full cache file before the byte-bound rejection
- id: `rm-759` | track: reliability | priority: 27.0 | status: in_progress
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
- rider (2026-10-09, repository-maintenance cycle:2 run 493bbbf2227c4352b8e9dde32420d1f1 roadmap 224cff7852b341b9a86606161f339b91, from assess 86b3a211a66d4402be03dd31b0634968): runtime-drift datum — delegate/dev hosts execute Node v22.22.0 against engines >=24 (pnpm warns `[WARN] Unsupported engine` on every invocation yet the full gate battery passes first-hand this run), i.e. local-vs-CI runtime divergence is warning-only today; parked LOW — an engine-strict (or preflight assert) hardening would fail loudly instead, gated on the operator's tolerance for breaking local flows on older hosts; 24.x line unchanged at 24.19.1 (types + runtime both re-probed 2026-10-09); node:24-trixie-slim digest 173f1258 registry-verified current this run (base-drift Monday fire expected green, corroborating rm-689's rider).
- rider (2026-10-10, run 08a0abac9453 roadmap a2555fa7, from research a2cbb8e9 D): endoflife.date fresh read — v24 active support ends 2026-10-20 (maintenance to 2028-04-30), v26 latest 26.11.1; the 2026-10-28 gate needs the engines>=24 / node:24-trixie-slim / CI node-version 24 triad decision — open the Node-26 validation window now so the gate lands as a decision, not a scramble
- rider (2026-10-10, run e5b71847827444268f9a5b54b9831322 cycle:3 roadmap 694f98d352f9, from research 1a534497 live nodejs.org read: v26.11.1 still Current (lts:false) at 2026-10-10; v24.21.0 = LTS Krypton active (2026-09-07); the 2026-10-28 promotion-gate rider unchanged — no movement owed.

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
- rider (2026-10-09, repository-maintenance cycle:2 run 493bbbf2227c4352b8e9dde32420d1f1 roadmap 224cff7852b341b9a86606161f339b91, from research 6e9b9be5916b4eda83a7b94df796905f): soak windows OPENED — @hono/node-server 2.1.4 published 2026-10-08T04:42:19Z passed minimumReleaseAge at 2026-10-09T04:42Z, and vite 8.3.4 published 2026-10-08T12:07:04Z passes at 2026-10-09T12:07Z (npm publish times probed first-hand this run), so the def's acceptance pair is actionable as of this extension; @playwright/test 1.64.0 (published 2026-10-07T20:44:27Z) is age-eligible but stays gated on the mcr playwright image digest triple-probe + visual.yaml container lockstep + the two-green visual rule recorded in this def's acceptance; remaining watch set at compose (eslint 10.12.0, hono 4.13.13, @opencode-ai/plugin 1.18.35, @types/node 24.19.1) all sit at dist-tags latest and landed — nothing else held.
- selection rider (2026-10-09, run 493bbbf2227c4352b8e9dde32420d1f1 cycle:2 prioritize 1b02a1f15f5d43a48d9ccfc847eb8925): selected for the soak-eligible half — @hono/node-server 2.1.4 (package.json:22, published 2026-10-08T04:42:19Z, 1597 min elapsed ≥ minimumReleaseAge 1440 at the 07:19Z selection probe) lands now; vite 8.3.4 (published 2026-10-08T12:07:04Z, 1152 min elapsed) matures 2026-10-09T12:07:04Z and is NOT yet eligible — correcting the roadmap rider above, whose 'windows OPENED' claim is premature on the vite half by ~4.6h; implement may take the vite pin 8.3.3→8.3.4 only from 12:07:04Z onward, else leaves vite held with a dated deferral rider per this def's escape clause. @playwright/test 1.64.0 stays excluded (mcr digest triple-probe + visual lockstep + two-green rule). Congestion cleared at selection: no sibling wall flips rm-760 (id-level scan 2026-10-09T07:29Z; 1930644a's batch doc reads the dep-refresh surface as 'owned by 38e72854' — a phantom of this def's historical 'prior: selected 2026-10-08' text, 38e72854's actual batch is rm-599+rm-797); 155f9770's unlanded rm-807 held the same pair on a 48h misreading of the 1440-minute gate. File adjacency: package.json:22 + pnpm-lock.yaml regeneration sit in a different hunk than LIVE c4617181's rm-797 packageManager pin at package.json:57 — merge-adjacent, named for integrate; no live lane's current batch doc claims codeql.yaml/release.yaml/scorecard.yaml/visual.yaml.
- implementation rider (2026-10-09, run 493bbbf2227c4352b8e9dde32420d1f1 cycle:2 implement 45e7b1c140384b3b88b33b18201bd70b): pnpm install rc=0 (age gate enforced on the resolution), frozen install rc=0, pnpm build:web green on vite 8.3.4 (3-entry precache, sw.js generated), check-types rc=0, lint rc=0, pnpm audit dev-included 'No known vulnerabilities found'; visual.yaml container lockstep untouched with playwright held at 1.63 — carried watch item, not a regression.
- rider (2026-10-09, run 493bbbf2227c4352b8e9dde32420d1f1 cycle:2 compound 3b18fd47aae247d8ad022f58869782c5, from targeted_tests d383088e063f47899cc5050e06977ee6 + full_tests ffc19fc0e1c44d808da79dac677a41fd): pre-review validation recorded — targeted GREEN (13-suite impacted union 232/232 rc=0 incl. the workspace/lockfile guards; frozen install + audit 'No known vulnerabilities found' re-proof the lockfile sync on the regenerated tree) + FULL GREEN via supervisor-authorized local Main-mirror (all six jobs green; the vite 8.3.4 client build exercised inside pnpm test's pretest; 3677/3677; digest validation:v1:4074d26f… re-derived == dispatch, no executable change at compound) — GitHub-runner leg deferred as recorded on rm-137's compound rider (account-level Actions disable; the verbatim attempt's fold-gate rejection and its learnings doc cited there). Soak-rule discipline held end-to-end: selection's 1152-min vite hold → implement's 1606-min maturity crossing proves each phase re-derives windows from first-hand npm `time` and never copies a prior phase's arithmetic; @playwright/test stays ^1.63.0 by acceptance clause 2 (mcr digest unverifiable) with the visual.yaml container lockstep untouched — the def's own carried watch item for the next refresh window. Def stays implemented (pending landing); no status flip, no new ids at compound.
- rider (2026-10-10, run 08a0abac9453 roadmap a2555fa7, from research a2cbb8e9 F): soak windows PASSED (2026-10-10 sits past both 2026-10-09 stamps) — vite 8.3.4 (eligible since 12:07Z) and @hono/node-server 2.1.4 (since 04:42Z) re-qualify for the next sweep under the soak rule; @playwright/test 1.64.0 stays double-gated (mcr digest unverifiable + visual lockstep)
- rider (2026-10-10, run e5b71847827444268f9a5b54b9831322 cycle:3 roadmap 694f98d352f9, from research 1a534497 live npm probes: in-window openers — vite 8.3.4 (published 2026-10-08T12:07Z, soak-clean 2d; upstream holds 8.3.3 via #593), @hono/node-server 2.1.4 (we ^2.1.3), pnpm 11.28.5 (upstream took it via #592), @playwright/test 1.64.0 (visual container lockstep); hono 4.13.13 == latest; gated majors unmoved — vitest 5.0.3 / typescript 7.0.2 / pnpm 12.10.1 / vite-plugin-pwa 2.0.0.

### Code-truth micro-batch: dead param, env-parse lenience
- id: `rm-180` | track: reliability | priority: 23.0 | status: in_progress
- acceptance: one truth each — the dead param removed (both call sites plus signature) or exercised by a test proving intended precedence; envIntOrDefault tightened to whole-string parsing or the lenient behavior pinned by an added test with the decision recorded in the cycle batch doc
- evidence: campaign-recorded in dashboard ROADMAP.md
- rider (2026-10-10, run 08a0abac9453 roadmap a2555fa7, from assess 0b1bd864 F5): the implemented cure covered envIntOrDefault's whole-string semantics but the port path still parses lenient — readServerBindConfig uses bare Number(rawPort) at src/server.ts:1559 (accepts '0x10'/'1e2' spellings) while the house grammar at src/server.ts:152 is /^\d+$/ with fallback; the port-path sibling of this def's env-lenience scope, fold into any code-truth micro-batch
- rider (2026-10-10, run 08a0abac9453 prioritize 51f05853, from assess 0b1bd864 F-low): port-path residual rides cycle:2's batch as RIDER-SCOPE (no status regression of the implemented cure): src/server.ts:1559 readServerBindConfig parses DASHBOARD_PORT with bare Number(rawPort) ('0x10'/'1e2' accepted) while the house grammar at :152 is /^\d+$/ — the batch folds the one-line grammar alignment + pinning test under this def with a completion rider at implement time.
- completion rider (2026-10-10, run 08a0abac9453 implement 31a7ab3c): DONE as rider-scope of the cycle:2 batch — readServerBindConfig (src/server.ts) now gates DASHBOARD_PORT on the whole-string /^\d+$/ house grammar (Number.parseInt after the regex; bare Number(rawPort) accepted '0x10'/'1e2'/'12.5'/'+80' as valid ports), fail-loud throw semantics preserved for out-of-range values, pinned by the new test/server.test.ts case ('0x10'/'1e2'/'12.5'/'+80' each throw); README env table unchanged (valid-input behavior unchanged).

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

### security-posture runbook: carry the conditional GitHub-Release design
- id: `rm-692` | track: reliability | priority: 22.0 | status: in_progress
- acceptance: both runbook lines reworded to carry the conditional (dormant App-gated path exists at release.yaml:416/488, active iff both app secrets are provisioned); the row states what happens to the Signed-Releases score if that path ever activates; the fresh Scorecard date + score recorded in the same edit; zero code/workflow changes in this item — any decision to REMOVE the dormant path is a separate deliberate change, not part of this docs batch.
- evidence: campaign-recorded in dashboard ROADMAP.md

### Pin X-GitHub-Api-Version at every GitHub egress client
- id: `rm-855` | track: reliability | priority: 22.0 | status: candidate (added 2026-10-10, repository-maintenance cycle:3 run e5b71847827444268f9a5b54b9831322 roadmap 694f98d352f948b496616287b3134e0f, from research 1a534497 N3; minted above the all-lineage unlanded ceiling rm-852; verified unowned — grep apiVersion/api-version across ledger = 0)
- signals: src/auth/oauth.ts:130 pins 'X-GitHub-Api-Version: 2022-11-28' on exactly ONE manual fetch; the App installation client, the GraphQL aggregator client and the operator client never send the header (repo grep apiVersion -> 1 site) — GitHub's REST calendar-versioning guidance recommends pinning the version on every client so a future deprecation window cannot shift responses under a long-lived deployment
- acceptance:
  - every GitHub egress path sends X-GitHub-Api-Version: 2022-11-28 — set once at Octokit client construction (default headers), the manual oauth fetch already covered
  - a test pins the header at the egress seam (client construction fixture); no behavior change against current APIs
  - GraphQL paths documented as versionless (no header owed there) in a comment at the construction site
- evidence: the client-construction diff; the header-pinning test; grep showing no remaining unpinned egress site
- trade-off: the pin freezes the REST surface until deliberately revisited — revisit only when GitHub announces a REST sunset; low churn (one constant + one header)
- rider (2026-10-10, run e5b71847827444268f9a5b54b9831322 cycle:3 prioritize c5cd03a368eb4b92b7e536e2a90d7c79): NOT selected this cycle — low urgency (REST surface stable, no announced sunset; the oauth manual fetch already pins the header) and no theme anchor with the selected operator-stream batch; carried as a next-cycle candidate alongside the soak-cut dependency refresh; effort S, zero sibling claims.

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

### pnpm auto-install rewrites pnpm-lock.yaml on script runs — evidence-integrity hazard, kill-switch proven
- id: `rm-656` | track: reliability | priority: 14.0 | status: in_progress
- acceptance:
- evidence: campaign-recorded in dashboard ROADMAP.md

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

<!-- conductor integrate 493bbbf2 merge-resolution graft (2026-10-14): same regime and same rule as the e5b71847/08a0abac grafts below — the landed managed render stays authoritative; candidate cb80b6a (run 493bbbf2227c cycle:2 'dep + action-digest currency refresh', rm-137 digest pair + rm-760 soak-eligible dep half) ledger content is preserved on top of it: ZERO def entries minted (the run's roadmap phase folded every researched candidate to standing owners), the run's thirteen dated evidence riders attached to their live defs above (rm-137 ×4 incl. selection/implementation/compound, rm-760 ×4 likewise, rm-139/rm-143/rm-252/rm-278/rm-689 one each), cycle-2 extension #31 + the cycle-2 compound comment preserved verbatim below. Candidate-era def-status rewrites and the base-era extension #30 / compound #12 tail comments stay retired with the render regime (the grafted riders carry the implemented record); roadmap-integrity-guard.test.ts / scripts/roadmap-census.ts remain absent per the upstream-adoption fold, so ext #31's guard-battery sentence is historical, not actionable. Landing reconciliation note: the rm-137 digest pair had ALREADY reached main by content via upstream #580/#589 (adoption lineage 4b73309/e895362 — identical digests 24c5418/cf430e0), so this merge keeps the identical digests and restores rm-650's precise version comments (# v4.38.3) at the four codeql-action sites upstream had rewritten to bare # v4; visual.yaml's two upload-artifact sites (stale 043fb46 # v7.0.1 on main, missed by the adoption) take the candidate's cf430e0 # v7.0.2 pins, completing the 8-site single-family surface; rm-760's @hono/node-server ^2.1.4 rides package.json/pnpm-lock (vite 8.3.4 already on main via #608). Render census after this graft: 235 def ids / 0 dups / max rm-856 / next free rm-857. -->
<!-- cycle-2 extension #31 (2026-10-09, conductor run 493bbbf2227c4352b8e9dde32420d1f1 roadmap attempt 224cff7852b341b9a86606161f339b91, repository-maintenance cycle:2 at base 364272b6669bb8c8e20591ba063d24fdfc6753a2 == origin/main fetched fresh this phase, clean tree at dispatch; this run's assess 86b3a211a66d4402be03dd31b0634968 + research 6e9b9be5916b4eda83a7b94df796905f): census after edit: 245 defs / 0 dups / max rm-778 (ZERO MINTS this extension — every researched candidate folded to an existing owner def, so the guard id-ceiling pin stays 778 and next free id is rm-806, minted above the all-lineage unlanded frontier rm-805 re-probed this phase via def-line scans of all ten sibling run walls: 8dd690c8 805, d8fdf8b7 803, 6a97d6f7 802, c37a8576 801, c4617181 800, 38e72854 797, d1a0b216 796 — fleet liveness sqlite-probed, dead-lane claims are content-re-implementable per convention). Census at compose (base 364272b): 245 defs, 0 dups, max rm-778 — unchanged. Dated riders appended: rm-760 (soak windows opened — @hono/node-server 2.1.4 eligible since 2026-10-09T04:42Z, vite 8.3.4 at 12:07Z same day, playwright 1.64.0 still mcr-gated), rm-252 (absorb window 25 commits tip 22e2e46/v0.118.3, #573 content-absorbed byte-identical provenance.ts via 89c7398/rm-157, remainder = agent pin + 2 docs + digest pair folded to rm-137, wiki-write never-absorb current, decision due 2026-10-13), rm-689 (live remainder = fro-bot.yaml agent pin v0.117.5 -> v0.118.3 + impeccable 3.6.1 two-place; eslint/pnpm-action halves landed, Dockerfile digest halves superseded by rm-698 trixie), rm-137 (upload-artifact v7.0.2 peeled cf430e0 + codeql-action v4.38.3 peeled 24c5418 same-major digest pair, upstream #580/#589 precedents), rm-278 (Scorecard 7.4 @2026-10-09T01:56Z, CI-Tests 7->4, SAST 9->7, TP/PD hold; License:0 root cause = no LICENSE file or package.json license field in either fork or upstream — owner decision), rm-143 (7.6->7.4 regression continuation, Vulnerabilities recovered, runbook obligation open), rm-139 (dev-host Node v22.22.0 vs engines >=24 warning-only — engine-strict hardening parked LOW). Deliberately NOT minted (dedupe, house rule — every candidate group has a standing owner): C1 dep-soak pair -> rm-760 candidate (exact versions already in its acceptance); C2 actions digest pair -> rm-137 rider + rm-689 composite; C3 absorb decision input -> rm-252/rm-157/rm-689 interlock (due 2026-10-13); C4 impeccable two-place -> rm-689 composite via rm-196's ext rider; C5 LICENSE -> rm-278 owner-decision half; C6 scorecard regression -> rm-143/rm-278 riders. Zero status flips at compose. Post-edit guard battery to run before close: scripts/roadmap-census.ts (expect 245/0/778), test/roadmap-integrity-guard.test.ts (pin unchanged 778, newest-census-comment rule owned by THIS comment by document order and date), test/roadmap-length-guard.test.ts, eslint ROADMAP.md. -->
<!-- cycle-2 compound (2026-10-09, conductor run 493bbbf2227c4352b8e9dde32420d1f1 compound attempt 3b18fd47aae247d8ad022f58869782c5, repository-maintenance 40c3c987488a4931bb9ea115d6375109 cycle:2 at base 364272b6669bb8c8e20591ba063d24fdfc6753a2; chain: assess 86b3a211 + research 6e9b9be5 + roadmap 224cff78 + prioritize 1b02a1f1 + stewardship e2a85fb4 + implement 45e7b1c1 + targeted_tests d383088e + full_tests ffc19fc0 — the phase's first verbatim attempt c92d3cf2 outage-failed rc=1 and its honest 'failed' report was fold-gate-rejected; superseded evidence, not a repo regression; PRE-REVIEW evidence only, NO tests executed at compound — targeted and full outcomes consumed verbatim from their recorded artifacts, the only local commands were static ledger hygiene: census + eslint on the edited prose). Batch 'dep + action-digest currency refresh' (rm-137 + rm-760, batch doc docs/prioritization/2026-10-09-repository-maintenance-cycle-2-batch-run-493bbbf2227c.md): implemented in-tree UNCOMMITTED at dispatch (8-path porcelain set; commit is this run's later gate); targeted GREEN (13 files / 232 tests rc=0 over the impacted union; frozen/ct/lint/actionlint/buildweb/audit all rc=0); FULL GREEN via supervisor-authorized LOCAL MIRROR of all six Main-workflow jobs (5th approved instance of 2026-10-09; lint 0 err, impeccable [], check-types rc=0, 3677/3677 tests, actionlint 1.7.12 zero output, scripts-load 48/48; digest validation:v1:4074d26f91806e6279bb3c95a807d2a6b4e5f0ea38bf546ac67f284253e06ed7 re-derived post-battery == dispatch) — GitHub Actions is account-level disabled (dispatch 422 re-probed 18:42Z + 18:51Z, newest run 37872407109 of 01:59:31Z), so the GitHub-runner leg rides the first authorized push-gate turn after recovery; the fold-gate economics of outage-failed verbatim reports + the per-session mirror-authorization pattern are compounded to docs/solutions/workflow-issues/maintenance-cycle-learnings-2026-10-09-fulltests-outage-fold-gate-and-mirror-authorization.md (recipe mechanics cross-referenced to the sibling mirror doc maintenance-cycle-learnings-2026-10-09-actions-account-disable-full-validation-local-mirror.md). Per the compound house rule (cycle-2 precedent c026a644 / 6c18f152): NO status flips and NO new ids at compound — nothing has landed for THIS run (review/shipping happen after this step); validation-outcome riders appended to rm-137/rm-760; census at compound 245 defs / 0 dups / max rm-778, unchanged from implement and extension #31 (this comment is now the newest census-bearing comment by document order; guard id-ceiling pin stays 778, next free id rm-806). Next-cycle context carried (owners named, no claims transferred): @playwright/test 1.64.0 + visual.yaml mcr digest lockstep + the two-green visual rule are rm-760's own acceptance tail; the fro-bot.yaml agent pin v0.117.5→v0.118.3 is the rm-689/rm-252 absorb-coupled remainder (decision input due 2026-10-13); action pins released after the 2026-10-09 census (setup-node v7.1.0 ×5 sites, 8207627 lineage) re-derive at next assess; the 2026-10-12 scheduled gate wave (base-drift 04:13Z, audit, cve-tripwire 06:53Z) is untouched by this batch; this batch's GitHub-runner CI confirmation completes at the first green stack post-recovery. -->
<!-- conductor integrate e5b71847 merge-resolution graft (2026-10-12): same regime and same rule as the 08a0abac graft above — the landed managed render stays authoritative; candidate 99925c1 (run e5b718478274 cycle:3 "operator-stream parse-and-drop truth") ledger content is preserved on top of it: rm-853/rm-854/rm-855/rm-856 def entries grafted in render priority order, the run's ten dated evidence riders attached to their live defs above (rm-760, rm-139, rm-143, rm-157, rm-159, rm-187, rm-196, rm-209, rm-252, rm-779), cycle-3 extension #38 preserved verbatim below. The candidate-era roadmap regime artifacts stay retired per HEAD (roadmap-integrity-guard.test.ts / scripts/roadmap-census.ts absent since the upstream-adoption fold; rm-856's mint-time guard-pin sentence is therefore historical, not actionable). Render census after this graft: 235 def ids / 0 dups / max rm-856 / next free rm-857. -->

<!-- conductor integrate 08a0abac merge-resolution graft (2026-10-11): the landed managed render (upstream-adoption regime, HEAD 558b14e) is authoritative; candidate 6c28871 (run 08a0abac) ledger content is preserved on top of it — rm-842/rm-843 def entries grafted in render priority order, 10 dated riders attached to their live defs above, cycle-2 extension #37 / prioritize-selection / compound-tail comments preserved verbatim below, rm-108/rm-116 riders preserved as orphan-wrapped comments because those defs are superseded and absent from the render (see Closed list). The candidate-era roadmap regime artifacts (roadmap-integrity-guard.test.ts, scripts/roadmap-census.ts) stay retired per HEAD. -->

<!-- cycle-2 extension #37 (2026-10-10, conductor run 08a0abac9453449a9900081b59decc00 - repository-maintenance cycle:2; assess 0b1bd864 (5 first-hand findings, all fleet/environment-class: Actions run-creation outage 38.5h+, duplicate CI-validation PR stacking, actions-permissions settings gap, canary stale-red with cured cause, port-parse grammar nit) + research a2cbb8e9 (7 candidate classes A-G, upstream delta 27 commits c1f760e..1ecbb81, Node v24 end 2026-10-20, ubuntu-26.04 published, dependabot 0 open / 47 fixed); composed at base 88e423a6c53a8e81a7eb4ab121ef66c57bfab9c7 == origin/main, clean tree, every probe read-only). MINT-TIME CENSUS — committed ledger at base: 247 defs, 0 dups, max rm-780 in comma-form (e796bbf3's post-merge comment owns the pre-mint truth in claim form); all-lineage re-probe 2026-10-10 across all 159 origin refs: run-wall def-line ceiling rm-835 (conductor/ci-c454e28d lineage), the rm-13640 def-line outlier is the recorded phantom family (ext #18), unlanded spool frontier rm-838/840/841 (run 1c814809 batch, no CI-validation PR) -> THIS EXTENSION mints TWO items rm-842 (contract 1.8.0 browser display half) + rm-843 (actions-permissions hardening), both clear of the wall ceiling and the spool frontier; post-mint census 249 defs / 0 dups / max rm-843, next free rm-844; re-census before any further mint. DEDUPE MAP — no re-mints: parser-twin disposition is rm-253's wire-or-fold; env-lenience (port path) rides rm-180; red-watch/absorb-window/pin-drift/Node-gate/ubuntu-alias/dependabot posture all ride existing owners below. DATED RIDERS appended, one each (11): rm-102, rm-108, rm-116, rm-139, rm-157, rm-180, rm-188, rm-252, rm-289, rm-648, rm-760. Completed and Superseded untouched. Guard pin bumped 780 -> 843 atomically with the mints (the assertion comment stack in test/roadmap-integrity-guard.test.ts carries the provenance). Ordinals are per-lineage and doubled ordinals reconcile by content (this is #37 continuing the fleet-visible #36/ext-#18 lineages; every comment self-identifies by run id). -->

<!-- repository-maintenance cycle:2 prioritize selection (2026-10-10, run 08a0abac9453449a9900081b59decc00 prioritize 51f05853d09c46f9a8a9ec502f00b9b0; decision record 51f05853d09c46f9a8a9ec502f00b9b0-prioritize.md in this spool)

SELECTION — batch 'operator-contract 1.8.0 display completion + supply-chain hardening': rm-842 U1/LEAD + rm-843 U2; rm-180 port-path residual as rider-scope under the batch doc (no def flip). Status flips do not move the census; ext #37 above stays the newest claim-bearing comment and its census claim remains the live truth.

CLAIMED AND EXCLUDED (collision diligence, all first-hand): rm-289 red-watch — content-adjacent to 159ec0eb's selected rm-836 ci-freshness batch (live lane); rm-108 codeql/setup-node/upload-artifact re-pins — katex/codeql family already implemented by sibling f72cb7ef rm-844 (unlanded, folds at its own integrate), workflow churn under the run-creation outage adds unvalidatable surface; rm-760 vite 8.3.4 + @hono/node-server 2.1.4 re-eligible sweeps — held for the next routine-bump batch (lockfile churn dilutes this batch's operator-contract focus); rm-116 protection fill — outage-gated (needs live check conclusions to require); rm-139 Node-26 window — gated on CI lanes, deferred to its 2026-10-28 rider date; rm-252 absorb — only live items are pnpm 11.28.5 + agent v0.118.3 + docs #578, each a rider-note not a batch anchor; rm-846 sibling duplicate — folds per the fold map above.

SELECTION RISK — one structural risk: TWO live lineages (this one and 633717c2's 1.9.0-readiness lane) will touch public/operator-stream.js; this batch lands first and smaller (provenance/preparation only, no window change), keeping the 1.9.0 lane's rebase additive. -->

<!-- cycle:3 roadmap extension #38 (2026-10-10, run e5b71847827444268f9a5b54b9831322 cycle:3 roadmap 694f98d352f9, repository-maintenance 4e88459f cycle:3 at base 88e423a == origin/main, porcelain clean): FOUR mints above the all-lineage unlanded def-line ceiling rm-852, re-probed live this turn — spool *.patch def-max rm-852 (roadmap-06c667d3, run 633717c23b19 ext#37), dirty dashboard walls top rm-849 (run-386aafb1395f), open PRs 483/485/488/494/498/499 carry no ROADMAP defs; foreign bands excluded with evidence: rm-871/872/873 agenttrace (run 2a5cdb9e worktree agenttrace-80c75f65b7), rm-890/892/894+ truth-family ledgers (zero-padded rm-011 ids, 'done' statuses, 342 rows), rm-895/896 cfa48339 truth-family scratch. MINTS: rm-853 (operator stream seq-gap surfacing — parse-drop invisibility, assess F3), rm-854 (SSE multi-line data join per WHATWG 9.2.6), rm-855 (X-GitHub-Api-Version pinned at every egress client), rm-856 (base-drift tag literal derives from the Dockerfile ARG — the second rm-779-class site). NINE dated evidence riders at rm-779/rm-157/rm-252/rm-196/rm-108/rm-143/rm-139/rm-187/rm-209 (fresh simulation, agent 1.9.0 committed-unreleased, absorb window static + #1737 unblock, action re-pins, registry soak windows, scorecard 7.4 drop + CI-Tests outage erosion, Node 26 not-LTS, console.warn discipline residual, GET-seam abort residual). HONORING: 633717c23b19's unlanded rm-838..852 band is untouched — integrate reconciles by content; this run's mints start at rm-853 clear of it. SCREENED OUT: trivy-action 'drift' was the scanner repo reading (action v0.36.0 IS latest); vendored-twin single-sourcing stays DELIBERATELY REJECTED (the :1781-band record — public/ no-build standalone); vite-plugin-pwa 2.0.0 stays rm-138; dependabot alerts 0 open. Guard pin 780 -> 856 atomically with these mints (test/roadmap-integrity-guard.test.ts). Census after edit: 251 defs / 0 dups / max rm-856 / next free rm-857. -->

<!-- cycle:2 compound tail (2026-10-10, run 08a0abac9453449a9900081b59decc00 compound f9a7ba3b, repository-maintenance 00ad211e cycle:2, pre-review evidence only — consumed from the typed records targeted_tests cda2b2fc + full_tests 03061b8d, NO local re-validation per the compound contract): two validation-outcome riders appended (rm-842, rm-843 — both stay implemented 2026-10-10 pending landing; landing verification owns the final flip); pre-review validation appendix added to docs/prioritization/2026-10-10-repository-maintenance-cycle-2-batch-run-08a0abac9453.md; NEW cycle record at docs/prioritization/2026-10-10-repository-maintenance-cycle-2-compound-run-08a0abac9453.md; NEW prevention rule at docs/solutions/best-practices/operator-contract-browser-display-twin-parity-2026-10-10.md. ZERO def-line edits, ZERO status flips, ZERO mints — census after this compound layer 249 defs / 0 dups / max rm-843, next free rm-844 (unchanged from ext #37 above; this comment takes the newest-claim slot by document order and restates the same live truth). Guard pin 843 and every test file untouched; the compound delta is markdown-only, so the executable-surface digest cannot move — implement-applied digest validation:v1:90d701f48eb4bda9d3f6ef31c452e61dd56b8826d8347949102e50749a0e510f re-derived byte-identical after composition. Attempt lineage: compound attempts 9f28a60c (reaped ~2.5min, zero output) and ceb465d4 (provider 429 after 783.6s, no PhaseResult delivered) preceded this attempt; their sole durable residue was the implement patch left applied in the worktree, verified byte-exact by clean reverse-apply and md5 and reused as the composing base, then restored. -->

<!-- orphan rider (def `rm-108` not present in the managed render; preserved verbatim from lineage 88e423a): - rider (2026-10-10, run 08a0abac9453 roadmap a2555fa7, from research a2cbb8e9 C): drift attribution refresh — actions/setup-node v7.1.0 (2026-10-08) vs pinned v7.0.0 at 4 sites, actions/upload-artifact v7.0.2 (2026-10-07) vs v7.0.1 at 4 sites; upstream's codeql-action digest bump 24c5418 (#589) converges the unowned codeql refresh from the 2026-10-09 rider -->
<!-- orphan rider (def `rm-116` not present in the managed render; preserved verbatim from lineage 88e423a): - rider (2026-10-10, run 08a0abac9453 roadmap a2555fa7, from assess 0b1bd864 F1/F2): protection shell re-probed empty under a new datum — the Actions run-creation outage (38.5h+ at probe, newest run 2026-10-09T01:59:31Z, main tip 88e423a carrying 0 check-runs) stacks duplicate CI-validation PRs per batch (#480/#482/#488 identical 12-file set of c37a857620e1; #485/#487 identical 5-file set of 91f3d37f), each individually mergeable CLEAN — with no required checks nothing blocks a double-merge double-landing ROADMAP/batch-doc hunks; keep-one-per-batch until checks can run -->

<!-- managed by hermes-roadmap render; do not edit by hand -->

