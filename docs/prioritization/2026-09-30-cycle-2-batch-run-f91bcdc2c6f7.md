# Dashboard maintenance — cycle 2 batch, run f91bcdc2c6f7 (2026-09-30)

module: dashboard
tags:
  - reliability
  - ci
  - workflows
  - dependencies
  - maintenance
problem_type: batch-record

Frame: `31995a2` (run `f91bcdc2c6f74c30a3acc7b125c1d791`, repository-maintenance
cycle 2; origin/main re-probed 17:02Z still `31995a2`, floors still stale, 2
dependabot alerts still open). Selected by prioritize attempt
`fb4765cc8f7f4c3f9f47e162d62f8afa` (the prior attempt died in an ENOSPC
envelope failure leaving zero durable product — spool probe found no
`fb4765cc*` artifact and the worktree carried only this run's roadmap delta —
so this selection is authored fresh, consuming this run's assess `01dc5635`,
research `aab50a73`, and roadmap `55572ba1` artifacts; every file:line claim
below re-derived at base 31995a2 this attempt).

## The cycle's mandate

Three reliability-track items, one theme: **make the Main pipeline truthful and
self-maintaining under the hosted-compute epoch — end the Lint flake that is
cancelling most Main runs, stop the validation-draft residue class from
regenerating faster than manual sweeps, and make dependency-advisory drift
visible in every Main run log.** All three are workflow-level: zero `src/`
surface, no external sequencing (no gateway deploy, no upstream release, no
owner-API call), and all evidence is already on disk from this run's
assess/research phases.

### Selection screen (impact / risk / effort / dependencies / strategic)

- **B1 = rm-294 (46.0), shard cold Lint** — HIGHEST cycle leverage: Main Lint
  is flaky-under-ceiling, not reliably green (15:05Z census: 8/8 recent Main
  runs cancelled incl main-push 36692888877; 17:02Z: 3 of the last 5
  validation-PR runs cancelled at the rider, 2 green) / LOW-MED risk
  (workflow-only, must keep flat-config resolution identical and coverage
  exact) / MED effort / no deps / strategic: unblocks rm-116 (branch
  protection cannot enforce a flaky check) and every future validation run.
- **B2 = rm-295 (44.0), validation-residue janitor** — MED-HIGH impact (23
  open PRs of which 21 are Conductor CI validation drafts at 17:02Z; the
  empty-shell protection makes accidental merge unblocked; they bury the two
  legitimate dependabot PRs #288/#289) / MED risk (must provably never touch a
  live validator's PR — guarded by title + draft + age bound) / MED effort /
  no deps / strategic: converts rm-159's manual sweep into prevention.
- **B3 = rm-293 (48.0), CI advisory-drift gate, advisory mode** — MED impact
  (advisory drift on unchanged resolves is invisible to every gate today; the
  two HIGH fast-uri alerts sat open with no red check anywhere) / LOW risk
  (advisory = logged, non-failing, safe at today's 19-advisory baseline) /
  SMALL effort / no hard deps / strategic: the enforcement flip becomes a
  recorded decision on a green baseline.
- **Not selected — the supply-chain floor class (rm-291/rm-292 content)**:
  oversubscribed across FOUR lineages (rm-276/277 in run afab8dbb's tree and
  run d997d9a88aad's, rm-286/287 in run 0a6430c9's, rm-291/292 here); sibling
  run 0a6430c9's cycle-1 batch owns it with a complete verified recipe and is
  furthest along (its validation run 36745792065 went green 16:39Z on
  `conductor/ci-a5b8c4bb01f9`; floors still unlanded at 31995a2). A parallel
  implementation here would double-land a 4-line floor change and collide at
  integrate — reconcile by content, landed meanings win. No file overlap
  between that batch and this one.

## B1 — rm-294: shard the cold repo-wide Lint (headline)

- **Change.** `.github/workflows/main.yaml` Lint job (job at :26, rider
  comment :33-35, `timeout-minutes: 35` at :36, `run: pnpm lint` at :51)
  becomes a matrix over file classes (server `src`+`test`+`scripts`+`.opencode`,
  `web`, markdown/docs, root config + workflows), each shard running an
  explicit `eslint` file list or the `--stdin --stdin-filename` instrument
  with identical flat-config resolution (`eslint.config.ts`), each with its
  own rider-sized `timeout-minutes` from measured cold duration. True the
  :33-35 comment (still says "20 min") to the values it documents. The
  `--cache --cache-location node_modules/.cache/eslint/` flag
  (package.json:15) is useless on hosted runners (cache never persists) — the
  standing disposition is shard the work, never lift the rider.
- **Gate.** A coverage assertion that the union of shard file lists equals the
  repo lint set (from `git ls-files`) — no file linted zero times or twice;
  actionlint container-form clean; each shard's cold duration measured
  locally well under its rider (ROADMAP.md-class markdown shards may exceed
  local delegate-host budgets — timebox and record per the stdin-instrument
  constraint, CI is the authority); `yml` plugin single-quote rule holds.
- **Watch-out.** The engine's validation clone REPLACES `.github/workflows`
  with origin/main's, so this batch's own validation PR still runs the OLD
  unsharded Lint — a cancelled-Lint validation is an epoch flake, not a batch
  defect; the cure's proof (green sharded Lint with per-shard durations) is
  the post-landing Main run.

## B2 — rm-295: scheduled validation-residue janitor (extends rm-159)

- **Change.** New scoped scheduled workflow (pattern precedent:
  `.github/workflows/base-drift.yaml` — `cron: '13 4 * * 1'`, off the hour,
  least-privilege permissions; add `pull-requests: write` for close-only),
  closing ONLY PRs matching ALL of: title starts `Conductor CI validation`,
  is draft, older than a stated bound (48h — far beyond any live validator's
  lifetime), head ref `conductor/ci-*`. Close-only: the janitor never deletes
  refs and never touches PRs outside its title+age set (ref deletion stays
  with push-authorized phases per rm-159).
- **Gate.** Dry-run mode default: the first landed run logs the would-close
  set against the live PR list (must be exactly the stale-titled drafts,
  21 at 17:02Z); the close pass lands as its own follow-up decision once the
  dry-run set is reviewed; an in-flight validator's PR provably stays open.
- **Watch-out.** The engine-side per-run manifest rider in rm-295's
  acceptance is out of repo scope — the janitor half alone satisfies the
  EITHER/OR acceptance; record the manifest half as engine follow-up.

## B3 — rm-293: advisory-mode `pnpm audit` step in Main (rides B1's file)

- **Change.** A Main-workflow step after install runs
  `pnpm audit --recursive` in ADVISORY mode (logged, non-failing,
  `continue-on-error` or exit-code-tolerant capture) — landed after B1 so
  both main.yaml edits land as one coherent diff. Distinguished from sibling
  claims rm-278 (run d997d9a88aad; enforcing, strictly sequenced after floors)
  and rm-281 (run fe15f967; prod-scope hard-fail): advisory-first is the only
  variant landable NOW, before the supply-chain batch closes the 19-advisory
  baseline; the enforcement flip stays a separate recorded decision and never
  lands while the baseline is red.
- **Gate.** Step visible in a green Main run log with the advisory census
  line (today: 19 advisories, 3 low / 8 mod / 8 high, all dev/build-transitive
  — expected to read 0 once rm-291's floors land); actionlint clean.
- **Watch-out.** Never `set -e`-fail on the audit exit code in this cycle;
  the step name must state advisory mode so a red future run means the
  recorded flip, not flake.

## Deferred, with reasons

- **rm-291 / rm-292** (floors + dependabot security updates): in-flight as
  sibling 0a6430c9's cycle-1 batch B1/B2 — see the not-selected note above.
- **rm-116** (fill branch protection with required checks): sequenced BEHIND
  B1 by its own logic — enforcing a check that cancels 3-of-5 runs would jam
  every landing; this batch is its unblocker, next cycle's headliner.
- **rm-296** (Dockerfile HEALTHCHECK): small but off-theme and needs
  docker-build+run drain evidence — different verification harness than this
  workflow-level batch.
- **rm-289 / rm-290** (PR-233 U3 rate-limit key cap + U5 GATEWAY_* env-docs
  census, sibling 0a6430c9's numbering): pre-announced by that run's cycle-1
  doc as its next-cycle headliners; taking them here would double code
  surface for mid-pack value and collide with their pre-specified acceptance.
- **assess F4** (listener store prune-on-read): low severity, write-quiet
  inbox staleness only; below the batch cut line.
- **rm-252** (14-commit upstream absorb): pure dep chores, unmoved window
  (research aab50a73 re-verified); low marginal value vs conflict risk.

## Verification recipe (implement phase)

1. B1 first: shard main.yaml's Lint, add the coverage assertion, measure each
   shard cold (timeboxed; record durations), true the :33-35 comment,
   actionlint container-form.
2. B2: new janitor workflow in dry-run default, actionlint + `yml/quotes`,
   run its selection logic against the live PR list and record the dry-run
   set (expect exactly the stale validation drafts).
3. B3 last: advisory audit step into the same main.yaml, advisory census line
   captured from a local `pnpm audit --recursive` run.
4. Leave the tree with: `.github/workflows/main.yaml`, the new janitor
   workflow, any shard-list/coverage script, this doc, and the run's
   ROADMAP.md delta — nothing else.

## Implementation record (2026-09-30 → 2026-10-01, implement d964b577)

- **Shard engine**: `scripts/lint-shards.ts` (new, Node-24 native TS) — single
  source of truth for the shard map, per-shard riders, and the exact-coverage
  assertion. The lint set is DERIVED, never mirrored: tracked files from
  `git ls-files`, filtered through the loaded flat config via
  `calculateConfigForFile` and `isPathIgnored`. Cold assert at base 31995a2:
  186 files = 45 + 50 + 56 + 1 + 27 + 7; union exact, no overlaps, no empty
  shards; assert itself runs in ~7 s.
- **Six shards, not five**: measurement split `markdown` — ROADMAP.md alone
  exceeds ~15 min cold on the delegate host (rm-103 paragraph cliff; the
  sibling cure has not landed at this base), so it is isolated as
  `markdown-roadmap` (rider 25 m) while `markdown-docs` (56 files) rides 20 m.
  Riders: server-src 15, server-test 15, markdown-docs 20, markdown-roadmap
  25, github-config 10, tooling-ts 10.
- **Main workflow**: new `lint-plan` job (coverage assert + matrix emit, rider
  10 m) feeding a `lint` matrix (`Lint (<shard>)` names, `fail-fast: false`,
  `timeout-minutes` taken from the matrix). rm-13640's fixed 35-min whole-job
  rider is superseded — the supersession is documented in place. `TIMING=1`
  was dropped with the CLI: it is inert under the API-based runner, which
  prints per-shard duration itself.
- **Audit (rm-293)**: parallel `audit` job, advisory `pnpm audit --recursive`
  under `continue-on-error` — the census is logged into every green Main run.
  Live local probe: 19 advisories (3 low, 8 moderate, 8 high), rc=1.
- **Janitor (rm-295)**: `.github/workflows/conductor-validation-janitor.yaml`
  (new) — daily 04:23 UTC plus manual dispatch, dry-run by default, close-only
  (never deletes refs). Live selection probe 2026-10-01: 23 open PRs, 12
  stale validation drafts matched (2026-09-23 → 09-25 vintage); the
  batch-landing and Dependabot PRs were correctly untouched.
- **Verification**: eslint rc=0 on all three touched files; `pnpm check-types`
  rc=0; actionlint 1.7.12 container rc=0 over both workflows (including the
  `fromJSON` matrix and the expression `timeout-minutes`); 7 impacted guard
  suites → 201 tests green; shards server-src, server-test, github-config,
  tooling-ts green cold; `assert` and `plan` rc=0.
- **Discovered landing hazard — surfaced, deliberately NOT absorbed** (both
  files are outside this batch's sanctioned file-set): the exact-coverage
  shard exposes 12 pre-existing markdown lint errors on main@31995a2 that the
  35-min-timeout monolith has been masking. Eleven are
  `@stylistic/no-trailing-spaces` in
  `docs/archive/pr-233-unlanded-cycle-18-2026-09-30.md` — that file is
  sha256-pinned by the rm-217 disposition, so stripping its whitespace breaks
  the integrity pin (needs a ledger decision: eslint-ignore with a pin
  reference, or unpin and fix). One is `markdown/no-missing-label-refs` at
  `docs/prioritization/2026-09-29-cycle-19-batch.md:4` — the one-line
  backtick-wrap cure is already sitting in sibling run-c06f7bf3d796's dirty
  tree, so fleet-collision discipline says do not duplicate it here (a
  stdin-instrument run of the cured content lints clean). No completed lint
  has ever run on current main content — the 2026-09-30 green Main runs were
  validation PRs built on pre-eb9ed3f frames — so these defects are real and
  merely invisible. Until the sibling cure lands and the archive pin gets its
  ledger decision, the `markdown-docs` shard reports them red — which is the
  truthful-pipeline goal working as designed.

## Verification addendum (2026-10-01, implement c8659f78 — adoption of salvaged attempt d964b577)

Prior-attempt forensics: attempt d964b577 landed the full batch host
2026-09-30 19:2x–20:18Z and wrote the record above, then died provider-side
before its envelope; the re-fire 55c6947e (host 2026-10-01 00:42–00:52Z)
landed nothing (its only scratch artifact is a failed `/usr/bin/time` probe).
No typed PhaseResult exists from either, so every claim in the record above
was re-verified first-hand against the tree, then adopted:

- Coverage contract: `node scripts/lint-shards.ts assert` rc=0 — 186 tracked
  files = 45+50+56+1+27+7, union exact, no overlaps; `plan` emits pure JSON.
- Cold shard runs (local, sequential): server-src 25s / server-test 59s /
  github-config 7.5s / tooling-ts 11.6s green — server-test closes the empty
  `cold-server-test2.out` gap the dead attempt left. markdown-docs 4.2s with
  exactly the 12 pre-existing problems (truthful red, see record above).
  markdown-roadmap not locally runnable (the >900s cliff); CI is authority.
- eslint rc=0 on all four touched files (both workflows, shard script, this
  doc); `pnpm check-types` rc=0; actionlint container 1.7.12 rc=0 over all
  workflows (matrix `fromJSON` + per-shard `timeout-minutes` expression pass).
- Focused tests, 201 green: the six workflow-reading guard suites
  (base-drift-digest-readback, fork-exclusion-guard, prose-residue-guard,
  release-trigger-paths, should-release, visual-gate-paths) = 97 tests, plus
  operator-contract-conformance = 104.
- Audit census re-run: 19 advisories (3 low / 8 moderate / 8 high), rc=1 —
  matches the workflow comment.
- Janitor selection re-probed live 2026-10-01T01:47Z: 24 open PRs, 21
  validation drafts, 12 matched stale — the identical set the dead attempt
  found; every draft younger than 48 h unmatched.
- Fleet re-derivation (this moved under the dead attempt): the cycle-19
  label-ref half of the docs-lint debt is already cured on origin/main
  5bf15e1 (run c06f7bf3d796 landing 6b39be0); the 11 trailing spaces are
  still on main and are owned + fixed in-flight by sibling run-5bf98ac3's
  rm-310 — not-absorbed stands, now grounded in current refs rather than the
  gone run-c06f7bf3d796 worktree.
- Ledger riders recording all three items' landing state were appended to
  ROADMAP.md (rm-293 / rm-294 / rm-295, dated 2026-10-01); the added-lines
  eslint instrument over the ROADMAP diff is rc=0 (52 added lines, longest
  1639 chars).
