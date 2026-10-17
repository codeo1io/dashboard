---
module: dashboard
tags: ['maintenance-cycle', 'reaped-attempt-forensics', 'tree-identity', 'zero-mint-fold', 'base-race-surface-derivation', 'ephemeral-ci', 'concurrent-sibling-attribution']
problem_type: workflow-issue
---

# Maintenance-cycle learnings — reap forensics, zero-mint folds, derived surfaces (2026-10-08, run 530bd1a93827)

Reusable lessons from the 2026-10-08 repository-maintenance cycle:2 batch
'Web-client resilience at the root + absorb-reference docs + ledger truth
extension #32' (rm-501 listener-ack half + rm-487 focus re-probe + rm-514
root ErrorBoundary + the absorb-reference docs + the riders-only extension
#32; full CI green on ephemeral PR #439, commit 6b9c4b11). Recorded
pre-review, from cycle evidence only.

## L1 — A reaped attempt is a question about the tree, not a verdict about the work

Four attempts in this one run died to provider/session reaps: stewardship
2d1a8735 (pre-work, 5-line event log), implement 661aafc8 (~41 s), full_tests
c29dccc9 (~24 s), and compound bbf260bb (~17 LIVE minutes of progress ticks
with the message count oscillating as the provider stream reset — and still
zero durable output). Two opposite failure shapes, one forensic triple that
resolves both:

1. **Event-log shape.** A few progress lines ending in `session_reaped` says
   the transport died; it says nothing about work already flushed to disk.
   Line count is not effort.
2. **Typed artifact.** A present result JSON must still be verified against
   THIS work order (identity, provenance, census, cleanliness) before
   adoption; an absent one is not evidence the work never happened.
3. **Tree identity.** The decisive leg: compare `git status`/`git diff
   --stat` against the last attested phase state, and sweep file mtimes
   against the reaped attempt's event window (`find . -newermt`). This run's
   implement phase inherited a dirty tree whose mtimes (22:16–22:19Z)
   predated the reaped attempt's own events (23:31Z) — attribution went to
   an earlier reap, and the state was adopted only after a per-file
   content-level audit against the batch scope.

Prevention rule: after any reap, run the triple BEFORE redoing the phase;
adopt verified durable work with a declared adoption, never a silent one,
and never re-implement what the tree already carries.

## L2 — When a sibling lineage already minted the subject, retire your mint BEFORE landing

The roadmap phase composed mint rm-707 (server entry-point guard vs
percent-encoded paths) at a base where run 5b333105's unlanded delta already
implemented the same cure. Rather than landing both defs and reconciling at
integrate, the implement phase retired the mint at composition time: the
extension landed ZERO-MINT with riders only, folding under the sibling's
rm-702 by content, with the fold recorded in the extension header. Rule: a
duplicate def is cheaper to kill at compose time than at integrate time —
grep the all-lineage spool for the subject BEFORE minting, and when the
collision is found after minting, retire your own mint and record whose def
owns the family.

## L3 — After a mid-cycle ff, the engine's derived surfaces include the advance

The implement phase ff'd the worktree 25d32be → f66e547e (six landed
commits, hunk-disjoint from the batch). The engine derives testable
surfaces from the ORIGINAL dispatch base, so targeted_tests was rightly
handed `.github/workflows/release.yaml + src/server.ts` — files this batch
never edited — while the batch's own web/src and docs delta is
non-executable to the classifier. Rule: after an ff, expect the derived
surface set to name the advance; run the sanctioned targeted command
VERBATIM on what it names (this run: selector 20 files/740 tests, rc=0) —
do not "correct" the selection to your own edit list, and do not treat a
surface you did not touch as an error to argue away.

## L4 — Attribute CI residue by ref, not by count

At full_tests cleanup the repo showed one open PR where pre-flight had zero.
Global emptiness checks cannot be the oracle on a repo shared by concurrent
conductor lineages: the open PR #440's head (`conductor/ci-4f5bc11b…`)
matched neither this run's validation head nor its base ref, and
`git ls-remote` for THIS run's exact ref patterns returned zero — cleanup
held; the stranger was a sibling's in-flight validation. Rule: verify your
own cleanup by your own exact ref patterns (head AND base), and attribute
any surplus by head ref before diagnosing a leak.

## Related

- `docs/solutions/workflow-issues/phase-result-validation-evidence-missing-implement-fold-rejection-2026-10-07.md` — the other pre-review record trap.
- `docs/solutions/workflow-issues/fulltest-preflight-engine-drift-node-sweep-cross-guard-exclusions-2026-10-08.md` — why full-gate-only classes exist at all.
- `docs/solutions/workflow-issues/maintenance-cycle-learnings-2026-10-04-session-trust-time-bounds.md` — the earlier cycle's dead-wire and trust lessons.
