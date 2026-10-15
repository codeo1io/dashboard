/**
 * rm-1018: public/ JS ↔ d.ts export-parity guard.
 *
 * public/operator-stream.js exports APPROVAL_FETCH_TIMEOUT_MS while its d.ts
 * declared only QUESTION_FETCH_TIMEOUT_MS (2026-10-14) — the declared module
 * surface silently lagged the implementation, forcing hand-declared shapes in
 * web/src. This guard asserts every runtime export in each public/*.js module
 * has a matching `export declare` in its sibling d.ts.
 *
 * Sensitivity is proven in-suite: the same checker run against a mutated d.ts
 * (one declaration stripped) must report the missing name.
 */

import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

const MODULES = [
  'operator-stream',
  'operator-run-index',
  'operator-launch',
] as const

function jsExportNames(source: string): string[] {
  const names = new Set<string>()
  for (const match of source.matchAll(/^export (?:async )?(?:const|let|var|function\*?|class) ([A-Za-z_$][\w$]*)/gm)) {
    const name = match[1]
    if (name !== undefined) names.add(name)
  }
  return [...names].sort()
}

function dtsDeclaredNames(source: string): Set<string> {
  const names = new Set<string>()
  for (const match of source.matchAll(/^export declare (?:const|let|var|function\*?|class) ([A-Za-z_$][\w$]*)/gm)) {
    const name = match[1]
    if (name !== undefined) names.add(name)
  }
  return names
}

function missingDeclarations(jsSource: string, dtsSource: string): string[] {
  const declared = dtsDeclaredNames(dtsSource)
  return jsExportNames(jsSource).filter(name => !declared.has(name))
}

describe('public JS ↔ d.ts export parity (rm-1018)', () => {
  for (const moduleName of MODULES) {
    it(`${moduleName}.js exports are all declared in ${moduleName}.d.ts`, () => {
      const jsSource = readFileSync(join(repoRoot, 'public', `${moduleName}.js`), 'utf8')
      const dtsSource = readFileSync(join(repoRoot, 'public', `${moduleName}.d.ts`), 'utf8')
      expect(missingDeclarations(jsSource, dtsSource)).toEqual([])
    })
  }

  it('guard sensitivity: a d.ts stripped of one declaration is caught', () => {
    const jsSource = readFileSync(join(repoRoot, 'public', 'operator-stream.js'), 'utf8')
    const dtsSource = readFileSync(join(repoRoot, 'public', 'operator-stream.d.ts'), 'utf8')
    const anyName = dtsDeclaredNames(dtsSource).values().next()
    if (anyName.done) throw new Error('operator-stream.d.ts declares nothing — cannot prove sensitivity')
    const stripped = dtsSource.replace(new RegExp(String.raw`^export declare (?:const|let|var|function\*?|class) ${anyName.value}.*$`, 'm'), '')
    expect(stripped).not.toBe(dtsSource)
    const missing = missingDeclarations(jsSource, stripped)
    expect(missing).toContain(anyName.value)
  })
})
