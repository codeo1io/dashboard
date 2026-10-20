# Repository maintenance cycle 3 — compound (run `f376b0191629`)

## Run

- Base `64cd2f6a` == `origin/main` at run start. Cycle lineage: assess `51bbda58` → research `6680c011` → roadmap `3b40af6e` (mints `rm-1960`/`rm-1961` + riders; prior roadmap attempt `73a92280` died to a provider-family reap with zero durable artifacts and was redone from scratch) → prioritize `5e8baf2c` → stewardship `35ff8d43` → implement `f2b83e7d` (fold-rejected once for a missing attestation; verified-and-attested by `f7b596c6`) → targeted_tests (reaped `d036adbd`, forensically adjudicated and redone as `b302af3a`) → full_tests (reaped, redone as `fa2b936c`) → this compound `aeb5216b`.
- Selected batch: "deliverability + observability revival" — 3 legs, zero sibling-claim collisions (fog map honored throughout).
- Candidate delta: 20 surfaces uncommitted at base (the implement result + two validation cures absorbed below).

## Legs

1. `rm-1960` PWA update-path repair (reliability 91.0) — the service worker activated only on a `SKIP_WAITING` message that no production code ever posted, pinning installed clients to a stale shell across deploys. Executed via the recorded autoUpdate decision: `registerType: 'autoUpdate'` in `web/vite.config.ts`, top-level `self.skipWaiting()` + activate-handler `clients.claim()` in `web/src/sw.ts`. New guard `test/sw-auto-update-guard.test.ts` (8 tests, proven RED at base 6/8 before implementation). The dead `ReloadPrompt` surface retired in full (component, test, `virtual-pwa-register` mock, vitest alias, AppShell mount, App.test case).
2. `rm-1961` schedule-darkness fallback triggers (reliability 71.0) — the shared Actions scheduler missed every Monday cron the week of 2026-10-12 (zero runs repo-wide Oct 11–14) and canary is 0-for-2 lifetime. Landed: `workflow_run` on Main completion + a `fallback-gate` job with a 6-day recency dedupe (off-main fallback fires skipped; scheduled/manual always pass) on `canary.yaml`, `audit.yaml`, `base-drift.yaml`; `actions: read` added to audit/base-drift for the gate's `gh run list`.
3. `rm-274` + `rm-249` truthing — the four kill-switch fiction sites trued (README client bullet, vite.config comments, ReloadPrompt, static-assets comment) with a *real* `registerSW.js` emission assertion added; `rm-249` acceptance moved onto the post-2026.10.43 Workbox reality.

## Validation

- Full-suite (work-order `full_command`, engine `github_ci_validate.py`, routed to ephemeral GitHub CI): PASSED — PR #971, Main run 39119346319 (Test job: 76 files, 3619 passed + 1 skipped; web: 38 files, 1652 passed), visual 39119346470, Dependency Review 39119346322, all on branch `conductor/ci-7e50eca49999`. Digest `validation:v1:a0014cdd…` re-derived pre-launch and post-run, identical.
- Two validation-time reds were diagnosed and cured by byte-exact main-absorption (both folds are 0-diff vs `origin/main`, hence merge-neutral):
  - visual 3294-vs-3410 (PR #914, run 39085013742): the dark-operator snapshot renders live wall-clock against fixture dates frozen at 2026-06-19T06:33:06Z with no spec-level clock pin, so old-base trees go red purely from elapsed time; `origin/main` landing `7742e11` (2026-10-17) rebaselined to 1280x3410. Cure: absorb `tests/visual/dashboard.spec.ts` + the snapshot (our render was byte-identical to main's baseline, md5 `56b8f398…`).
  - `should-release.test.ts:292` reverse-parity (run 39100497500): the validator grafts current-main `.github/workflows` over the base tree, so main's `release.yaml` `gzip-static-sidecars.ts` path entries red against base's unpaired `scripts/release-paths.ts` corpus. Cure: absorb both files from `origin/main`.
- Both cures are recorded as fleet constraints in conductor memory; the visual one now also has main's own solution doc (`docs/solutions/workflow-issues/playwright-caret-lock-desync-visual-baseline-stale-2026-10-16.md`).

## Lessons

- A guard suite can enforce a bug: `web/src/sw.test.ts` pinned the dead prompt-gated activation (asserted `clients.claim` *absent* and `skipWaiting` never called at startup). When implementation contradicts tests, audit which side owns the contract before "fixing" either.
- Fiction compounds: the false "registerSW.js is NOT emitted" comment survived because it was prose, not an assertion — every doc claim about build output wants an executable check or it rots (rm-274's new assertion is the pattern).
- Dated-baseline + live-clock is a standing trap for old-base validation: expect the visual suite to go red on any base >N days old regardless of the delta; the cure is absorb-main-rebaseline, never a local regen (a local regen bakes today's clock into the delta).
- Two KTD-class fold rejections in this lineage (missing `changed_surfaces` attestation; a reaped attempt's unverifiable validator claims) were cured by verify-and-attest-only redos — never re-implement, always prove live GitHub refs before declaring them.

## Next-cycle candidates (pre-review evidence only)

- Toolchain currency wave (research `6680c011` C3): TS 6.0.3→7.0.2, vitest 4.1.11→5.0.5, pnpm 11.28.5→12.14.0 — all gates green on current pins; stage pnpm last (lockfile-class risk already bit the canary once).
- Node v26 / digest decision window opens 2026-10-28 (nodejs/Release: v24 maintenance entry 2026-10-20, support to 2028-04-30); base-drift is the digest guard and rides this cycle's fallback trigger.
- Post-landing observations owed: first canary fallback fire (first non-cron attempt ever — verifies the frozen-install cure and closes `rm-288`'s gap) and the Monday 2026-10-19 03:37–07:23Z scheduler window.
- Sibling-claimed lanes that may orphan: fro-bot.yaml FRO_BOT_PAT gate restoration (fog rm-1518, cure bytes preserved in the roadmap tail orphan rider), runner-pin/timeout re-hardening (fog rm-1520), #646 markdown absorb (fog rm-1513, supply-chain evidence recorded in research `6680c011`), darkness-watch pagination (fog rm-1956).
- Durable fog note: this lineage minted `rm-1960`/`rm-1961` above the prior all-lineage frontier (fog rm-1958); the next mint anywhere must re-probe all four fog sources (live main defs, sibling worktree walls, spool def-max, postimage ceilings) before choosing ids.
