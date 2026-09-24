# Prioritization batch 2026-09-24 — repo lineage cycle 9

Provenance: conductor run 04c7d9c2949a40a49b96587440fcbf93, prioritize attempt
6d0f6d1ec854443a8dea570ff96e9765, repository-maintenance lineage bffe834e cycle:1 (engine label).

Lineage numbering (disclosed per convention): engine labels this run cycle-1 of a new lineage, but repo docs
carry landed batches cycle 1–7 (docs/prioritization at origin/main 763c1fa, verified by ls-tree 2026-09-24)
and PR #23's title burned "cycle-8" without landing a doc. Taking lineage **cycle 9** avoids both collisions.
This doc is authoritative for this run's implement phase.

## Live frame re-measurement (stale-base rule)

- `git fetch origin` 2026-09-24: worktree HEAD `7809df6`; `origin/main` = `763c1fa`, 3 commits ahead
  (`6e2df14`, `75f7410`, `763c1fa`) — a +1654/−212 landing wave (cycle-4/6/7 payloads, base-drift.yaml,
  ROADMAP to 50 ids). CI green at tip (Main/CodeQL/visual/Dependency Review, gh run list 2026-09-23).
- **Stale-base disclosure — three of this run's six roadmap additions are already closed at main, verified
  directly against `763c1fa`:**
  - setup-composite pnpm caching: DONE by main's rm-145 (`setup-node@…5020 # v7.0.0` with `cache: pnpm`,
    dated rationale, `pnpm/action-setup@…cc86 # v6`); worktree candidate rm-150 obsolete.
  - visual.yaml digest pins: DONE by main's rm-137 — all five `uses:` in visual.yaml are sha-pinned
    (checkout `3d3c42e`, pnpm/action-setup `0977fd9`, setup-node `8207627`, upload-artifact `043fb46` ×2);
    worktree candidate rm-153 obsolete.
  - self-hosted prose sweep: mostly DONE by main's rm-148 + `6e2df14` — remaining `git grep -in self-hosted`
    hits at main are explicitly-historical records (setup action history note, dependabot.yml:4,15,
    base-drift.yaml:26 retired-policy marker, main.yaml:133 and release.yaml:441 past-run observations,
    AGENTS.md:48 runner-agnostic phrasing); the vitest-config/test-file sites measured at the stale base
    no longer appear at main. Worktree candidate rm-152 reduced to residual at most.
  - dead renovate config: DELETED at main (rm-136); fro-bot pin at main = `dd5b5343… # v0.114.1`.
- **Still open at main, freshly verified:** `release.yaml` `paths:` (Dockerfile, package.json, pnpm-lock.yaml,
  tsconfig*, src/**, web/**, public/**, workflow file, two scripts) and `isHardReleasePath`
  (scripts/should-release.ts:161-186) both omit `pnpm-workspace.yaml` while the Dockerfile COPYs it into both
  stages (Dockerfile:9,29) — and main's version of that file now also carries `minimumReleaseAge: 1440` +
  `minimumReleaseAgeExclude` (supply-chain gate, rm-133), making the no-trigger surface sharper than at the
  assess base. Aggregator signals (rm-112) unchanged by the wave (src/github/aggregator.ts ±9 at main did not
  touch the cache/null-repo paths; rm-112 status verified candidate).
- Worktree ROADMAP hazard: this run's roadmap phase (attempt 4b1665c5) added rm-148..rm-153 at base 7809df6;
  main's ROADMAP already owns rm-134..rm-148 (50 ids). **rm-148 collides** — landing must renumber
  (release-trigger item → rm-154; rm-149 fro-bot-absorb keeps its id, free at main).

Inputs used, not redone: assess d2a81faa (gates 3115/3115 at 7809df6; release-path, cache, null-repo,
prose, healthz evidence), research 433a7ece (upstream/npm/fro-bot-release evidence), roadmap 4b1665c5
(ROADMAP.md +53/−4 at base, gates re-green).

## Gated scoring (impact, risk-to-skip, risk-to-do, effort, dependencies)

Gates: (G1) restores/locks a broken invariant? (G2) completable end-to-end this cycle with hosted-runner CI
evidence? (G3) depends on unlanded or out-of-repo work?

| item | impact | risk-to-skip | risk-to-do | effort | deps | gated |
| --- | --- | --- | --- | --- | --- | --- |
| release-trigger completeness (this run's rm-148→rm-154) | 9 — build-behavior + supply-chain-gate file edits ship no release, no audit trail | 9 — silent by construction; minimumReleaseAge excludes are attack-adjacent | 1 — 2 trigger surfaces + one structural guard test | S | none | PASS |
| rm-112 aggregator fix-half (75.0, queued next-cycle by cycle-7 compound) | 8 — a monitoring dashboard that renders vanished repos calm and never serves its cache misreports by design | 7 — the exact failure class the product exists to surface | 3 — semantic change: TTL decision + null-repo rollup + negative caching; suite 2038 server tests as net | M | none | PASS |
| rm-149 absorb fro-bot/agent v0.115.0 (72.0) | 7 — required trusted-proxy env for proxied operator surface + run-provenance contract | 6 — pin lags; env is a deployment prerequisite | 4 — contract adoption unverifiable without the live gateway (AGENTS.md: operator surface proxied, no in-repo test can reach it) | M | infra pairing | DEFER — cannot complete end-to-end (G2) |
| rm-105 SBOM/provenance (80.0) | 7 | 4 — attestations already land via buildx (#3317) | 3 | M | Release-pipeline scope beyond this batch's theme | DEFER |
| rm-103 absorb cadence (85.0) | 6 — current drift = 3 dep commits already absorbed at main except v0.115.0 (rm-149) | 3 | 3 — scheduled merge-PR machinery | M | wants rm-116 | DEFER |
| rm-116 branch protection (58.0) | 6 | 5 — three recorded red landings | 3 — account-level owner action | S | owner decision | DEFER — owner action, raise out-of-band |
| rm-144 property-based SSE suites (50.0) | 5 | 3 | 2 | M | none | DEFER — good next-cycle pairing with rm-114 |
| rm-104 render hardening (98.0) | 7 | 6 | 3 — hermes-roadmap lives in the fleet repo | M | outside this repo | HOLD — fleet scope |
| rm-107 system-status panel (65.0) | 6 | 3 | 3 — UX design surface | M | rm-112 semantics first | DEFER — enabled by this batch's B2 |
| rm-102 first-PR proof / rm-146 auto-merge | — | — | — | — | dependabot window ~2026-10-03; rm-146 sequenced on rm-116 | NOT selected (time/sequence blocked) |
| rm-150/151/152/153 (worktree ids) | — | — | — | — | stale-closed at main (see live frame) | NOT selected (already landed there) |

## Selected batch — theme: close the silent-failure gaps (silent-release surface + invisible degradations)

- **B0 — ROADMAP landing reconciliation (rider, XS).** Merge the worktree ROADMAP (base 7809df6 + this run's
  rm-148..153) into main's 50-id state by content: renumber the release-trigger item to **rm-154** (main owns
  rm-148), keep the fro-bot-absorb item as rm-149 (free at main), mark rm-150/151/152/153 absorbed with
  pointers to main's rm-145 / rm-102+rm-136 / rm-148 / rm-137; preserve every existing item verbatim
  (completed/superseded untouched) per the file's own directive. AC: no id collision against
  `git show origin/main:ROADMAP.md`; unique-id count reconciled and stated in the landing commit;
  `pnpm lint` green (rm-104's bare-array rule).
- **B1 — release-trigger completeness for pnpm-workspace.yaml (rm-154).** Add `pnpm-workspace.yaml` to
  `.github/workflows/release.yaml` `paths:` and to `isHardReleasePath` in scripts/should-release.ts with a
  comment naming what lives in the file (allowBuilds, shamefullyHoist, minimumReleaseAge(+Exclude), overrides).
  Guard: extend the PR-side validity family (test/dockerfile-context.test.ts precedent) with a structural test
  asserting every Dockerfile COPY/ADD source is present in the release-trigger surfaces (paths ∪ hard paths) —
  no per-file enumeration, so the class cannot regress. AC: test red on a scratch tree omitting the new path,
  green after; `actionlint` container command exit 0; `pnpm lint`/`check-types`/`pnpm test` green;
  `should-release` dry-run on a synthetic pnpm-workspace.yaml-only change returns release=true.
- **B2 — rm-112 fix-half: make degradation visible and the cache real.** Scoped to the three measured gaps:
  (a) cache-vs-interval coherence — `CACHE_TTL_MS` (60s) equals the refresh interval with a strict `<` check
  (aggregator.ts:717-718 vs :789-795 at the base), so steady-state reads never hit cache; either raise TTL
  above the interval (documented rationale + jitter if chosen) or delete the dead cache layer — decision
  recorded in the rm-112 item either way; (b) `repository: null` (deleted/renamed-away repo) currently renders
  calm (`rollupState` unknown, `stale` false, needsAttention false — :521-522, :223-231) while
  installation_id-null flags stale (:553-556): make null-repo fail-visible, matching that precedent;
  (c) dead-installation resolution: add bounded negative caching or record an explicit declined-with-rationale
  note. AC: aggregator tests extended for all three behaviors (vanish-repo surfaces attention; cache serves on
  the documented TTL; negative-cache respects its bound); full suite green; no public-API field removed
  (additive semantics only — the web client consumes these shapes).

Order: B0 → B1 → B2 (guard test lands over the reconciled tree; B2 is the only semantic change and lands
last with the suite as its net).

## Deferred rationale and contingencies

- rm-149 (v0.115.0) deferred one cycle BY DESIGN: the trusted-proxy env is a deployment prerequisite and the
  provenance contract cannot be exercised without the live gateway; rm-120 (drift watch) is the standing
  catch-net. Re-select next cycle alongside the operator-surface items (rm-107/rm-127) once infra-paired.
- Stale-base rule passed forward: implement MUST re-measure at its landing base — origin/main moved twice
  during this phase alone (763c1fa at fetch; gh shows runs at newer branch shas). If main moves again,
  re-verify B1's two surfaces and B2's aggregator anchors before editing; re-run the self-hosted grep if
  landing lands after another truthing wave.
- Contingency: if B2(a) chooses deletion of the cache layer, keep `CACHE_TTL_MS`'s test references consistent
  in one pass — do not leave half-referenced constants (lint will catch unused, tests may not).
- Contingency: if ROADMAP reconciliation hits a text conflict beyond the id block (main's cycle-7 compound
  comment vs this run's manual-revision note), merge by content per #3233's strongest gate — staged file must
  equal the superset content, ids unique, completed history byte-stable.
- Landing hygiene (standing): stage explicit file lists only (#3256 — the repo does NOT gitignore
  `.conductor/`); after any landing merge, `git ls-files .conductor` must end empty — main currently TRACKS
  `.conductor/progress/70f231743fbd4e3a82afb82232a13c4d.ndjson` (+3 in the 7809df6..763c1fa diff), so the
  implement/landing phase must `git rm --cached` it in the same batch or the rm-131 guard reddens.
- Deferred items queued for cycle 10+: rm-144 (with rm-114), rm-107 (enabled by B2), rm-116 (owner action),
  rm-105, rm-103+rm-149 (absorb window with v0.115.0).

## Implementation outcome (2026-09-24, implement attempt 9b17c4e7)

Base correction first: the stewardship worktree sat at 7809df6, which origin/main (763c1fa) had
passed — the worktree base was itself a divergent sibling of main's PR #12 wave, not an ancestor.
Per the cycle-7 house precedent the worktree was reset to 763c1fa (nothing unique lost — the diff
was main's wave in reverse) and the batch applied on top, uncommitted.

**B0 — ROADMAP landing reconciliation.** Header gains the manual-revision note recording the id
mapping (unlanded rm-148 → re-authored rm-154; unlanded rm-149 → rm-155; unlanded rm-150..rm-153
content-absorbed by landed rm-145/rm-136+rm-148/rm-148/rm-137, unallocated) plus the governance
rule: audit open PR titles and `git log --all -- ROADMAP.md` before allocating ids. rm-154 and
rm-155 appended as the cycle-9 extension block. Dated signals appended to rm-103 (upstream =
3 dep-only commits, all content-absorbed), rm-107 (healthz still null at 763c1fa), rm-108
(vitest 5 exposure quantified — no structural blockers), rm-112 (fix-halves implemented, see B2).

**B1 — release-trigger completeness (rm-154).** `pnpm-workspace.yaml` added to
`.github/workflows/release.yaml` push paths (with rationale comment) and to
`scripts/should-release.ts` `isHardReleasePath` (plus its rule-1 doc comment). New structural
guard `test/release-trigger-paths.test.ts`: parses the Dockerfile build-context sources
(reuses the rm-132 parser, extension-less-safe), the workflow paths block, and the hard-release
literals/prefixes, then asserts every COPY source is covered by trigger surfaces in BOTH gates,
that pnpm-workspace.yaml specifically sits in both, and that every hard-release literal is
reachable through the workflow filter (unreachable-rules check). Negative-verified against the
real files: stripping the trigger entry reddens 4 assertions; restored, 6/6 pass.

**B2 — aggregator fail-visible (rm-112 fix-halves).**
(a) Cache decision: DELETE, not raise. The cache could never serve in steady state (TTL ==
interval with strict `<`), so removal changes no behavior while deleting the dead weight; a
raised TTL was rejected because it would serve staler data to save trivial API budget.
`CacheEntry` and the Map are gone; the decision is recorded in a comment at the former site.
(b) `repository:null` now fails visible: `stale:true` (matching the installation_id-null
precedent), warning logged at both parse call sites, attention-first ordering. Two new tests.
(c) Negative caching for dead installations: DECLINED with rationale (cadence bounds re-hits to
one resolve/min/repo; the skip path already warns; auth-path failure surface not worth it) —
recorded in rm-112's signal append per the batch's acceptance alternative.

**Unit C — engine hygiene.** `git rm --cached .conductor/progress/70f231743fbd4e3a82afb82232a13c4d.ndjson`
(staged deletion; file intact on disk untracked). `git ls-files .conductor` ends empty.

**Changed files:** `.github/workflows/release.yaml` (+4), `scripts/should-release.ts` (+4),
`src/github/aggregator.ts` (− cache + null-repo stale, net −10), `test/aggregator.test.ts`
(+2 tests, 1 renamed), `test/release-trigger-paths.test.ts` (new, 6 tests), `ROADMAP.md`
(reconciliation), `docs/prioritization/2026-09-24-cycle-9-batch.md` (this section), plus the
staged untrack of the tracked `.conductor` breadcrumb.

**How to verify:** focused gates all green — `pnpm lint` EXIT=0, `pnpm check-types` EXIT=0,
`pnpm vitest run test/release-trigger-paths.test.ts test/aggregator.test.ts test/dockerfile-context.test.ts`
→ 62/62 (`/tmp/04c7d9c2-impl-*.log`); actionlint container exit 0 on release.yaml;
`pnpm tsx scripts/should-release.ts --changed-files pnpm-workspace.yaml` → `release: hard-release
path changed` (README.md control → skip, exit 1); `git ls-files .conductor` → empty;
`git status --porcelain` shows exactly the batch files (4 M code + M ROADMAP + new test + batch
doc + 1 staged D breadcrumb), uncommitted per phase boundary.

### Validation rider (2026-09-25, targeted_tests attempt 409ba5bb)

The engine's targeted command falls back to `github_ci_validate.py` (package.json is in the
changed set), whose ephemeral-PR route registered ZERO checks at this base: `pull_request:
branches: [main]` in main.yaml/codeql.yaml/dependency-review.yaml filters out PRs based on
`conductor/ci-base-**` (#9803 wedge; the filter fix exists only in unlanded run f4622d7e).
Added `conductor/ci-base-**` to those three pull_request filters (actionlint 0, `pnpm lint` 0).
After the fix the cloud route registers 9 checks — 8 green (Lint, Check Types, Check Workflows,
Design Check, Test Scripts Load, CodeQL init, Dependency Review, …) and one red: the rm-131
fork-exclusion guard, because the validation clone starts at source HEAD (763c1fa) which still
TRACKS `.conductor/progress/70f231743fbd4e3a82afb82232a13c4d.ndjson`, and the engine's delta
patch excludes `.conductor/**` — so this batch's staged deletion of that exact file cannot
propagate into the clone. Cloud-green is therefore structurally blocked until the residue is
untracked on main, which is precisely Unit C of this batch: the fix lands, then validation goes
green. Authoritative local gates re-run instead (see targeted_tests PhaseResult).
