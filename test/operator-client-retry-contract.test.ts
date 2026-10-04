import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

/**
 * rm-485 (declined-by-decision arm): the four mutating OperatorClient methods
 * must each state an explicit CSRF-400 retry contract in their interface
 * docstring, and the three that retry (decideRunApproval, subscribePush,
 * unsubscribePush) must say so the same way, while launchRun must say it does
 * NOT retry server-side and name the browser twin that owns the
 * refresh-then-resend. This guard keeps that documentation self-locking: if a
 * docstring drifts (or a fifth mutating method appears without a contract
 * statement), the suite fails instead of silently regressing the symmetry.
 */
const repoRoot = process.cwd()
const clientPath = resolve(repoRoot, 'src/gateway/operator-client.ts')
const source = readFileSync(clientPath, 'utf8')

/** The `export interface OperatorClient { … }` block, docstrings included. */
function interfaceBlock(): string {
  const start = source.indexOf('export interface OperatorClient {')
  expect(start, 'OperatorClient interface not found').toBeGreaterThanOrEqual(0)
  const end = source.indexOf('\n}', start)
  expect(end, 'interface terminator not found').toBeGreaterThan(start)
  return source.slice(start, end)
}

/** Collapse docstring wrapping: strip `*` decoration, join lines, squeeze runs. */
function normalize(text: string): string {
  return text
    .split('\n')
    .map(line => line.replace(/^\s*\*\s?/u, ''))
    .join(' ')
    .replaceAll(/\s+/gu, ' ')
}

/** The docstring + signature region of one interface member. */
function memberRegion(block: string, name: string): string {
  const at = block.indexOf(`readonly ${name}:`)
  expect(at, `member ${name} not found in OperatorClient`).toBeGreaterThanOrEqual(0)
  // capture the member's own docstring (immediately above) + its signature line
  const regionStart = block.lastIndexOf('/**', at)
  const regionEnd = block.indexOf('\n', at)
  expect(regionStart, `member ${name} has no docstring`).toBeGreaterThanOrEqual(0)
  return block.slice(regionStart, regionEnd)
}

describe('OperatorClient retry-contract documentation (rm-485)', () => {
  it('decideRunApproval documents one CSRF-400 retry with the same key', () => {
    expect(normalize(memberRegion(interfaceBlock(), 'decideRunApproval'))).toMatch(
      /one CSRF-400 retry reusing the same key/u,
    )
  })

  it('subscribePush documents one CSRF-400 retry with the same key', () => {
    expect(normalize(memberRegion(interfaceBlock(), 'subscribePush'))).toMatch(
      /one CSRF-400 retry reusing the same key/u,
    )
  })

  it('unsubscribePush documents one CSRF-400 retry with the same key', () => {
    expect(normalize(memberRegion(interfaceBlock(), 'unsubscribePush'))).toMatch(
      /one CSRF-400 retry reusing the same key/u,
    )
  })

  it('launchRun documents the deliberate NO-retry contract and the browser twin', () => {
    const region = normalize(memberRegion(interfaceBlock(), 'launchRun'))
    expect(region).toMatch(/NO server-side CSRF-400 retry/u)
    expect(region).toMatch(/SAME idempotency/u)
    expect(region).toMatch(/operator-launch\.js/u)
  })

  it('every mutating member states a CSRF-400 retry contract (no silent fifth)', () => {
    const block = normalize(interfaceBlock())
    const contractStatements = block.match(/CSRF-400 retry/gu) ?? []
    // 3 retrying methods + launchRun's explicit no-retry statement
    expect(contractStatements.length).toBeGreaterThanOrEqual(4)
  })
})
