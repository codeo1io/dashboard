---
module: dashboard
tags: ['maintenance-cycle', 'conductor', 'calver', 'validation', 'ephemeral-ci', 'result-envelope']
problem_type: workflow-issue
---

# Maintenance-cycle learnings — calver string-sort, ephemeral-CI scope, result-envelope variant (2026-10-08/09, run `405e9004`, repository-maintenance cycle 2)

Four first-hand lessons from the 'Operational truth: make silent-failure surfaces
loud' cycle (batch rm-740..743, targeted 71ace59a + full 37f87e37 both green
pre-review). Companions: the 2026-10-07 fold-rejection doc for the
result-envelope family, and the 2026-10-08 reap-forensics doc for adoption
invariants.

## L1 — Calver refnames must be crowned numerically, never by string sort

`git ls-remote --tags origin | grep -E '2026\.(07|08)'` plus any
string-order tail/sort crowns `2026.08.9` over the true newest `2026.08.15`
because `'9' > '1'` lexicographically at the patch position. This exact
artifact was recorded independently by TWO phases of this cycle (assess and
research both cited `2026.08.9` as newest calver) and survived until the
implement module's numeric compare — `parseCalverTag` /
`selectNewestCalverTag` in `scripts/release-channel-staleness.ts` — crowned
`2026.08.15` (verdict unchanged here only because both readings exceeded the
staleness threshold). Prevention rules:

- Never derive 'newest tag' with `sort` / `tail` over refnames; parse the
  numeric components and compare them as numbers.
- When an evidence line cites a 'newest X', record the derivation command and
  that the comparison is numeric — a bare `ls-remote`-grep citation is
  unauditable and this cycle proves it silently wrong.

## L2 — A green ephemeral validation PR proves the PR-triggered workflows only

The authoritative full-command routes to an ephemeral draft PR over
`conductor/ci-base-**`. What runs there is exactly what the repo's `on:`
filters admit: `main`, `codeql`, `dependency-review`, `lockfile-guard`
(explicit `conductor/ci-base-**` branch filters) — 10 checks this cycle.
What can NEVER run there: every schedule/dispatch-only workflow
(`release-channel.yaml` weekly Mon 07:23Z, `cve-tripwire`, `base-drift`,
`upstream-drift`, the audit/scorecard/canary family) — so their proof is owed
to the first post-landing scheduled fire, and a first-fire RED can be
by-construction rather than a regression (the rm-740 staleness check is RED
by design while the rm-714 dormant-vs-active decision is pending).
Also scoped by filter, not by failure: `visual.yaml` is paths-filtered, so a
batch that touches no web/render inputs gets no visual check — absence of the
check is not a red. Rules:

- Enumerate the expected check set from the `on:` blocks BEFORE polling, and
  claim 'full green' only over the checks that actually registered.
- Post-landing watch lists must carry every schedule-only workflow's next
  fire time, or the green PR record silently over-claims coverage.

## L3 — `validation_evidence` as a top-level sibling of `phase_result` folds as absent

First fold rejection of this cycle (attempt `ef47317c`): the implement result
JSON was complete and correct in content but placed `validation_evidence` as
a top-level SIBLING of `phase_result`, so the gate read `changed_surfaces` as
absent against a 6-surface executable delta and rejected the fold. This is a
variant of the 2026-10-07 missing-field case
(`phase-result-validation-evidence-missing-implement-fold-rejection-2026-10-07.md`),
not a repeat: the field was present in the file, just outside the envelope the
gate reads. Cure applied (attempt `e3e009f1`): adopt the completed work
byte-stable — verified identical porcelain and diff-stat against the rejected
attempt's exit state — and re-file the envelope with `validation_evidence`
INSIDE `phase_result`, declaring exactly the engine-derived executable
surfaces. Prevention rule: when a fold is rejected on shape alone, diff the
REJECTED attempt's tree against the re-filed tree and record the byte-stability
proof; never re-implement work whose rejection reason is envelope placement.

## L4 — Attribute ephemeral validation PRs by head sha + creation time, never by number

Multiple fleet lanes open validation PRs within the same minutes (this cycle:
sibling lanes' PRs `#448`/`#455` were open while `#456` was ours). The
validator's error JSON names the PR it created, but polling output and PR
lists alone will not separate siblings. Attribute by (a) head ref =
`conductor/ci-<snapshot12>` matching the snapshot commit the validator
reported, and (b) creation timestamp within seconds of the command launch
(this cycle: launch 01:36:05Z, PR created 01:36:26Z). Never close, re-run, or
'sweep' sibling-lane PRs or refs mid-attribution — the accumulating
`conductor/ci*` ref residue (50 heads at the 2026-10-09T02:56Z probe, up from
48 at mint) is exactly what the rm-742 sweep exists to reap, at a sanctioned
push gate, not opportunistically.

## Digest invariants reaffirmed

Markdown-only compounding (ledger riders, canopy comments, `docs/*.md`) leaves
the executable validation digest unchanged — re-derived equal to the dispatch
digest before and after every phase that touched no executable surface
(`validation:v1:b0988520…` stable across targeted, full, and this compound).
When a phase DOES change executable surfaces, the emission-time digest must be
re-derived, not copied — the fold gate re-derives and rejects stale
declarations.
