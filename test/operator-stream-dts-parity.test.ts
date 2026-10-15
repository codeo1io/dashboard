import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {cwd} from 'node:process'
import {describe, expect, it} from 'vitest'

/**
 * js <-> d.ts export parity for the vendored public operator modules
 * (rm-1412). The d.ts is hand-maintained next to the runtime .js: nothing
 * forces a new runtime export to be declared, so typed consumers silently
 * miss constants like APPROVAL_FETCH_TIMEOUT_MS (missing from the d.ts from
 * rm-594 until 2026-10-14). This guard extracts the declared-const surface
 * from both files and fails on any divergence, so the class cannot regrow.
 */

const repoRoot = cwd()
const jsPath = join(repoRoot, 'public', 'operator-stream.js')
const dtsPath = join(repoRoot, 'public', 'operator-stream.d.ts')

/** Runtime `export const NAME = ...` declarations from the .js source. */
function runtimeConstExports(source: string): Set<string> {
  const names = new Set<string>()
  for (const match of source.matchAll(/^export const ([A-Z][A-Z0-9_]*)\b/gm)) {
    names.add(match[1] ?? '')
  }
  return names
}

/** Declared `export declare const NAME: ...` surface from the d.ts source. */
function declaredConstExports(source: string): Set<string> {
  const names = new Set<string>()
  for (const match of source.matchAll(/^export declare const ([A-Z][A-Z0-9_]*)\b/gm)) {
    names.add(match[1] ?? '')
  }
  return names
}

describe('operator-stream js <-> d.ts export parity (rm-1412)', () => {
  const jsSource = readFileSync(jsPath, 'utf8')
  const dtsSource = readFileSync(dtsPath, 'utf8')

  it('every SCREAMING_SNAKE runtime export is declared in the d.ts', () => {
    const runtime = runtimeConstExports(jsSource)
    const declared = declaredConstExports(dtsSource)
    expect(runtime.size, 'no runtime const exports found — extraction regex drifted').toBeGreaterThan(0)
    const missing = [...runtime].filter(name => !declared.has(name))
    expect(missing, 'runtime consts missing from operator-stream.d.ts').toEqual([])
  })

  it('the d.ts declares no const the runtime does not export', () => {
    const runtime = runtimeConstExports(jsSource)
    const declared = declaredConstExports(dtsSource)
    const stale = [...declared].filter(name => !runtime.has(name))
    expect(stale, 'd.ts consts with no runtime export').toEqual([])
  })

  it('regression pin: APPROVAL_FETCH_TIMEOUT_MS is declared and equals 10_000', async () => {
    const declared = declaredConstExports(dtsSource)
    expect(declared.has('APPROVAL_FETCH_TIMEOUT_MS')).toBe(true)
    const module = await import('../public/operator-stream.js')
    expect(module.APPROVAL_FETCH_TIMEOUT_MS).toBe(10_000)
  })
})
