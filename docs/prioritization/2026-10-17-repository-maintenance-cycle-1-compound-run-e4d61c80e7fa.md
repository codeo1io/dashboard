# Repository maintenance cycle 1 compound - run e4d61c80e7fa

Recorded 2026-10-17 by the compound phase, using pre-review cycle evidence only (assessment, research, roadmap, prioritization, stewardship, implementation, targeted and full validation). Review and shipping outcomes are recorded downstream; the next cycle's assessment carries them forward.

## Cycle chain

repository-maintenance 004d537e cycle 1, base worktree 5d5f9be (branch conductor/run-e4d61c80e7fa), origin/main 3e3664c at planning time, upstream b16d061 (tag 2026.10.38, 22-commit drift).

- assess: fresh adversarial pass (prior attempt 0aeff3f7 reaped with nothing durable - redone from scratch). Two live-wire bugs surfaced: the flat-parses-a-list subscription read and the 1.9.0-exact contract gate.
- research: window re-scanned to 2026.10.38; the ready-frame hard-gate was proven (gateway serves contractVersion 1.11.0 unconditionally while the fork exact-matched 1.9.0 and failed closed); the push-UX dead-end was proven at bundle level (kill-switch SW registered on every load, serviceWorker.ready never settles).
- roadmap: rm-873 through rm-880 minted spool-side; the spool artifacts were swept before compound landed them, so the block was re-derived from the tree and landed directly this phase with receipts (see below).
- prioritize: batch = rm-873 CORE + rm-874 + riders rm-879/rm-880. The rm-875/rm-876/rm-878 territory was left to the parallel 48f621e31d band (87bda710) to avoid collision.
- stewardship: structured request with 21 surfaces, 4 must_remain_separate pairs (pins vs runtime code, ledger vs behavior, the never-absorb SW pair, docs vs code).
- implement: prior attempt 4ff3aee4 died of provider death mid-flight; its tree work was adopted after mtime-window and event-log forensics and completed (attempt e833210e).
- targeted_tests: prior attempt e1144f13 died at ~46s with nothing durable; redone (attempt db5430c3). 18 files 2234/2234 plus 2 files 9/9 green, check-types exit 0, eslint 0 errors on all changed paths, actionlint clean on all 5 changed workflows.
- full_tests: prior attempt 205c3272 died after completing real cures (ROADMAP lint cure, playwright fleet trio cure); the cures were adopted and the authoritative github_ci_validate.py ran green (attempt fc478e3c) - validation PR 783, commit ae41d738, conductor digest validation:v1:ccdc8dab27ed92cb729577e80f9d61c7ab183e49db2da39dc1f977a250359650 (SUPERSEDED pair, pre-review-fix), mirror gates lint/check-types/test 59 files 3091 + 34 files 1231 + impeccable clean + playwright 3 passed in the pinned mcr container. Post-review-fix full validation: PR 824 (head e1b3bb581f861b0432a62e177daf06a61a7256fe, 10 checks SUCCESS) with emission digest validation:v1:4ab3f55de23cd405f66d1bac815cb889fdb1295e5ff671815b0c00008f4b5da8; review round fd5570d2 re-scoped fro-bot.yaml to origin/main bytes, so the band's emission digest moves again and final_validation is the authoritative re-derivation point (never present a superseded digest as current).
- review: first independent review (cfff32e4) NEEDS_CHANGES with 10 findings - all cured at review-fix (ebda3048); re-review (53e474bb) NEEDS_CHANGES with 6 findings - fro-bot.yaml validator collision, twin-surface conflict map, additive-vs-exact-pin adjudication, stale receipts, compound-doc currency, band count - cured at fd5570d2 (this round): fro-bot.yaml reverted to origin/main bytes (v0.122.2, digest 06469674e6671f36c7f22b87f136d34d6d69f060), the twin-surface deferral fold map recorded in rm-873's receipt (take-main / take-ours / compose per file vs origin/main edf948de), the plan-R1 supersession adjudication recorded, all receipts re-pointed at PR 824 + 4ab3f55d. The post-re-scope emission digest is validation:v1:8c079f6802d9065a59632a01fab5fa577d35e857edc01f5215866f3ca36186b7 (derived 2026-10-17 at review fd5570d2, engine release 01d80a427ec3, base 5d5f9be); the landing fold must re-derive at the live tip and never re-present 4ab3f55d as current.

## What landed (the uncommitted cycle band, 44 files + this band)

Contract compatibility (rm-873): src/gateway/operator-sse-reader.ts grew ACCEPTED_OPERATOR_CONTRACT_VERSIONS (the known-good set 1.6.0 through 1.11.0; unknown versions still fail closed with contract-drift); src/gateway/operator-contract/version.ts pins 1.11.0; public/operator-stream.js carries the label parity; waiting-class statuses render end-to-end in both projectors (web/src/operator/runtime.ts, public/operator-run-index.js, run-summary contract types, fixture harness); fixtures in test/run-responses.ts preserved. The upstream sw.ts and sw.test.ts hunks were never absorbed - kill-switch discipline held.

Subscription-list wire (rm-874): src/gateway/operator-client.ts parses the list envelope only; src/gateway/operator-contract/push.ts is a closed-DTO list parser (per-entry validation, invalid entries dropped) that rejects a flat record - no supported gateway serves one, the wire has been list-shaped exclusively since v0.122.1; the operator-client fixture flipped off the buggy flat shape; a new test/operator-contract-push.test.ts covers the contract surface including flat rejection; the web push family stays coherent (push-types, reconcile, subscribe, Notifications).

Pin riders (rm-879): the agent v0.122.3 bump (digest 7d273ac643c8f9c0dc8615222677693dc337adef, verified against its upstream tag) is DEFERRED to the landing gate (review fd5570d2): origin/main moved its pin to v0.122.2 via sibling landing 1c7f74a, three values on one line is the deterministic #18878 validator conflict, so fro-bot.yaml carries origin/main's exact bytes (re-anchor the pin line + AGENTS.md + the pin-guard map together at landing); the codeql 4.39.0@6f2ac81 bump was DEFERRED at review-fix - origin/main's own v4.38.3@24c5418 reconciliation of the same four sites (codeql.yaml twice, release.yaml once, scorecard.yaml once) landed first, so the four workflows are byte-identical to main (re-bump next-cycle); visual.yaml's upload-artifact v7.0.2 and v1.64.0-noble image coincide with main's lockstep repair; @types/node 24.19.2; @opencode-ai/plugin 1.19.0, with the lockfile delta limited to plugin + types + peer-suffix rewrites (review-corrected receipt: no hono refresh occurred). Dockerfile node digest NOT touched - carry-forward residue, re-verify at the next absorb.

Docs (rm-880): the Cloned Dependency Source note in AGENTS.md is composed from main's own CI-pinned bullet and states the live v0.122.2 pin (digest 06469674e6671f36c7f22b87f136d34d6d69f060), the 1.11.0 contract fact, the additive 1.6.0-1.11.0 set pointer, and the v0.122.3 deferral that rides the landing-gate re-anchor.

Validation-borne cures adopted into the band by full_tests: the ROADMAP.md lint cure (line-19 bracket escape plus 47 trailing-whitespace strips, replicating the shapes main landed - the mirror Lint job is green on the landing tree) and the playwright fleet trio cure with the regenerated operator-dark baseline.

## Status of the minted defs (ROADMAP.md now carries the block)

- rm-873, rm-874, rm-879, rm-880: implemented 2026-10-17 run e4d61c80e7fa - evidence lines cite the green receipts above; statuses stay in_progress pending review per house practice.
- rm-875, rm-876, rm-878: not selected cycle 1 - owned by the parallel 48f621e31d band; re-derive at the next absorb.
- rm-877: top candidate for the next cycle (unique to this run).
- rm-252 evidence extended with the 2026.10.38 window rescan and the cycle-1 landing; rm-139 evidence extended with the live Node calendar (v24 maintenance 2026-10-20, v26 LTS 2026-10-28 - the gate is ripe).

## Prevention rules learned this cycle

1. An exact-match version gate on a client against a server it does not control is a self-inflicted outage: the gateway moved to 1.11.0 unconditionally and the fork's stream failed closed on every connect. Additive known-good-set acceptance keeps fail-closed behavior for unknowns while never betting on a single server version.
2. Reaped-attempt forensics: two provider deaths left real work in the shared worktree. The adoption proof that worked: event-log session window, file mtime window inside it, porcelain delta matching the phase's expected end state, then hunk-by-hunk verification against the batch contract before declaring adoption.
3. The engine's impacted-test derivation treats package.json as shared build configuration: any batch touching it degrades targeted mode to fallback-full. Plan the surface list accordingly.
4. Delegate spool scratch dirs are swept between phases - a compound phase must never depend on delegate-scratch artifacts surviving; re-derive ledger inserts from the tree (this phase did).
5. Gate censuses do not survive base movement: re-measure lint at the reconciled base before burning validation rounds (reaffirmed; the lint debt measured 48 at assess was cured to green in-band by full_tests).

## Next-cycle candidates (in order)

1. rm-877 push-UX host decision - full push SW host (absorbing the 619 pure modules) or gate the Notifications opt-in; the surface is currently dead in production either way.
2. Node 26 go/no-go (rm-139) - the LTS window opens 2026-10-28; engines already permits 26; record the matrix.
3. rm-875/rm-876/rm-878 reconciliation - re-derive against whatever the parallel band landed; first-landed-wins.
4. Deferred rm-873 sub-clauses: jump plumbing and scroll-into-view (de2ce7f) whose triggers ride the push host, and the card cosmetics (c936d85).
5. Dockerfile node digest re-verification (carry-forward from rm-879).

Standing exclusions reaffirmed: read-only invariant absolute; upstream write-capability surfaces never absorbed; sw.ts/sw.test.ts never touched; fork issues disabled so user-facing needs ride upstream trackers.
