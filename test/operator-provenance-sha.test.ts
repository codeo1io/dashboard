/**
 * rm-1449: SHA-256 (64-hex) git object ids on the operator checkout
 * provenance wire.
 *
 * src/gateway/operator-contract/provenance.ts validated every sha slot with
 * `SHA_RE = /^[0-9a-f]{40}$/` — a repository initialized
 * `--object-format=sha256` carries 64-hex shas on `head.sha` and every
 * `remote` variant, so the whole checkout-provenance field silently degraded
 * to `undefined` for SHA-256 checkouts: fail-safe downstream, but the
 * operator surface lost the field the rm-157 ladder surfaces (run 85d97dc8
 * assess 448c33b8 F6, 2026-10-15).
 *
 * The dedicated file is deliberate: the natural hosts for these cases
 * (test/operator-contract-conformance.test.ts, test/operator-fixture-harness.test.ts)
 * are window-hit by the in-flight upstream absorb (upstream #619 c13d4ef /
 * #623 c936d85 both touch them) — a dedicated new file keeps this batch
 * disjoint from that merge surface.
 */

import {describe, expect, it} from 'vitest'

import {parseOperatorCheckoutProvenance} from '../src/gateway/operator-contract/provenance.ts'

const SHA1 = 'c'.repeat(40)
const SHA256 = 'ab'.repeat(32)

const observedWith = (headSha: string, remoteSha?: string, fromSha?: string) => ({
  kind: 'observed',
  observation: {
    head: {kind: 'attached', branch: 'fixture-main', sha: headSha},
    worktree: {kind: 'clean'},
    operationInProgress: 'none',
    observedAt: '2026-10-15T00:00:00Z',
  },
  remote:
    remoteSha === undefined
      ? {kind: 'not-checked'}
      : fromSha === undefined
        ? {kind: 'checked', defaultBranch: 'main', sha: remoteSha, checkedAt: 'now', change: 'unchanged'}
        : {
            kind: 'checked',
            defaultBranch: 'main',
            sha: remoteSha,
            checkedAt: 'now',
            change: 'fast-forward',
            fromSha,
          },
})

describe('parseOperatorCheckoutProvenance — SHA-256 (64-hex) shas (rm-1449)', () => {
  it('a 64-hex attached head sha parses and flows through the rebuild intact', () => {
    const parsed = parseOperatorCheckoutProvenance(observedWith(SHA256))
    expect(parsed).not.toBeUndefined()
    expect(parsed?.kind).toBe('observed')
    if (parsed?.kind !== 'observed') return
    expect(parsed.observation.head.kind).toBe('attached')
    if (parsed.observation.head.kind !== 'attached') return
    expect(parsed.observation.head.sha).toBe(SHA256)
    // The constructor rebuilt the value field-by-field (not the input object).
    expect(parsed.observation.head).not.toBe(observedWith(SHA256).observation.head)
  })

  it('a 64-hex detached head sha parses', () => {
    const value = {
      kind: 'observed',
      observation: {
        head: {kind: 'detached', sha: SHA256},
        worktree: {kind: 'clean'},
        operationInProgress: 'none',
        observedAt: '2026-10-15T00:00:00Z',
      },
      remote: {kind: 'not-checked'},
    }
    const parsed = parseOperatorCheckoutProvenance(value)
    expect(parsed?.kind).toBe('observed')
    if (parsed?.kind !== 'observed') return
    expect(parsed.observation.head.kind).toBe('detached')
    expect(parsed.observation.head.sha).toBe(SHA256)
  })

  it('64-hex remote checked sha (unchanged) parses', () => {
    const parsed = parseOperatorCheckoutProvenance(observedWith(SHA1, SHA256))
    expect(parsed?.kind).toBe('observed')
    if (parsed?.kind !== 'observed') return
    expect(parsed.remote.kind).toBe('checked')
    if (parsed.remote.kind !== 'checked') return
    expect(parsed.remote.sha).toBe(SHA256)
  })

  it('a 64-hex fast-forward (sha + fromSha both SHA-256) parses', () => {
    const parsed = parseOperatorCheckoutProvenance(observedWith(SHA1, SHA256, 'cd'.repeat(32)))
    expect(parsed?.kind).toBe('observed')
    if (parsed?.kind !== 'observed') return
    expect(parsed.remote.kind).toBe('checked')
    if (parsed.remote.kind !== 'checked') return
    expect(parsed.remote.sha).toBe(SHA256)
    if (parsed.remote.change !== 'fast-forward') return
    expect(parsed.remote.fromSha).toBe('cd'.repeat(32))
  })

  it('40-hex SHA-1 shas still parse (regression pin)', () => {
    for (const value of [observedWith(SHA1), observedWith(SHA1, SHA1), observedWith(SHA1, SHA1, 'd'.repeat(40))]) {
      expect(parseOperatorCheckoutProvenance(value)?.kind).toBe('observed')
    }
  })

  it('mixed sha lengths validate independently — a SHA-1 head with a SHA-256 remote parses', () => {
    const parsed = parseOperatorCheckoutProvenance(observedWith(SHA1, SHA256))
    expect(parsed?.kind).toBe('observed')
  })

  it('off-by-one and malformed sha shapes still fail closed to undefined', () => {
    for (const bad of [
      'c'.repeat(39), // SHA-1 minus one
      'c'.repeat(41), // SHA-1 plus one
      'ab'.repeat(31), // SHA-256 minus two
      `${'ab'.repeat(32)}a`, // SHA-256 plus one
      'c'.repeat(40).toUpperCase(), // uppercase is not the wire shape
      'g'.repeat(40), // non-hex
      '', // empty
    ]) {
      expect(parseOperatorCheckoutProvenance(observedWith(bad)), `sha=${bad}`).toBeUndefined()
      expect(parseOperatorCheckoutProvenance(observedWith(SHA1, bad)), `remote sha=${bad}`).toBeUndefined()
    }
  })

  it('a fast-forward whose fromSha equals the 64-hex sha is still rejected (no real advance)', () => {
    expect(parseOperatorCheckoutProvenance(observedWith(SHA1, SHA256, SHA256))).toBeUndefined()
  })
})
