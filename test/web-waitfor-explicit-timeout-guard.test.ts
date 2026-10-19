import {readdirSync, readFileSync, statSync} from 'node:fs'
import {join, relative} from 'node:path'
import process from 'node:process'
import ts from 'typescript'
import {describe, expect, it} from 'vitest'

// rm-1501 (run b9c4278c cycle-2 batch 'verification truth on the post-absorb
// base'): vi.waitFor defaults to a 1000ms budget (vitest 4.1.11
// WaitForOptions — verified against the installed types; there is no
// config-level knob for it, unlike testTimeout), and that default is the
// repo's only live CI-flake family: four web-suite reds at ~1006-1028ms under
// host load 56-64, green in isolation and on rerun (assess F1). Every call
// site now passes an explicit { timeout: 5_000 } (105 sites across 6 files at
// landing). This guard fails when any vi.waitFor call under web/src regresses
// to the implicit default, so the family cannot quietly return.

const repoRoot = process.cwd()
const WEB_SRC = join(repoRoot, 'web', 'src')

function collectSourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...collectSourceFiles(full))
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      out.push(full)
    }
  }
  return out
}

interface CallSite {
  file: string
  line: number
}

function findImplicitBudgetWaitForCalls(file: string): CallSite[] {
  const text = readFileSync(file, 'utf8')
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  const offenders: CallSite[] = []
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && node.expression.getText(sf) === 'vi.waitFor') {
      const last = node.arguments.at(-1)
      // vi.waitFor(callback, options) — options may be a bare number (timeout)
      // or an object that must carry an explicit `timeout` member.
      const explicit =
        last !== undefined &&
        (ts.isNumericLiteral(last) ||
          (ts.isObjectLiteralExpression(last) &&
            last.properties.some(
              p => ts.isPropertyAssignment(p) && p.name.getText(sf) === 'timeout',
            )))
      if (!explicit) {
        offenders.push({
          file: relative(repoRoot, file),
          line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        })
      }
    }
    node.forEachChild(visit)
  }
  visit(sf)
  return offenders
}

describe('web vi.waitFor explicit-timeout guard (rm-1501)', () => {
  const files = collectSourceFiles(WEB_SRC)
  const offenders = files.flatMap(findImplicitBudgetWaitForCalls)
  const totalWaitForCalls = files.reduce(
    (count, file) => count + (readFileSync(file, 'utf8').match(/vi\.waitFor\(/g)?.length ?? 0),
    0,
  )

  it('guards a live tree (waitFor calls exist under web/src)', () => {
    expect(files.length).toBeGreaterThan(0)
    expect(totalWaitForCalls).toBeGreaterThan(0)
  })

  it('every vi.waitFor call under web/src carries an explicit timeout budget', () => {
    const listed = offenders.map(({file, line}) => `${file}:${line}`)
    const details = offenders.map(({file, line}) => `  ${file}:${line}`).join('\n')
    expect(
      listed,
      'vi.waitFor defaults to a 1000ms budget — the flake family this guard exists for. ' +
      `Pass an explicit options argument, e.g. vi.waitFor(fn, { timeout: 5_000 }).\nOffenders:\n${details}`,
    ).toEqual([])
  })
})
