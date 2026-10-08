---
title: 'vi.spyOn cannot stub node:fs — the builtin namespace is frozen; use a hoisted vi.mock passthrough'
date: '2026-10-08'
category: 'workflow-issues'
module: 'test'
problem_type: 'api-misuse'
component: 'vitest'
severity: 'info'
---

## Problem

An ordering proof needed to assert that `readFileSync` NEVER runs when a
pre-check (`statSync` size gate) rejects the file first (rm-759). The natural
Vitest tool — `vi.spyOn(fs, 'readFileSync')` — throws at runtime:

```text
TypeError: Cannot redefine property: readFileSync
```

`node:fs` exports a frozen namespace object in this toolchain (Node 24), so
`spyOn` cannot redefine its properties, and the usual
`vi.spyOn` + `mockImplementation` recipe is unavailable for builtins.

## Solution

Hoisted `vi.mock` with a passthrough wrapper preserves the real behavior AND
captures calls (works with `toHaveBeenCalledWith` /
`toHaveBeenCalledTimes`, and a throwing mock body proves "never runs"):

```ts
import fs from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

const readFileSync = vi.hoisted(async () => {
  const actual = await import('node:fs')
  return vi.fn(actual.readFileSync)
})

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return { ...actual, readFileSync: await readFileSync }
})

// in tests: readFileSync.mock.calls, .mockImplementationOnce(() => { throw new Error('must not run') })
```

The mock must be hoisted next to the captured actual; `importActual` inside
the factory also works but the `vi.hoisted` form keeps the wrapper reusable
across tests in the file.

## Evidence

- `test/snapshot-store.test.ts` (2026-10-08, run `788aa489c1d5`): oversize
  file → `readFileSync` throws if called (proves stat-before-read ordering);
  at-cap file → called exactly once. Both green, red-first authored.

## Notes

- Applies to any frozen builtin namespace (`node:fs`, `node:path`, ...);
  prefer asserting on the wrapper's call log over implementation details.
