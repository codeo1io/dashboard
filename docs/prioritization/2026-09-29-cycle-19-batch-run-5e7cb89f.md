# Dashboard maintenance — cycle 19 batch (2026-09-29, run 5e7cb89f47c2)

Base: HEAD `163ff116` (worktree clean at dispatch except this run's roadmap edit:
rm-272..rm-271 + three dated riders, phase `roadmap:b4612dfb`). Cycle-18 landed this
morning via #277; the 262f170c bounded-poll cycle landed the same day — both are on
this base, so this batch builds on the newest hardened surfaces (useBoundedPoll,
rm-264 abort windows).

## Selection method

Scored every open roadmap item plus this run's assess/research findings on impact
(user-visible failure / invariant), risk (blast radius × reversibility), effort, hard
dependencies (gateway deployment, live settings, upstream releases, dependabot
windows, product decisions), and strategic value (unblocks other items). A batch must
be completable end-to-end **locally** this cycle — no live-gateway, no CI-admin, no
dep-registry dependency, no pending product decision — per the standing rule the last
two cycles also applied.

Two coherence constraints shaped the pick: (1) surface-collision discipline — one
surface family per cycle (this batch owns `web/src` push/api/views + two docs files +
one logger routing decision; no server routes, no parser files); (2) no racing of
standing dispositions — rm-137's acceptance still hands npm minors to the ~2026-10-03
dependabot window, so rm-271's in-range trio defers to it rather than landing here.

## Selected: auth-expiry truth + push-sweep bound batch

Coherent theme: three operator-visible falsehoods share one root class — the client
reports the WRONG durable state to the operator. A session-expired operator is told
"network" (rm-273/rm-208); a flag-enabled push user is told "initializing, temporary"
while the sweep hangs forever (rm-272); the README and the wire-contract doc describe
a rate-limit class and a payload the code does not have (rm-275). All four are
locally verifiable, none is tracked by an in-flight PR, and two are third-carries
(rm-208 explicitly marked "LEADING operator-experience candidate for the next cycle"
on 2026-09-25 — twice deferred since).

### B1 — `rm-272` Reconcile-sweep unbounded await + copy truth (priority 74.0, effort S) — batch lead

- Scope: `web/src/push/subscribe.ts:624` — bound `runReconcileSweep`'s
  `getLocalSubscription()` await with the same `withTimeout` discipline as the
  siblings at `:325`/`:426` (or resolve a registration-absent state explicitly);
  `web/src/views/notifications-copy.ts:73-75` — distinguish permanent unavailability
  (no registration / flag off) from initializing. No gateway contract change, no
  subscribe-path semantics change (rm-264's windows stay untouched).
- Acceptance (from ROADMAP rm-272): a test with no SW registration and a
  never-settling `serviceWorker.ready` proves the sweep completes, reports
  not-subscribed, and leaks no pending promise per focus event; copy truthed so the
  permanent state stops claiming to be temporary.
- Evidence expectation: `web/src/push/subscribe.test.ts` new cases (deferred ready
  promise + fake timers); grep shows no other unbounded `serviceWorker.ready` await.

### B2 — `rm-208` + `rm-273` folded: 'unauthenticated' across all three client surfaces (priorities 32.0/46.0, effort M)

- Scope: `web/src/api/listener.ts:99-101` and `web/src/api/monitoring.ts:112-119` —
  the fetch-error reason union gains `'unauthenticated'` for 401 (distinct from
  transport failure); `web/src/App.tsx:45-56` — the badge poll stops and renders an
  auth-expired state on 401 instead of freezing at the last good count forever;
  `web/src/views/Listener.tsx:109` / `web/src/views/Monitoring.tsx:67` — auth-expired
  affordance consistent with existing session UX instead of the network-error copy;
  ≥2-failure streak marks the badge stale (aria + last-good timestamp) per rm-208.
- Acceptance (from ROADMAP rm-208 + rm-273): web tests feed ok/401/rejected mocks per
  fetcher and for the App poll loop; no non-OK mapping silently collapses to
  `'network'` in either fetcher.
- Evidence expectation: `pnpm test` (web config) green with the new mocks;
  `grep -rn "reason: 'network'"` returns only genuine transport failures.
- Sequencing note: rm-251's useBoundedPoll already bounds these fetches' transport;
  this unit changes only the classification and rendering of the 401 class — no poll
  wiring changes.

### B3 — `rm-275` Doc-truth pair (priority 24.0, effort XS)

- Scope: `README.md:132` — the public rate-limit class description names exactly the
  gated paths (`/`, `/auth/login`, `/auth/callback`; rm-262 already pinned the
  static-asset half as deliberate; this truths the `/auth/logout*` half);
  `docs/contracts/operator-listener-channel.md:150-163` — the messages example
  carries `prunedCount` with the semantics of `src/listener/contract.ts:48`.
- Acceptance (from ROADMAP rm-275): README and `src/server.ts:670-671` gate
  grep-agree; `prunedCount` present in the contract doc; env-docs guard green.
- Evidence expectation: `grep prunedCount docs/contracts/operator-listener-channel.md`
  non-empty; `pnpm test` (env-docs guard) green.

### B4 — `rm-260` Logger routing decision (priority 15.0, effort XS — decision unit)

- Scope: `src/logger.ts:104` — choose the truth-the-routing end (info/debug →
  `console.info`, stderr reserved for warn+) or land a structured stdout sink;
  whichever way, the "clean stdout" premise stops being a claim without a consumer.
  The recorded decision lands in this batch doc + the code comment.
- Acceptance (from ROADMAP rm-260): no silent behavior change to listener/ingest
  error surfacing — warn/error stay on stderr; logger unit tests still green.
- Evidence expectation: decision note here; `pnpm test` green.

### B0 — batch baseline (house convention)

- `pnpm build:web` (web/dist must exist — direct vitest hits `/`), `pnpm check-types`,
  targeted suites (push web tests, App/Listener/Monitoring web tests, env-docs guard,
  logger tests) at base BEFORE B1 starts; same battery + full `pnpm test` after B4.
- Lint: targeted `npx eslint <changed files>` on non-re-fire turns per the runbook
  rule; never as the final gate before the phase-result JSON.

## Deliberately excluded (rationale recorded, no deferral notes minted)

| Candidate | Why not this cycle |
|---|---|
| rm-252 (80.0) + rm-253 (50.0) gateway contract forward-support + wire-or-fold | The ledger's top open pair and the NAMED cycle-20 lead: completable locally via fixture streams, but the pin-bump half couples to the full v0.117.0 absorb riders (pnpm 11.28.0, eslint-config 0.54.0) and the 401-semantics half wants the deployment sequencing decision in the same window — give it a dedicated cycle, not the tail of this one |
| rm-249 (72.0) push-only SW substrate | Still gated on the rm-106 product decision that deferred it on 2026-09-23; this run's research added standards grounding (PNG icons, rotation ownership) but nothing changed the decision state — carrying it without the decision would rebuild the product on an unowned substrate |
| rm-274 (30.0) pwa/ residue | Its keep-or-remove decision rides rm-249's substrate decision by its own acceptance |
| rm-271 in-range trio (hono 4.13.11 etc.) | rm-137's standing acceptance hands npm minors to the ~2026-10-03 dependabot window; rm-271's rider clause defers to that disposition rather than racing it (noted here so the rider clause is not read as this-cycle authority) |
| rm-271 majors (vitest 5 / jsdom 30 / pnpm 12 / impeccable@4) | Their own acceptance requires one evaluation window per major, no bundled mega-PR — cycle-20+ material |
| rm-116 (58.0) protection fill | Live-settings op whose cycle-10 fill demonstrably did not persist (re-probed empty 2026-09-29); needs a stewardship turn with re-read verification, not an implement unit |
| rm-102 (90.0) / rm-103 (85.0) | Evidence-gated on the first dependabot PR ~2026-10-03; absorb automation (rm-103) additionally gates on rm-102's evidence |
| rm-139 (24.0) Node 26 window | Time-gated 2026-10-28 by its own status (dated rider already records the live platform facts) |
| rm-106 / rm-250 / rm-247 | Upstream-trigger-missing / deployed-gateway-gated respectively — no local end-to-end path |
| rm-114 / rm-220 parser single-sourcing + watchdog | rm-253's window; must start from the landed rm-261 abort sites, and belongs with the contract-forward-support cycle |

## Watchlist

- Dependabot's first npm minors ~2026-10-03 (rm-102/rm-137 window) may touch
  `package.json`/pnpm-lock — zero overlap with this batch's files
  (`web/src/**`, `src/logger.ts`, `README.md`, `docs/contracts/**`).
- Any gateway deployment to ≥v0.115.0 trips the mirror brick chain — that is
  rm-252's trigger and advances the cycle-20 lead, not this batch.
- Open-PR surface: re-verify at implement dispatch that no feature PR touches this
  batch's paths (last full check was cycle-18's; conductor ephemerals only then).
- rm-208 lands here on its third carry — if B2 slips again the ledger should record
  WHY (surface collision), not just re-defer.

## Landing notes (implement, 2026-09-29)

All four units landed in one pass at base 163ff116. B1: `subscribe.ts` sweep +
unsubscribe local reads bounded (`localReadTimeoutMs`, default 5s via
`withTimeout`), ready-timeout classified permanent `sw-unavailable` via a
`getSwRegistration` probe; copy + `Notifications.tsx` consumers updated.
B2: `unauthenticated` reason for 401 in both fetchers, auth-expired panels in
`Listener.tsx`/`Monitoring.tsx`, App badge poll torn down + badge cleared +
stale-marking (`App.tsx`/`AppShell.tsx`) — rm-208's acceptance satisfied, third
 carry cleared. B3: README + contract doc trued (no behavior change). B4:
`src/logger.ts` routing trued (info/debug → `console.info`; stderr reserved for
warning/error) — decision recorded in the rm-260 rider. Verification: 644/644
across the 10 impacted web suites (`vitest run --config web/vitest.config.ts`
over push/api/views/App/AppShell/notifications-copy), 153/153 across the two
logger-importing server suites, plus the subscribe.ts syntax repair noted below.
Re-fire defect worth recording: the interrupted first implement attempt left
`Promise<MinimalServiceWorkerRegistration | undefined}` (brace, not `>`) at
subscribe.ts:287 — Node's amaro tolerated it but the web `react-swc` pipeline
rejected the file, breaking 3 suites at load; caught by parse-bisect and fixed
before any test run this turn.
Full-suite rider (full_tests phase, same day): CI's first validator pass caught
ONE type error the implement battery never could — `subscribe.ts(308)` returned
the DOM `ServiceWorkerRegistration` where the structural
`MinimalServiceWorkerRegistration` was declared (DOM/minimal `PushManager`
members differ; fixed with the house `as unknown as` boundary cast; tsc -p
web/tsconfig.json then green locally, all 3 check-types passes green). The same
phase mirrored the landed rm-13640 lint-timeout rider (20→35 min) onto this
tree — byte-identical to origin/main — so cold eslint survives the validator's
poll window. Final: ephemeral PR #268, 10/10 checks SUCCESS, ok:true.

## Cycle-19 outcomes (compound, 2026-09-29)

Recorded by run 5e7cb89f compound aa34e393 from pre-review cycle evidence
(implement 075c2ae5, targeted_tests 6b5f3ec7, full_tests 206a418e); no tests
re-run in this phase by mandate — every count below is the recorded outcome.

- **B1 rm-272** — the reconcile sweep's local-subscription read is bounded
  (`DEFAULT_LOCAL_READ_TIMEOUT_MS` behind an injectable `localReadTimeoutMs`
  dep); a never-settling read now resolves as no-local-subscription and
  derives to the conservative action `none`; subscribeOptIn probes the
  registration to classify the permanent case as a new `sw-unavailable`
  outcome whose copy says reload/reinstall instead of "initializing"
  (subscribe.test.ts + notifications-copy.test.ts pin both paths).
- **B2 rm-208 + rm-273** — `'unauthenticated'` joins the fetch-error reason
  unions (mapped from 401 in web/src/api/listener.ts + monitoring.ts), both
  views render a sign-in affordance instead of network-retry copy, and the App
  badge poll stops on unauthenticated, clears the platform badge, and marks
  the rendered count stale (title + aria, last-good timestamp) after a
  two-failure streak (listener/monitoring/Listener/Monitoring/App suites pin
  it; monitoring.test.ts is new).
- **B3 rm-275** — README's rate-limit row names the exact sensitive-path gate
  (`/`, `/auth/login`, `/auth/callback`) and records that the other `/auth/*`
  paths sit outside the limiter by design; the listener contract doc's
  messages example carries `prunedCount` with rm-244 semantics.
- **B4 rm-260** — logger routing trued to reality: `info`/`debug` route to
  `console.info` (stdout) while `warn`/`error` stay on stderr, with the
  decision recorded at the site; no listener/ingest error surfacing changed.
- **Gates** — targeted web 644/644 across 10 impacted suites; targeted server
  243/243 and 237/237 (impacted runner over the logger-importing suites);
  `eslint src/logger.ts` clean (the one web-lint gap is pre-existing policy:
  eslint.config.ts globally ignores `web/**`); full_tests 206a418e ephemeral-CI
  10/10 checks green (`ok:true`) on this exact tree, prior green a38cdc74
  (PR #268) tree-identical; ROADMAP ids rm-272/rm-273/rm-275/rm-260/rm-208
  flipped to `status: implemented`.
- **Durable lessons landed** —
  `docs/solutions/workflow-issues/amaro-strip-types-accepts-swc-rejects-refire-syntax-bisect-2026-09-29.md`
  (re-fire syntax defects that pass the strip-types `--check` but break the
  swc pipeline, and the parseSync bisection recipe) and
  `docs/solutions/workflow-issues/full-tests-digest-stale-after-executable-edits-2026-09-29.md`
  (the full_tests digest is emission-tree-bound; post-dispatch executable
  edits invalidate the dispatch digest and force a re-fire).

Next-cycle leads (carried, not started): rm-252 + rm-253 are the named
cycle-20 lead (gateway contract forward-support + the dead-twin wire-or-fold
in one window); rm-274 rides rm-249's product decision; rm-271's majors each
get their own window and its in-range refresh trio defers to rm-137's
~2026-10-03 dependabot disposition; rm-102's first-PR evidence lands
~2026-10-03. Landing note: origin/main has advanced past this batch's base
(65f05db, run 995ad0e1's lint-timeout rider integration) — this worktree's
`.github/workflows/main.yaml` mirror is byte-identical to origin/main (empty
diff), so that rider merges as a no-op.
