---
title: Single-line markdown monoliths in ROADMAP.md kill the remote Lint job (split recipe and added-lines bar)
date: 2026-09-30
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: ci_lint
severity: high
applies_when:
  - Authoring or extending ROADMAP.md ledger lines (id/status/signals riders) or any markdown the remote Lint job covers
  - Splitting an inherited monolith line before cloud validation
tags: [markdownlint, eslint, lint, ci, roadmap, ledger, riders]
---

# Single-line markdown monoliths in ROADMAP.md kill the remote Lint job (split recipe and added-lines bar)

Date: 2026-09-30 (event) · documented 2026-10-01 · Run:
`f3fbd7d9582d43c4bda4f80283127c56` (repository-maintenance cycle 2, ledger
cycle 20) · Author: hermes-conductor compound phase (attempt
`e9c2dde38ea9475a8f96e9ecfb216307`, ce-compound)

## Problem

The ledger keeps each item's `id`/`signals`/`acceptance`/`evidence` as
physical single lines, and riders historically append to them inline. Left
unchecked, lines grow into multi-thousand-character monoliths, and the repo's
markdown lint behaves superlinearly over them: a standalone
`eslint --stdin --stdin-filename ROADMAP.md` over such a line exceeds 300s
(session memory: proven repeatedly on this ledger class, 2026-09-30/10-01),
and the remote Lint job — which must lint the whole file — dies at its ~35
min cap. Cycle 20 inherited two such lines at base `31995a2` (ROADMAP.md:189
at 7317 chars and ROADMAP.md:422 at 7967 chars, per the targeted_tests
pre-fix census; predicate used: every line over ~5.2K chars).

## Symptoms

- The remote Lint job on the ephemeral validation PR runs to its timeout cap
  and is cancelled, while every other check passes. The same night this was
  recorded, a sibling lineage's un-split ROADMAP tree died exactly this way
  (actions job 110138963118, cancelled), while this tree — split first —
  passed Lint in 41s twice (PR #307 head `6753f5ebba70`, PR #321 commit
  `f64bbd0ecb8a`).
- Locally, `eslint` over the affected file (or just the offending line via
  `--stdin`) does not return in any patience-reasonable time.

## What Didn't Work

- Letting the monolith ride into cloud validation "because the file already
  lints clean at HEAD": the cliff is pathological-line-shaped, not
  content-shaped, so pre-existing greenness of the REST of the file proves
  nothing about the one line you just grew.
- Appending riders to the monolith lines instead of minting short lines or
  fragments — it enlarges the added set and re-arms the cliff.

## Solution (split recipe, proven twice on this file)

1. Measure first, edit nothing if already split:
   `awk '{ print length, FNR }' ROADMAP.md | sort -rn | head` — this cycle's
   post-split census: no line over 2503 chars (former 7317/7967-char lines
   are now multi-line fragments at ROADMAP.md:189-193 and 422-427).
2. Split the monolith at sentence boundaries into blank-line-separated,
   2-space-indented fragments that stay part of the same list item (the
   2026-09-25 blank-line-paragraph recipe). Never let a wrapped continuation
   line begin with `#` — ATX lint reads it as a broken heading (see the
   2026-09-25 hard-wrap trap doc below).
3. Keep each fragment ≤ ~2500 chars.
4. Prove the split is semantics-preserving: rejoin the fragments and compare
   bytes with the pre-split original (sha256 roundtrip must be exact; this
   cycle's split verified `ROUNDTRIP_BYTE_EXACT: True`, diff touching exactly
   the two split regions).
5. Land the split BEFORE cloud validation, in the same uncommitted batch.

## The added-lines bar (for riders and mints)

Any edit that puts a line into the git diff `-U0` added set must, when that
line is under 3000 chars, lint clean standalone:

    git diff -U0 -- ROADMAP.md | grep '^+[^+]' | cut -c2- \
      | pnpm exec eslint --stdin --stdin-filename ROADMAP.md

(rc=0 in ~12-30s when healthy.) Appending to a PRE-EXISTING monolith is
excused only as the pre-existing regime — the unmodified original times out
identically (parity-proven), so the excuse never covers growing a new
monolith or extending a young line past the bar.

## Prevention

- Mint ledger items with short lines from the start; riders go in as dated
  clauses on lines that stay under the bar, and a line approaching ~2.5K
  chars gets split before its next rider, not after.
- Run the length census in the assess phase whenever the ledger has grown.
- Note the lint surface: `eslint.config.ts:14` ignores `docs/solutions/**`
  (AI-authored planning docs), but `docs/prioritization/**` and ROADMAP.md
  ARE linted — the same bar applies to batch docs.

## Related

- `hard-wrapped-markdown-line-initial-hash-fails-atx-lint-2026-09-25.md` —
  the continuation-line ATX trap this recipe must avoid while splitting.
- `prioritization-doc-atx-heading-lint-trap-2026-09-25.md` — same remote-Lint
  family, bare `#NNN` PR refs.
- `ci-validator-poll-window-vs-cold-lint-2026-09-29.md` — cold-lint timing
  context for the validator's poll window.
- Cycle record: `docs/prioritization/2026-09-30-cycle-20-batch-run-f3fbd7d9.md`.
