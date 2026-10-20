import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

/**
 * rm-1483: tripwire for the operator-contract twin surface.
 *
 * Supersession record (2026-10-17 integrate, conflict case ba612599): the
 * guard was minted pinning 1.9.0 while rm-252's estate verdict still gated
 * absorbing the newer contract. Main then landed the upstream 2026.10.43
 * adoption (c51597ad + 64cd2f6a, contract 1.11.0) first, so the pin is
 * re-derived at the absorbed version: the fork's contract twins now speak
 * 1.11.0 and this guard keeps the two declarations in lockstep. Any change
 * that bumps one declaration without the other — or diverges the twins —
 * fails here and must either be part of a deliberate absorb/verdict landing
 * (rm-252 lineage) or back the bump out.
 *
 * public/operator-run-index.js carries no version declaration of its own
 * (only the stream twin pins), so this guard pins the two declarations that
 * exist.
 */

const repoRoot = resolve(import.meta.dirname, '..')

function read(path: string): string {
  return readFileSync(resolve(repoRoot, path), 'utf8')
}

describe('operator contract scope guard (rm-1483 / rm-252)', () => {
  it('keeps the server contract version pinned at 1.11.0', () => {
    const versionTs = read('src/gateway/operator-contract/version.ts')
    expect(versionTs).toContain("export const OPERATOR_CONTRACT_VERSION = '1.11.0'")
  })

  it('keeps the stream twin pinned to the same version', () => {
    const streamJs = read('public/operator-stream.js')
    expect(streamJs).toContain("export const PINNED_CONTRACT_VERSION = '1.11.0'")
  })

  it('declares the pin in neither place with any other value', () => {
    const versionTs = read('src/gateway/operator-contract/version.ts')
    const streamJs = read('public/operator-stream.js')
    const declared = [...versionTs.matchAll(/OPERATOR_CONTRACT_VERSION = '([^']+)'/g)]
      .concat([...streamJs.matchAll(/PINNED_CONTRACT_VERSION = '([^']+)'/g)])
      .map(m => m[1])
    expect(new Set(declared)).toEqual(new Set(['1.11.0']))
  })
})
