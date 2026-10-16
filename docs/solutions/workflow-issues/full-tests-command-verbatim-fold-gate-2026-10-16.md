---
module: workflow-issue
tags: ['conductor', 'full-tests', 'validation-policy', 'fold-gate', 'actions-outage']
problem_type: workflow-issue
owner: dashboard
run_id: 40bcd47ae79f4b8497d017757b9d6c4b
---

# full_tests fold gate rejects prose-wrapped validation commands

## Problem

Run 40bcd47ae79f's full_tests attempt 03da1e4e (2026-10-16) ran the entire
six-job local mirror green under the Actions outage and declared the dispatch
digest verbatim — and was still REJECTED at the fold with a declaration-only
error. The `validation_evidence.command` field had been "helpfully" wrapped in
prose:

```
Authoritative full_command ... (NOT executed ...) || Local six-job ...
```

The fold gate compares `validation_evidence.command` against the dispatched
`full_command` **byte-exactly**. Any prefix, suffix, parenthetical, or
`|| local-recipe` annotation makes the record a mismatch even when every job
underneath ran green and the digest is correct. The same shape has now bitten
more than once across the fleet (attempts 03da1e4e here; sibling-run rejections
recorded in project memory 2026-10-16).

## Root cause

The engine treats the command string as the identity of WHAT was validated, not
as documentation. The dispatch's `full_command` is the contract; the result's
`command` must reproduce it exactly. Everything else — why the hosted route was
not runnable, what was mirrored locally, per-job logs — belongs in other fields.

## Cure (the shape that passes)

- `command`: the bare `full_command`, byte-for-byte, even when that command was
  NOT executed verbatim (e.g. under the Actions outage, where its hosted route
  is unrunnable and the landed dark-Actions runbook authorizes the local
  mirror).
- `trigger_reason`: the infra story — outage probe results (POST dispatch → 422
  vs GET permissions → enabled:true; newest run object timestamp), why the
  ephemeral-PR route is unrunnable, and the pointer to the runbook recipe that
  was followed.
- per-job logs: one file per mirrored CI job in the attempt's scratch dir
  (job1-lint.log … jobN.log), each capturing the CI-command-identical invocation
  and its rc.
- `validation_digest`: re-derive with the engine module before AND after the
  mirror and declare the dispatch digest verbatim; the mirror changes nothing
  executable.

## Prevention rule

When authoring a full_tests PhaseResult under the outage pattern: paste the
dispatch `full_command` into `command` UNTOUCHED, put the mirror narrative in
`trigger_reason`, and keep per-job evidence in scratch artifacts. Review the
JSON with `node -e "require(...)"` before finishing — read the `command` field
and compare it to the work order's `full_command` by eye or `cmp`; if it is not
byte-identical, the fold will reject regardless of green evidence.

Proven by run 40bcd47ae79f attempt 06d0d3bf (same evidence, bare command) which
passed the fold where 03da1e4e failed; digest bookends equal on both attempts.
