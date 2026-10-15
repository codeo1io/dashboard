---
module: dashboard
tags: [repository-maintenance, cycle-1, batch, rm-100, rm-284, rm-279, gates]
problem_type: maintenance-batch
---

# Repository-maintenance cycle 1 — batch record (2026-10-15, run 796f73cf)

Batch `Gates green at HEAD`, implemented at base `5d5f9be` (== dispatch base;
origin/main one merge ahead at `3e3664c` for other runs, irrelevant here).

Ledger lead: `rm-100` (priority 100.0, ROADMAP.md:23). The same change unit
defuses `rm-284` (lint paragraph cliff, 97.0) and `rm-279` (Main Lint job
35-min timeout decomposition, 96.0) — dispositions below.

## Inputs

- assess `d73f8c5e` — gates at HEAD 5d5f9be: check-types green, lint RED 48
  (all in ROADMAP.md), root tests 3056/3057 with one cold-load flake
  (prose-residue 33283 ms > 30 s), web 1213/1213, audit clean.
- research `cfd21264` — upstream ladder (#619 contract 1.11.0 + releases
  .26-.29 unabsorbed), ecosystem majors; the absorb is queued next cycle.
- roadmap ext #45 `7372d149` — mints rm-1450/1451 + rm-486 flip; spool patch
  `roadmap-delta-796f73cf-7372d149.patch`, must land separately (bot-managed
  ledger surface).
- prioritize `2015e28a` — this selection; why it outranks the 1.11.0 absorb.
- stewardship `1f778c93` — the 5-surface change unit pinned below.

## Members (what changed)

1. **`eslint.config.ts`** — `ignores` gains `'ROADMAP.md'` with a rationale
   comment. ROADMAP.md is a bot-managed generated artifact (hermes-autonomy
   roadmap-sync rewrites it wholesale); the same exclusion class as
   docs/plans, docs/solutions, docs/brainstorms, .agents. Cures all 48
   chronic lint errors at HEAD and removes the paragraph-cliff file from the
   lint surface.
2. **`test/prose-residue-guard.test.ts`** — de-flake: `walk()` now prunes
   excluded directory subtrees during traversal instead of enumerating
   ~26.7K files (cold node_modules/.git) and filtering per-file afterwards.
   Kept-set equivalence proven byte-identical (481 == 481 files) against the
   old semantics, including the linked-worktree `.git`-is-a-file case kept
   out by a basename check in `isExcluded`.
3. **`test/roadmap-render-guard.test.ts`** (NEW) — frozen census guard for
   what the carve-out retires: trailing-whitespace lines <= 47, narrative
   rm-refs with neither def line nor Closed row pinned to the exact known
   set {rm-13640, rm-553, rm-678} (growth fails, renderer improvement
   passes), duplicate def-ids == 0 (def-line-only extraction), def-line
   count >= 235. Runs in milliseconds; complements the rm-284 length guard.
4. **`AGENTS.md`** — truth rider: the Fro Bot workflow claim
   ('disabled_manually, verified 2026-09-19') updated to the live state
   (re-verified 2026-10-15: workflow `active`, last run 2026-09-18 failed,
   `FRO_BOT_PAT` secret still absent — provision it before relying on the
   workflow).
5. **This batch doc** — records the selection, dispositions, and acceptance.

## Dispositions

- **`rm-279` (lint-job decomposition): defused by exclusion.** The 35-min
  self-kill ceiling (main.yaml:36-44) was attributed to a single ROADMAP.md
  markdown paragraph-length pass; with ROADMAP.md off the lint surface that
  pathological input is gone. Decomposition is not needed for the cliff
  class; revisit only if another file exhibits it.
- **`rm-284` (lint paragraph cliff): append defense stays.** The existing
  `test/roadmap-length-guard.test.ts` (non-comment line <= 4000 chars)
  remains; the new render guard adds the trailing-space / dangling-ref /
  dup-id censuses that repo-side lint used to (fail to) carry.

## Deliberate exclusions (this batch is dependency- and ledger-free)

- ROADMAP.md content edits — bot-managed; ext#44/ext#45 patch bands
  reconcile by title at the commit gate, separately from this unit.
- operator-contract 1.11.0 absorb (src/gateway, web/src/push,
  public/operator-*.js) — next cycle; needs green gates to prove narrow
  scope in a dark-CI world.
- package.json / pnpm-lock.yaml — workbox-*, @opencode-ai/plugin, rm-271
  majors; excluded so this batch's gates verdict is attributable to it alone.
- rm-135 (stranded PR #9) and rm-1411 (watchdog) — see the prioritize
  artifact for the recorded reasons.

## Acceptance (verified 2026-10-16, implement attempt f796c6c9)

- `pnpm check-types` — exit 0.
- `pnpm lint` — exit 0 (11 s, first green at HEAD since the render
  pathology; re-verified cache-independent via `pnpm exec eslint`, exit 0;
  ROADMAP.md now reports "File ignored because of a matching ignore
  pattern").
- Focused guard suites (node 24): `pnpm exec vitest run
  test/prose-residue-guard.test.ts test/roadmap-render-guard.test.ts
  test/roadmap-length-guard.test.ts` — 3 files, 7/7 tests passed, ~0.6 s
  (the prose-residue suite that flaked at 33.3 s cold now walks the pruned
  tree in ~0.2 s of test time).
- Full-suite / web / audit runs are reserved for the full_tests gate per the
  validation budget (focused tests only in implement).

## Provenance

Implemented by conductor attempt `f796c6c9` over the surviving tree state of
reaped sibling attempt `b0c4a106` (provider-killed mid-turn; its four file
surfaces were verified — including the prune-semantics equivalence proof and
the walk() basename fix folded in by this attempt — before adoption).
