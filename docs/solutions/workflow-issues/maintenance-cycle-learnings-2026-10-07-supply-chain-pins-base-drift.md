---
module: dashboard
tags: ['maintenance-cycle', 'ephemeral-ci', 'base-drift', 'pin-hygiene', 'ledger-prune', 'adoption-forensics', 'validation-digest', 'trivy-replica', 'same-id-collision']
problem_type: workflow-issue
---

# Maintenance-cycle learnings — supply-chain pins, ledger hygiene, base-drift cure (2026-10-07, run 09e5b4d619fe)

Reusable lessons from the 2026-10-06/07 repository-maintenance cycle
(campaign bda9c272 cycle:1; batch 'supply-chain currency + ledger hygiene +
one reliability guard': B1 rm-681 Open-ledger prune, B2 rm-682 node:24-slim
digest re-pin, B3 pin fleet — fro-bot/agent action pin + pnpm/action-setup
at 4 sites, B4 rm-187 store.ts links-cell guard, B5 the batch doc). Validation
consumed as recorded evidence: targeted 4 files/50 tests rc=0; full local
suite 58 files/2388 + 31 files/1180 tests, 0 failed; authoritative ephemeral
full-validation PR #426 @ 8e816004, 12/12 checks green. Recorded pre-review,
from cycle evidence only.

L-space continuity: L1–L6 live in the landed 2026-10-04 learnings doc
(`maintenance-cycle-learnings-2026-10-04-session-trust-time-bounds.md`);
L7 was forward-referenced by run 5e6615586335's rm-205 review rider before
any doc carried it — this doc honors that reference and owns L7–L11.

## L7 — Pre-ship replica check for image-affecting changes

Before shipping any base-image or digest-pin change, measure the actual CVE
posture from a replica of the shipped image (trivy Enforce form:
`HIGH,CRITICAL --ignore-unfixed --exit-code 1`), or defer with an explicit
dated note naming the deferred measurement and its owner — never hand-wave
a CVE-count delta from a stale scan state or from upstream's numbers, and
classify multi-member CVE sets (the util-linux 8-member families) as
mass-rebuild noise vs. real regressions before acting on them. Context: this
cycle's B2 re-pin (0e0ff40c → d6aa754f, a refreshed same-suite bookworm
build) is digest-parity-proven and audit-clean, but this environment has no
local docker, so the measured before/after counts are delegated to the next
weekly trivy scan (rm-648) with base-drift parity holding the floor green
in between; the acceptance gap is recorded on rm-682's rider.

## L8 — Re-probe origin/main before the ephemeral full-validation round

The ephemeral validation PR does not test the worktree alone:
`github_ci_validate.py` builds its tree as run HEAD + CURRENT origin/main's
`.github/workflows` overlay + `git apply --3way` of the worktree patch. If
main moved during the cycle and edited a line the patch also edits, the
3-way apply hard-fails in ~6 s (`Applied patch to X with conflicts` /
`U X`) before any PR exists — and with both sides editing one line there is
no clean postimage except main's bytes or the base's. Pins are the
collision-prone surface: main absorbed the fro-bot/agent v0.117.5 pin
overnight under this cycle while the batch held v0.118.0. Prevention rule:
after any multi-hour implement/test phase, `git fetch origin main` and diff
every touched file against origin/main — an empty diff on shared lines is
the pass signal. Cure: re-base the worktree's conflicting line to main's
bytes (verify `git diff origin/main -- <file>` is EMPTY), reconcile any
rider/doc that claims the old value, re-derive the validation digest, and
re-run the verbatim validation command. A reaped/dead attempt's green round
visible in `gh run list` is corroboration only — artifacts or redo.

## L9 — Dead-attempt forensics before redo

Before redoing a phase whose prior attempt died of infrastructure failure,
check the durable trail in order: the typed result artifact, the scratch
directory, the event log (lifecycle-only vs. real tool activity), the
open-PR census, and `gh run list` for orphaned CI rounds. Adopt only an
envelope that verifies against THIS work order's lineage (run/action/attempt,
test-selection provenance, tree census, worktree cleanliness at dispatch).
This cycle's full_tests lost an attempt minutes after its ephemeral round
went green — unattributable without artifacts, so the phase was redone
(~2.7 min) and the orphaned green cited as corroboration only.

## L10 — Emission-time digest discipline for evidence-bearing folds

Whenever an executable surface changes mid-phase — even a single workflow
pin line — the declared validation digest must be re-derived at emission
time (derive 3× and require identity; quiesce after installs) because the
fold gate re-derives and rejects stale declarations. Declare
`changed_surfaces` as the FULL FLAT engine enumeration (the complete
`.surfaces` list, no nesting): a harmless superset that matches the engine's
own count and survives gate-semantics drift. Note the attestation gate's
no-attestation arm is implement-fold-specific — when simulating a fold for
a non-implement phase, use the implement action variant if you need a
base-sha/delta-count proof.

## L11 — Ledger prune economics and same-id collisions at integrate

An Open ledger that carries implemented-status and LANDED items is labeling
debt with compounding cost: this cycle's research leg re-measured 11 action
pins as already-latest because the ledger does not discriminate landed work,
and every assess leg re-derives the same implemented candidates (89
implemented-status + 25 LANDED items sat in Open against 41 in Completed).
The prune convention: fold implemented+LANDED def bodies verbatim into
Completed with a dated one-line close rider; implemented-but-unlanded stays
in Open with status unchanged; re-derive and record the census after. And
the integrate-time twin of that hygiene: long-running cycles mint ids that
main may land under them with DIFFERENT meanings (this run's rm-681 ledger
prune / rm-682 node digest vs origin/main 25d32be's rm-681 pin-corpus
table / rm-682 always-semver action pins, run 14a81ea6). Landed meanings
own their ids: reconcile-by-content at integrate and re-mint any surviving
overlap above the ALL-LINEAGE ceiling — refs including `refs/preserve/*`,
pushed run tips, open-PR heads, sibling dirty worktrees, and the delegate
spool filtered by ledger overlap.
