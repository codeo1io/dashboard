# Prioritization batch 2026-09-21 — repo lineage cycle 5

Provenance: conductor run 87e3c32fa39a429989c7d8e5493b8e13, prioritize attempt 8532c9f44256458b8eb3c1fb734c6fe0, cycle-3 engine label.

Lineage numbering (disclosed per convention): the engine labels this run cycle 3, but repo lineage already carries
`2026-09-20-cycle-3-batch.md` (run f69cd740), and a parallel campaign (run 5351fd4e, unlanded worktree) holds
`2026-09-21-cycle-4-batch.md` — verified by filesystem probe 2026-09-21. To avoid the known same-name collision
hazard (two campaigns, one doc name), this batch takes lineage **cycle 5**. Engine label vs repo lineage differ
throughout; this doc is authoritative for this run's fix phase.

## Live frame re-measurement (stale-base rule)

- `git fetch origin` 2026-09-21: worktree HEAD `d0d17fc` == `origin/main` — no drift since assess.
- Workflow state at tip: Release **FAILED** (run 35562249072, COPY wiki-writer/package.json: not found,
  builder step 5/8); Main, CodeQL, Scorecard, visual all green at the same sha. GHCR `:latest` stale since
  4b1b406 (2026-09-20T21:53Z) — three consecutive Release reds (7ba9c82, b0ed12d, d0d17fc).
- `base-drift.yaml` absent on origin/main (the parallel cycle-4 work is not landed).

Inputs used, not redone: assess e3c515c5 (findings P0/P1/P2/P3 with CI evidence), research 829799a5
(candidates C1–C6 with sources), roadmap 7187054a (ROADMAP.md now carries rm-131..rm-133 and fresh signals on
rm-103/rm-116/rm-119/rm-123).

## Gated scoring (five axes: impact, risk-to-skip, risk-to-do, effort, dependencies)

Gates before value: (G1) does it restore or lock a currently broken invariant? (G2) can it complete end-to-end
this cycle on the single self-hosted runner? (G3) does it depend on unlanded parallel work?

| item | impact | risk-to-skip | risk-to-do | effort | deps | gated |
| --- | --- | --- | --- | --- | --- | --- |
| P0 Dockerfile fix (assess) | 10 — Release red now | 10 — every push ships a broken image path | 2 — remove 2 lines, restore pin | S | none | PASS |
| P1 exclusion sweep (assess) | 9 — security wording is the fork's contract | 9 — third merge regression already | 2 — restore from 4b1b406 | S | none | PASS |
| P1 untrack breadcrumbs (assess) | 7 — engine state published in a public repo | 6 | 1 — git rm --cached | XS | none | PASS |
| rm-131 guard test (88.0) | 9 — locks the whole regression class in Main | 9 — class recurred 2× in 4 days | 2 — one vitest file | S | B1/B2 land first | PASS |
| rm-132 Dockerfile validity gate (84.0) | 8 — PR-time failure instead of push-time | 8 — PR #7 merged green → Release red | 2 — one node test | S | none | PASS |
| rm-133 dependabot pins (74.0) | 6 — prevents ~2026-10-03 major-PR red | 5 — surprise red mid-cycle | 1 — yaml ignore rules | XS | none | PASS |
| rm-104 render hardening (98.0) | 7 — but the tool lives in the fleet repo | 6 | 3 — hermes-roadmap changes | M | outside this repo | HOLD — fleet scope |
| rm-103 absorb automation (85.0) | 7 | 5 | 3 — scheduled merge-PR machinery | M | wants rm-131 first | DEFER — enabled by B4 |
| rm-105 SBOM/provenance (80.0) | 7 | 4 | 3 | M | Release green first | DEFER — enabled by B1 |
| rm-116 branch protection (58.0) | 6 | 5 | 3 — account-level owner action | M | owner decision | DEFER — B5 mitigates meanwhile |
| rm-125 / rm-128 / rm-130 | — | — | — | — | in-progress in run-f69cd740 worktree | NOT re-selected (pending landing) |

## Selected batch — theme: restore the fork exclusion invariants, restore Release, lock the class at PR time

- **B1 — P0 Release restore** (assess P0). Remove `COPY wiki-writer/package.json` at Dockerfile:10 and :31;
  restore `corepack prepare pnpm@11.27.0` at Dockerfile:4 and :25 (the merge regressed it to 11.8.0); restore the
  trivy-history comment removed by 57c9c6b. AC: docker build succeeds locally; Release green at the pushed sha;
  GHCR `:latest` advances. Evidence: builder log reaches the final stage; `gh run list --workflow=release.yaml` green.
- **B2 — P1 exclusion sweep** (assess P1/P2; fork invariants). Drop the `wiki-writer/test` include at
  vitest.config.ts:8; restore the strict read-only wording in README.md, AGENTS.md and .github/copilot-instructions.md
  from 4b1b406 (strict "no write code path" contract). Scope note, freshly measured: pnpm-lock.yaml already carries
  zero wiki-writer references (b0ed12d regen) and renovate.yaml is already re-dropped (PR #7) — assess listed both,
  they are done. AC: repo-wide grep for `wiki-writer` WITHOUT extension filters (#3255 lesson) returns zero hits
  outside docs/prioritization history and this batch doc's own prose; binding docs consistent per the fork contract.
- **B3 — P1 untrack engine breadcrumbs** (assess P1). `git rm --cached` the 18 tracked `.conductor/progress/*.ndjson`
  files (verified count 2026-09-21); they stay on disk untracked. AC: `git ls-files '.conductor/*'` empty; landing
  gates stage explicit file lists only (#3256 — the repo does NOT gitignore .conductor/).
- **B4 — rm-131 merge-residue guard test**. Vitest test, no extension filters: zero `wiki-writer` occurrences in
  Dockerfile, README.md, AGENTS.md, .github/copilot-instructions.md, vitest.config.ts, pnpm-workspace.yaml; pnpm
  pinned 11.27.0; `.github/workflows/renovate.yaml` absent; no tracked `.conductor/` paths. Runs in Main so the
  57c9c6b class fails at PR time. AC: red on a scratch tree re-adding any one hazard; green at the fixed tree;
  Main run green including the new test.
- **B5 — rm-132 PR-side Dockerfile validity gate**. Node test parsing Dockerfile COPY/ADD sources across both
  stages against tree contents. Would have caught B1's breakage in seconds: Main never builds the image and
  Release is main-push-only. AC: red on the pre-B1 tree, green after; Main green; adds seconds not minutes
  (serialized single runner).
- **B6 — rm-133 dependabot major pins (rider)**. Ignore rules for major updates of vitest, typescript, pnpm in
  .github/dependabot.yml with a dated re-evaluation comment; validate with the repo's actionlint container command.
  AC: actionlint exit 0; `gh api` shows the ignore list; first weekly PRs propose minor/patch only.

Order: B1 → B3 → B2 → B5 → B6 → B4 (guard test lands last, over an already-fixed tree; B4 asserts what B1/B2
established).

## Deferred rationale and contingencies

- rm-104 (98.0) held: the renderer tool lives in the fleet repo; this run's roadmap manual-revision directive
  already mitigates on this repo. Raise with the fleet cycle, not this repo's fix phase.
- rm-103 (85.0) deferred one cycle BY DESIGN: its own signal says pair the next absorb with rm-131 — B4 unblocks it.
- rm-105 (80.0) deferred: supply-chain provenance on a red Release pipeline is lower value than restoring it.
- Parallel-campaign overlap disclosed: run 5351fd4e's cycle-4 batch (base-drift.yaml, B5 there) and run f69cd740's
  pending B1/B2/B3 (rm-125/128/130) may land interleaved with this batch. File-level collision surface is small
  (this batch touches Dockerfile, vitest.config.ts, three docs, dependabot.yml, two new tests); if a parallel
  landing moves origin/main, the fix phase re-measures before its own landing (stale-base rule applies to it too).
- Contingency: if Release is still red after B1 (pin/lockfile mismatch), regenerate the lockfile under pnpm
  11.27.0 and re-run — do not stack a second theory on an unverified one.
- Contingency: if the f69cd740 worktree lands first and touches vitest.config.ts, land B2/B4 after that landing
  and re-run the residue grep against the new tip.

## Implementation outcome (2026-09-21, implement attempt c6a1806d + full_tests 0bfe12f2)

- B1 RESTORED — Dockerfile from 4b1b406 baseline: pnpm 11.27.0 x2, both wiki-writer COPY lines removed, trivy-history comment back; verified by local docker build (manifest sha256:cb0ce8a…).
- B2 RESTORED — README/AGENTS/copilot-instructions strict wording + codeo1io/.github org; vitest include clean; one legit upstream improvement (v0.107.1 cache-purge note) re-applied to AGENTS.md.
- B3 DONE — 18 .conductor ndjson untracked (staged-D, contents on disk).
- B4 DONE — test/fork-exclusion-guard.test.ts (9 invariants, no extension filters; negative-verified).
- B5 DONE — test/dockerfile-context.test.ts (COPY/ADD parse; negative-verified).
- B6 DONE — dependabot.yml npm ignore for vitest+typescript majors (re-eval 2026-10-21); pnpm pin guarded by B4 instead (not a dependabot surface).
- Extra beyond batch: merge-deleted .slim/clonedeps.json restored and added to the B4 guard.
- Gates at implementation time: pnpm lint ✅, check-types ✅, pnpm test 31 files/2033 + 28 files/1070 ✅.
- Unlanded: review/commit/push gates remain; landing must stage explicit file lists (.conductor/ stays untracked).
