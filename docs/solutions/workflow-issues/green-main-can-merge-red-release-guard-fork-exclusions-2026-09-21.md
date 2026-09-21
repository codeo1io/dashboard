---
title: A green Main can merge a red Release - guard fork exclusions with negative-invariant tests
date: 2026-09-21
category: workflow-issues
module: dashboard
problem_type: fork_maintenance
component: development_workflow
severity: high
applies_when:
  - Maintaining a fork that deliberately diverges from upstream (excluded workspaces, pinned toolchains, stricter doc wording) and absorbing upstream merges
  - The fork's PR gates do not exercise every landing surface (e.g. no docker build on Main while Release runs main-push-only)
  - A prior run drafted a guard test but never landed it, so nothing fails when an upstream merge reverts fork-only state
tags:
  - fork-maintenance
  - merge-residue
  - guard-tests
  - ci-gates
---

## Problem

The 2026-09-20 upstream merge `57c9c6b` landed on a fully-green Main gate set (Lint, Design,
Types, Test, Check Workflows, Scripts Load) and simultaneously broke Release: the merged
Dockerfile gained `COPY wiki-writer/package.json` for a directory this fork does not carry.
Release runs only on push to main, so the break surfaced after merge as run `35562249072`
builder step 5/8 — the third consecutive red Release — while GHCR `:latest` went stale.

The same merge silently reverted every other fork divergence it touched: the pnpm pin
(11.27.0 → 11.8.0), a `wiki-writer` include in `vitest.config.ts`, the stricter
"read-only by construction" wording in README/AGENTS/copilot-instructions, the metadata
source org (codeo1io → fro-bot), deleted `.slim/clonedeps.json`, and `git add -A`-style
tracking of 18 engine-internal `.conductor/progress/*.ndjson` files.

Three compounding causes:

1. **No negative invariant had teeth.** A prior run drafted a guard test; only its
   breadcrumbs landed. Nothing in Main asserted the *absence* of upstream-only content,
   so a merge that reintroduced it merged green.
2. **Extension-filtered sweeps miss extension-less files.** The Dockerfile carried the
   loudest regression and matches no `*.ts`/`*.md` filter.
3. **PR gates do not cover the Release surface.** A Dockerfile referencing a missing
   build-context path is valid YAML-shaped text to every Main gate.

## Solution

Two layers, both landed as ordinary vitest files (they run in Main automatically via the
existing `test/**/*.test.ts` include — no workflow wiring):

**Restore first, from the last-good baseline.** `git diff <last-good> HEAD -- <files>`
per file decides the strategy: when the delta is pure regression (every hunk reverts
fork-only state), `git checkout <last-good> -- <files>` is exact and auditable. One
targeted edit re-applied the single legit upstream improvement the merge carried, so no
real content was lost. Do not hand-rewrite what git can restore byte-for-byte.

**Then guard the class, not the instance** (`test/fork-exclusion-guard.test.ts`):

- absence assertions use a content regex with **no file-extension filters**
  (`/wiki[-_]writ/i` across Dockerfile, README, AGENTS, copilot-instructions,
  vitest.config.ts, pnpm-workspace.yaml)
- pins asserted where they live (pnpm in Dockerfile stages *and* `packageManager`)
- structural claims asserted too: excluded directory absent, removed workflow absent,
  metadata org correct in binding docs, fork manifest present, `git ls-files .conductor`
  empty
- a second test (`test/dockerfile-context.test.ts`) parses `COPY`/`ADD` sources from both
  stages (skipping `--from=` stage sources) and fails on any referenced path missing from
  the tree — seconds of Node instead of a docker build, friendly to the serialized
  self-hosted runner

**Prove the guards red before trusting them green.** Re-inject one real hazard line
(`sed` the upstream COPY back in), watch exactly the expected tests fail, restore, watch
the suite green. A guard that cannot be shown to fail is decoration.

## Prevention

- Treat "diff vs last-good fork baseline is empty" on Dockerfile/README as a red flag,
  not convergence: this fork *must* differ from upstream on its exclusion surfaces.
- Any drafted-but-unlanded guard test is an open wound — land it or delete the belief
  that it protects anything.
- Land gates should stage explicit file lists; `git add -A` after an upstream merge is
  how engine-internal breadcrumbs become tracked repo files.
- When the engine's validation template names a command this repo cannot run
  (`npm test -- --runInBand` → vitest 4 `CACError`), run and record the repo-canonical
  translation (`pnpm test`) with the probe evidence, never silently skip.

## References

- Prior art in-repo: `upstream-merge-exclude-workspace-package-2026-09-17.md` (the
  original exclusion mechanics — this entry is what happens when they are not guarded)
- Cycle record: `docs/prioritization/2026-09-21-cycle-5-batch.md`, roadmap rm-131/rm-132
- Release failure evidence: run `35562249072`; last good `4b1b406` (2026-09-20T21:53Z)
