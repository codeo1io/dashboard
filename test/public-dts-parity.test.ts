import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

/**
 * rm-1466: the vendored public twins must keep their .d.ts value-export
 * surface in lockstep with the .js runtime. The test derives BOTH sides from
 * the files themselves — no hand-maintained allowlist:
 *
 *  - .js side: a real namespace import where the module is importable under
 *    node (`operator-run-index.js`, `operator-launch.js`); a source parse of
 *    `export const/function/{…}` statements for `operator-stream.js`, whose
 *    module top level touches browser globals and cannot be imported here.
 *  - .d.ts side: a source parse of `export declare const/function` and
 *    `export {…}` declarations.
 *
 * The red-first case that motivated the guard: `APPROVAL_FETCH_TIMEOUT_MS`
 * (operator-stream.js:2020), `formatRelativeTime` and
 * `markCardExpandedForLaunch` (operator-run-index.js) shipped as runtime
 * exports with zero .d.ts declarations.
 */

interface Pair {
  readonly jsPath: string
  readonly dtsPath: string
  readonly runtimeImportable: boolean
}

const PAIRS: readonly Pair[] = [
  {jsPath: '../public/operator-run-index.js', dtsPath: '../public/operator-run-index.d.ts', runtimeImportable: true},
  {jsPath: '../public/operator-launch.js', dtsPath: '../public/operator-launch.d.ts', runtimeImportable: true},
  {jsPath: '../public/operator-stream.js', dtsPath: '../public/operator-stream.d.ts', runtimeImportable: false},
]

const IDENT = /^[A-Z_$][\w$]*$/i

/** Value-export names declared by a .d.ts (functions, consts, re-export lists). */
function declaredValueExports(dtsSource: string): Set<string> {
  const names = new Set<string>()
  for (const match of dtsSource.matchAll(/^export (?:declare )?(?:async )?(?:function|const) ([A-Za-z_$][\w$]*)/gm)) {
    if (match[1] !== undefined) names.add(match[1])
  }
  for (const match of dtsSource.matchAll(/^export \{([^}]+)\}/gm)) {
    for (const piece of (match[1] ?? '').split(',')) {
      const name = (piece.split(/\s+as\s+/).pop() ?? '').trim()
      if (IDENT.test(name)) names.add(name)
    }
  }
  return names
}

/** Value-export names in a .js source (export const/function, export lists). */
function sourceValueExports(jsSource: string): Set<string> {
  const names = new Set<string>()
  for (const match of jsSource.matchAll(/^export (?:async )?(?:function|const) ([A-Za-z_$][\w$]*)/gm)) {
    if (match[1] !== undefined) names.add(match[1])
  }
  for (const match of jsSource.matchAll(/^export \{([^}]+)\}/gm)) {
    for (const piece of (match[1] ?? '').split(',')) {
      const name = (piece.split(/\s+as\s+/).pop() ?? '').trim()
      if (IDENT.test(name)) names.add(name)
    }
  }
  return names
}

describe.each(PAIRS)('public .d.ts parity ($jsPath)', pair => {
  const jsSource = readFileSync(new URL(pair.jsPath, import.meta.url), 'utf8')
  const dtsSource = readFileSync(new URL(pair.dtsPath, import.meta.url), 'utf8')
  const declared = declaredValueExports(dtsSource)
  const parsed = sourceValueExports(jsSource)

  it('declares every runtime value export', async () => {
    const runtime = pair.runtimeImportable
      ? new Set(Object.keys((await import(pair.jsPath)) as unknown as Record<string, unknown>))
      : parsed
    if (pair.runtimeImportable) {
      // The namespace import is the authority; the source parse must agree
      // with it or the guard itself has rotted.
      expect([...runtime].sort()).toEqual([...parsed].sort())
    }
    const undeclared = [...runtime].filter(name => !declared.has(name)).sort()
    expect(
      undeclared,
      `runtime exports missing from ${pair.dtsPath}: ${undeclared.join(', ')}`,
    ).toEqual([])
  })

  it('declares no value export the runtime does not provide', async () => {
    const runtime = pair.runtimeImportable
      ? new Set(Object.keys((await import(pair.jsPath)) as unknown as Record<string, unknown>))
      : parsed
    const ghost = [...declared].filter(name => !runtime.has(name)).sort()
    expect(ghost, `stale declarations absent from ${pair.jsPath}: ${ghost.join(', ')}`).toEqual([])
  })

  it('keeps the known three-name drift class closed', () => {
    // Regression anchors from the incident that minted this guard.
    expect(declared.has('APPROVAL_FETCH_TIMEOUT_MS')).toBe(
      pair.dtsPath.includes('operator-stream.d.ts'),
    )
    if (pair.dtsPath.includes('operator-run-index.d.ts')) {
      expect(declared.has('formatRelativeTime')).toBe(true)
      expect(declared.has('markCardExpandedForLaunch')).toBe(true)
    }
  })

  it('declares no name twice (mid-edit double-append guard)', () => {
    // A reaped-mid-edit implement attempt once left each new declaration
    // appended twice. A name-set comparison collapses duplicates silently,
    // but a duplicate `export declare` is drift (and a TS duplicate-identifier
    // error for any consumer who type-checks public/). Count raw occurrences.
    const counts = new Map<string, number>()
    for (const match of dtsSource.matchAll(/^export (?:declare )?(?:async )?(?:function|const|class) ([A-Za-z_$][\w$]*)/gm)) {
      const name = match[1]
      if (name !== undefined) counts.set(name, (counts.get(name) ?? 0) + 1)
    }
    const dupes = [...counts.entries()].filter(([, count]) => count > 1)
    expect(dupes.map(([name]) => name)).toEqual([])
  })
})
