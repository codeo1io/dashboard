# Dashboard maintenance — cycle-3 batch (2026-09-20)

Run `a7ca030394064ceda58170c7561a2707` (campaign `d7f1a7a213d04c1bacc9489cb55dc305`), prioritize phase, attempt `c34a3721bfe24d76b4492a3869be9894`.

**Lineage disclosure** (standing convention): the engine labels this campaign `cycle:1`, but the
repository's prioritization lineage already has cycle-1 (2026-09-19, run cf5527c1) and cycle-2
(2026-09-20, runs 270220e7 + 779e7271, batch docs `2026-09-20-cycle-2-batch.md` and
`2026-09-20-cycle-2-batch-2.md`). This artifact follows the repo lineage and is numbered
**cycle-3**; the engine-label discrepancy is disclosed rather than propagated.

**Roadmap-phase write loss (repaired by B0)**: the roadmap phase (attempt `cbb47922…`) selected
items `rm-125..rm-131` for addition to `ROADMAP.md`, but its filesystem writes were lost to a
session-context fault: `ROADMAP.md` matches HEAD (`git diff` empty), the phase's breadcrumbs file
`.conductor/progress/cbb47922c58247949172d195762165d2.ndjson` does not exist, and its delegate-spool
JSON does not exist. The item definitions survive verbatim in the phase result summaries; B0
re-applies them. `rm-125..rm-131` below are those ids (numbering continues the registry at HEAD,
whose highest open/candidate id is rm-124).

## Live-frame facts (re-measured this phase, not carried stale)

- `git fetch origin` then `git log -1 origin/main` → `7de0de3`; `git rev-parse HEAD` → `7de0de3`;
  worktree clean except untracked `docs/ideation/2026-09-20-repository-extensions-research-2.md`
  (research artifact) and `.conductor/` (engine-internal).
- Registry at HEAD enumerated by `grep -n '^- id:' ROADMAP.md`: 21 tracked ids — 16 candidates
  (`rm-103..rm-120` set), 3 in-progress with stale "pending landing" statuses (`rm-121`, `rm-122`,
  `rm-124` — all three landed on origin/main at `7de0de3`, verified by the assess phase against
  commit content), 5 completed, 2 superseded.
- Upstream drift re-measured by the research phase at this frame: 8 commits behind
  `autonomy-upstream/main`, now including a full `wiki-writer/` workspace package (20 files,
  references in 7 non-package files) and a real deny-by-default PWA fetch router replacing the
  kill-switch `sw.ts`. Sources: `docs/ideation/2026-09-20-repository-extensions-research-2.md`.
- Gates at `7de0de3` measured by the assess phase this run (cited, not re-run here): actionlint
  1.7.12 exit 0, `pnpm check-types` green, `pnpm lint` green, `pnpm test` 3026/3026, audit clean.
- CI posture: single self-hosted runner serializes all jobs (Release ~7 min warm / 31+ min cold);
  CodeQL green at aa4ff9f via `SEMMLE_TYPESCRIPT_HOME`; first dependabot PR window opens
  ~2026-10-03 (`rm-102`).

## Scoring (five-axis gated)

Axes: impact, deferred-risk, effort, dependencies, strategic value. Gate = implementable
end-to-end this cycle (no upstream merge, no external secret, no fleet-side actor) AND coherent
with the batch theme. Scores are cycle-relative, 0–100.

| item | impact | deferred-risk | effort | deps | strategic | gate | score |
| --- | --- | --- | --- | --- | --- | --- | --- |
| rm-125 wiki-writer exclusion guard | 80 | 90 (drift now ships the write package) | 15 (test+script) | none | 95 (fork invariant #1) | pass | 88 |
| rm-112 aggregator silent-drop/stale-banner (registry 75.0) | 85 | 75 (fail-closed violation) | 55 | none | 80 | pass | 78 |
| rm-128 aggregator concurrency+cycle telemetry (assess F2) | 70 | 65 (staleness grows with fleet) | 30 | none (same file as rm-112) | 70 | pass (folded into B2) | 74 |
| rm-126 privacy-policy absorb + push unblock | 65 | 40 | 45 | upstream absorb | 60 | fail (absorb-scope) | 58 |
| rm-105 SBOM + build provenance | 70 | 45 | 50 | none | 65 | fail (CI risk surface this cycle) | 61 |
| rm-129 metadata malformed-object observability (assess F1) | 55 | 50 (denylist source uncounted drops) | 12 | none | 55 | pass | 68 |
| rm-106 listener push/digest (registry 70.0) | 60 | 30 | 55 | policy absorb (rm-126) | 50 | fail (dependency) | 47 |
| rm-130 healthz real contract (assess F3) | 40 | 25 | 10 | none | 35 | pass | 55 |
| rm-123 digest-drift workflow (registry 48.0) | 45 | 30 | 25 | none | 40 | fail (runner-time budget; dependabot ~10-03) | 46 |
| rm-127 PWA router absorb | 55 | 25 | 45 | upstream absorb | 45 | fail (absorb-scope) | 44 |
| rm-131 listener SSE live stream | 50 | 20 | 60 | none | 40 | fail (design-first) | 42 |
| rm-116 branch protection + drift alert | 60 | 55 (two red landings already) | 30 | none (API-only) | 60 | fail (gh API + throwaway-branch evidence; next cycle) | 63 |
| rm-119 gate-health roll-up (registry 52.0) | 55 | 35 | 40 | joint-design w/ rm-107 | 45 | fail (design-first, pairs rm-107) | 48 |
| rm-107 system-status panel | 55 | 30 | 50 | joint-design w/ rm-119 | 45 | fail (design-first) | 46 |
| rm-117/rm-118/rm-120/rm-108/rm-114/rm-115 | ≤45 | ≤30 | varied | none–external | ≤40 | fail (watch/design/low) | ≤45 |
| rm-104 render hardening (registry 98.0) | fleet | fleet | n/a | fleet-side generator | high | fail (external actor; watch) | — |
| rm-102 dependabot first-PR proof | 90 | low | n/a | wall-clock (~2026-10-03) | high | fail (waiting) | — |
| rm-103 absorb cadence + drift gate | 85 | high over time | 60 | upstream merges | 80 | fail (absorb-scope, sequenced after rm-125) | — |

Deferred-risk axis rationale for the two headline picks: the fork's defining invariant (no write
code path, memory #3206) is now one careless absorb away from breach — upstream literally ships
the excluded package — while the aggregator is the application's single source of truth and
currently violates its own fail-closed design in two branches (rm-112 signals, registry-cited).

## Selected batch — cycle-3: "aggregator reliability + invariant guard"

Chosen for highest value density that clears the gate: two of three fresh assess findings close,
the registry's top non-blocked reliability item (rm-112) lands with the fresh P2 folded in, and
the fork invariant gets a structural guard before the next absorb cycle widens the blast surface
further. Everything is server-side TypeScript plus tests plus one README line — no workflow
edits, no upstream merge, no secrets.

### B0 — registry repair (bookkeeping rider, zero executable surface)

Re-apply the lost roadmap hand-extension: add `rm-125..rm-131` to `ROADMAP.md` under a stacked
`<!-- manual-revision 2026-09-20 ... -->` directive (convention per registry precedent), and close
the three stale statuses — `rm-121`, `rm-122`, `rm-124` → completed at `7de0de3` (content verified
by this run's assess: onError redaction, binding-docs sync, hygiene items).

- evidence: `git diff ROADMAP.md` shows only additions/status edits; `pnpm lint` exit 0
  (backticked ids, no bare-array prose — the rm-104 lint hazard).

### B1 — `rm-125` wiki-writer exclusion guard

- why now: upstream drift (8 commits) ships `wiki-writer/` complete; the exclusion is currently
  convention + memory only — nothing executable fails if a merge imports it.
- acceptance: a test (or test+script pair) fails when any `wiki-writer/` path exists in the tree or
  any tracked file references it (extension-less files included — Dockerfile precedent, memory
  #3255); passes on the clean tree; wired into `pnpm test` so Main enforces it.
- evidence: test green on clean tree; deliberately-introduced reference in a scratch checkout
  flips it red (verified locally by the implement phase, not on CI).

### B2 — `rm-112` + `rm-128` aggregator reliability hardening (folded scope, one file family)

rm-112 (registry 75.0) keeps its registry acceptance verbatim: partial resolver failure serves
last-good with an explicit stale marker and per-repo absence entries; warm-empty never silently
replaces last-good; snapshot cache TTL fixed above the interval or removed with a comment; failed
installation resolution negatively cached; `renovate.json5` deleted or documented inert;
MonitoringDto degradation signal consumed by the operator view; both branches tested. rm-128 (this
run's assess F2) folds in on top: per-repo status fetches bounded to a small concurrency pool
(4–6) instead of the sequential loop at `src/github/aggregator.ts:714-731`, and a slow-cycle
warning is logged when a refresh cycle approaches the interval, keeping the in-flight guard.

- why folded: same file, same test suite, same acceptance surface (staleness/degradation); two
  cycles touching the aggregator serially would churn the same tests twice.
- risk control: aggregator is hot path — full `pnpm test` (3026) must stay green; new
  fake-timer tests cover the pool bound and the skip-tick boundary.
- evidence: new aggregator tests in `pnpm test`; a seeded degraded snapshot renders the stale
  banner in the operator view; no regression in suite count or wall time beyond noise.

### B3 — `rm-129` metadata malformed-object observability

- acceptance: the public-entry predicate's silent branch (`src/github/metadata.ts:331-343`, else-if
  with no trailing else) counts object entries that fail the field predicate into the existing
  malformed-entries counter alongside non-object entries; a test covers a malformed object entry
  (bad/missing `discovery_channel` or empty `node_id`), not just scalar/array junk.
- evidence: `pnpm test` includes the new case; log line emits the combined count on a fixture.

### B4 — `rm-130` healthz contract

- decision (chosen direction): populate the fields — `lastFetch` from the aggregator snapshot
  timestamp and `rateLimit` from the app-client rate hooks — because README.md:48 already
  documents them and rm-107/rm-119 will want the same signals; the alternative (drop fields, fix
  README) is the fallback if wiring the snapshot into the route exceeds trivial effort.
- acceptance: `/api/healthz` returns real values (or fields removed AND README.md:48 corrected —
  one truth); an assertion test pins the chosen shape; README matches implementation.
- evidence: test asserting the response shape; grep shows no other doc repeats the old contract.

## Deferred (with rationale and sequencing)

- `rm-103` absorb cadence, `rm-126` privacy-policy absorb, `rm-127` PWA router absorb — the next
  absorb cycle; sequenced strictly AFTER B1 lands so the guard protects the merge. `rm-126` then
  unblocks `rm-106` (its own acceptance names the policy as a precondition — upstream #495/#496
  now merged, so the dependency is clearable, not gone).
- `rm-116` branch protection — high deferred-risk (two red landings already) but needs `gh` API
  mutation + a throwaway-branch red-merge observation; first candidate of cycle-4.
- `rm-105` SBOM/provenance — Release-workflow surface on the serialized runner; cycle-4 candidate
  alongside rm-116.
- `rm-119` + `rm-107` — design-first pair (ONE joint status surface, per rm-119's registry note);
  needs a plan phase, not a rider.
- `rm-123` digest-drift workflow — dependabot's first docker PR (~2026-10-03) may carry the bump;
  re-score after that window.
- `rm-102` (wall-clock), `rm-104` (fleet-side actor) — watch items, no local work possible.
- `rm-131` SSE live stream, `rm-117`, `rm-118`, `rm-120`, `rm-108`, `rm-114`, `rm-115` — below
  the gate on value/effort or design-first; unchanged from prior cycles' deferrals.

## Verification plan for the implement phase

1. B0 lands first (registry repair) so the batch's items are visible in `ROADMAP.md` during review.
2. B1–B4 implemented on top of `7de0de3`; gates: `pnpm check-types`, `pnpm lint`, `pnpm test`
   (target ≥ 3026 + new tests), actionlint unchanged-set check if any workflow file is touched
   (none planned).
3. Full-suite green BEFORE hand-off to review/ci; landing stages explicit-file staging only
   (memory #3256 — never `git add -A` with `.conductor/` untracked in the same tree).

## Cycle-3 outcome addendum (2026-09-20, run a7ca0303, compound phase)

Pre-review outcome fold — implementation and targeted-tests evidence only; review and
shipping outcomes are recorded by the next cycle's assessment.

### Batch outcomes

- `B0` registry repair — landed in the run worktree first, as sequenced. rm-125..rm-131
  interleaved priority-descending; rm-121/122/124 closed as landed-7de0de3 with live
  re-verification (README.md:40 + AGENTS.md:9 source naming, server.ts onError redaction,
  server.ts warning + allowlist guards). One edit-round anchor slip (rm-127 insert shifted
  the removal anchors) was re-anchored same turn.
- `B1` rm-125 guard — `test/wiki-writer-guard.test.ts` (4 tests): allowlist-aware scan
  with NO extension filters (Dockerfile lesson), nested `node_modules` skip, `.git`-as-file
  tolerance for conductor worktrees, oversized-file detection instead of silent skip.
  Robustness gaps found and fixed in-attempt: trailing-slash allowlist prefix (`docs//`),
  directory-before-pattern ordering, scratch-tree creation.
- `B2` rm-112 + rm-128 (one scope) — aggregator hardening: `FETCH_CONCURRENCY=6` bounded
  pool replaces the sequential per-repo loop; `CACHE_TTL_MS` 60s→120s (2× interval — the
  old TTL could never bridge refreshes); 10-minute negative cache for failed resolutions
  (no per-cycle dead-install re-hit); warm-empty preserve on enumeration failure
  (fail-closed keeps last-good repos + staleBanner instead of wiping); cycle telemetry
  (`cycleMs`, `skippedCycles`, `unresolvedCount`) + slow-cycle/skipped-tick warnings.
  Six new tests; suite 56/56.
- `B3` rm-129 — trailing `else` closes the classifier gap: malformed object entries now
  counted in `skippedMalformedCount`; object-junk fixture added; suite 42/42.
- `B4` rm-130 — healthz returns the documented contract for real: `lastFetch` (ISO from
  `snapshot.refreshedAt`), `rateLimit` from a new `RateLimitState` self-tracked in the App
  client's 403/429 handling (no extra GitHub round-trip), null fallback when no client is
  wired, pinned by test. README.md:48 unchanged — the implementation now matches it.
- rider rm-102 — `.github/renovate.json5` deleted (dead since PR #1 removed renovate.yaml);
  dependabot.yml header rewritten to past tense; binding docs carry no live claim.

### Gates

`pnpm check-types` exit 0 · `pnpm lint` exit 0 · `pnpm test` 3040/3040
(server 2020 + web 1020; assess baseline 3026, +14) · actionlint 1.7.12 exit 0
(no workflow edits). Tree at 7de0de3 with the batch uncommitted pending review.

### Incidents and deviations (for the fleet record)

- Engine cycle label `cycle:1` vs repo lineage cycle-3 — disclosed at selection time; the
  artifact keeps lineage numbering per convention.
- Two implement attempts were rejected on fault-terminated turns (generation faults, not
  gate failures); one spool-write correction. The final attempt closed all gates green.
- The B2/B4 edits were briefly applied to the stale main checkout
  (`/work/projects/dashboard`, 3 commits behind) and ported back via git patch — the
  staged `renovate.json5` deletion was invisible to `git diff` and had to be re-applied
  in the worktree. Main checkout restored pristine. Lesson banked as fleet memory: anchor
  every edit and `cd` to the assigned run worktree and fingerprint the tree before gates.
- The `check-types` miss that failed one attempt existed all along in the ported test
  (closure-narrowed `releaseSlow` typed `never`); a `tail`-truncated gate log hid it in
  the main checkout. Fix: run gates unfiltered, or grep the full log for `error TS`.

### Next-cycle heads (refreshed)

- `rm-126` privacy-policy absorb + listener digest push (unblocked upstream #495/#496),
  `rm-127` PWA router absorb, `rm-103` absorb cadence — the absorb cycle, sequenced
  strictly after this batch lands; the B1 guard protects those merges.
- `rm-116` branch protection and `rm-105` SBOM/provenance remain cycle-4 front-runners;
  `rm-119`+`rm-107` design pair still needs a plan phase; `rm-123` re-scores after the
  first dependabot docker PR (~2026-10-03).
- Watch: `rm-128`'s telemetry gives cycle-4 fresh wall-clock evidence for the
  `rm-104`/`rm-102` wall-clock items — re-read `cycleMs` from production before re-scoring.
