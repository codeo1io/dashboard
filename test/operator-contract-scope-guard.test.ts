import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

/**
 * rm-1483: tripwire for the operator-contract surface the cycle:3 port batch
 * deliberately did NOT touch.
 *
 * The fork pins the operator contract at 1.9.0 while upstream has moved to
 * 1.11.0 (rm-252: the absorb of the newer contract surface is gated on the
 * deployed-gateway estate verdict, which is still unrecorded). The batch that
 * landed the verdict-independent operator-UX ports (#633/#637/#641/#644)
 * promised zero hunks in the contract twins. This guard turns that promise
 * into a test: if a future change bumps the pinned versions or touches the
 * twin that carries the version pin, this fails and the change must either
 * be part of a deliberate rm-252 absorb (with its estate-verdict evidence)
 * or back the bump out.
 *
 * public/operator-run-index.js carries no version declaration of its own
 * (only the stream twin pins); its 1.9.0-era behavior is the run-index DOM
 * contract, not a version constant, so this guard pins the two declarations
 * that exist.
 */

const repoRoot = resolve(import.meta.dirname, '..')

function read(path: string): string {
  return readFileSync(resolve(repoRoot, path), 'utf8')
}

describe('operator contract scope guard (rm-1483 / rm-252)', () => {
  it('keeps the server contract version pinned at 1.9.0', () => {
    const versionTs = read('src/gateway/operator-contract/version.ts')
    expect(versionTs).toContain("export const OPERATOR_CONTRACT_VERSION = '1.9.0'")
  })

  it('keeps the stream twin pinned to the same version', () => {
    const streamJs = read('public/operator-stream.js')
    expect(streamJs).toContain("export const PINNED_CONTRACT_VERSION = '1.9.0'")
  })

  it('declares the pin in neither place with any other value', () => {
    const versionTs = read('src/gateway/operator-contract/version.ts')
    const streamJs = read('public/operator-stream.js')
    const declared = [...versionTs.matchAll(/OPERATOR_CONTRACT_VERSION = '([^']+)'/g)]
      .concat([...streamJs.matchAll(/PINNED_CONTRACT_VERSION = '([^']+)'/g)])
      .map(m => m[1])
    expect(new Set(declared)).toEqual(new Set(['1.9.0']))
  })
})
