import {describe, expect, it} from 'vitest'

import {
  isKnownOperatorContractVersion,
  KNOWN_OPERATOR_CONTRACT_VERSIONS,
  PINNED_OPERATOR_CONTRACT_VERSION,
} from '../src/gateway/operator-contract-versions.ts'
import {OPERATOR_CONTRACT_VERSION} from '../src/gateway/operator-contract/version.ts'
import {
  KNOWN_CONTRACT_VERSIONS as BROWSER_KNOWN_CONTRACT_VERSIONS,
  PINNED_CONTRACT_VERSION as BROWSER_PINNED_CONTRACT_VERSION,
} from '../public/operator-stream.js'

/**
 * rm-157 lock rider: the operator contract version exists in THREE places —
 * the vendored mirror (`src/gateway/operator-contract/version.ts`), the
 * dashboard acceptance set (`src/gateway/operator-contract-versions.ts`), and
 * the PRODUCTION client script (`public/operator-stream.js`, whose drift check
 * at the ready frame is what actually gates the operator view). This suite
 * locks all three together so an absorb cannot land on one surface while
 * another still fails closed on an old pin — the exact seam class that let
 * `operator-stream.js` carry a second, divergent '1.6.0' copy through the
 * 1.6.0 absorb (see ROADMAP rm-157, 2026-09-29 signal).
 */
describe('operator contract version lock (rm-157)', () => {
  it('the vendored mirror pin equals the last (newest) entry of the dashboard known set', () => {
    expect(KNOWN_OPERATOR_CONTRACT_VERSIONS.at(-1)).toBe(OPERATOR_CONTRACT_VERSION)
    expect(PINNED_OPERATOR_CONTRACT_VERSION).toBe(OPERATOR_CONTRACT_VERSION)
  })

  it('the production client script pin and known set equal the dashboard set exactly', () => {
    expect(BROWSER_PINNED_CONTRACT_VERSION).toBe(OPERATOR_CONTRACT_VERSION)
    expect([...BROWSER_KNOWN_CONTRACT_VERSIONS]).toEqual([...KNOWN_OPERATOR_CONTRACT_VERSIONS])
  })

  it('the known set is strictly increasing semver minors with no duplicates', () => {
    const versions = [...KNOWN_OPERATOR_CONTRACT_VERSIONS]
    expect(new Set(versions).size).toBe(versions.length)
    for (let i = 1; i < versions.length; i += 1) {
      const prev = versions[i - 1] ?? ''
      const cur = versions[i] ?? ''
      const [prevMajor, prevMinor] = prev.split('.').map(Number) as [number, number]
      const [major, minor] = cur.split('.').map(Number) as [number, number]
      expect(major).toBe(prevMajor)
      expect(minor).toBeGreaterThan(prevMinor)
    }
  })

  it('isKnownOperatorContractVersion accepts every member and rejects neighbors', () => {
    for (const version of KNOWN_OPERATOR_CONTRACT_VERSIONS) {
      expect(isKnownOperatorContractVersion(version)).toBe(true)
    }
    const parts = OPERATOR_CONTRACT_VERSION.split('.').map(Number)
    const major = parts[0] ?? 0
    const newestMinor = parts[1] ?? 0
    expect(isKnownOperatorContractVersion(`${major}.${newestMinor + 1}.0`)).toBe(false)
    expect(isKnownOperatorContractVersion(`${major}.0.0`)).toBe(false)
    expect(isKnownOperatorContractVersion('')).toBe(false)
    expect(isKnownOperatorContractVersion(undefined)).toBe(false)
    expect(isKnownOperatorContractVersion(1)).toBe(false)
  })

  it('README of the vendored mirror documents the pinned version (docs cannot lag the code)', async () => {
    const {readFileSync} = await import('node:fs')
    const text = readFileSync(new URL('../src/gateway/operator-contract/README.md', import.meta.url), 'utf8')
    // The README header records the pin both backticked (prose) and bare
    // (`Contract: OPERATOR_CONTRACT_VERSION = X.Y.Z`) — either satisfies the lock.
    expect(text.includes(`\`${OPERATOR_CONTRACT_VERSION}\``) || text.includes(`= ${OPERATOR_CONTRACT_VERSION}`)).toBe(
      true,
    )
  })
})
