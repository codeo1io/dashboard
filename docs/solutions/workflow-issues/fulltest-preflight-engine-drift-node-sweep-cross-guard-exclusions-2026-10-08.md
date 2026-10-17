---
module: dashboard
tags: [full-validation, pre-flight, engine-release-drift, node-modules-sweep, prose-residue-guard, cross-guard-coupling, excluded-files, guard-suites]
problem_type: workflow-issue
---

# Full-validation pre-flight: engine-release drift, host dependency sweeps, and cross-guard exclusion coupling

**Date**: 2026-10-08 · **Runs**: conductor `3ff5a80c` full_tests `d91247009f2347d8ac3d69d3c9bf4e7c` (all three classes caught before the cloud route; one real regression cured) · **Tree**: run worktree HEAD `5b8a88f8` + the 14-surface uncommitted cycle-1 batch.

## Symptom

Three unrelated failure classes surface only when the authoritative full gate runs — after implement and targeted suites have already passed:

1. The validation digest recomputed for dispatch does not match the stamp recorded earlier in the same cycle (the engine release moved underneath the phase).
2. The local suite dies instantly on module resolution (`vite`/`vitest` not found) while `git status` shows a perfectly green-looking tree.
3. `test/prose-residue-guard.test.ts` fails with dozens of "New prose residue" entries pointing at a brand-new guard test file that both earlier phases passed.

## Mechanism

1. **Engine-release drift.** The conductor engine ships its own `validation_policy.py` / `github_ci_validate.py`; a release move between phases swaps the very code that computes digests and gates the cloud route. Contract knowledge (fold gates, route rules) and every earlier stamp are only valid for the release that produced them.
2. **Host dependency sweeps.** Between turns, a host-side cleanup deleted the worktree's root `node_modules/` (the `web/` workspace survived). Nothing tracked changes — the tree stays clean while the runtime cannot resolve anything.
3. **Cross-guard exclusion coupling.** The rm-164 prose-residue guard walks every repo file with no path filter. A guard suite whose machinery names the terms it polices (forbidden packages, method names, wrapper shapes, docblock prose) reads as "residue prose" to that guard. Focused suites are selected per changed surface, so they structurally cannot see the interaction — only the full gate can.

## First-hand instance (this repo, 2026-10-08)

- Engine moved `7cc76f58` → `82f2a2e1` between the targeted and full phases. `github_ci.py` + `validation_policy.py` diffed byte-IDENTICAL, so the contract knowledge carried — and the digest recomputed on the NEW release still equaled the dispatch stamp (`validation:v1:b940252a…`, verified 4×). Without the diff check this would have been an assumption, not a fact.
- Root `node_modules/` was gone. `pnpm install --frozen-lockfile` restored it in 9.1 s; lockfile and tracked tree verified unchanged afterward.
- Implement's NEW `test/read-only-invariant-guard.test.ts` (rm-649) carries 20 wiki-writer-family mentions inside its own machinery → prose-residue guard red (`:139`, 20 entries). Cured in-batch by the guard's designed precedent (`fork-exclusion-guard` is excluded the same way): an `EXCLUDED_FILES` entry with the comment `guard machinery names its own terms`, plus the exclusion-census comment truthed from "two guard suites" to "guard suites" (now three).

## Prevention rule

1. At every validation phase, check the engine release id against the one that produced earlier stamps. If it moved: diff the policy files, and recompute the digest on the CURRENT release against the dispatch stamp before trusting any carry-over.
2. Bootstrap-check before an authoritative long suite. If resolution fails on a green tree, suspect infrastructure (host sweeps), restore with `pnpm install --frozen-lockfile`, and re-verify the tracked tree is unchanged afterward — do not debug the batch first.
3. Adding a guard suite — or any test that must quote the patterns it polices? In the SAME batch, add the new file to the prose-residue guard's `EXCLUDED_FILES` with the designed comment, and keep that guard's exclusion-census comment truthful. Targeted suites cannot catch this class; scheduling it for the full gate guarantees a wasted cloud cycle.

## Related

- `docs/solutions/workflow-issues/ephemeral-ci-route-prepush-workflow-byte-collision-2026-10-06.md` — the other pre-cloud abort class on this route.
- `docs/solutions/workflow-issues/targeted-runner-blind-spots-web-config-untracked-tests-2026-10-04.md` — why focused suites miss cross-cutting guards (the structural companion to rule 3).
