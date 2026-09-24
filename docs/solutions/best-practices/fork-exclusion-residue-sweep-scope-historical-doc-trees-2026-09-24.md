---
title: Fork-exclusion residue sweep — canonical scope and the historical-doc-tree boundary
date: 2026-09-24
category: best-practices
module: dashboard
problem_type: tooling_decision
component: development_workflow
severity: medium
applies_when:
  - Sweeping for wiki-writer or other fork-excluded upstream residue anywhere in the repository
  - Deciding whether a historical prose reference in docs/ is "residue" or an intentional record
  - Writing or reviewing the detection command for an exclusion sweep (assess/review/landing gates)
---

## Context

Run 602f80de (2026-09-24, cycle 9) codified the fork-exclusion residue sweep — before
this doc, the sweep existed only as campaign convention (memory + batch-doc prose), and
its implied boundary disagreed with reality: a repo-wide no-filter grep for `wiki-writer`
returns 9 hits, **all historical prose** — 4 in `docs/solutions/`, 5 in
`docs/ideation/` — while code, config, and CI are clean (the operative guard is the
fork-exclusion test family, rm-131 lineage). Leaving the boundary implicit risks the two
opposite failures: a future sweep treating the historical corpus as actionable residue
(rewriting dated archives) or, worse, someone "fixing" the sweep by scoping it to a
path/extension subset that hides real residue — the exact miss mode documented in
`best-practices/binding-doc-consistency-greps-avoid-pathspec-miss-2026-09-20.md`
(the extension-less `Dockerfile` hid `COPY wiki-writer/package.json` lines) and the
cycle-7 path-scope lesson (a `.github/ AGENTS.md` scope hid 3 stale sites in
`vitest.config.ts` and `web/vitest.config.ts`).

## Guidance

- The canonical sweep is **repo-wide with NO extension filter and NO pathspec filter**:

  ```sh
  grep -rn '<term>' . \
    --exclude-dir={.git,node_modules,web/dist,.agents,.conductor,solutions,ideation,prioritization}
  ```

  `--exclude-dir` matches a directory **basename**, never a path —
  `--exclude-dir={docs/solutions,…}` silently excludes nothing (verified live
  2026-09-24: path-form returned the identical 41-hit set as no exclusion).
  Never narrow by `--include` or by a path list; the extension-less
  `Dockerfile` and cross-tree test configs are exactly where residue hides.

- **Historical doc trees are intentional references, not residue.** `docs/ideation/` and
  `docs/solutions/` are dated archives narrating decisions (e.g. the 5 ideation hits all
  describe the exclusion work itself: upstream `COPY wiki-writer/package.json` lines the
  fork removed). Rewriting them to satisfy a sweep falsifies the record; the fork
  invariant is enforced where it bites — code, config, CI — by the fork-exclusion guard
  tests and by this sweep's empty result outside the excluded trees.

- **New dated docs may add hits.** A doc written today that mentions the excluded term
  (this one does) joins the corpus; the sweep's acceptance is "zero hits outside the
  excluded trees," never "zero hits anywhere."

- If a hit outside the excluded trees is live prose (a README claim, an AGENTS.md
  example), treat it as actionable: rewrite to read-only wording per the exhaustive
  exclusion convention, do not extend the exclusion set past the historical trees.

## Verified corpus (2026-09-24, worktree at batch implementation)

| Location | Hits | Character |
| --- | --- | --- |
| `docs/solutions/` | 18 | historical problem narratives across 4 docs (incl. this doc) |
| `docs/ideation/` | 5 | dated research archives narrating the exclusion work (2 docs) |
| `docs/prioritization/` | 9 | cycle batch docs narrating the invariant (2 docs) |
| `test/fork-exclusion-guard.test.ts` | 4 | the guard itself — asserts the workspace's absence |
| `test/dockerfile-context.test.ts` | 1 | locks the Dockerfile COPY-line exclusion |
| `ROADMAP.md` | 5 | ledger narration of the invariant (rm-131 lineage) |
| source / config / workflows / scripts / binding docs | 0 | enforced by the fork-exclusion guard family |

Hit sites outside the excluded trees are **intentional only** when they are the
enforcement (guard tests) or the ledger (ROADMAP); anything else is actionable
residue. Roadmap: rm-161. Landing evidence: the canonical grep above returns only
the rows above; `test/fork-exclusion-guard.test.ts` green.
