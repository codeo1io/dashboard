---
title: 'Lint is a test-bearing gate — re-run pnpm lint after ANY test-file edit, and never hand-expand regex case classes'
date: 2026-09-24
last_updated: 2026-09-24
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - An implementation phase edits test files after its lint run and hands off on the earlier green
  - eslint `regexp/*` rules reject fast-check/vitest generator patterns written as `[a-zA-Z]` or with the `i` flag
  - A cloud validation Lint job reds on a file that was green at the last local gate
tags:
  - eslint
  - regexp-plugin
  - lint
  - fast-check
  - conductor
  - validation
---

# Lint is a test-bearing gate — re-run lint after ANY test-file edit

## Context

Conductor run 3538ec96 (cycle-10 batch, 2026-09-24) shipped three fast-check
property suites. Two generator fixes were made late in the implement phase,
after that phase's lint run:

1. `fc.stringMatching(/…/i)` was rejected by `regexp/use-ignore-case`-adjacent
   rules, so the `i` flag was removed and the pattern hand-expanded to
   `[a-zA-Z]` character classes.
2. That expansion was the last edit before handoff — local lint was NOT re-run.

The engine's cloud validation (`github_ci_validate` snapshot Lint job,
107517654497) then failed on `regexp/use-ignore-case` tripping exactly those
`[a-zA-Z]` classes — a defect already present in the worktree that local
evidence did not show because local evidence predated the edit.

## Guidance

- **Treat a test-file edit exactly like a source edit: the gate set re-runs
  after it.** A green lint breadcrumb that predates the newest test-file edit
  is not evidence. The cheap discipline: `pnpm lint && pnpm check-types` after
  the final test-file write, every time, no matter how small the edit.
- **Never express case-insensitivity by hand-expanding classes.** In this
  repo the passing forms are:
  - use a bare `[\w]` class when mixed case is not actually required (covers
    `[A-Za-z0-9_]`, satisfies `regexp/prefer-w`, trips neither
    `regexp/use-ignore-case` — there is no case pair left — nor
    `no-useless-character-class`);
  - or generate case-insensitivity through the *arbitrary's* constraints
    (e.g. build the alphabet as an explicit array the generator samples), not
    through the regex.
  The `i` flag itself is forbidden; `[aA]`-style pairs are equally forbidden.
  There is no third hand-written form that passes.

## Why This Matters

The failure surfaced only in the engine's cloud snapshot, where it cost a full
validation round-trip and a failed phase report before the cause was found.
Both errors were in the batch's own test code — the product code was sound —
so the entire red was preventable by one 5-second local command.

## When to Apply

- Any phase that ends by editing files under `test/`, `web/src/`, or configs
  linted by `eslint-plugin-regexp`/`eslint-plugin-yml`.
- Any fast-check/vitest generator work: generator patterns are regex-shaped
  and hit the full `regexp/*` rule set.

## Examples

Rejected (both rules fire, in different ways):

```ts
fc.stringMatching(/^tr-[a-zA-Z]+$/)   // regexp/use-ignore-case: case pair
fc.stringMatching(/^tr-\w+$/i)        // the i flag itself is forbidden
```

Passing:

```ts
// mixed case not required — the bare class is the canonical form
fc.stringMatching(/^tr-[\w]+$/)

// mixed case required — express it via the arbitrary's alphabet, not the regex
const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
fc.array(fc.constantFrom(...alphabet), { minLength: 1 })
```

Cross-references: the sibling artifact of the same run —
`validation-clone-exclude-pathspec-drops-staged-breadcrumb-deletion-2026-09-24.md`
(the only OTHER red that validation surfaced) — and
`property-test-generator-pitfalls-fast-check-2026-09-24.md` (the generator
semantics behind these patterns).
