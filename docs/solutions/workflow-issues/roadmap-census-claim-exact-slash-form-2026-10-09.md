---
title: Roadmap census claims must be exact slash-form or the newest-census guard reads the older claim
date: 2026-10-09
category: workflow-issue
module: dashboard
component: roadmap-ledger
problem_type: workflow_issue
severity: medium
---

# Roadmap census claims must be exact slash-form

## Problem

The roadmap-integrity guard's "newest census comment states the true census" check parses census
claims with the regex `/(\d+) defs \/ (\d+) dups \/ max rm-(\d+)/` inside the first
`<!-- … -->` whose body opens with `(YYYY-MM-DD,`, and takes the FIRST match in that comment
body — newest by date, last-wins by document order among equal dates.

Two inert shorthands have now silently neutered a ledger edit's post-mint census:

- `census after this edit 239 / 0 / rm-780` (run `cbe70604af06` ext #36, 2026-10-09) — no
  `defs`/`dups` words, so the regex never matches, and the at-compose `237 defs / 0 dups / max
  rm-744` EARLIER in the same comment body stayed the first parseable claim while the live
  census was 239. The guard reded only on the full ephemeral-PR CI run
  (`gh run view 37857579938`: expected 237 to be 239) — every local focused run had passed
  because none of them ran `test/roadmap-integrity-guard.test.ts`.
- The same trap recurred across the fleet the same day (runs `32f33f1b`/`438dea88` compound
  notes) — this is a pattern, not a one-off.

## Rule

1. The post-edit census in any ledger extension comment MUST be written in the exact slash form
   `N defs / N dups / max rm-N` — and must be the FIRST parseable claim in the comment body.
2. Any at-compose/basis census you also want to record (the pre-edit state) must be demoted to
   comma-form (`237 defs, 0 dups, ceiling rm-744`) — comma-form is inert to the regex, so it
   cannot steal the slot.
3. Equal-date comments resolve last-in-document-order: a new claiming comment must sit after
   every equal-date claiming comment in the file (e.g. after INTEGRATE-MERGE records).
4. If a census correction happens after compose (as at full_tests), disclose it in the comment
   itself — corrected form in slash-form, original form demoted to comma-form — so the comment's
   own history stays honest and the guard's slot ownership is explicit.

## Verification recipe (doc-only, no test run)

```
node scripts/roadmap-census.ts          # live defs/dups/max
grep -nE '[0-9]+ defs / [0-9]+ dups / max rm-[0-9]+' ROADMAP.md | tail -3
```

Cross-check by hand: the newest-by-date (last-in-file among equals) matching comment's FIRST
slash-form occurrence must equal the live census triple. When in doubt, replicate the guard's
reduce in a throwaway python one-liner (date regex `\((\d{4}-\d{2}-\d{2}),`, claim regex above,
`c[0] >= newest[0] ? c : newest` fold) BEFORE pushing the ledger edit anywhere CI reads it.
