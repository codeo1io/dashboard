# Dashboard maintenance — cycle 4 batch (2026-09-21)

Lineage disclosure (#4323): engine labels run 5351fd4e cycle:1; by repository
artifact lineage this is the 4th prioritization batch (09-19 c1 → 09-20 c2 ×2
→ 09-20 c3 → this) and follows the 4th research refresh
(docs/ideation/2026-09-21-repository-extensions-research.md, reconstructed
this run — see disclosures).

## Live frame facts (re-measured this phase, not carried stale)

(Superseded 2026-09-21, later the same day — review re-measure: PR #6 and PR #7 merged, and the frame has since moved twice more (2f4d118 + 38fc511); see "Landing gate riders" at the end of this doc for the current tip. The facts below were true at prioritize time and are kept for the record.)

- Fork origin/main tip `9f978d1`; `git log --oneline a3bf45a..origin/main` →
  only 9f978d1 — frame STABLE since the roadmap phase (same day).
- Gates at HEAD: Main/CodeQL/Scorecard green at 9f978d1 (gh run list, branch
  main); Release green at f334fb2 (run 35523081051); suite 3070/3070
  (assess-phase evidence).
- The alarming "Main failure" runs at 451d8b9/6f0ef5e belong to PR #6's OPEN
  branch (visual-regression gate, report-only), NOT main — verified
  `gh pr view 6 → state=OPEN, mergedAt=null`.
- Upstream drift: 11 commits, all three new ones docs-only (#497 absorbable,
  #498 must be EXCLUDED, #499 moot).
- Branch protection on main NOW EXISTS but is a shell: required_status_checks
  empty, enforce_admins disabled, zero rulesets (API 200 on
  branches/main/protection; rulesets length 0) — rm-116 re-probed.
- fro-bot/agent at v0.113.2 (releases/latest AND list, prerelease=false);
  clonedep reference documents v0.78.0.
- node:24-slim live digest 5cbc7cab vs Dockerfile pin 0e0ff40 (one behind);
  first dependabot PRs expected ~2026-10-03 (rm-102 window).
- Parallel campaign: PR #6 touches visual.yaml, .gitignore, package.json,
  playwright.config.ts, pnpm-lock.yaml, tests/visual/** — NO file overlap with
  this batch (checked `gh pr diff 6 --name-only`).

## Five-axis scoring (1–5; Effort 5 = cheapest; Dep-free 5 = no external landing dependency)

Composite = Impact×2 + Strategic + Risk-reduction + Effort + Dep-free (max 25).

| item  | Impact | Strategic | Risk-red | Effort | Dep-free | Composite | Gate |
|-------|--------|-----------|----------|--------|----------|-----------|------|
| rm-126 drift-identity reconciliation | 4 | 4 | 5 | 3 | 5 | **25** | pass |
| rm-131 absorb #497 + exclusion ledger | 3 | 4 | 3 | 5 | 5 | **23** | pass |
| rm-134 binding-docs truthfulness 2 | 3 | 3 | 2 | 5 | 5 | **21** | pass |
| rm-133 minimumReleaseAge real-or-drop | 2 | 3 | 4 | 5 | 5 | **21** | pass |
| rm-123 base-digest drift workflow | 3 | 3 | 3 | 3 | 5 | **20** | pass |
| rm-132 aggregator concurrency | 3 | 3 | 2 | 2 | 5 | 18 | defer |
| rm-115 CSRF ack tokens | 2 | 2 | 3 | 3 | 5 | 17 | defer |
| rm-112 staleness semantics | 4 | 4 | 4 | 2 | 5 | 23 | defer (size: bundle with rm-132 next cycle) |
| rm-106 listener digest push | 4 | 5 | 2 | 2 | **1** | 14 | **blocked-external** |
| rm-116 required checks on main | 3 | 3 | 4 | 3 | 2 | 18 | defer (needs check-name decision + GitHub-side config) |

Scoring notes: rm-106 gates out despite top strategic value — dependency
discovery below. rm-112 scores high but is a medium-large feature; batching it
with its sibling rm-132 next cycle keeps this cycle's batch coherent and
landable. rm-104/102/103/105/108/117/118/119/120/127/129/114 are standing
process, large features, or small-code items with no cycle pressure — not
scored this round.

## Selected batch — "drift-identity truth + posture riders"

Theme: make the repository tell the truth about itself (identity semantics,
docs, supply-chain gate, base pin), while the big features wait for their
dependencies. One anchor code change + four trivial riders, all
end-to-end-verifiable in-cycle.

### B0. ROADMAP bookkeeping rider (done this phase)

rm-106 flipped candidate→blocked-external with the gateway-send dependency
evidence; research artifact reconstructed with corrections (v0.113.2,
tailwind 4.3.3). No executable surface.

### B1. Reconcile drift-identity reporting (rm-126, anchor)

- **Decision pinned:** keep discovered-only repo rows VISIBLE (they are
  non-denylisted installation repos; showing them is the feature — single
  operator, invariant 3 of the aggregator docstring already labels them
  'discovered'), and make the docstring's count-only promise tell the truth
  about what is actually exposed.
- **Acceptance:** aggregator.ts:19-21 docstring rewritten to state precisely:
  installation-only repos are listed with full identity + 'discovered' label;
  the count-only promise applies to the metadata-vs-installation cardinality
  GAP (driftCount), not to row identity; driftCount semantics documented and
  locked by a test (count = installation-only count); discovered-row labeling
  locked by a test; `pnpm lint`/`check-types`/`test` green.
- **Evidence:** aggregator.ts diff; the single new lock test; suite count 3070 → 3071.

### B2. Absorb upstream #497 + exclusion ledger (rm-131, docs-only)

- **Acceptance:** port `git show 2941af0`'s solutions doc verbatim (path:
  docs/solutions/integration-issues/public-route-swallowed-by-caddy-extensionless-rewrite-2026-09-20.md);
  apply the two 6-line touch-ups where fork copies still carry pre-#497 text;
  ledger lines in this batch doc's landing commit message record #498-EXCLUDE
  (wiki-writer invariant #3206) and #499-MOOT (plan doc never carried);
  binding-docs grep stays zero on wiki-writer.
- **Evidence:** diff vs `git show 2941af0`; grep; `pnpm lint` green.

### B3. Binding-docs truthfulness micro-batch 2 (rm-134, docs-only)

- **Acceptance:** README badges → codeo1io/dashboard; Endpoints inventory
  cross-checked against isPublicPath + route registrations (include /privacy,
  /api/listener/*, push proxy surfaces); dependabot.yml comment names the
  codeo1io/renovate-config retarget + Renovate-never-runs state;
  web/vite.config.ts:40 comment rewritten for the kill-switch SW reality.
- **Evidence:** diffs; grep zero upstream badge URLs + zero stale strings.

### B4. Make the minimumReleaseAge gate real (rm-133, config)

- **Decision pinned:** SET `minimumReleaseAge: 1440` (1 day; conservative
  7d was considered and rejected — the fork already pins by digest wherever it
  cares, and dependabot PRs arriving ~10-03 need to stay mergeable; 1d blocks
  same-day compromise pushes only) with the @bfra.me excludes intact and a
  comment naming the policy. Fallback if frozen-lockfile install or CI
  objects: drop the exclude block with a recorded decision — never land the
  gate silently untested.
- **Acceptance:** pnpm-workspace.yaml edit + comment; frozen-lockfile install
  clean; full `pnpm test` green; decision recorded here.
- **Evidence:** pnpm-workspace.yaml diff; `pnpm config get minimumReleaseAge`
  at the landing tree.

### B5. Base-digest drift visibility workflow (rm-123, droppable last)

- **Acceptance:** weekly read-only workflow comparing Dockerfile pins to live
  node:24-slim digest via `docker manifest inspect` (digest parse per #3317 —
  never the imagetools --format template); opens an issue on drift, never
  auto-bumps; actionlint-validated with the exact container command (#4265);
  single quotes in YAML (#4263).
- **Evidence:** actionlint exit 0; first scheduled run log (or dispatch proof).

Drop order if the cycle runs tight: B5 → B3 → B2 (B1 and B4 are the
value-dense core).

## Deferred (one-line rationales)

- rm-106 — blocked-external: gateway (fro-bot/agent) has no push-send
  endpoint in the vendored contract; propose the digest-send contract
  upstream first (next-cycle candidate via gateway repo).
- rm-112 + rm-132 — aggregator staleness semantics + concurrency are one
  coherent next-cycle pair; both medium effort.
- rm-115 — small security rider, no pressure; next cycle.
- rm-116 — protection shell now exists; filling required checks needs a
  check-name decision (Main job set + CodeQL) and is GitHub-side config —
  batch with the next red-merge signal or operator ask.
- rm-107/rm-119/rm-117 — operator panels, medium-large features, queue behind
  the aggregator pair.
- rm-105/rm-118 — security standing items (SBOM/provenance; scoped tokens).
- rm-104/rm-102/rm-103 — standing process (render hardening; dependabot
  first-PR proof lands ~10-03; absorb cadence).
- rm-108 — majors adoption stays a dated decision matrix; no date pressure.
- rm-120/rm-127/rm-129/rm-114 — watches and small code items, next cycles.

## Disclosures

- Engine cycle label vs repo lineage: cycle:1 vs cycle-4 batch (#4323).
- The cycle-4 research artifact was reconstructed this run with two
  measurement corrections (fro-bot/agent v0.113.2 not v0.79.0; tailwind
  4.3.3 = fork/current) — the corrections are recorded in the artifact's
  reconstruction note; the ROADMAP manual-revision block documents the same.
- PR #6 (visual gate, OPEN) runs in parallel; zero file overlap with this
  batch verified by name-only diff; its branch CI is red twice — branch-only,
  not a main break.
- rm-126's B1 decision (expose-and-document) is a semantics choice the
  implement phase MUST NOT relitigate silently — if implementation discovers
  discovered-row exposure is unintended (e.g. a denylist gap), stop and
  re-open the item instead of masking.

## Absorb ledger (cycle 4, B2 landing)

- `2941af0` (#497) — **ABSORBED verbatim** (`git show 2941af0 -- docs/solutions/ | git apply`): new integration-issues doc + two workflow-issues touch-ups.
- `d2510df` (#498) — **EXCLUDED**: corrects an upstream wiki-writer existence claim; this fork has no `wiki-writer/` and must never re-introduce the reference (invariant #3206).
- `d207fc7` (#499) — **MOOT**: corrects upstream's privacy plan doc; the fork never carried `docs/plans/2026-09-19*` and the kill-switch SW has no NavigationRoute denylist.

## Cycle-4 outcome addendum (2026-09-21, run 5351fd4e compound phase — implemented, pre-review)

Status: B1-B5 fully implemented in stewardship worktree
`conductor/run-5351fd4e039a` at a3bf45a (tree-identical to origin/main
9f978d1 at implement start). NOT landed — commit/push were prohibited phases;
landing + CI at the landed sha + review happen after this step.

Implemented evidence (all on the worktree tree):

- B1 rm-126 — aggregator.ts docstring rewritten to the expose-and-document
  decision; new lock test (driftCount = 2 discovered + 1 listed + 1
  denylisted filtered; discovered rows keep full_name). File run: 52 passed.
- B2 rm-131 — `git show 2941af0 -- docs/solutions/ | git apply` applied
  clean (+128 new integration-issues doc, two 6-line touch-ups); wiki-writer
  sweep clean; ledger above records #498-EXCLUDE / #499-MOOT.
- B3 rm-134 — README badges → codeo1io/dashboard (4 URLs), Endpoints
  inventory completed (/privacy + all four /api/listener routes, mount
  semantics verified at server.ts:273-274), dependabot.yml comment truthed
  (Renovate never runs; json5 retarget a3bf45a uninvoked), vite.config.ts
  kill-switch comment.
- B4 rm-133 — `minimumReleaseAge: 1440` (1d) with policy comment; 7d form
  REJECTED because weekly dependabot PRs would be unmergeable until their
  packages age past the gate (~2026-10-03 first-PR horizon); @bfra.me
  excludes kept; `pnpm config get minimumReleaseAge` → 1440.
- B5 rm-123 — .github/workflows/base-drift.yaml: weekly Mon 04:13 UTC +
  dispatch, self-hosted only, pinned checkout, digest via
  `docker manifest inspect | awk '/^Digest:/'` (never imagetools --format —
  silently ignored on attestation-bearing indexes), deduplicated drift issue,
  exits 1 on drift, never auto-bumps. actionlint container exit 0.

Gates on the implemented tree: `pnpm lint` 0 · `pnpm check-types` 0 ·
`pnpm test` 3071/3071 (2017 server incl. +1 / 1054 web) · frozen install
clean. Validation dispatch note: the literal `npm test -- --runInBand`
fails by CACError (vitest 4 rejects jest flags) — see
docs/solutions/workflow-issues/vitest4-cac-cli-rejects-jest-style-flags-2026-09-21.md;
`pnpm test` is the canonical equivalent and passed.

### Next-cycle heads (carry into cycle-5 assessment)

1. rm-112 + rm-132 aggregator pair — sequential per-repo fetch with
   cacheTtlMs == refreshInterval is the standing scalability ceiling;
   research-measured again 2026-09-21, deliberately deferred from cycle 4
   (drop order named B5→B3→B2 kept it out only under pressure).
2. rm-115 CSRF posture unification (listener acks Lax-only vs logout's
   x-csrf-token) and rm-116 branch-protection shell (empty required checks,
   enforce_admins off — PR #6's red branch runs corroborate the gap).
3. rm-120 clonedep refresh — fleet fro-bot/agent is v0.113.2 (NOT v0.79.0;
   the research artifact's fleet line was corrected same-day); the
   .slim/clonedeps mirror still pins v0.78.0.
4. rm-102 first dependabot PRs expected from the 2026-09-19 window
   (~2026-10-03); zero as of 2026-09-21 — if still zero past the horizon,
   re-audit dependabot delivery rather than assume drift.
5. B5 first proof: base-drift.yaml's first scheduled run (Monday 04:13 UTC)
   or workflow_dispatch — verify pinned 0e0ff40 vs live digest verdict and
   that the drift issue opens deduplicated.
6. Landing verification: the cycle-5 assessment must confirm the landed sha,
   CI green at it, and only then move rm-123/126/131/133/134 to completed.

## Landing gate riders (review re-measure, 2026-09-21, run 5351fd4e)

Re-measured at independent review (08:55Z) — the frame moved under the batch
THREE times on landing day (PR #6, PR #7, then 2f4d118 + 38fc511):

- **Frame now:** origin/main tip `38fc511` (2026-09-21T08:54:41Z, merge
  landing the parallel campaign's cycle-5 batch, run 87e3c32f) on `2f4d118`
  (08:37Z) on `d0d17fc` (PR #7, 04:47Z). Rebase the batch onto 38fc511 (or
  newer) and verify CI on the EXACT pushed sha (#3263 lesson).
- **wiki-writer regression: already fixed on main — do NOT re-strip.** PR #7's
  upstream sync (57c9c6b) had regressed `Dockerfile:10`/`:31` to
  `COPY wiki-writer/package.json` and made Release red at d0d17fc (run
  35562249072, `"/wiki-writer/package.json": not found`); `2f4d118`
  ("restore fork exclusion invariants") stripped it — 0 wiki-writer hits in
  `origin/main:Dockerfile` now. On rebase, just verify 0 hits survive
  (invariants #3206/#3210).
- **`.conductor/` tracking: also already fixed** — PR #7 had committed 18
  `.conductor/progress/*.ndjson`; 2f4d118 deleted them (0 tracked at tip).
  This worktree still keeps `.conductor/` untracked per #3256 — stage explicit
  file lists only, never `git add -A`/`git add .`.
- **Overlap with the landed frame — three files, one real conflict:**
  `ROADMAP.md` is a REAL merge conflict (their hunks :72/:124/:139/:148/:207+
  vs ours :45/:72/:91/:116/:147/:168/:185/:201 — both campaigns edited status
  lines; merge semantically, keep both, and reconcile the rm-ID space: their
  cycle-5 B6 dependabot-major-ignore comment is also labeled "rm-133",
  distinct from this batch's rm-133 minimumReleaseAge). `README.md` should
  auto-merge (ours :6-13 and :48-54; theirs :16-23 and :59-82 — adjacent,
  non-overlapping; our base a3bf45af was already free of the wiki-writer
  paragraph 2f4d118 removed). `.github/dependabot.yml` should auto-merge
  (ours = top comment :1-13; theirs = major-update ignore block :32+).
  The earlier PR #7 `web/vite.config.ts` adjacency note still applies
  (globIgnores hunk directly above B3's comment edit).
- **Suite-count expectation at landing:** the landed frame includes run
  87e3c32f's 17 new tests (their worktree measured 3103). After rebase the
  expected full-suite count is their-tip count + this batch's 1 new lock test
  (~3104), NOT 3071 — 3071 was measured against base a3bf45af. Verify against
  whatever `pnpm test` reports at the landed sha.
- **Deferred riders (P3-6 + info):** `base-drift.yaml`'s digest grep is
  `grep -oE 'sha256:[0-9a-f]{64}' Dockerfile` — it matches ANY sha256 pin,
  not only `FROM node@sha256:` (safe today: all pins are node:24-slim at
  Dockerfile:1/:21/:39, but it would false-flag a second digest-pinned base
  image). The advisory comment documenting this — plus the expectation that
  the workflow's first fire exits 1 while the drift issue is open — lands
  with the batch's commit; the file is a validation-digest surface mid-phase
  and an advisory comment-only edit is not worth invalidating the declared
  digest.
