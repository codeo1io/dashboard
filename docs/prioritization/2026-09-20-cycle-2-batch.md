---
date: 2026-09-20
topic: dashboard maintenance cycle 2 — scoring and batch selection
mode: delegated-conductor
run: 54fa71a37878477a901aed4eaae3a87e
phase: prioritize
attempt: 4f62e5d21a9d453ca0f3d29f3e30277c
skill: ce-plan (scoring/batch selection — lineage precedent from cycle 1; no dedicated ce-prioritize skill in the installed router). Deviations declared: no subagent surface in this session, research/flow frames run in-process and disclosed (convention #3768); interactive gates replaced by autonomous adjudication per work order. Numbering: engine labels this run `cycle:1`; repo lineage continues from `docs/prioritization/2026-09-19-cycle-1-batch.md` → this is **cycle 2** (discrepancy disclosed per fleet convention).
---

# Dashboard maintenance — cycle 2 batch (2026-09-20)

## Live frame facts (re-measured this cycle, not carried stale)

- Fork tip `2f3a884` == `origin/main` == worktree HEAD; `git fetch origin` + `git log origin/main -3` (2026-09-20, this phase). No new commits since assess.
- Main workflow red at `2f3a884` AND `5b8a2b3` (Check Workflows from PR #4's `5b8a2b3`/head `b2ef125`; Lint from `2f3a884`); last green Main at `c737026`.
- CodeQL red at `2f3a884` (run 18805981102: `Cannot find module 'typescript'` in autobuild — the run-333ad19e fix never landed).
- Release last green at `fc7b834` (2026-09-19T04:15Z); the three newer commits correctly skip it (`scripts/should-release.ts` hard paths are src/web/public/Dockerfile/release.yaml; these commits touched workflows/docs — verified in assess).
- No open PRs; upstream `autonomy-upstream/main` 4 commits ahead with absorbable surface = 2 files (Dockerfile digest `0e0ff40` == live registry digest today; hono 4.13.8 lockfile).
- Staged payloads pending the cycle's commit/push gate: `ROADMAP.md` (rewrite, lint-green: `eslint ROADMAP.md` exit 0), `docs/ideation/2026-09-19-repository-extensions-ideation.md` (2026-09-20 update).
- Recurrence mechanics confirmed: cycle 1's ROADMAP rewrite landed (via `fc7b834`/`3075f4a` lineage), then the 2026-09-20 fleet render (`2f3a884`) **re-emitted** rm-002's bare array at a new line (20:32). The generator is the recurring source; in-repo rewrites are temporary by construction.

## Five-axis scoring (1–5; Effort 5 = cheapest; Dep-free 5 = no external landing dependency)

| Ref | Item | Impact | Delay | Effort | Dep-free | Strategic | Total | Standing |
|-----|------|--------|-------|--------|----------|-----------|-------|----------|
| rm-112 | fro-bot.yaml job-env gating (+ ROADMAP lint half already staged) | 5 | 5 | 5 | 5 | 5 | 25 | **SELECTED** |
| rm-113 | codeql.yaml deps-install before init (posture b) | 5 | 5 | 4 | 4 | 5 | 23 | **SELECTED** |
| rm-111 | Dockerfile digest `0e0ff40` + retire libpcre2 patch (+ hono rider) | 4 | 4 | 5 | 4 | 4 | 21 | **SELECTED** |
| rm-110 | checkSuites pagination + >10-suite fixture | 3 | 3 | 5 | 5 | 3 | 19 | **SELECTED (rider)** |
| rm-116 | required status checks on origin/main | 4 | 4 | 5 | 2 | 4 | 19 | held — needs settings authority + operator sign-off (advisory to land phase) |
| rm-103 | upstream-absorb cadence automation | 4 | 4 | 3 | 3 | 5 | 19 | gated on Main green (next cycle head) |
| rm-105 | SBOM attestation + provenance mode=max | 3 | 3 | 3 | 4 | 4 | 17 | gated: don't touch green Release mid-restore |
| rm-117 | major-upgrade watchlist section | 2 | 2 | 5 | 5 | 2 | 16 | fold into next fleet sync; not batch work |
| rm-115 | partial-enumeration degradation surfacing | 4 | 3 | 3 | 3 | 3 | 16 | gated on product pass (DTO semantics vs staleBanner) |
| assess-F9 | SIGTERM graceful shutdown | 2 | 2 | 4 | 5 | 2 | 15 | below batch floor (code hygiene) |
| assess-F7 | per-repo dead cache fix-or-remove | 2 | 2 | 4 | 5 | 2 | 15 | below batch floor (code hygiene) |
| rm-107 | operator status panel | 3 | 2 | 3 | 4 | 3 | 15 | needs plan phase (experience track) |
| rm-106 | listener digest push | 3 | 2 | 2 | 3 | 3 | 13 | needs plan phase + push privacy policy (upstream #238) |

Standing rules applied: reliability pillar (gates before features), end-to-end completability this cycle (tree changes + gate proofs at the exact pushed sha), no green-pipeline blast radius mid-restore, single-runner serialization budget (batch adds exactly one Main + one CodeQL + one Release run).

## Selected batch — cycle 2 fix restore (4 items + doc riders)

1. **rm-112 — Main gate: fro-bot.yaml secrets-in-if.** Replace the job-level `if: secrets.FRO_BOT_PAT` (fro-bot.yaml:259-268, actionlint error `266:47`) with the job-env pattern already proven in release.yaml:129,366-368 (`env: HAS_…` from `secrets` at job level — legal — plus `if: env.HAS_… == 'true'` and a warn+skip step). Workflow is `disabled_manually`, so this is a pure schema fix with zero runtime change. Files: `.github/workflows/fro-bot.yaml`. The Lint half of rm-112 is already staged (ROADMAP.md rewrite, eslint exit 0).
2. **rm-113 — CodeQL green: deps install before init.** codeql.yaml gains `corepack enable && corepack prepare pnpm@11.27.0 --activate && pnpm install --frozen-lockfile` before `codeql-action/init`; `runs-on` stays self-hosted (PR #1 policy; posture b per stewardship). Implementation known-good from the lost run-333ad19e worktree (memory: autobuild build-mode:none needs `node_modules/typescript`; checkout git-clean wipes it). Files: `.github/workflows/codeql.yaml`.
3. **rm-111 — Base absorb: digest `0e0ff40` + patch retirement.** All three `FROM` pins (builder / prod-deps / runtime) `2fe369e` → `0e0ff40` (live registry digest verified 2026-09-20); delete the `apt-get install --only-upgrade libpcre2-8-0` block (Dockerfile:44-50) — the base ships `10.42-1+deb12u1`; **keep** pnpm 11.27.0 (upstream's 11.8.0 is a downgrade trap); hono 4.13.8 rides as the lockfile-only absorb of upstream #488. Files: `Dockerfile`, `pnpm-lock.yaml`, `package.json` (hono range unchanged).
4. **rm-110 — rider: checkSuites >10 suites.** `src/github/aggregator.ts:137` `checkSuites(first: 10)` → `100` (or pagination); fixture with >10 suites on a head commit asserting full enumeration; suite count 3017 → 3018. Files: `src/github/aggregator.ts`, `test/aggregator.test.ts`.

**Doc riders (no selection weight, always ride):** staged `ROADMAP.md` + `docs/ideation/2026-09-19-repository-extensions-ideation.md`; this batch file. Expected effect: Main Lint green at pushed sha.

**Batch acceptance (end-to-end this cycle):** local gates green (lint / check-types / actionlint container `rhysd/actionlint:1.7.12` exit 0 / `pnpm install --frozen-lockfile` clean / 3018 tests) → land phase pushes → Main `success`, CodeQL `success`, Release `success` with Trivy zero HIGH, **all at the exact pushed sha** (cancel stale queued runs first, convention #3391; merge only after green, per the PR#4 merge-over-red lesson).

## Degrade order

rm-112 + rm-113 must land (they are the point — both red gates). Then rm-111. First drop if budget tightens: rm-110 (rider). Doc riders never drop (zero cost, already written).

## Contingencies

- **Digest moved again** (base rebuild velocity is high): re-query the registry at implement time; pin the newest `node:24-slim` digest and note it supersedes `0e0ff40` (the acceptance is "live digest + libpcre2 ≥ 10.42-1+deb12u1", not the literal value).
- **Generator re-break risk:** the next fleet render may re-emit rm-002's array and re-redden Lint after this cycle. Chosen posture: re-rewrite per cycle + fleet-side advisory (rm-104, `/work/projects/hermes-roadmap`) — NOT a scoped eslint override on ROADMAP.md (masking a broken generator defeats evidence-proven lint; recurrence is now documented twice: 14:32, then 20:32).
- **actionlint container pull fails on runner:** fallback chain from cycle 1 (in-step pipx bootstrap if python exists, else actionlint curl-installer) — prior cycle proved the container form works on the runner; low risk.
- **CodeQL install step fails on runner:** Main workflow already runs corepack/pnpm on the same runner (`c737026` cache-drop commit proves the path); if pnpm version drifts, align the `corepack prepare` pin with package.json's packageManager field rather than hardcoding.
- **rm-116 (branch protection):** out of batch — requires repo-settings authority and operator sign-off that autonomy merges will start waiting for green (intentional friction). Advisory to the land/ci phase: if authority exists, enable required checks (Lint, Check Workflows, Test) AFTER this batch proves green, never before.

## Non-goals this batch

No operator-facing features (rm-106/rm-107 — plan phase first), no Release-pipeline additions (rm-105 — green pipeline stays untouched mid-restore), no upstream-automation design (rm-103 — gated on Main green), no partial-enum contract work (rm-115 — needs product pass), no settings changes (rm-116), no code-hygiene P3s (SIGTERM, dead cache — below floor), no watchlist section (rm-117 — next fleet sync).

## Next-cycle heads

rm-103 first (Main green unblocks it; drift now 4 commits with a proven 2-file absorb surface), rm-116 decision (operator sign-off), rm-105, rm-115 product pass (degraded-but-fresh semantics), rm-106/rm-107 via plan phase, rm-117 rides the next fleet sync. Fleet-side: file the rm-104 advisory (generator vendored-path exclusion + stack-correct evidence — recurred twice).

## Cycle-2 outcome addendum (2026-09-20, run 54fa71a3, compound phase)

Pre-review record: implement + targeted tests completed in the conductor
worktree (base 2f3a884); review and shipping outcomes land after this phase
and are NOT claimed here.

**Implemented (worktree, uncommitted by design — landing is a later gate):**

- rm-112: fro-bot.yaml `secrets` term removed from the job-level `if:`;
  `HAS_FRO_BOT_PAT` staged in workflow-level `env:` (legal `secrets` read);
  new warn step on schedule-without-PAT; step-level gate on the agent step
  (actionlint's context list admits only `github, inputs, needs, vars` at job
  level — even `env` is illegal there, so the release.yaml pattern had to be
  adapted to step level; the last step is the agent step, so the gate fully
  realizes the skip).
- rm-113: codeql.yaml corepack/pnpm frozen install between checkout and init
  (posture b, self-hosted held per PR #1 policy).
- rm-111: all three FROM pins to `0e0ff40` (re-verified == live registry
  digest at implement time); libpcre2 in-image patch retired; hono 4.13.8 as a
  surgical 7-line lockfile-only swap with upstream-mirrored integrity.
- rm-110: `checkSuites(first: 10)` to `100` at BOTH query variants
  (aggregator.ts:137 primary and :174 no-alerts — the second site was found at
  implement; roadmap updated); 12-suite fixture added.

**Local gate outcomes (targeted_tests phase, full scope):** actionlint
container zero-byte output across all workflows; `pnpm lint` 0;
`pnpm check-types` 0; `pnpm test` 0 with 1998 server + 1020 web = 3018 tests
(the +1 is the new fixture, confirmed by name via the verbose reporter). The
engine's `npm test -- --runInBand` template was substituted (Vitest 4 rejects
jest-style flags) per standing convention. Fingerprint proof: no executable
file changed during the validation turn, so the dispatch digest was copied
verbatim.

**Reusable lessons banked this cycle:**

- `pnpm update <pkg>` over-reaches for absorb riders (rewrites the package.json
  specifier AND prunes ~63 lines of unrelated lockfile entries); mirror the
  upstream lockfile block by hand and prove with `pnpm install
  --frozen-lockfile` (package.json untouched).
- The landed-state lesson recurred after its own solution doc shipped; the doc
  now carries the recurrence plus the implement-to-landing enforcement seam
  (docs/solutions/best-practices/verify-fix-landed-before-crediting-cycle-2026-09-19.md).
- actionlint container exit code alone is unreliable — the pass signal is
  zero-byte OUTPUT (CI's pipefail is what catches the error text).

**Next-cycle heads (carry forward):** after landing is proven green, rm-103
first (drift 4 commits, measured 2-file absorb surface), then the rm-116
required-checks decision (enable only AFTER this batch proves green), rm-105,
rm-115 product pass, rm-106/rm-107 via plan phase, rm-117 rides the next fleet
sync, fleet-side rm-104 advisory (generator break recurred twice). Digest
re-verification is mandatory at CI time (base rebuild velocity is high).

**Review-fix addendum (attempt e1e30f2f, same day):** all five review riders
fixed - ROADMAP rm-112 acceptance reworded to the as-built step-level
mechanism; the three gate-proof evidence clauses marked PENDING; the codeql
install step simplified to `corepack enable` + `pnpm install
--frozen-lockfile` (the corepack shim resolves pnpm from package.json
`packageManager` - no hardcoded pin to drift); stale Dockerfile cross-ref
reworded; `Both` pins corrected to three. Full suite re-run green at 3018.
