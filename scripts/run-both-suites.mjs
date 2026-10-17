#!/usr/bin/env node
/**
 * Run the root and web vitest suites independently and report both halves
 * (rm-651): the old `vitest run && vitest run --config ...` chain masked the
 * web suite behind any root failure — on 2026-10-15 a root load-flake left
 * the web half unreported even though it was green when run separately.
 *
 * Always runs BOTH suites, prints a per-half verdict line, and exits nonzero
 * if either half failed.
 */
import {spawnSync} from 'node:child_process'
import {existsSync} from 'node:fs'
import process from 'node:process'

// Resolve vitest from the repo-local bin when present — a bare `vitest` on
// PATH only exists inside `pnpm run` scripts; direct `node scripts/…` calls
// would otherwise ENOENT and report both halves as failed.
const LOCAL_VITEST = process.platform === 'win32'
  ? 'node_modules/.bin/vitest.cmd'
  : 'node_modules/.bin/vitest'
const vitestCmd = existsSync(LOCAL_VITEST) ? LOCAL_VITEST : 'vitest'

const halves = [
  {name: 'root', args: ['run']},
  {name: 'web', args: ['run', '--config', 'web/vitest.config.ts']},
]

let overallExit = 0
const verdicts = []

for (const half of halves) {
  const run = spawnSync(vitestCmd, half.args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  })
  const exit = run.status ?? 1
  const ok = exit === 0
  if (!ok) overallExit = exit
  verdicts.push(`${half.name}: ${ok ? 'PASS' : `FAIL (exit ${exit})`}`)
}

console.log(`[both-suites] ${verdicts.join(' | ')}`)
process.exit(overallExit)
