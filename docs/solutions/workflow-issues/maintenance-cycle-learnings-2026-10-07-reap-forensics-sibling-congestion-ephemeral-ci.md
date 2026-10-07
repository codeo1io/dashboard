---
module: dashboard
tags: [maintenance-cycle, conductor, reaped-attempts, sibling-congestion, ephemeral-ci, registry-pinning, attestation-repair]
problem_type: workflow-issue
---

# Maintenance cycle learnings 2026-10-07 — reaped-attempt forensics at cycle scale, sibling congestion audit, ephemeral-CI full-validation mechanics

Context: conductor run `a94d0659c3f54b758267b7cc1c0ed3d8` (repository-maintenance
cycle 1), base `25d32be` == origin/main at dispatch. All outcomes below are
PRE-REVIEW, written at compound with no tests executed; review and shipping
outcomes are carried by the next cycle's assessment per house convention.
Companion artifacts: the cycle batch doc at
`docs/prioritization/2026-10-07-repository-maintenance-cycle-1-batch-run-a94d0659.md`
(pre-review outcomes + next-cycle context sections) and the ROADMAP cycle-1
compound comment.

## L1 — Reaped prior attempts: read the durable trail before redoing anything

Six of this cycle's seven pre-compound phases (assess `0482408f`, research
`0030185d`, roadmap `ec8ff90e`, prioritize `c466ae5c`, targeted-tests
`84a39930`, full_tests `d86b7c7d`) had a provider-reaped prior attempt. In every
single case the pattern was identical: the typed result artifact was ABSENT from
the delegate spool, and the durable event log (`events/<attempt>.jsonl`) read in
full held `delegate_turn_started` → a few message-count progress ticks →
`session_reaped` (`exit_reason=failed`) → `delegate_turn_completed
status=failed`, with NO PhaseResult event. Two checks — `ls` the typed artifact
and read the event log end-to-end — decided adoptability in minutes, and each
phase then declared its redo-from-scratch explicitly instead of redoing blind.

The full_tests case adds the sharp edge: the reaped attempt died ~184s in, long
before any suite could have finished, so the absence of a PhaseResult matched
the absence of real work. The inverse hazard is the one already codified as
lesson L5 in
`docs/solutions/workflow-issues/maintenance-cycle-learnings-2026-10-08-reaped-attempt-adoption-forensics-validation-invariants.md`
(sibling run 02238c80): an attempt that finishes real work but dies before
writing the typed envelope leaves nothing adoptable.

**Prevention rule.** For any phase whose prior attempt died mid-turn: (1) `ls`
the typed artifact; (2) read the event log IN FULL, not the tail — a
`delegate_turn_completed` line alone says nothing about whether a PhaseResult
was ever emitted; (3) check for a scratch dir and attributable residue; (4)
adopt only on a verifiable envelope (identity lineage, provenance, census);
(5) otherwise declare redo-from-scratch and do it. Write the result JSON as the
FINAL durable act of the turn.

## L2 — Sibling congestion audit BEFORE prioritization, not at fold time

The two highest-impact assess findings this cycle (release.yaml promote red
rm-691, Cache-Control rm-690, plus posture wording rm-692) were ALREADY
implemented inside sibling run b2a3ae9b's standing composition — discovered by a
first-hand scan at prioritize time: sibling worktrees' standing diffs read
directly, campaign DB run states (workspace_path match), open-PR census, and
`git ls-remote 'refs/heads/conductor/run-*'` + spool claim greps. The batch
therefore fell to genuinely-unowned work (this run's own fresh mints rm-698 /
rm-699), and the implement phase never collided with a running sibling.

**Prevention rule.** In a multi-run fleet, prioritization anchors on a
first-hand ownership scan (sibling worktree diffs + run states + PR census +
spool claims), never on main's ledger alone. Double-implementation is wasted
work at best and fold-time contention at worst; when contention is live anyway
(the Dockerfile overlap with 09e5b4d6), record first-landed-wins and reconcile
by content at integrate.

## L3 — Ephemeral-PR full validation under a moving main

`github_ci_validate.py --repo .` snapshots the worktree delta into a disposable
clone (base = HEAD with origin/main's workflows, head = + the delta, untracked
files included), pushes two `conductor/ci-*` refs, and waits on an ephemeral
draft PR. Two mechanics matter:

1. **Pre-check the base..main workflow overlap before running.** This run's
   base 25d32be had been superseded on origin by a9576e3, but the advance was
   riders-only with `.github/workflows/base-drift.yaml` byte-identical between
   the two — so the validator's `git apply --3way` of the worktree delta onto
   the main-workflows base was collision-free by construction. A workflow-file
   divergence in the touched hunks would instead have failed the snapshot
   before any CI ran.
2. **PR-check green never clears non-PR-triggered red.** The release.yaml
   promote failure (rm-691 lineage; see
   `docs/solutions/workflow-issues/maintenance-cycle-learnings-2026-10-03-sigpipe-superseded-content-reanchor.md`)
   is tag/release-triggered and never ran on the 10/10-green ephemeral PR. A
   green full-suite record at PR scope is exactly that — PR scope. Tag- and
   schedule-triggered workflows need their own prove-outs.

Also observed: the validator's teardown (close PR `--delete-branch`, delete
base ref, remove temp clone) lives in a `finally` block — provider reaps
mid-wait strand the refs. Fleet residue at this cycle's close: 20
`conductor/ci-*` + 28 `conductor/ci-base-*` refs on origin, none referenced by
an open PR. A batch sweep is sanctioned push-stage work (ledgered rm-159);
compound and validation phases must NOT touch shared-remote state.

**Prevention rule.** Before routing a full phase to the ephemeral-PR validator
mid-run, diff HEAD..origin/main on `.github/workflows/` for the files your
delta touches. Treat a green PR record as covering exactly the PR-triggered
gate set; enumerate the workflows that did NOT run and hand their state
forward explicitly.

## L4 — Registry-truth pin migration for base images

rm-698 (node:24-slim → node:24-trixie-slim) followed a pin-migration recipe
worth keeping: (1) probe the registry, never guess — token from
`auth.docker.io` then `HEAD registry-1.docker.io/v2/library/node/manifests/<tag>`
with the OCI-index Accept header; the `docker-content-digest` returned is the
pin; (2) move ALL token sites together — Dockerfile `ARG NODE_IMAGE` (which
feeds the FROM stages), every literal tag site in base-drift.yaml, the digest
sentinel test, and the gate's header/prose; (3) never byte-adopt upstream's
Dockerfile — it carries wiki-write machinery this fork excludes by invariant
(fork-exclusion guard, rm-131); (4) re-probe the registry at implement time and
assert probe == pin.

**Prevention rule.** A base-image pin change is a five-surface change by
construction (ARG/From, workflow tag sites, sentinel test, gate prose,
registry truth). Land them as one delta or not at all — a split leaves the
drift gate comparing a new pin against an old sentinel (or vice versa) and
manufactures a false red.

## L5 — Attestation-only rejection: adopt the standing delta, repair the attestation

This cycle's implement phase inherited a rejected sibling attempt (`1e648558`)
whose recorded rejection was SOLELY a missing changed-surfaces attestation —
the tree delta itself had been judged sufficient. The repair did not redo the
phase: the standing 6-file delta was verified byte-identical against the
rejected attempt's durable spool patch (index-line-normalized diff ⇒ identical)
and against the doc copy (`cmp` ⇒ identical), then the missing
`validation_evidence.changed_surfaces` was added with fresh verification
evidence (re-run of the 4 directly-touched suites, 165/165 green, plus a fresh
registry re-probe).

**Prevention rule.** Read the rejection reason precisely. When it is
attestation-only, the correct repair is verify-then-adopt (durable patch copy
as the byte authority) plus the missing attestation — NOT a re-implementation,
which risks diverging from the state that already passed validation. Redo only
what the rejection actually impugned.
