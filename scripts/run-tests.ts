/**
 * Two-leg test runner with independent accounting (rm-972).
 *
 * The server leg (root vitest config) and the web leg (web/vitest.config.ts)
 * previously chained via `&&` in package.json — a red server leg short-circuited
 * before the web leg started, so a standing server failure hid every web
 * regression from `pnpm test` and from the CI Main job alike. This runner
 * executes BOTH legs unconditionally, reports each leg's exit status
 * separately, and exits non-zero when either leg fails.
 *
 * `pretest` (pnpm build:web) still runs exactly once per `pnpm test`
 * invocation — this script must NOT build the client and must NOT re-enter
 * `pnpm test` (use `pnpm exec vitest ...` for the legs, which fires no
 * lifecycle hooks).
 */

import {spawnSync} from 'node:child_process'
import process from 'node:process'

interface TestLeg {
  readonly name: string
  readonly args: readonly string[]
}

const LEGS: readonly TestLeg[] = [
  {name: 'server (root vitest config)', args: ['exec', 'vitest', 'run']},
  {name: 'web (web/vitest.config.ts)', args: ['exec', 'vitest', 'run', '--config', 'web/vitest.config.ts']},
]

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

interface LegResult {
  readonly name: string
  readonly code: number
}

const results: LegResult[] = []

for (const leg of LEGS) {
  process.stdout.write(`\n[run-tests] === leg: ${leg.name} ===\n`)
  const run = spawnSync(pnpm, leg.args, {stdio: 'inherit', env: process.env})
  const code = run.status ?? 1
  results.push({name: leg.name, code})
}

process.stdout.write('\n[run-tests] leg summary\n')
let failed = false
for (const result of results) {
  if (result.code !== 0) {
    failed = true
  }
  const mark = result.code === 0 ? 'PASS' : 'FAIL'
  process.stdout.write(`  ${mark}  ${result.name} (exit ${result.code})\n`)
}

if (failed) {
  process.stdout.write('[run-tests] one or more legs failed\n')
  process.exitCode = 1
} else {
  process.stdout.write('[run-tests] all legs green\n')
}
