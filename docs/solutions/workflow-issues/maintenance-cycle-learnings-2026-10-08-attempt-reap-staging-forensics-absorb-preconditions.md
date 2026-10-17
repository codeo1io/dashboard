---
module: dashboard
tags: ['maintenance-cycle', 'conductor', 'validation', 'upstream-absorb', 'forensics']
problem_type: workflow-issue
---

# Maintenance-cycle learnings — attempt-reap staging forensics + byte-exact absorb preconditions (2026-10-07/08, run `02238c80`, repository-maintenance cycle 1)

Companion to `docs/solutions/workflow-issues/maintenance-cycle-learnings-2026-10-06-detached-ci-wait.md`
(impacted-tests fallback economics — see L4) and to the attempt-reap adoption forensics in
`maintenance-cycle-learnings-2026-10-06-registry-drift-rule-adoption.md` (that file lands on main
via the 14a81ea6 batch and is absent at this batch's base b1e7def; the reference resolves at
integrate). This cycle survived five provider-reaped phase attempts — the fifth of them AFTER its
typed result artifact was already on disk (L5) — and executed the fork's first
product-content upstream absorb since the 2026-09-29 wiki-writer disposition. Durable lessons:

## L1 — a reaped attempt leaves exactly three durable artifacts, and the heartbeat stream is not one of them

Before redoing any phase whose prior attempt died mid-turn, read the durable trail in this order:
the typed result `delegate/<attempt>.json` under the delegate spool, the event log
`events/<attempt>.jsonl` (message counts + reap reason), and the scratch dir
`delegate/<attempt>-scratch/`. Absent result JSON is not evidence that no work happened; a present
artifact is not proof that it is valid. Nothing durable → redo from scratch. Artifact present →
verify identity first (run/action/attempt lineage, tree census, worktree cleanliness at dispatch),
then adopt and record the verification legs. This cycle: research `1b024c92` (reaped ~32s at 10
messages), roadmap `989b3f13` (~41s at 2 messages), targeted_tests `894a6ab21` (session-not-found,
zero messages), and compound `a9f6a187` (~17 minutes, seven progress heartbeats, still zero durable
output) — the last is the rule's proof: progress heartbeats are liveness, never work evidence.

## L2 — dirty tracked files at dispatch are dead-attempt staging until blob-proven otherwise

A worktree that shows tracked-file modifications at phase dispatch, with mtimes that predate the
dead attempt's dispatch time, is neither automatically drift to revert nor automatically work to
adopt. Provenance recipe: `stat` the dirty paths (pre-dispatch mtime means not written by the dead
attempt), then `git hash-object` each dirty blob and compare against the known landed or snapshot
blobs. Byte-equality to a landed blob means dead-attempt scaffolding with zero authored delta —
account it, don't re-adopt and don't "fix" it. Any residual means an authored delta to reconcile
into the redo. First-hand: this run's roadmap phase found a modified `ROADMAP.md` plus two
untracked guard files at dispatch; `git hash-object` proved all three byte-identical to d3a5cec's
landed blobs, so the redo composed from a known-clean base instead of diffing against phantom
work. Never blind-revert a dirty worktree at dispatch.

## L3 — byte-exact upstream absorb: prove the precondition, then apply upstream's own diff

Hand-porting an upstream fix invites drift; the alternative is provable. Precondition check:
`git diff <upstream-fix>~1 <fork-base> -- <target paths>` — an EMPTY diff means the fork is
byte-identical to upstream's pre-fix state on those paths, so the absorb IS upstream's diff:
`git apply` the upstream diff for both the product surfaces and their tests verbatim. The result is
byte-exact (reviewable as "equals upstream's blob"), and CI's visual paths-filter (`public/**`)
exercises the ported DOM for free. Enumerate fork divergence FIRST and record the exclusion: this
fork's divergence on the touched tree is confined to `operator-stream.*` (excluded by the
never-absorb discipline), and the standing wiki/write-capability exclusion from the 2026-09-29
disposition stays an acceptance clause on every absorb. First-hand: implement `668642ca`
byte-adopted all four blobs of upstream `879cb2d` / #570 at base b1e7def; ephemeral PR #431 went
11/11 green including the visual workflow.

## L4 — a scripts/-only changed surface defeats the impacted-tests selector; seed the named suite directly

`run_repo_impacted_tests.py --mode fast -- scripts/roadmap-census.ts` answered
`impacted-tests: unable to prove narrow scope; fallback=full` — and the fallback is the FULL suite,
whose cost the 2026-10-06 detached-CI lesson already priced. Rule: when the changed surface is a
script with a small importer set, seed the targeted command as the direct named-suite run (here:
the guard suite that imports the census, plus the census execution itself) and record the selector
degradation line as evidence that the narrow route was a deliberate choice. Evidence:
delegate-spool targeted-tests record `bae06766`.

## L5 — a written result JSON is not a completed attempt: phase state follows the turn, not the file

Compound attempt `6b000b2f` finished the entire phase, wrote its scratch record and its SUCCEEDED
typed artifact (`delegate/6b000b2f840a474cb4b93d8b208e792c.json`, 20:00) — and was still
session-reaped ~90s later at message_count 11. The event log's terminal pair `session_reaped`
(exit_reason failed) + `delegate_turn_completed` (status failed) is what the engine acts on, so the
phase re-dispatched (`dcac26ad`) despite a valid artifact sitting on disk. Two rules fall out.
First, when reading a predecessor's trail the TERMINAL EVENTS outrank artifact presence: read the
last lines of `events/<attempt>.jsonl` before trusting `delegate/<attempt>.json` — a
`delegate_turn_completed` with status failed means the file is an adoption candidate, never the
phase's completion record. Second, the reaper owns the window between the artifact write and turn
completion: sequence the result-channel write as the final durable act, keep the post-write tail to
the one closing message, and let the successor adopt after lineage verification (run/phase/attempt
ids, tree census, porcelain vs the recorded finish state — the re-dispatch verified the 8-path delta
matched 6b000b2f's recorded finish exactly: 5 M + the two untracked adopts + this doc, ROADMAP
numstat 124/0, census 230/0/683, absorb re-proven byte-exact via `git hash-object` vs the `879cb2d:`
blobs, `(2026-10-08,` exactly once). A heartbeat stream whose message_count DROPS mid-attempt
(1→2→5→1→2→3→5→8→11) marks session restart churn under an unstable provider — the same signature
as this run's other four reaps.

Evidence pointers (delegate spool, run `02238c80e4c241b4b87dfde5b30c9efb`): assess
`ff66ef417e2d43fdb7b563790108bd10`, research `50ce49b2df574f89bb6f5f66f1410030`, roadmap
`fd738ee24ffe47fc97dad00f01aeaae1`, prioritize `7687e5a49332453483f07ee08907ba1f`, implement
`668642cacd9e4d0db188eb66003fd4b3`, targeted_tests `bae0676623fc4b80911a8679763f6395`, full_tests
`16529ecfed4e4ef9999b7ae3931191ea` (ephemeral PR #431, 11/11 checks, snapshot `cab0fc54`),
compound `6b000b2f840a474cb4b93d8b208e792c` (reaped post-artifact; durable work adopted and
extended by re-dispatch `dcac26ad0470423db7f7500f2cd9c381`).
