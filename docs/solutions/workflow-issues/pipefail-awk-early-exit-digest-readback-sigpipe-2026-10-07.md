---
title: Pipefail turns awk early-exit digest readbacks into CI-adjacent release failures
date: 2026-10-07
category: workflow-issues
module: ci
problem_type: workflow_issue
tags: [release, pipefail, sigpipe, awk, digest-readback, actionlint]
component: release-workflow
---

# Pipefail turns awk early-exit digest readbacks into release failures

## Problem

Release runs failed at digest-verification steps even when the captured digest
was byte-identical to the expected one. 7 of the 8 release runs preceding
2026-10-07 were red overall; of those, the four most recent reds (37435636956,
37453985189, 37567189586, 37574226127) died at exactly this step, while the
five 2026-10-04 reds were the separate build/lockfile failure class (Class B
in `docs/runbooks/release.md`'s triage table — different step, different
cure). When this step failed, `Dispatch infra deploy` (which needs the
release to succeed) was skipped, so deploys did not fire from merges. The
pattern is invisible to actionlint and shellcheck: the scripts parse cleanly
and the logic is right.

## Mechanism

`release.yaml` runs under `bash -Eeuo pipefail`. The readback sites used the
common one-match awk idiom inside a command substitution:

```bash
got=$(docker buildx imagetools inspect "$TAG" | awk '/^Digest:/{print $2; exit}')
```

Under `pipefail` this fails even when `got` equals the expected digest:

1. `awk` finds the match, prints it, and exits.
2. The early `exit` closes the pipe while `docker` may still be writing.
3. `docker` receives SIGPIPE and dies non-zero.
4. `pipefail` makes the whole pipeline non-zero, so the assignment returns
   that status.
5. The `&& [ "$got" = "$expected" ]` chain fails before the comparison runs.

The failure is a race, not a certainty: if the producer finishes writing into
the pipe buffer before `awk` exits, the step goes green. One of the eight
observed runs (37463802355, 2026-10-06) passed. Consequence for triage: a
single green release run is weak evidence of a fix; a single red run at this
step is strong evidence of the trap.

## Fix

Parse in an `END` block so `awk` reads the producer to EOF and never closes
the pipe early (adopted 2026-10-07 at both sites in `release.yaml`, the
ungated `Promote latest image tag` step and the app-gated release step):

```bash
got=$(docker buildx imagetools inspect "$TAG" | awk '/^Digest:/{d=$2} END{print d}')
```

No match still prints an empty string with exit status 0, so the existing
`[ "$got" = "$expected" ]` comparison stays the sole correctness check.

## Do not over-apply

`base-drift.yaml` digest-readback sites are intentionally `|| true`-guarded
(advisory, not enforcement) — they are a different contract and must not be
"fixed" to this shape.

## Prevention rule

Audit any `$(producer | awk '…{…; exit}')` (or `head -1`) construct under
`bash -Eeuo pipefail` in any workflow, now and at every future workflow edit:
prefer the `END`-block form for single-match extraction, or guard the readback
explicitly. actionlint and shellcheck do not catch this class.
