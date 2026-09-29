---
title: Re-fire syntax defects — strip-types --check accepts what the web swc pipeline rejects; bisect with @swc/core parseSync
date: 2026-09-29
category: workflow-issues
module: dashboard
problem_type: workflow_issue
component: development_workflow
severity: low
applies_when:
  - 'A re-fired implement attempt inherits persisted, never-gated code edits and a web vitest suite fails at LOAD time with a syntax error'
  - "The error text points at a line far above the real defect (e.g. swc's 'Expected {, got interface')"
  - '`node --experimental-strip-types --check <file>` (amaro) reports the same file clean'
tags:
  - refire
  - swc
  - amaro
  - strip-types
  - parse-bisect
  - web-pipeline
---

## Problem

This repo runs two different TS syntax front-ends: the server tree is Node 24
native strip-only (amaro — `node --experimental-strip-types`), while the web
tree compiles through Vite's react-swc pipeline. On a re-fired implement
attempt, a persisted edit that was never run through any gate can carry a
syntax defect that **amaro accepts but swc rejects**. Observed case (run
5e7cb89f, attempt 075c2ae5): `Promise<X | undefined}` — a closing brace where
an angle bracket belongs, at `web/src/push/subscribe.ts:287`.

Two traps compound:

1. **The cheap check lies.** `node --experimental-strip-types --check` on the
   file passes; the defect only surfaces when a web suite loads the module.
2. **The swc error misattributes location.** The parser reported
   `Expected {, got interface` roughly 60 lines ABOVE the real defect (it
   swallowed the broken generic and choked on the next declaration).

## Cure

Treat persisted re-fire code as **unvalidated input**: run the impacted web
battery BEFORE building anything on top of it. If a web suite fails at LOAD
with a syntax error, bisect the file with the same parser the pipeline uses:

```js
// minimize-while-FAILING: shrink the file while the parse STILL fails,
// keeping the failing block — not while it passes (an inverted delta-debug
// collapses to a trivially failing `{}`).
const swc = require('./node_modules/@swc/core')
const out = swc.parseSync(source, { syntax: 'typescript', target: 'es2022' })
```

- Delete a contiguous middle chunk, re-parse, keep the edit if it still
  throws with the same message; revert the chunk otherwise. The block that
  survives minimization contains the defect.
- `parseSync` throws with a 1-based line/column on the offending token —
  trust THAT location over the vitest/served error text.
- Fix, then re-run `parseSync` on the full file expecting `OK`, then run the
  impacted suites before continuing the phase.

## Prevention

- A green `node --check` is NOT a syntax gate for `web/**` — only the swc
  pipeline (vitest load or `pnpm build:web`) is.
- When handing off a half-finished edit (or inheriting one), record that it
  is ungated; the next attempt's first act is the impacted battery, not new
  construction on top.
