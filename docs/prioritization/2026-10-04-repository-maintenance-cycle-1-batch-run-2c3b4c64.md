# Dashboard maintenance — repository-maintenance cycle 1 batch (2026-10-04, run 2c3b4c64)

module: dashboard
tags: `[reliability, test-infra, server, batch-record]`
problem_type: batch-record

Frame: base `227375247` (== origin/main; porcelain-clean at assess/research
time). Run `2c3b4c64121247678589a83be487183e`, repository-maintenance
cycle:1. Phases: assess `d53f1a37c798470d8a497cba2e44b5fc` (gates
check-types rc=0 / lint rc=0 / test rc=1 decomposed to exactly the known
Node-26 web localstorage class), research
`eb6870e602684a0486ef1212793323ff` (mechanism + zero-edit cure proven
first-hand), roadmap `83468e4f7d1e4517ac2aba3e9b12cc07` (worktree ROADMAP.md
+21/-0: mints rm-608/rm-609 + riders on rm-139/rm-271/rm-252), prioritize
attempt `4d468bda42e144d68451e4d18c0a2780` (this document). The worktree
ledger = main's 200-def ledger including this run's two mints; sibling
worktrees hold their own uncommitted mints (fleet ceiling rm-615 at
prioritize time) and are treated as owned lanes, not candidates.

## The cycle's mandate

One theme: **restore gate truth on the fleet's standing red, then close the
one operator-visible reliability wart this run caught first-hand.** Both
members are this run's own fresh mints — small, mechanical, zero external
dependencies, zero time gates, zero lockfile churn, and zero collision with
the unlanded sibling lanes (the symptom-only Node-26 battery mints
rm-561/568/591 fold INTO rm-608 at integrate rather than racing it).

## B1 — rm-608: cure the Node 26 web-test localstorage battery

- **Why first.** Every assess phase in the fleet currently decomposes the
  same 100-test red (App 25 / AppShell 30 / Notifications 37 / InstallPrompt
  8) before it can claim "zero new red"; the upcoming Node-26 gate (rm-139,
  window 2026-10-28) and the jsdom-30/vitest-5 evaluations (rm-271) both
  NEED a green web suite to evaluate against. One seam removes all of it.
- **Mechanism (proven, research eb6870e6).** Node 26.10's experimental
  webstorage leaves `globalThis.localStorage` a getter returning undefined
  (with `--localstorage-file` unset); jsdom 29.1.1's own window storage is
  fine; vitest 4.1.11's jsdom-env propagation loses it, so setup's
  `localStorage.clear()` throws. `NODE_OPTIONS='--localstorage-file=<tmp>'`
  + `vitest run --config web/vitest.config.ts` from the repo root returned
  App 25/25 and AppShell 30/30 rc=0 with zero tracked-file edits (logs
  v-a/v-b/v-c in delegate spool eb6870e6-scratch).
- **Change (pre-decided seam, implement verifies).** Primary: pin the flag
  in `web/vitest.config.ts` via poolOptions execArgv with a per-run tmp file
  computed at config load — config-owned, invocation-independent
  (CI/local/IDE), cross-platform. Fallback: `NODE_OPTIONS` on the `test`
  script's web term. The test-setup polyfill axis is third choice
  (unverified whether Node's getter is configurable in the env). The web
  half runs from the REPO ROOT (`root: 'web'` in the config) — direct
  vitest from inside `web/` finds no files.
- **Acceptance.** `pnpm test` rc=0 on Node 26.10.0 with all four suites
  enabled (server files + web both green — first fully green local run on
  Node 26.10); Notifications + InstallPrompt verified green alongside
  App/AppShell (only the latter two were proven in research); the flag file
  does not leak cross-file state (all four suites clear() in setup); the
  rm-608 entry gains a rider naming the winning axis and the jsdom-30
  interaction per its acceptance clause; no `ExperimentalWarning` noise in
  the web half's output.

## B2 — rm-609: serve the stale-cached SPA shell on transient dist reload failure

- **Why.** `src/server.ts:1056-1076` — when the shell TTL expires and
  `loadSpaShell()` fails transiently (readFile throws mid-swap), the
  handler at :1070-1074 returns `c.notFound()` even though a usable
  `spaShellCache.injected` copy sits right there: a dist-reload blip
  renders a bare 404 to the operator instead of the last-known-good shell.
  Line-verified first-hand at 227375247 this run.
- **Change.** On reload failure with a non-null cache, serve the stale
  shell (stale asset references intact, same `Cache-Control: no-store`
  posture per rm-166) and log the staleness once at warn; cold start with
  no prior load still 404s with the documented diagnostic.
- **Acceptance.** Server-suite fixture test: dist read error after a
  successful prior load → 200 stale shell, not 404; cold-start-no-prior
  → 404; `pnpm test` green (lands on the B1-restored green baseline).

## Why not the ledger's top-priority candidates (grounded, not hand-waved)

- `rm-252` (80.0) / `rm-103` (85.0) absorb family — window UNMOVED: delta
  27 commits, all dep-chore, NO-ABSORB stands; the two open upstream
  security PRs (#549 undici, #538 fast-uri) are already neutralized by the
  fork lockfile (undici@7.30.0, fast-uri@3.1.8). Multi-cycle scope.
- `rm-139` Node-26 adoption (24.0) — time-gated: the window opens with the
  2026-10-28 LTS promotion (v24 maintenance-entry 2026-10-20); next cycle's
  lead item, and its go/no-go evaluation is *unblocked* by B1 landing.
- `rm-271` toolchain majors + in-range refresh (34.0) — deps batch: no
  functional gain this cycle, unicorn 73→76 findings risk on the
  eslint-config bump, majors re-eval sits at the 2026-10-21 window; B1's
  rider takes the required jsdom-30 position on the seam instead.
- `rm-116` branch-protection fill — strategic but decision-first (which
  checks become required) plus live `gh api` mutation; an ops/decision
  step, not a tree member.
- `rm-147` LICENSE — blocked-external (license null both repos, re-probed
  this run). CII badge — declined by design (security-posture.md:18).
- Sibling-owned uncommitted lanes — NOT raced: SSE parser twins
  (73365170 rm-606/607), HTTP compression (rm-602/rm-600), 429 Retry-After
  (fefc4067 rm-602), /assets caching (38ee3e1c rm-594), detailsUrl
  (rm-450/rm-570), registerSW artifact cycle (d1850b2e rider on rm-138),
  302-misclassification (rm-614) and robots.txt (rm-615) in 84860aac's
  lane, and the Node-26 symptom batteries themselves (rm-561/568/591 —
  they fold into this run's cure rm-608 at integrate).

## Sequencing and verification

B1 first — it restores gate truth, so B2's new server-suite test lands on
a fully green baseline rather than inside a known-red run. Final cycle
verification: `pnpm check-types` rc=0, `pnpm lint` rc=0, `pnpm test` rc=0
on Node 26.10.0 (the fleet's first no-asterisks local run on 26), plus
the two rm-608/rm-609 ledger riders recording the winning seam axis and
the landed stale-shell behavior.

## Compounded next-cycle pointers (2026-10-04, compound d61feaf0)

- **rm-139 Node-26 gate** opens 2026-10-28 (v26 LTS; v24 maintenance-entry
  2026-10-20). Its go/no-go evaluation now runs against a GREEN local suite
  — this cycle's B1 removed the standing 100-test red that would have
  polluted every Node-26 trial run.
- **rm-271 majors window 2026-10-21**: jsdom-30 evaluation must take the
  rm-608 seam position (retire the `web/src/test-setup.ts` guard if the
  major restores env propagation — see
  docs/solutions/workflow-issues/node26-localstorage-undefined-vitest-jsdom-2026-10-04.md);
  in-range refresh set (vite 8.3.2, eslint 10.12.0, fast-check 4.10.2,
  hono 4.13.12, plugin 1.18.34, erasable-syntax-only 0.7.2, eslint-config
  0.54.0) re-probed at mint time.
- **Integrate-time folds**: sibling symptom-only Node-26 battery mints
  (rm-561/568/591) fold INTO rm-608 per its dedupe clause; sibling lanes
  (SSE twins rm-606/607, compression rm-600/602, Retry-After, /assets
  rm-594, detailsUrl rm-450/570, registerSW rider on rm-138, 302-class
  rm-614, robots rm-615) reconcile against their own worktrees' diffs.
- **Standing watch**: upstream absorb window (rm-252 — NO-ABSORB holds;
  open upstream PRs #549/#538 neutralized by the fork lockfile); branch
  protection fill (rm-116, decision-first); LICENSE (rm-147,
  blocked-external).

## Landed (2026-10-04, implement bd34be11)

- **B1 rm-608 landed on a different axis than pre-decided**: environment
  probes showed the jsdom window is NOT re-borrowable in vitest 4.1.11
  (`window === globalThis` and `document.defaultView === globalThis`;
  `sessionStorage` — not pre-defined by Node — propagates fine, pinning the
  mechanism to Node's localStorage getter blocking the env copy). Winning
  seam: `web/src/test-setup.ts` re-binds `globalThis.localStorage`
  (configurable getter, verified) to a fresh in-memory Storage literal per
  test file. Full web project: **31 files / 1172 tests rc=0 on Node
  26.10.0, zero flags** (was 4f/100t). One benign ExperimentalWarning per
  file remains (single guard probe read).
- **B2 rm-609 landed as designed**: stale-shell serve + TTL-window
  throttle; fixture transcript: cold-start (empty dist) → 404; dist present
  → 200 injected (contains the push-enabled meta); `index.html` removed +
  5s TTL aged out → second request → **200 byte-identical stale shell +
  exactly one `logger.warning('SPA shell reload failed — serving stale
  cached shell')`** (spy-filtered). static-assets suite 95/95 (was 93).
- Gates at the touched surface: `pnpm check-types` rc=0; eslint
  (src/server.ts, test/static-assets.test.ts) rc=0; ROADMAP guards 3/3;
  eslint ROADMAP.md rc=0; 0 duplicate ledger ids; porcelain = 4 tracked
  files + this doc.
