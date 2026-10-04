---
title: Regex contract tests over JSDoc go false-negative when the docstring wraps
date: 2026-10-04
category: workflow-issues
module: dashboard
component: operator-client-contract-tests
problem_type: test_design
severity: low
applies_when:
  - 'A test pins a DOCUMENTED contract by matching regexes against interface docstrings (test/operator-client-retry-contract.test.ts pins the four mutating OperatorClient members'' CSRF-retry contracts)'
  - 'The docstring under test wraps mid-phrase, so the sentence the regex expects is split across physical `*`-decorated lines'
  - 'Prettier or hand-wrapping can reflow the docstring later, decoupling the test from layout'
tags: [docstring, contract-tests, normalization, jsdoc, regex, operator-client, rm-485]
related:
  - 'ROADMAP.md rm-485 (the decline that shipped the doc-pin suite)'
  - 'test/operator-client-retry-contract.test.ts (the normalize helper)'
  - 'docs/solutions/security-issues/csrf-400-retry-stale-token-pin-test-2026-10-04.md (the class this suite locks)'
---

## Problem

To make the rm-485 decline self-locking (server `launchRun` keeps NO retry by
recorded decision; the browser twin owns refresh-then-resend), the batch added
`test/operator-client-retry-contract.test.ts`: it regexes each mutating
`OperatorClient` member's interface docstring for its stated CSRF-retry
contract and counts the mutating surface.

The first run FAILED on docstrings that did state the contract: the phrases
were wrapped mid-sentence in the JSDoc (`* NO server-side CSRF-400 retry:`
followed by continuation lines), so a regex spanning the phrase matched nothing
— a false negative of the worst kind, because the guard looks broken precisely
when it is needed. The naive fix (regexing raw source text) has the mirror
failure too: a pattern can accidentally match across unrelated adjacent lines
of two different docstrings.

## Solution

Normalize the docstring before matching, and match per-member:

1. Extract each member's docstring block; strip leading whitespace and the
   `*` decorations; join the lines; collapse runs of whitespace.
2. Regex against the NORMALIZED text only — never the raw source.
3. Assert one named check per member (a failing assertion names the member
   that lost its contract sentence) and a count check on the mutating
   surface, so a silent fifth member also fails the suite.

## Prevention

- Any test that pins prose in comments or docs must normalize formatting
  first; assert on semantic strings, never on layout.
- Prefer pinning the CONTRACT SENTENCE (the words that must stay true), not
  line numbers or raw-source slices — both drift on reflow.
- A doc-pin suite is the right companion to a decline-by-decision: the
  decision lives in the ledger, and the suite turns "the docs say so" into a
  red/green fact.
