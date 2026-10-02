---
title: 'A passing local gate can be a pipeline illusion — capture the real exit code of every verification command, and re-run the authoritative gate after any executable-surface change'
date: 2026-09-25
category: best-practices
module: dashboard
problem_type: best_practice
tags: [shell, pipeline-exit-status, eslint, ci-parity, validation-digest, false-green]
component: tooling/verification
severity: high
applies_when:
  - any local gate (lint, types, tests, yaml parse) is checked through a shell pipeline
  - an implement phase declares a local check green and a later authoritative CI run is the next reader
  - a validation digest or fingerprint is declared against a tree that later edits touch
---

## Problem

During the 2026-09-25 cycle-1 batch (run bf5d7753), the implement phase verified
ESLint locally with a pipeline and reported it green:

```bash
./node_modules/.bin/eslint <files> 2>&1 | tail -8; echo "exit=$?"
```

That `exit=` prints **tail's** status, not eslint's. ESLint had actually failed
the tree with 5 errors (method-signature style in a new interface, import
ordering in two files). The false green stood until the cycle's authoritative
ephemeral-PR validation ran and its Lint job went RED — after all local work was
already declared done, burning a validation round and a re-dispatch.

A second, related staleness class hit the same cycle: a validation *digest* is
derived from the tree content. The lint fixes changed executable surfaces after
the dispatch digest was minted, so the digest declared verbatim no longer
described the tree — the fold gate rejected the declaration even though every
check was green.

## Root cause

1. In a shell pipeline, `$?` after the last segment is the last command's
   status. A reader (`tail`, `head`, `grep` used as a filter) always exits 0
   unless it itself fails.
2. Tree-derived digests/fingerprints are only as current as the last edit. Any
   post-measurement executable change (even "just lint fixes") invalidates a
   previously-derived value.

## Prevention rules

- Capture the exit status of the tool, not of the pipeline. Either run the tool
  bare (`cmd > log 2>&1; echo $?`), use `set -o pipefail` in the checking shell,
  or check `${PIPESTATUS[0]}` (bash) explicitly.
- Prefer the smallest authoritative invocation over the repo-wide one when the
  tool is slow here (full `pnpm lint` times out on this box at ~19 min CI/540s
  local because of the markdown ruleset; a targeted per-file eslint invocation
  finishes in seconds and uses the same config).
- Local green is provisional. Any phase that changes an executable surface after
  a digest/fingerprint was recorded must re-derive or re-run before declaring it.
- When an authoritative CI run contradicts a local green, suspect the local
  harness first — prove which one is wrong by pulling the failing step's log
  (`gh run view --log-failed`) and re-running the tool with a truthful exit
  capture.
- Verify the authoritative run tested YOUR tree (exact-sha / snapshot identity),
  not a stale tip — snapshot commits are not in the local object store until
  fetched.

## Verification pattern

```bash
./node_modules/.bin/eslint file1 file2 > /tmp/lint.log 2>&1; echo "exit=$?"
# exit=0 → real pass; anything else → read /tmp/lint.log, fix, repeat
```

## References

- Cycle record: run bf5d7753 targeted_tests (first authoritative run RED on 5
  lint errors; fixed lint-only; re-run green ×3 on ephemeral PRs #185/#189/#191).
- Related: docs/solutions/best-practices/verify-fix-landed-before-crediting-cycle-2026-09-19.md
  (same trust-but-verify family — local narration is not gate evidence).
