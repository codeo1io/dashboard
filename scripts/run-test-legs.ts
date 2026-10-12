#!/usr/bin/env node
// scripts/run-test-legs.ts
//
// Run BOTH vitest legs of the local test battery and report each leg's verdict
// even when the other leg fails.
//
// Why this exists (rm-963): the previous `test` script chained the legs with
// `&&` — a failing server leg skipped the web leg entirely, so ~1200 web tests
// silently never ran and a red web leg could hide behind a red server leg.
// Gate truth requires both verdicts on every run.
//
// Usage:
//   pnpm test
//
// Behavior:
//   - Runs the legs sequentially (server `test/` first, then `web/` via its
//     own vitest config), inheriting stdio so each leg's reporter output
//     reaches the terminal / CI log unchanged.
//   - Prints a per-leg verdict line plus a final summary table.
//   - Exits 0 only when BOTH legs pass; exits 1 if any leg fails to run.
//   - Arguments are NOT forwarded to vitest. For focused runs invoke
//     `vitest run <pattern>` directly per AGENTS.md — and build web/dist
//     first, because direct invocations bypass `pretest`.
//
// Environment:
//   None. `pretest` (pnpm lifecycle) builds web/dist before this runs.

import {spawnSync} from 'node:child_process'
import process from 'node:process'

interface Leg {name: string; args: string[]}

const LEGS: readonly Leg[] = [
  {name: 'server (test/)', args: ['exec', 'vitest', 'run']},
  {name: 'web (web/vitest.config.ts)', args: ['exec', 'vitest', 'run', '--config', 'web/vitest.config.ts']},
]

if (process.argv.length > 2) {
  console.error('note: arguments are not forwarded; run vitest directly for focused runs (see AGENTS.md)')
}

const results: {name: string; ok: boolean}[] = []

for (const leg of LEGS) {
  console.log(`\n=== test leg: ${leg.name} ===\n`)
  const run = spawnSync('pnpm', leg.args, {stdio: 'inherit'})
  const ok = run.status === 0
  results.push({name: leg.name, ok})
  if (run.error !== undefined) console.error(`leg spawn error: ${run.error.message}`)
  console.log(`\n=== test leg: ${leg.name} — ${ok ? 'PASS' : 'FAIL'} ===\n`)
}

console.log('Test battery summary:')
for (const result of results) console.log(`  ${result.ok ? 'PASS' : 'FAIL'}  ${result.name}`)

if (results.some(result => !result.ok)) {
  console.error('At least one test leg failed.')
  process.exit(1)
}
