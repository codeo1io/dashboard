import {readdirSync, readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

import {RUN_SUMMARY_STATUSES, STREAM_RUN_STATUSES} from '../src/gateway/operator-contract/run-status.ts'
import {OPERATOR_CONTRACT_VERSION} from '../src/gateway/operator-contract/version.ts'

const publicDir = new URL('../public/', import.meta.url)

const PAIRS = [
  {js: 'operator-stream.js', dts: 'operator-stream.d.ts'},
  {js: 'operator-run-index.js', dts: 'operator-run-index.d.ts'},
  {js: 'operator-launch.js', dts: 'operator-launch.d.ts'},
] as const

/** Runtime-bearing export declarations in a d.ts (type/interface exports bind nothing at runtime). */
const RUNTIME_EXPORT_RE = /^export (?:declare )?(?:async )?(?:const|let|var|function|class)\s+([\w$]+)/gm

/**
 * The drift checker, factored out so the suite can prove it goes red: returns the d.ts-declared
 * runtime export names that do not resolve on the loaded module.
 */
export function missingRuntimeExports(dtsText: string, moduleNamespace: object): string[] {
  const names = new Set<string>()
  for (const match of dtsText.matchAll(RUNTIME_EXPORT_RE)) {
    const name = match[1]
    if (name !== undefined) {
      names.add(name)
    }
  }
  const missing: string[] = []
  for (const name of names) {
    const value = (moduleNamespace as Record<string, unknown>)[name]
    if (value === undefined) {
      missing.push(name)
    }
  }
  return missing.sort()
}

async function loadModule(jsName: string): Promise<object> {
  const moduleNamespace = (await import(new URL(`../public/${jsName}`, import.meta.url).href)) as object
  return moduleNamespace
}

describe('public/*.d.ts runtime parity guard (rm-1462)', () => {
  it('every operator-*.d.ts has a .js sibling and every operator-*.js has a .d.ts sibling', () => {
    const files = readdirSync(publicDir)
    const dts = files.filter(f => /^operator-.*\.d\.ts$/.test(f)).sort()
    const js = files.filter(f => /^operator-.*\.js$/.test(f)).sort()
    expect(dts.length).toBeGreaterThan(0)
    expect(js.length).toBe(dts.length)
    for (const d of dts) {
      expect(js, `${d} must have a .js sibling`).toContain(d.replace(/\.d\.ts$/, '.js'))
    }
    for (const j of js) {
      expect(dts, `${j} must have a .d.ts sibling`).toContain(j.replace(/\.js$/, '.d.ts'))
    }
  })

  for (const pair of PAIRS) {
    it(`every runtime export declared in ${pair.dts} resolves on ${pair.js}`, async () => {
      const dtsText = readFileSync(new URL(`../public/${pair.dts}`, import.meta.url), 'utf8')
      const moduleNamespace = await loadModule(pair.js)
      expect(missingRuntimeExports(dtsText, moduleNamespace)).toEqual([])
    })
  }

  it('constant shapes: pinned version agrees with the server pin; status sets have the wire shape', async () => {
    const stream = (await loadModule('operator-stream.js')) as Record<string, unknown>
    const runIndex = (await loadModule('operator-run-index.js')) as Record<string, unknown>

    expect(stream.PINNED_CONTRACT_VERSION).toBe(OPERATOR_CONTRACT_VERSION)

    const statuses = stream.VALID_STATUSES
    expect(statuses).toBeInstanceOf(Set)
    expect((statuses as Set<unknown>).size).toBe(STREAM_RUN_STATUSES.length)
    for (const value of statuses as Set<unknown>) {
      expect(typeof value).toBe('string')
    }

    const summary = runIndex.VALID_RUN_SUMMARY_STATUSES
    expect(summary).toBeInstanceOf(Set)
    expect((summary as Set<unknown>).size).toBe(RUN_SUMMARY_STATUSES.length)
  })

  it('checker goes red on a deliberately drifted declaration', async () => {
    // Prove the checker detects drift without mutating any repo file: a synthetic d.ts that
    // declares one real module's exports plus two phantom names must yield exactly the phantoms.
    const real = readFileSync(new URL('../public/operator-stream.d.ts', import.meta.url), 'utf8')
    const drifted = `${real}\nexport declare const __DRIFTED_SENTINEL_A__: string\nexport declare function __DRIFTED_SENTINEL_B__(): void\n`
    const moduleNamespace = await loadModule('operator-stream.js')
    expect(missingRuntimeExports(drifted, moduleNamespace)).toEqual([
      '__DRIFTED_SENTINEL_A__',
      '__DRIFTED_SENTINEL_B__',
    ])
    // And a declaration stripped of a real export's phantom twin resolves clean on the real module.
    expect(missingRuntimeExports(real, moduleNamespace)).toEqual([])
  })
})
