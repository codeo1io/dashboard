# Repository-maintenance cycle 6 — roadmap extension (run f59e69361b38)

- date: 2026-10-21 · conductor run `f59e69361b384177b987c9cb823cfe46` · roadmap attempt
  `6bccbf7096f440d6b608b5315fb9e9b6` · base `76005aa` == origin/main
- inputs: this run's assess (battery green at `76005aa` first-run: check-types rc=0,
  lint rc=0, test rc=0 — 89/3929 root + 41/1852 web; census 325 defs / 0 dups /
  max rm-2032) and research `e1a5492b` (upstream window 31→32 via exactly PR #696;
  live npm + action registry sweeps; live OpenSSF Scorecard fetch).

## Deliverables

- `ROADMAP.md` — extension #58: 4 mint defs (rm-2142..rm-2145) + 5 riders + the
  extension comment.

## Mints

- `rm-2142` (reliability 50.0, candidate) — `web/src/sw.ts:84` runs
  `cleanupOutdatedCaches()` at module top level, i.e. while the new worker is still
  installing: it deletes the precache the still-controlling old worker serves from, so
  a failed install strands controlled tabs with no offline shell. Cure: activate-phase
  placement + a placement-pinning test. Lineage: the recorded-decision lanes rm-138
  (deny-by-default precache router) and rm-1960 (autoUpdate) are not relitigated.
- `rm-2143` (platform 30.0, candidate) — `web/index.html:8` points
  `apple-touch-icon` at `/icon-192.svg` and `web/public` holds no PNG at all; iOS
  Safari requires PNG, so Add to Home Screen renders a degraded tile. Lineage
  reconciled against the superseded rm-249 rider and the rm-1466 build-icons emission
  claim (`assets-src` does not exist at `76005aa` — find, first-hand).
- `rm-2144` (platform 52.0, candidate) — secret-scanning alerts as the third
  optional+graceful security surface: `secret_scanning_alerts: read` joins
  `OPTIONAL_READ_PERMISSIONS` (`src/github/installations.ts:41-46`) with the same
  core-only retry seam as vulnerabilityAlerts (`src/github/aggregator.ts:754`);
  REST endpoint verified in the installed `@octokit/types` generated surface.
  Succeeds the superseded rm-117 panel lane; read-only-by-construction preserved.
- `rm-2145` (reliability 28.0, candidate) — `scorecard.yaml` is the only workflow of
  13 with zero `timeout-minutes` (the 2026.10.43 adoption revert was never restored
  here). Cure: `timeout-minutes: 20` + a `workflow-hardening-guard` pin so no future
  absorb silently drops it. A fog lineage claimed the restoration — reconcile by
  title at integrate, never by id.

## Riders

- `rm-252` — window truth at `76005aa`: 32 behind upstream `f37600d3`; exactly one
  new commit since the 2026-10-20 map (PR #696, agent v0.125.0, fro-bot.yaml pin
  `e59939d`→`c8a3ad5`, workflow-only); v0.125.0 still latest; zero open upstream PRs;
  release 2026.10.59 — no new absorb surface.
- `rm-147` — blocked-external re-verified: upstream license still null (live
  2026-10-21); scorecard License 0 on the 2026-10-20 analysis.
- `rm-1451` — action currency 2026-10-21: qemu v4.4.0 hold stands (release.yaml:194
  at v3.7.0); setup-node straggler persists; docker-org `releases/latest` quirk
  healed; codeql `releases`-LIST rule stands (v4.39.0 current); all other pins
  current.
- `rm-139` — Node v26.12.0 (2026-10-14) still `lts=false` (live read); the
  2026-10-27/28 LTS-turn gate stands; `@types/node` 26.6.5 rides.
- `rm-143` — live scorecard 7.7 (analysis 2026-10-20): Code-Review 0 (0/21 approved
  changesets — conductor landing model, by-design until the rm-1464 ruleset fill);
  SAST 9 and CI-Tests 9 rows belong in the sub-8 disclosure table; Maintained 0
  self-heals ~2026-11-08.

## Screening (no mints)

Scorecard posture disclosure owned live by rm-143 (rider only). Toolchain majors stay
majors-lane owned (TS 7.0.2 peer-blocked; vite-plugin-pwa 2.0.0, vitest 5.0.5, jsdom
30.1.3, jest-dom 7.0.1, @types/node 26.6.5). react 19.3.1 / vite 8.3.4 npm-latest;
hono 4.13.13 caret-covered in bun.lock. Playwright 1.64.1 churn forbidden.
Trivy v0.76.0, actions/cache v6.1.0, the web-test-only release skip, integrity-guard
hardening and impeccable 4.7.0 are unlanded-sibling-claimed by title — first-landed
wins, never re-minted.

## Census

After this extension: 329 defs / 0 dups / max rm-2145 (next free rm-2146; rm-2140
and rm-2141 stay reserved by sibling fog bands — dependabot-darkness and the
release-docs row — never cited by id). Guards at compose: census green, ledger-check
rc=1 unchanged at the two known PROVEN-STALE claims, integrity/length/render/prose
guards green, eslint on ROADMAP.md green.
