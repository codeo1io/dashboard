/**
 * rm-1468 — public/ d.ts drift guard.
 *
 * The public/ operator scripts (operator-run-index.js, operator-stream.js) are
 * hand-written ES modules served raw to the browser; their .d.ts twins are the
 * typed contract consumed by web/src/gateway/operator-sse-reader.ts and friends.
 * History: three exports (formatRelativeTime, markCardExpandedForLaunch,
 * APPROVAL_FETCH_TIMEOUT_MS) accumulated in the JS with no declaration — live
 * API invisible to every typed consumer. This guard closes the CLASS: every
 * name the JS exports must be declared in the twin d.ts, and every d.ts
 * declaration must still exist in the JS (dead declarations drift too).
 *
 * Runs in the Main CI job (plain fs reads, no network). Byte-level, not
 * type-level: tsc already checks type COMPATIBILITY where the d.ts is imported;
 * what tsc cannot see is an export that simply has no declaration row at all.
 */
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'

const publicDir = fileURLToPath(new URL('../public/', import.meta.url))

const GUARDED_PAIRS: readonly {readonly js: string; readonly dts: string}[] = [
  {js: 'operator-run-index.js', dts: 'operator-run-index.d.ts'},
  {js: 'operator-stream.js', dts: 'operator-stream.d.ts'},
]

/** Exported names in the hand-written JS: `export function|const|class name`. */
export function extractJsExportNames(source: string): Set<string> {
  const names = new Set<string>()
  for (const match of source.matchAll(/^export (?:async )?(?:function|const|class) (\w+)/gm)) {
    const name = match[1]
    if (name !== undefined) names.add(name)
  }
  return names
}

/** Declared names in the twin d.ts: `export declare function|const|class name`. */
export function extractDtsDeclaredNames(source: string): Set<string> {
  const names = new Set<string>()
  for (const match of source.matchAll(/^export declare (?:function|const|class) (\w+)/gm)) {
    const name = match[1]
    if (name !== undefined) names.add(name)
  }
  return names
}

describe('rm-1468: public/ JS exports vs d.ts declarations', () => {
  for (const {js, dts} of GUARDED_PAIRS) {
    it(`${js}: every JS export is declared in ${dts}, and every declaration still exists in the JS`, () => {
      const jsSource = readFileSync(`${publicDir}${js}`, 'utf8')
      const dtsSource = readFileSync(`${publicDir}${dts}`, 'utf8')
      const jsExports = extractJsExportNames(jsSource)
      const dtsDeclarations = extractDtsDeclaredNames(dtsSource)

      const drifted = [...jsExports].filter(name => !dtsDeclarations.has(name)).sort()
      const dead = [...dtsDeclarations].filter(name => !jsExports.has(name)).sort()

      expect(drifted, `${js} exports with NO d.ts declaration (declare them in ${dts})`).toEqual([])
      expect(dead, `${dts} declarations whose JS export is GONE (remove the dead declaration)`).toEqual([])
    })

    it(`${js}: the pair is non-empty (guard wiring sanity — an unread file must never vacuously pass)`, () => {
      const jsSource = readFileSync(`${publicDir}${js}`, 'utf8')
      const dtsSource = readFileSync(`${publicDir}${dts}`, 'utf8')
      expect(extractJsExportNames(jsSource).size).toBeGreaterThan(0)
      expect(extractDtsDeclaredNames(dtsSource).size).toBeGreaterThan(0)
    })
  }
})
