# Dashboard maintenance — repository-maintenance cycle 1 batch (2026-10-04, run 146d73f2)

module: dashboard
tags: `[security, operator-experience, test-quality, reliability, batch-record]`
problem_type: batch-record

Frame: base `227375247` (== live origin/main, re-probed at the roadmap phase).
Run `146d73f21f704fb99fea62dadf0c1577`, repository-maintenance
(`3a560bcc781341d38a7e2c76163b6011`) cycle:1. Phases: assess
`e9067d2195694d9ca7fa4e896be8078b` (gates check-types rc=0 / lint rc=0 / test
rc=1 decomposed to exactly the known rm-548 Node-26 web-localStorage class;
findings F1–F5), research `bbe81d28a76e4d81a164708f7563c5f3` (C1–C3, §1
correction-of-record, §3 rider datums, §5 declines), roadmap
`8604104efb94475db21b9773452b2fe6` (worktree ROADMAP.md +25/-0 — mints
rm-594/rm-595/rm-596 + riders on rm-249/rm-108/rm-138 + extension #11),
prioritize attempt `29c14354aaf146dbab33f681e36d2262` (this document).

Skill routing: no ce-\* skill package is installed in this delegate env
(checked `~/.agents/skills` — agent-reach only); the narrowest installed match
would be a plan-composition skill, so this phase follows the fleet's recorded
house process (same precedent as this run's roadmap attempt 8604104e).

## The cycle's mandate

One theme: **harden the operator/public surfaces — cap what can grow, bound
what can hang, restore what was lost, guard what must stay in sync.** Four
members, all small-to-medium, tree-only, zero lockfile churn, zero time gates,
zero external dependencies, and zero content-claims by active sibling lanes.
Three are this run's own fresh mints; the fourth is the highest-priority
unclaimed open item in the committed ledger.

## Selection method

Ranked the full open-candidate field at base (66 `status: candidate` def-lines
extracted from ROADMAP.md, cross-checked against the 2026-10-04 riders).
Exclusions, each with a recorded reason:

- **Sibling-claimed (owned lanes, not candidates).** 38ee3e1c's selected
  batch today (rm-187, rm-501 + rm-482 rider, their rm-597, their rm-596
  erasable-plugin bump); 2c3b4c64's selected batch (the Node-26 web-test
  localStorage cure, their rm-608/rm-609); 7a4d9070's in-flight unlanded
  code (rm-555 /assets: README.md + src/server.ts + static-assets test —
  code present in that worktree); 5bf98ac3's stale cycle-19 lane
  (aggregator.ts + base-drift/canary/visual workflows — avoid until it lands
  or is adjudicated). Verified first-hand: only those two worktrees carry
  non-ROADMAP code diffs fleet-wide at prioritize time.
- **Fleet-consensus deferred.** rm-107 (65.0, feature-scale panel), rm-116
  (58.0, live GitHub ops mutation surface, decision-first).
- **Closed-by-content (spending a batch would re-do landed work).** rm-282
  (74.0: floors landed twice, CI audit gate discharged by audit.yaml);
  rm-512 (46.0: ledger says do-not-re-implement, rm-497 landed); rm-279
  (96.0: paragraph-split cure landed, two green push-to-main Main runs since,
  decomposition half likely moot — next integrate should weigh
  close-as-cured-by-content).
- **Bound to external lineages/windows.** rm-281 (62.0, rides 2ee1c4841e9d's
  landing); rm-106 (70.0, blocked on the gateway-side send contract);
  rm-139 (24.0, time-gated 2026-10-28).
- **Feature-scale panels** (API-budget memoize 60.0, gate-health 52.0, trend
  sparklines 40.0, approvals aging 50.0, fleet inbox 48.0, security panel
  70.0, …): not cycle-1 material.
- **Joint-decision-gated.** rm-249 (72.0) + rm-138 (30.0): the push-SW
  substrate, the strip-or-implement config decision, and the PNG-icon
  remediation (2026-10-04 rider) move as one dedicated cycle — they need an
  architecture decision, an asset-tooling choice, and live VAPID
  verification that cannot ride four other members. rm-596's rider
  cross-refs the icon half as one UX story; the pointer stands.
- **rm-289 (38.0, scheduled-watch path).** Its first live test window is the
  2026-10-05 03:37–05:23Z Monday cluster — one day out. An implementation
  this cycle could not be validated against a live window; next cycle gets
  fresh cluster evidence. Strong next-cycle headliner.
- **rm-484 (36.0, SSE multi-line data join) and the SSE twins.** The
  2026-10-04 rider set (rm-114-family: 73365170, 64fa04b0, 3193ff37, this
  run's research) converged the acceptance onto the single-sourcing item
  ("Single-source the SSE parser invariants", 45.0): spec-strip + U+000A join
  in the shared-source extraction. Implementing rm-484's half alone would be
  absorbed by that refactor — defer to the convergence cycle.
- **rm-485 (32.0, launchRun refresh-then-resend).** Verified first-hand this
  phase: the server-side `launchRun` has ZERO production callers (only
  test/operator-client.test.ts:178–404); the browser twin
  (public/operator-launch.js:529–544) already retries with the same
  idempotency key. Impact is below the bar for this batch; the ledger's own
  decline-path (record the decision + symmetric interface docs) can close it
  without code. Candidate for a cheap docs-riding member next cycle.

Survivors, ranked by ledger priority, all four selected: **rm-286 (44.0,
security) > rm-594 (35.0) > rm-596 (28.0) > rm-595 (22.0).**

## B1 — rm-286: rate-limit store admission cap (`RATE_LIMIT_MAX_KEYS`)

- **Why first.** Highest-priority unclaimed implementable open item (security
  44.0), with a prebuilt cure: the archived cycle-18 PR #233 U3 hunks + 77-line
  red test are preserved verbatim
  (docs/archive/pr-233-unlanded-cycle-18-2026-09-30.md:26, :303–326+). Premise
  verified at base: zero `RATE_LIMIT_MAX_KEYS` hits in src/, test/, README.
- **The gap.** `rateLimitMap` (src/server.ts:125) is an unbounded in-memory
  store keyed on the client address (first XFF hop when the proxy is
  trusted) — key-churn grows it without limit; src/server.ts's own comment at
  :749 acknowledges "rateLimitMap without bound inside the sweep window".
- **Change.** `envIntOrDefault('RATE_LIMIT_MAX_KEYS', 10_000)` (the :143
  house pattern), admission check on the insert path (:265–269),
  stale-window sweep on insert (reuse the :246–248 sweep shape) so a full
  store self-heals within the window, fail-closed 429 when full — the
  archived pre-decided shape. README env-table row; the env-docs guard's
  census regex (test/env-docs-guard.test.ts:25, `(?:DASHBOARD|RATE_LIMIT|GATEWAY)_`)
  already covers the token, so the README row is enforced automatically.
  Rebuild/reuse the archived red test where it still compiles.
- **Risk.** Medium-low: fail-closed-429-on-full is a deliberate
  availability trade (a churn-filled store denies the class until the sweep
  frees room) — pre-decided in the archive, keep sweep-on-insert so the
  denial window is bounded, and state the trade in the README row. Invalid
  values fall back to the default per the house env convention.

## B2 — rm-594: bound the approval-surface fetches (this run's mint)

- **Why.** The decide/CSRF mutation fetches (public/operator-stream.js:1048
  browserFetch → refreshCsrf :1057, decideRunApproval :1095–1125 incl. the
  CSRF-400 retry re-fetch, listRunApprovals) carry no wall-clock bound while
  in-flight state disables every control (:1409/:1511/:1560) — a decide that
  never resolves strands the operator. The in-file cure precedent is
  buildCancelClient (:1276 `CANCEL_FETCH_TIMEOUT_MS=10_000`, :1293
  feature-detected `AbortSignal.timeout` + rationale comment).
- **Change.** Named 10s constant + the same `typeof AbortSignal?.timeout`
  feature-detect wired into browserFetch's init; never-resolving-decide unit
  tests red-before-green in test/operator-stream-core.test.ts (keep the
  never-resolving branch unit-level, per the SSE-reader precedent); zero
  behavior change on healthy paths; 10s parity with the cancel client.
- **Risk.** Low: in-file precedent + operator-run-index.js:205
  (`FETCH_TIMEOUT_MS`); the idempotency key in makeInit (:1104) is the safety
  seam making client-side bounding safe.

## B3 — rm-596: re-entry for dismissed push cards (this run's mint)

- **Why.** Dismissing the notifications card latches
  `fro-bot-notifications-dismissed='1'` (web/src/views/Notifications.tsx:16,
  :54–58, :337–343) and the early return at :281 hides the app's ONLY push
  surface (AppShell.tsx:512; footer's sole control is the Privacy link :533)
  — one accidental ✕ costs the entire push/settings surface including the
  ios-not-installed routing (notifications-copy.ts:18/:67) until devtools.
  InstallPrompt carries the same one-way latch (InstallPrompt.tsx:11–12/:24/:70).
- **Change.** One footer anchor beside Privacy covering BOTH keys — restores
  the card(s) by clearing the localStorage latch and re-entering the state
  machine at not-requested; key names unchanged (no migration); dismissal
  persistence itself stays deliberate (documented in InstallPrompt's
  docstring); unit tests assert key-cleared + card-visible after re-entry.
- **Risk.** Medium-low: web/src change → the path-filtered visual workflow
  rides the validation PR; web-test validation under the zero-edit Node-26
  recipe below.

## B4 — rm-595: parity guard for the three validateDynamicId copies (this run's mint)

- **Why.** validateDynamicId exists as three manual-sync copies —
  src/gateway/operator-client.ts:402 (server), web/src/operator/validate-dynamic-id.ts:11
  (web, docstring "Keep this in sync … manually"), public/operator-stream.js:1189
  (public, standalone-bundle constraint) — with zero cross-copy automation: a
  tightening in any one copy silently strands the others.
- **Change.** One shared-corpus parity suite in the server tree importing all
  three implementations by path (cross-tree import of public/ is proven by
  test/operator-stream-core.test.ts); hostile-id corpus (blank, `/` and `\`,
  `%2F`/`%5C` case-insensitive, `%00`/`%0D`/`%0A`, control chars,
  decodeURIComponent-throwers, `.` and `..` segments); mutation demo in the
  implementing PR (drift any single copy → suite red). Codegen/single-source
  deliberately rejected (public/ is a no-build standalone module; web/ must
  never import src/ — the Docker builder copies only web/).
- **Risk.** Minimal: test-only, zero production change; the repo's own
  pin-the-copy precedent exists (web/src/push/push-types.test.ts:1–8).

## Validation plan (implement gate)

- Server/public (B1, B2, B4): `pnpm check-types`, `pnpm lint`, targeted
  suites (operator-stream-core incl. B2's new tests, env-docs-guard with the
  new census row, B1's limiter suite, B4's parity suite), then full
  `pnpm test`.
- Web (B3): the known rm-548 Node-26 localStorage class (4 files/100 tests)
  is the standing red — validate B3's new web tests under the zero-edit
  recipe `NODE_OPTIONS='--localstorage-file=<tmp>'` + the web vitest config,
  with red-count accounting (new tests green under the recipe; known-red
  count otherwise unchanged). Recipe proven first-hand by 2c3b4c64's research
  (eb6870e6) and 38ee3e1c's B2 discipline — zero-edit, no racing of
  2c3b4c64's config-cure lane.
- Visual: B3 touches web/src → the visual workflow runs on the ephemeral
  validation PR.
- ROADMAP.md is the roadmap phase's deliverable (+25/-0) — implement does not
  touch it; roadmap guards were green at the roadmap phase (3/3) and stay so.

## Deferred with pointers (next-cycle headliners)

| item | pointer |
|---|---|
| rm-289 (38.0) | watch-path for scheduled-workflow failures — live cluster evidence lands 2026-10-05 03:37–05:23Z; implement against fresh facts |
| rm-485 (32.0) | zero production callers verified 2026-10-04; decision-shaped close (symmetric interface docs) may need no code |
| rm-249 + rm-138 | joint push-SW/strip decision + PNG icons (2026-10-04 rider) + rm-596 cross-ref — one dedicated cycle |
| SSE convergence (45.0 + rm-484) | single-source the parser invariants; today's riders fixed the acceptance (spec-strip + U+000A join) |
| rm-282 / rm-279 | close-as-content / close-as-cured-by-content at the next integrate (no batch spend) |
| feature panels (rm-107 65.0, security panel 70.0, …) | fleet-consensus deferred; scale, not cycle material |

## Sibling-lane notice

This batch claims no content owned by any active sibling lane. Id collisions
on rm-594/rm-595/rm-596 (38ee3e1c minted the same ids with other meanings
today; the fleet's all-lineage ceiling has since moved past rm-618) are
reconcile-by-content at integrate per the d00d095 convention — landed meanings
own ids. 7a4d9070's unlanded rm-555 hunks (src/server.ts /assets route,
README row) are content-distinct from B1 (limiter region :125–269, env-table
row) — routine hunk-level reconciliation, no content overlap.

## Pre-review validation outcomes (compound, 2026-10-04)

No new code after implement; outcomes consumed from the recorded phase
results, not re-run:

- **targeted_tests (d89841d6)**: engine `targeted_command` verbatim rc=0 —
  19 derived node targets -> 18 files / 713 tests green (the 19th target is a
  `web/**` file silently filtered by the root vitest config's `test/**`
  include; run separately via `--config web/vitest.config.ts`, green).
  Companions for the two new untracked test files + changed web tests:
  376 + 1 + 33 + 45 tests green (`AppShell.test.tsx` green **bare Node 26** —
  the rm-548 class narrowed). `pnpm check-types` rc=0, focused eslint rc=0.
- **full_tests (49120bd0)**: authoritative `full_command` verbatim rc=0 —
  ephemeral draft PR #373 at validation commit 8122225d (base 227375247 +
  this batch), **all 10 checks SUCCESS** (Test / Check Types / Lint / Design
  Check / Check Workflows / Test Scripts Load / Analyze + CodeQL /
  Dependency Review / visual). Teardown verified: PR CLOSED, throwaway
  `conductor/ci-*` refs deleted, worktree byte-identical pre/post.
- Validation digest `validation:v1:500717fc…` stable pre/post in both turns —
  neither validation phase changed an executable surface.

## Next-cycle context

- **Forensics pattern**: implement resumed dead attempt 9661273c's surviving
  uncommitted worktree diff (verified against this run's own assess/research
  artifacts first) — worktree diffs are the durable carrier across dead
  sessions; keep them clean and self-describing.
- **Housekeeping observed, not owned**: 5 stale `conductor/ci-*` refs on
  origin from sibling runs (14d8be50, 2f3d0d9c, 4bae894f, 55eb3806,
  6018c926; re-count at compound re-fire f0e761d3 13:06Z: grown to 20
  non-base + 27 ci-base refs, the five above still among them) and stale
  open validation PRs from killed validations — a stewardship candidate,
  deliberately not minted here.
- **Leads measured, left open**: rm-485 decision-shaped (`launchRun` has zero
  production callers — only its own test); the no-timeout fetch family
  remainder (sibling claims rm-569 / rm-571 / rm-581, reconcile by content);
  rm-249 icon remediation pairs with rm-596 as one operator-push UX story
  (restore affordance + ios-not-installed routing).
- **Post-landing obligations**: none beyond the standing batch rows above; on
  landing, reconcile the rm-594/595/596 id collisions with 38ee3e1c by
  content (landed meanings own ids).
