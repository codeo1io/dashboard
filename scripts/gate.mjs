#!/usr/bin/env node
/**
 * rm-982 — non-masking composite gate runner.
 *
 * Problem this solves: a `cmdA && cmdB && cmdC` composite stops at the FIRST
 * failing leg, so a red leg one masks every later leg's result — and a failed
 * `pretest` aborts before any test leg runs at all. Both shapes were observed
 * live: at 6ec2328 `pnpm test` reported "9 failed / 3007 passed" for the
 * server leg while the web leg's own 1201-test result was never reached, and
 * the check-types `&&` chain decided which TS project's truth an operator saw
 * first.
 *
 * Contract (this file is load-bearing for CI; keep it dependency-free):
 *   node scripts/gate.mjs <leg> [<leg> ...]
 *
 * - each `<leg>` is a package.json script name, run via `pnpm run <leg>` in
 *   declaration order, stdio INHERITED so each leg streams live exactly as it
 *   does today;
 * - a failing leg NEVER stops the next one: every leg always runs;
 * - after the last leg a per-leg summary table prints — the single place an
 *   operator reads "which gates are red, all of them";
 * - exit code 1 if any leg failed, 0 only if every leg passed, so CI keeps
 *   gating on the same predicate as before.
 *
 * The `test` composite uses this runner with `test:web-dist` as its FIRST leg
 * (the former `pretest` build). A red client build is therefore a visible leg
 * with its own row, not an abort that hides both test legs' results behind a
 * 404 cascade on a missing `web/dist`.
 */
import {spawn} from 'node:child_process'
import process from 'node:process'

const LEG_SEPARATOR_WIDTH = 72

function printLegBanner(name, index, total) {
  const label = `[gate ${index}/${total}] ${name}`
  const pad = '='.repeat(Math.max(0, LEG_SEPARATOR_WIDTH - label.length - 2))
  process.stdout.write(`\n${label} ${pad}\n`)
}

function printSummary(legs) {
  process.stdout.write(`\n${'='.repeat(LEG_SEPARATOR_WIDTH)}\ngate summary (${legs.length} legs)\n`)
  for (const leg of legs) {
    const outcome = leg.exitCode === 0 ? 'PASS' : `FAIL (exit ${leg.exitCode})`
    const duration = `${(leg.durationMs / 1000).toFixed(1)}s`
    process.stdout.write(`  ${leg.exitCode === 0 ? '✅' : '❌'}  ${leg.name.padEnd(24)} ${outcome.padEnd(14)} ${duration}\n`)
  }
  const failed = legs.filter(leg => leg.exitCode !== 0)
  process.stdout.write(
    failed.length === 0
      ? 'all legs passed\n'
      : `${failed.length}/${legs.length} leg(s) failed: ${failed.map(leg => leg.name).join(', ')}\n`,
  )
  process.stdout.write(`${'='.repeat(LEG_SEPARATOR_WIDTH)}\n`)
}

function runLeg(name, index, total) {
  return new Promise(resolve => {
    printLegBanner(name, index, total)
    const startedAt = Date.now()
    const child = spawn('pnpm', ['run', name], {stdio: 'inherit', shell: process.platform === 'win32'})
    child.on('error', err => {
      // pnpm itself missing/broken: treat as a failed leg, keep the rest running.
      process.stderr.write(`gate: could not spawn pnpm run ${name}: ${err.message}\n`)
      resolve({name, exitCode: 1, durationMs: Date.now() - startedAt})
    })
    child.on('close', code => {
      resolve({name, exitCode: code ?? 1, durationMs: Date.now() - startedAt})
    })
  })
}

const legs = process.argv.slice(2)
if (legs.length === 0) {
  process.stderr.write('usage: node scripts/gate.mjs <leg> [<leg> ...]\n  each <leg> is a package.json script name\n')
  process.exit(2)
}

const results = []
for (const [index, leg] of legs.entries()) {
  // Sequential by design: legs share the working tree and vitest workers;
  // the order IS the dependency order (build before the tests that read it).
  results.push(await runLeg(leg, index + 1, legs.length))
}
printSummary(results)
process.exit(results.some(leg => leg.exitCode !== 0) ? 1 : 0)
