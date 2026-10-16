#!/usr/bin/env node
// scripts/lint-baseline.ts
//
// Lint step of `pnpm gates` (rm-1454, docs/runbooks/local-gates.md): run
// `pnpm lint` and pass it only at the FROZEN baseline — at most
// FROZEN_LINT_ERRORS errors, every one attributed to ROADMAP.md.
//
// The baseline is ZERO since 2026-10-17: the rm-100 lint debt (exactly 50
// errors, all in ROADMAP.md — 47 trailing spaces, 3 unreferenced link
// labels) was cured in-tree by the full_tests pass of run 747806ff, and the
// constant was re-frozen to 0 in the same change. At zero this step
// degenerates to "lint must be fully green" — it still fails on drift in
// EITHER direction, so the first new error anywhere in the tree, or a
// deliberate re-introduction of ROADMAP.md debt without a re-freeze, stops
// the battery loudly.
//
// Re-freeze procedure: when the debt is deliberately resized, update
// FROZEN_LINT_ERRORS here AND the count quoted in
// docs/runbooks/local-gates.md in the SAME change, citing the ledger id that
// moved it.

import {spawnSync} from 'node:child_process'
import process from 'node:process'

const FROZEN_LINT_ERRORS = 0
const BASELINE_FILE = 'ROADMAP.md'

// eslint stylish output: findings are indented "  19:32  error  Message  rule"
// lines, attributed to the most recent standalone absolute-path header line.
const ERROR_LINE = /\serror\s/
const FILE_HEADER = /^\/\S+$/

function parseStylish(output: string): Map<string, number> {
  const perFile = new Map<string, number>()
  let currentFile = '<unattributed>'
  for (const line of output.split('\n')) {
    if (FILE_HEADER.test(line)) {
      currentFile = line
    } else if (ERROR_LINE.test(line)) {
      perFile.set(currentFile, (perFile.get(currentFile) ?? 0) + 1)
    }
  }
  return perFile
}

function isBaselineFile(file: string): boolean {
  return file === BASELINE_FILE || file.endsWith(`/${BASELINE_FILE}`)
}

const run = spawnSync('pnpm', ['lint'], {encoding: 'utf8'})
if (run.error) {
  console.error(`lint-baseline: could not run pnpm lint — ${run.error.message}`)
  process.exit(1)
}

const output = `${run.stdout ?? ''}${run.stderr ?? ''}`
const perFile = parseStylish(output)
const total = [...perFile.values()].reduce((sum, count) => sum + count, 0)
const foreign = [...perFile.entries()].filter(([file]) => !isBaselineFile(file))

if (total === FROZEN_LINT_ERRORS && foreign.length === 0) {
  console.log(
    total === 0
      ? 'lint-baseline: PASS — lint fully green (baseline re-frozen to zero 2026-10-17, rm-100 cure)'
      : `lint-baseline: PASS — exactly ${FROZEN_LINT_ERRORS} errors, all in ${BASELINE_FILE} (frozen baseline, rm-1454)`,
  )
  process.exit(0)
}

console.error(
  `lint-baseline: FAIL — expected exactly ${FROZEN_LINT_ERRORS} errors all in ${BASELINE_FILE}, found ${total}`,
)
for (const [file, count] of foreign) {
  console.error(`lint-baseline: ${count} error(s) OUTSIDE ${BASELINE_FILE} in ${file}`)
}
if (total !== FROZEN_LINT_ERRORS && foreign.length === 0) {
  console.error(
    `lint-baseline: all errors are in ${BASELINE_FILE} but the count drifted — if the debt was ` +
    `deliberately resolved or resized, re-freeze FROZEN_LINT_ERRORS in scripts/lint-baseline.ts ` +
    `and the count in docs/runbooks/local-gates.md in the same change (rm-1454 procedure)`,
  )
}
if (total === 0) {
  console.error('lint-baseline: lint appears fully green — raw output tail follows')
  console.error(output.split('\n').slice(-8).join('\n'))
}
process.exit(1)
