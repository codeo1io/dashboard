# Dashboard maintenance — cycle 1 batch (2026-10-06, run 9189a4ac)

module: dashboard
tags: `[lockfile, frozen-install, audit-floors, ledger-restore, ledger-integrity-guard, render-governance, repository-maintenance]`
problem_type: batch-record
base: 3d07cf9 == origin/main at dispatch (origin/main advanced to fe928ca mid-campaign; this batch stays pinned to the work-order base — see Outcome)

## Frame

Repository-maintenance cycle 1, run `9189a4ac596b462e9bc4971b3a94f0c0`, campaign
`3dbaa478b7ce452ab1306e191a629314`. Phase lineage: assess `bc717b84` (pristine
clone: frozen-install wall rc=1 `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`, 19 audit
advisories, 25 lint errors all in ROADMAP.md, corrupted 197-def ledger),
research `26e5188833cf`, roadmap `e36ee40cfb23` (patch vs c5b7cd7d's
compose-forward shape — later superseded by the restore-union decision below),
prioritize `9aea259f` (batch selection + live id-collision resolution),
stewardship `585b2c0d` (change-unit contract, 14 surfaces, 6
must-remain-separate pairs). Implement: reaped attempt `0828510109` composed the
batch in this worktree (provider failure at ~9.5 min, no result envelope);
re-dispatch attempt `230e55e6` verified the inherited composition surface-by-
surface against the stewardship contract before adopting it, then completed and
validated the batch. All work is uncommitted in
`/home/agent/.hermes/conductor-worktrees/dashboard-864ca327c8/run-9189a4ac596b-9189a4ac`.

Batch: **B1–B5 — 'Unfreeze the install, floor the advisories, restore the
ledger, armor the ledger class'**. Selection rationale and the unlanded-lineage
census live in `delegate/9aea259f…-batch-selection.md` (spool).

## B1 — cure executable set, byte-adopted (8 files)

PR #389's 9-file diff (head `ci-6f0d0d063134`, checks 11/11 green; PR later
CLOSED UNMERGED, ref deleted — the commit object is held locally and the batch
content survives in fleet worktrees) minus ROADMAP.md (replaced by B3).
Byte-adoption source: run e9bc28f5's worktree blobs (provenance proven twice in
fleet batteries). Every adopted file verified `git hash-object` IDENTICAL to
the source blob this attempt:

| Surface | Blob (both trees) |
| --- | --- |
| `.github/workflows/lockfile-guard.yaml` (NEW +62) | `c3f7b6d9` → `97a8ebf6` (full_tests harmonization) → `1ab27c9` (review-fix R1, byte-adopted from live main) |
| `Dockerfile` (+20/−7) | `88d1e57d` |
| `package.json` (+1/−1, `packageManager` pnpm 11.28.3→11.28.4) | `2312d0f6` |
| `pnpm-workspace.yaml` (+18/−2 + B2 floors) | `33fb7d5b` |
| `pnpm-lock.yaml` (full regen) | `a9dfc490` |
| `test/fork-exclusion-guard.test.ts` (+4/−4) | `95610ff9` |
| `docs/prioritization/2026-10-05-…cfa9f94b.md` (NEW +165) | `abdf79a1` |
| `docs/solutions/workflow-issues/pnpm-lockfile-config-mismatch-…md` (NEW +106) | `3219e80a` |

## B2 — audit floors + proven lockfile blob

`pnpm-workspace.yaml` floors region carries `source-map-js: '>=1.2.2 <2.0.0'`
and `katex: '>=0.18.2 <0.19.0'` with the dated advisory rationale
(GHSA-68fv-2mgg-jv7q HIGH, GHSA-238p-pmpm-9mq7 LOW). `pnpm-lock.yaml` is the
twice-fleet-proven blob `a9dfc49059e369ab9a89b8f3aecb96dd05513cf2`
(`git hash-object` re-verified this attempt) — closes the 2 time-defeated
advisories ahead of the 2026-10-12 03:37Z weekly audit fire. Frozen-install
and audit re-execution belong to the full battery (B5/full_tests), reserved by
the work order's focused-test budget for this phase.

## B3 — ledger restore-union (ROADMAP.md)

Replaces 3d07cf9's corrupted 197-def shape. Composition, proven by two diffs
this attempt: (A) 306a972 → e9bc28f5's worktree ledger is pure **+32/−0**
(rm-674 schedule-hygiene mint + cure riders); (B) e9bc28f5 → this batch adds
ONLY the cycle-1 extension census comment + 7 dated riders (rm-103 upstream tip
da0528f3; rm-108 in-range stragglers; rm-117 secret-scanning convergence →
rm-677 fold; rm-120 agent dual-tag channel; rm-133 TS peer gate 8.71.1
`<6.1.0` holds; rm-139 Node v24-maint 10-20 / v26-LTS 10-28; rm-140 pnpm
12.9.1 + majors window + katex ceiling) + the rm-680 mint (render-landing
channel governance). Census: **217 defs / 0 dups / max rm-680, next free
rm-681**; `rm-675..rm-679` defs deliberately absent (unlanded sibling claims:
c5b7cd7d/67868217 own 675–677, 85e37a8b owns 678/679). Id-collision
resolution: this run's roadmap-phase rm-678 draft renumbers to **rm-680**;
its schema-guard draft folds INTO 85e37a8b's rm-678 as the vitest half (one
item, two halves).

## B4 — ledger-integrity guard, both halves of rm-678 (the only new code)

- `scripts/roadmap-census.ts` — no-install census guard: bare `node`, zero
  dependencies (node: builtins only), Node 24 native strip-only TS per repo
  convention (the stewardship sketch named `.mjs`; `.ts` chosen to match the
  scripts/ convention and the test's typed import — functionally equivalent).
  Detects duplicate ids, defs below the 200 floor, trailing-whitespace
  acceptance hollowing, bare bracket-list residue; prints the status
  histogram.
- `test/roadmap-integrity-guard.test.ts` — vitest schema half: unique ids,
  healthy-defs floor, id-ceiling tripwire (680 — bump on next mint), status
  vocabulary, non-empty acceptance on open defs, empty violations mirror,
  census-comment truth, and the corruption fixture (`git show 3d07cf9:ROADMAP.md`)
  proving the guard is RED on the corrupted blob (197 defs, trailing-ws > 0)
  that every landed guard passed.

Four corrections made by the completing attempt over the reaped composition:
(1) the census-comment path reference (`.mjs` → `.ts`); (2) the
newest-census-claim selector — document order is not chronology in the restored
ledger (2026-10-04 extension comments carry historically-true census claims
below the 2026-10-06 one), so "newest" now selects by the comment's
`(YYYY-MM-DD,` date, not position; (3) the inherited STATUS_ENUM omitted the
live `blocked-external` token (2 defs use it) — the vocabulary test was born
red and now passes honestly; (4) both guard files were brought gate-clean
(repo eslint style + `noUncheckedIndexedAccess` strictness — the reaped
attempt never ran the gates; 21 initial errors → 0).

## B5 — focused battery this phase (full battery reserved for full_tests)

| # | Gate (focused) | Result |
| --- | --- | --- |
| 1 | `node scripts/roadmap-census.ts` (bare node, no install) | rc=0, `defs=217 dups=0 max=rm-680`, census healthy |
| 2 | `vitest run test/roadmap-integrity-guard.test.ts test/fork-exclusion-guard.test.ts` | all pass, incl. fixture RED-direction proof |
| 3 | `pnpm lint` (repo eslint incl. ROADMAP.md, new docs, yaml) | rc=0 (3d07cf9's 25 ROADMAP errors → 0) |
| 4 | `pnpm check-types` (server incl. scripts/, web, .opencode) | rc=0 |
| 5 | actionlint, container form, `lockfile-guard.yaml` | rc=0 |

## How to verify (from the worktree root)

```bash
git status --porcelain                    # the 12-surface batch, uncommitted
git hash-object pnpm-lock.yaml            # a9dfc49059e369ab9a89b8f3aecb96dd05513cf2
grep -c '^- id: `rm-' ROADMAP.md          # 217
node scripts/roadmap-census.ts            # defs=217 dups=0 max=rm-680, rc=0
node_modules/.bin/vitest run test/roadmap-integrity-guard.test.ts
pnpm lint && pnpm check-types
```

## Outcome and next-cycle notes

- Provenance forensics: reaped attempt `0828510109`'s work product was
  verified (not blindly adopted) against the stewardship contract — blob
  identity for all 8 adopted files, the two-diff ROADMAP composition proof,
  guard-file review — before this attempt completed it. The durable trail:
  `events/0828510109….jsonl` (13 events, `session_reaped(failed)`).
- Sibling hygiene honored: e9bc28f5 / c5b7cd7d / 85e37a8b worktrees untouched
  (byte-adoption was git-blob-level only); shared repo stashes (foreign
  `run-743f2e47fc3b` / `integrate-db83c0e5d133` entries) left alone.
- Merge-release watch: origin/main advanced to `fe928ca` mid-campaign — it
  carries a 58-line `lockfile-guard.yaml` variant (comment-prose-only
  divergence from this batch's 62-line adopted blob; triggers/steps identical)
  plus its own floors/lockfile/ROADMAP layers. Landing must reconcile
  guard bytes (adopt main's, zero functional change), union the floors (both
  carry source-map-js/katex), re-derive the lockfile if the union moves it,
  and 3-way the ROADMAP riders (fe928ca's ledger is a 217-def restored shape
  with max rm-659; union by id, parameterize any Closed-section census guard
  on the chosen base).
- Deferred (per prioritize): rm-116 protection fill at integrate; rm-680's
  enforcement half (needs rm-116 + emitter config); rm-681 is next free.

## Review-fix amendments (2026-10-06, independent_review:fix attempt 51d2a6d8, remediating review 176de71b)

Post-review reconciliation against the live tip `ac61ff3433de6fc027762d0b36e7c31ae71c3151`
(re-probed this attempt; the batch-table blobs above are implement-time
provenance and superseded where noted):

- **R1** `.github/workflows/lockfile-guard.yaml` byte-adopted from main
  (`1ab27c93c45c78b379bbc75d184b7c75e5fd75e6`, 68 lines, comment-only vs the
  prior staged variant — stripped-diff empty below headers, actionlint rc=0).
- **R2** `ROADMAP.md` re-united onto ac61ff3's 222-def canopy + our
  `rm-674`/`rm-680` blocks + all 11 dated 2026-10-06 riders: union-complete
  (def-id set == staged ∪ main), census 224 defs / 0 dups / max rm-680,
  trailing-ws 0; the extension comment's census claim refreshed to 224/0/680
  (main's own 2026-10-05 claim of 220/0/651 was stale vs its actual 222/659).
- **R3** the cfa9f94b cycle-3 record doc byte-adopted from main's landed
  267-line `2675be1f` variant (our staged 165-line shape was a strict prefix;
  lossless — the only overlapped line was main's amended audit-table row).
- **R4** `Dockerfile` (now `2fc5c232…`) and `pnpm-workspace.yaml` (now
  `4e6b4986…`) byte-adopted from main — normalized diff proven comment/prose +
  one adjacent WORKDIR↔apt-get line transposition only, zero functional delta.
- **R6** `test/roadmap-integrity-guard.test.ts` corruption fixture now
  fetches `3d07cf9` on demand (`git fetch --depth=1 origin <sha>`) so the
  red-proof half no longer silently skips under shallow CI checkouts; offline
  fallback (skip) preserved.
- Already byte-identical to main before this fix: `package.json`,
  `pnpm-lock.yaml` (`a9dfc490`), `test/fork-exclusion-guard.test.ts`, the
  frozen-install solutions doc. Residual merge surface vs ac61ff3 after this
  fix: the ROADMAP additive union + four genuinely new files (the B4 pair, this
  doc, and nothing else — the guard/Dockerfile/workspace/cfadoc are now
  byte-equal, so no add/add remains on any shared path).
