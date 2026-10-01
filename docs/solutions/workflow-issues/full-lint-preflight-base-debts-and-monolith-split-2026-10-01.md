---
module: ci
tags:
  - ci
  - lint
  - conductor
  - roadmap
problem_type: prevention-rule
---

# Full-lint pre-flight, base-carried lint debts, and the ROADMAP monolith split

## Problem

The ephemeral-PR validation used by full-suite phases lints the WHOLE repo at the
head snapshot (`pnpm lint` → `eslint --cache` with no path arguments). Two failure
classes redden that PR even when the cycle's own delta is lint-clean:

1. **Base-carried debts.** Files untouched by the cycle can carry lint errors from
   main itself. Proven 2026-10-01 (run 84974382, PR #326): two base files failed
   the Lint job — `docs/archive/pr-233-unlanded-cycle-18-2026-09-30.md` (11×
   `@stylistic/no-trailing-spaces` on space-only lines) and
   `docs/prioritization/2026-09-29-cycle-19-batch.md:4`
   (`markdown/no-missing-label-refs` on a bare bracket group). Main itself was
   RED on the same debts at `5bf15e1`.
2. **ROADMAP monolith lines.** `- signals:` / `- status:` accumulator lines grow
   by riders every cycle. Unsplit multi-K-char monoliths push per-file eslint
   time past 300 s and the repo-wide `pnpm lint` toward the Lint job's
   `timeout-minutes: 35` cliff (`.github/workflows/main.yaml`). Proven 2026-10-01
   (run a666f8c0 full_tests): four unsplit lines of 8203/7967/4911/4533 chars
   carried >300 s cold-lint each; after the split, ROADMAP lint was rc=0 in 11 s
   and the ephemeral PR Lint check passed in 58 s (PR #328 13/13, PR #329 9/9).

## Prevention rules

- Before firing any full-suite ephemeral-PR validation, run the CI-exact
  repo-wide lint locally (`pnpm lint`, ~75 s warm). Base debts found this way are
  part of the cycle delta — fix them per-lineage rather than shipping a red PR.
- Cures for the two proven debt shapes: strip trailing whitespace with
  `python` `rstrip` (NOT `sed 's/[ \t]+$//'` — BRE treats `+` literally and never
  matches), and backtick-wrap bracket groups (`[security, ...]` → `` `[security, ...]` ``)
  or write them as YAML block lists.
- Keep ROADMAP accumulator lines clause-wrapped: split at `;` boundaries into
  blank-line-separated 2-space-indented continuation chunks, first chunk keeping
  the `- signals:` prefix. Target ≤ ~2700 chars per chunk (proven passing at
  ≤ 3974 in PR #324's lineage; nothing over 4000 has ever passed a Lint job).
- Every split must be content-preserving: assert per-line reconstruction (join
  the chunks and compare against the original bytes) before writing, and verify
  the max markdown line length after.
- Line-length claims must state scope: HTML-comment provenance blocks
  (`<!-- ... -->`) are lint-exempt and can legitimately be multi-K chars; a
  "no line over N" claim needs a markdown-lines-only qualifier to be true.

## Detection

- `awk 'length($0) > 4000 {print FNR": "length($0)}' ROADMAP.md` (expect empty)
- `git diff -U0 <file> | grep '^+' | grep -v '^+++' | ./node_modules/.bin/eslint --stdin --stdin-filename <file>`
  (added-lines gate, ~5 s; count with the `grep '^+' | grep -v '^+++'` set —
  `grep -cE '^\+[^+]'` silently drops blank and `+`-leading added lines)

## Evidence

- PR #326 red on two base files; PR #327 green after the two cures (Lint 48 s).
- PR #328 (13/13) and PR #329 (9/9) green after the four-line split + cures
  (run a666f8c0 full_tests, attempts 7eec08e4/42cfd27d, 2026-10-01).
- Sibling lineage proof: PR #324's split (max chunk 3974) passed CI.
