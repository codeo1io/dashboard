# Conductor ref hygiene

Policy and procedure for `refs/heads/conductor/**` growth on
`codeo1io/dashboard`. Established 2026-10-17 (repository maintenance cycle 1,
run 7d5af220 stewardship); the sweep logic itself is rm-742 lineage and lives
in `scripts/sweep-stale-conductor-refs.ts`.

## The problem this governs

Every conductor run mints refs: `conductor/ci-*` and `conductor/ci-base-*`
(ephemeral validation clones) and `conductor/run-*` (per-run attempt refs).
As of 2026-10-16 the repo carried 317 such heads (128 ci + 193 run, the run
count growing monotonically) with no repo-side cleanup path — the sweep
covered only the ci namespaces and was wired into no workflow.

## Policy (the namespace decision)

- **Sweepable namespaces:** `conductor/ci-*`, `conductor/ci-base-*`, and
  `conductor/run-*`. Nothing else is ever considered — not `main`, not
  operator branches, not tags, not other `conductor/*` branches.
- **Age cutoff:** 14 days (the script default, overridable with
  `--cutoff-days` for a dry-run rehearsal of a tighter policy).
- **Open-PR protection:** a ref backing an OPEN pull request is never swept,
  regardless of age. The open-PR heads are gathered live (`gh pr list`) and
  unioned into the excludes. In `--apply` mode a failed gather ABORTS the
  sweep (fail-closed): never delete blind. Tests and air-gapped runs inject
  the set via `CONDUCTOR_SWEEP_PR_HEADS` (newline-separated branch names or
  fully-qualified refs).
- **Dry-run default:** the script reports and deletes nothing unless
  `--apply` is passed explicitly.
- **Manual-only lane:** the workflow is `workflow_dispatch` only
  (`.github/workflows/conductor-ref-sweep.yaml`), apply flagged per dispatch.
  There is deliberately no schedule: every sweep records a decision.
- **Own-refs discipline:** when the fleet is mid-outage or mid-landing, do
  not sweep refs belonging to runs that might still validate or fold — see
  `docs/runbooks/outage-validation.md`.

## Procedure

1. Dry-run first, from a checkout of `main`:

   ```sh
   node --experimental-strip-types scripts/sweep-stale-conductor-refs.ts
   ```

   Read the selected set. Anything unexpected (a young ref, a ref an open PR
   depends on) must be explainable before proceeding.

2. Dispatch the lane (or run with `--apply` locally with push rights):
   Actions tab → **Conductor ref sweep** → Run workflow. Leave `apply`
   unchecked for another recorded dry-run; check it to delete.

3. Record the outcome in the dispatching cycle's notes: the before/after
   `git ls-remote --heads origin 'refs/heads/conductor/*' | wc -l` counts and
   the run URL. The next prioritization reads those counts to re-derive the
   growth rate instead of trusting a stale census.
