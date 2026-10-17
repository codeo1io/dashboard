---
module: dashboard
tags: [landing-merge, adoption-collateral, silent-file-drop, cat-file-matrix, union-guard, restore-discipline, prose-residue-exclusions, docs-truth-riders]
problem_type: workflow-issue
---

# Landing-merge adoption collateral: a merge silently kept one side's file deletions (53-file drop, detection, restore, union guard)

Recorded 2026-10-17 by the repository-maintenance cycle:4 compound phase
(conductor run 9d5c156d444f431cac6fed15fa63ba82), from that cycle's assess
(attempt 2ff9aff3), prioritize (a66b3d94), implement (2f245515, attested
df78c2fc), and full-validation (939aff96) evidence. Ledger items: rm-857
(the restore), rm-649/rm-648 (restored guards), rm-860/rm-482 (riders).

## Problem

After the October upstream-adoption landing lineage, 53 whole files were
silently absent at base 3e3664c (origin/main tip on 2026-10-15) — tests,
guards, workflows, scripts, and docs — plus six content-level feature losses
inside surviving files (robots routes and allowlist in `src/server.ts`,
ErrorBoundary mount in `web/src/main.tsx`, `ACK_FETCH_TIMEOUT_MS`/ack-failure
banner in the listener pair, `refreshDegraded` whitelist and degraded banner in
the monitoring pair, focus re-probe in `web/src/App.tsx`, keyVersion metadata
in `web/src/push/subscribe.ts`). **No gate was red because of it**: the dropped
files were largely the guards that would have noticed, and a dropped test file
cannot fail. The only visible symptom was `pnpm lint` red — and that was an
unrelated 50-error ROADMAP batch, not the drop.

## Mechanics (why git did this silently)

- The drop first appears at merge 88e423a, whose BOTH parents' trees contain
  the files: `git log --full-history --graph -- test/read-only-invariant-guard.test.ts`
  shows last-with e49a72a, first-without 88e423a. The deletion was produced by
  merge resolution, not propagated from either parent tip.
- Later, the landing merge of the adoption lineage (p1, toward 5d5f9be) over
  the maintenance lineage (p2, 06396b4 — which still had everything) took the
  deletions. This is default git semantics, not corruption: when side A deletes
  a file relative to the merge base (364272b) and side B leaves that file
  untouched since the base, the merge deletes it **without conflict**. 53 files
  p2 had merely *kept* — not modified — vanished with zero conflict hunks.
- `git log -- <path>` hides this under default simplify history; only
  `--full-history` (ideally `--graph`) shows the deletion path. A reviewer
  reading the landing diff as "p2's changes" sees nothing: the files were
  never in the diff because they were already gone on the p1 side being
  landed.

## Detection recipe (proven 2026-10-15, reuse verbatim)

1. **Presence matrix by cat-file** — for the three-way frame, per file:
   `git cat-file -e <base>:<file>`, `<p1>`, `<p2>`, `<result>`. The signature
   of this failure class is `base:Y p1:n p2:Y result:n` — the merge had a
   parent that kept it and still dropped it.
2. **Mass-drop census by comm** —
   `comm -13 <(git ls-tree -r --name-only 06396b4 | sort) <(git ls-tree -r --name-only HEAD | sort)`
   lists every file p2 had that the result lacks; classify each against the
   matrix (intentional upstream deletions will show `base:n` or `p1:n p2:n`).
3. **First-vanish bisection** — per file,
   `git log --full-history --graph --oneline -- <file>`; the first commit
   whose tree lacks it while both parents have it is the merge that resolved
   to deletion.
4. **Zero-ref grep battery** — feature terms whose repo-wide count must be
   non-zero (this cycle: `robots` in `src/server.ts`, `ACK_FETCH_TIMEOUT_MS`,
   `refreshDegraded`, `ErrorBoundary` in `web/src/main.tsx`,
   `listener-ack-failure`). A count of 0 means the feature is gone from every
   surviving file, which whole-file presence checks cannot see. Run this in
   every assess phase; it is the only check that catches content-level loss.

## Cure discipline (what "restore" must mean)

- **Reconcile against drift, never blind-revert.** Restore sources are the
  last-holding commits (here p2 06396b4), but everything moved since: adopt
  byte-identical where no drift (49 of 53 files), re-derive where the guard
  itself must name new terms, and reconcile restored feature hunks against
  upstream drift in the surviving files.
- **One canonical spelling per guard.** The drop left two spellings of the
  read-only invariant guard behind different lineages; the restore unions them
  into ONE canonical file (rm-649) rather than re-landing both.
- **Restored machinery needs its exclusion riders.** Restored guard tests that
  name their own terms (wiki-writer family, lane-drop paths) must carry their
  `test/prose-residue-guard.test.ts` `EXCLUDED_FILES` entries — restore the
  canonical 06396b4 entry verbatim and add one for any NEW guard machinery
  (`test/landing-merge-union-guard.test.ts`). The cycle's first full-suite run
  failed exactly here (22 offender lines, 3107/3108); the fix was
  convention-exact, +2 lines.
- **Restored docs may narrate events that never happened.** Dropped workflows
  mean their "scheduled first fire" never occurred; the surviving docs that
  narrate it get dated supersede annotations naming the collateral drop
  (docs-truth riders, applied to the cycle-3 batch docs — the rm-779 deferred row
in 2026-10-10-cycle-3-batch-run-e5b718478274.md, and the claimed-and-excluded
plus cycle-4-entry-points bullets in
2026-10-09-repository-maintenance-cycle-3-batch-run-d8fdf8b79ad5.md).
- **Endpoint docs couple.** A restored robots endpoint means README's endpoint
  line rides the same batch — presence-parity guards will name it.

## Root-cause guard (the durable fix)

`test/landing-merge-union-guard.test.ts` (NEW in this restore, no upstream
counterpart): asserts that no file present in BOTH parents of a merge commit
is silently absent from the merge result — deletions must be explicit in the
merge commit, not an accident of resolution. It runs over the repo's landing
history, so future adoption merges that resolve to deletion fail a test
instead of shipping quietly. Ride it in every future batch; its
prose-residue `EXCLUDED_FILES` entry is part of the guard set.

## Prevention checklist

- After ANY landing/adoption merge: run the mass-drop census (recipe 2) and
  the zero-ref grep battery (recipe 4) before trusting the gates.
- Treat "guard file absent at HEAD" as a red flag in itself — presence of the
  guard suite is itself an invariant; the roadmap census guard
  (`scripts/roadmap-census.ts` + `test/roadmap-integrity-guard.test.ts`,
  both restored by this batch) is the ledger-side instance of that idea.
- When merging a lineage that carries upstream adoptions, diff the merge
  result against BOTH parents for the deleted-file set, not just the base —
  `git diff --diff-filter=D --name-only <p2> <merge>` on the landing commit
  exposes silent deletions p2 never chose.
