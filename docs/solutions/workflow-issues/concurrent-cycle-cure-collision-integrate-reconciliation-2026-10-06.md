---
module: repository-maintenance
tags: ['conductor', 'integrate', 'concurrent-cycles', 'lockfile-guard']
problem_type: workflow-issues
---

# Concurrent-cycle cure collision — reconcile at integrate before merge_release

## Problem

Two hermes-conductor repository-maintenance cycles can author overlapping cures
off the same base and validate them independently to fully green, while each is
blind to the other's batch. The first to land reshapes `origin/main`; the second
batch's validation record no longer describes a tree that merges cleanly. This
happened live on 2026-10-06: run `c6cd7c83df84424…` (base `306a972`) validated
its rm-673 cure batch to 11/11 green on ephemeral PR `#398` (snapshot
`e78286af`), while sibling run `5e66155863354a2d8…` — off the same base — landed
its own variant (landing `032fb6f` + merge `fe928ca`) at 08:22Z, between the
first run's implement fold and its full-suite check-wait.

## Signals

- Both batches carry the same cure surfaces: `.github/workflows/lockfile-guard.yaml`
  (62-line census-guarded variant vs the landed 58-line variant), floor sets in
  `pnpm-workspace.yaml`, their own `pnpm-lock.yaml` regens, `Dockerfile` edits,
  and ROADMAP rider layers — five colliding paths.
- Both were independently 11/11 green; neither validation covers the union tree.
- `git merge-base <base> origin/main` still shows the old base, so stale
  base-derived digests look valid while the tip has moved under them.

## Protocol (prevention rule)

1. At `integrate` — not at implement — re-probe `origin/main` for any batch that
   touches shared cure surfaces (lockfile, floors, CI workflows, ROADMAP).
2. Diff the batch against the CURRENT tip on every shared surface before
   folding; a PR-green record against a moved tip is evidence about the old tip.
3. Reconcile explicitly: union the floor sets, diff-merge the guard variants,
   re-derive the lockfile from the unioned floors, merge ROADMAP riders by id.
4. Re-validate after reconciliation: if any EXECUTABLE surface moved, mint a
   fresh full-suite record (the digest moves); documentation-only deltas leave
   the digest unchanged, so the prior record can stand.
5. Never sweep sibling `conductor/*` refs during a landing that depends on them —
   ephemeral validation refs are the other cycle's evidence of record.

## Evidence trail (2026-10-06)

- Merge `fe928ca` stat: lockfile-guard.yaml `+58`, pnpm-workspace.yaml `+35`,
  pnpm-lock.yaml `+247`, Dockerfile, ROADMAP.md `+63` — vs this run's batch
  delta of the same five paths (guard `+62` census-job variant, source-map-js /
  katex floors, own lockfile regen, 217-def ROADMAP layer).
- Ephemeral PR `#398`: 11/11 checks pass, snapshot `e78286af`, validation base
  `beb7689f` (run lineage + current-main workflows); PR closed and
  `conductor/ci-e78286af*` / `conductor/ci-beb7689f*` refs deleted post-run.
- Ledger: `rm-680` (minted 2026-10-06, run c6cd7c83 compound) carries the
  acceptance clauses for the c6cd7c83 integrate reconciliation.

## Related

- `rm-673` — the cure item this collision orbits; acceptance clause 3 (main-side
  landing effects) is gated on the `rm-680` reconciliation.
- `docs/solutions/workflow-issues/maintenance-cycle-learnings-2026-10-06-detached-ci-wait.md`
  — companion learning from the same cycle (detached CI wait).
- `rm-159` — conductor-refs sweep sequencing (sweep only after adoption lands).
