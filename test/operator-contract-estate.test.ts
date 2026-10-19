import {mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, expect, it} from 'vitest'
import {
  buildSummaryLines,
  compareContractVersions,
  EstateExtractionError,
  evaluateEstate,
  fetchUpstreamSnapshot,
  readForkPins,
  run,
} from '../scripts/operator-contract-estate.ts'

// rm-2063 operator-contract estate tripwire — fixture tests. All network and file edges are
// injected; nothing here touches the network. The RED-BY-DESIGN live datum (upstream v0.124.0
// contract 1.12.0 vs fork pins 1.11.0, researched 2026-10-18T22:04Z) is encoded as the
// drift-ahead fixture.

const SERVER_PIN_OK = `export type OperatorContractVersion = '1.11.0' | '1.12.0'
export const OPERATOR_CONTRACT_VERSION: OperatorContractVersion = '1.11.0'
`
const CLIENT_PIN_OK = `const PINNED_CONTRACT_VERSION = '1.11.0';
function reject() {
  return PINNED_CONTRACT_VERSION
}
`
const UPSTREAM_RAW_OK = `export type OperatorContractVersion = '1.11.0' | '1.12.0'
export const OPERATOR_CONTRACT_VERSION: OperatorContractVersion = '1.12.0'
`

function fixtureBaseDir(server: string, client: string): string {
  const baseDir = mkdtempSync(join(tmpdir(), 'estate-tripwire-'))
  mkdirSync(join(baseDir, 'src/gateway/operator-contract'), {recursive: true})
  mkdirSync(join(baseDir, 'public'), {recursive: true})
  writeFileSync(join(baseDir, 'src/gateway/operator-contract/version.ts'), server, {
    flag: 'wx',
  })
  writeFileSync(join(baseDir, 'public/operator-stream.js'), client, {flag: 'wx'})
  return baseDir
}

function makeFetchers(
  release: unknown,
  raw: string,
): {fetchJson: Parameters<typeof fetchUpstreamSnapshot>[0]; fetchText: Parameters<typeof fetchUpstreamSnapshot>[1]} {
  return {
    fetchJson: async () => release,
    fetchText: async () => raw,
  }
}

const FIXED_NOW = () => new Date('2026-10-19T04:00:00.000Z')

describe('compareContractVersions', () => {
  it('orders numeric segments', () => {
    expect(compareContractVersions('1.12.0', '1.11.0')).toBeGreaterThan(0)
    expect(compareContractVersions('1.11.0', '1.12.0')).toBeLessThan(0)
    expect(compareContractVersions('1.11.0', '1.11.0')).toBe(0)
    expect(compareContractVersions('2.0.0', '1.99.99')).toBeGreaterThan(0)
  })
})

describe('readForkPins', () => {
  it('extracts both declarations from tree contents', () => {
    const pins = readForkPins(
      p => (p.endsWith('operator-stream.js') ? CLIENT_PIN_OK : SERVER_PIN_OK),
      '/repo',
    )
    expect(pins.serverPin).toBe('1.11.0')
    expect(pins.clientPin).toBe('1.11.0')
  })

  it('throws an extraction error when the server pin is unparsable', () => {
    expect(() =>
      readForkPins(() => 'export const SOMETHING_ELSE = 1', '/repo'),
    ).toThrowError(EstateExtractionError)
  })

  it('throws an extraction error when the client pin is unparsable', () => {
    const noClientPin = 'const OTHER = 2;\n'
    expect(() =>
      readForkPins(p => (p.endsWith('operator-stream.js') ? noClientPin : SERVER_PIN_OK), '/repo'),
    ).toThrowError(EstateExtractionError)
  })

  it('rejects a non a.b.c server pin', () => {
    const bogus = "export const OPERATOR_CONTRACT_VERSION = 'latest'\n"
    expect(() => readForkPins(() => bogus, '/repo')).toThrowError(EstateExtractionError)
  })
})

describe('fetchUpstreamSnapshot', () => {
  it('resolves tag and contract version from the latest release', async () => {
    const {fetchJson, fetchText} = makeFetchers({tag_name: 'v0.124.0'}, UPSTREAM_RAW_OK)
    const snapshot = await fetchUpstreamSnapshot(fetchJson, fetchText, FIXED_NOW)
    expect(snapshot.releaseTag).toBe('v0.124.0')
    expect(snapshot.contractVersion).toBe('1.12.0')
    expect(snapshot.fetchedAtIso).toBe('2026-10-19T04:00:00.000Z')
  })

  it('throws when the release payload has no tag_name', async () => {
    const {fetchJson, fetchText} = makeFetchers({message: 'Not Found'}, UPSTREAM_RAW_OK)
    await expect(fetchUpstreamSnapshot(fetchJson, fetchText, FIXED_NOW)).rejects.toBeInstanceOf(
      EstateExtractionError,
    )
  })

  it('propagates fetch failures (never silent-green)', async () => {
    const {fetchJson} = makeFetchers({tag_name: 'v0.124.0'}, UPSTREAM_RAW_OK)
    await expect(
      fetchUpstreamSnapshot(fetchJson, async () => { throw new Error('HTTP 404') }, FIXED_NOW),
    ).rejects.toBeInstanceOf(Error)
  })
})

describe('evaluateEstate', () => {
  const pins = {serverPin: '1.11.0', clientPin: '1.11.0'}
  const snapshot = {
    releaseTag: 'v0.124.0',
    contractVersion: '1.12.0',
    fetchedAtIso: '2026-10-19T04:00:00.000Z',
  }

  it('ok when both pins equal the upstream contract', () => {
    expect(evaluateEstate({...snapshot, contractVersion: '1.11.0'}, pins).verdict).toBe('ok')
  })

  it('drift-ahead when upstream is newer — the RED-BY-DESIGN live case', () => {
    expect(evaluateEstate(snapshot, pins).verdict).toBe('drift-ahead')
  })

  it('drift-behind when pins are newer than the latest upstream release', () => {
    expect(evaluateEstate({...snapshot, contractVersion: '1.11.0'}, {
      serverPin: '1.12.0',
      clientPin: '1.12.0',
    }).verdict).toBe('drift-behind')
  })

  it('split-pins when the fork declarations disagree', () => {
    expect(
      evaluateEstate(snapshot, {serverPin: '1.11.0', clientPin: '1.12.0'}).verdict,
    ).toBe('split-pins')
  })
})

describe('buildSummaryLines', () => {
  it('names the owning def and the manual confirmation arm', () => {
    const lines = buildSummaryLines({
      verdict: 'drift-ahead',
      releaseTag: 'v0.124.0',
      upstreamContractVersion: '1.12.0',
      serverPin: '1.11.0',
      clientPin: '1.11.0',
    })
    const text = lines.join('\n')
    expect(text).toContain('rm-2063')
    expect(text).toContain('verdict: drift-ahead')
    expect(text).toContain('upstream AHEAD: 1.12.0 at v0.124.0 > pins 1.11.0')
    expect(text).toContain('docs/runbooks/gateway-access.md')
  })
})

describe('run', () => {
  it('exit 1 with drift-ahead against the live RED-BY-DESIGN datum', async () => {
    const baseDir = fixtureBaseDir(SERVER_PIN_OK, CLIENT_PIN_OK)
    const {fetchJson, fetchText} = makeFetchers({tag_name: 'v0.124.0'}, UPSTREAM_RAW_OK)
    const outcome = await run({
      baseDir,
      fetchJson,
      fetchText,
      now: FIXED_NOW,
    })
    expect(outcome.verdict).toBe('drift-ahead')
    expect(outcome.exitCode).toBe(1)
  })

  it('exit 0 and a step summary when everything agrees', async () => {
    const baseDir = fixtureBaseDir(SERVER_PIN_OK, CLIENT_PIN_OK)
    const summaryPath = join(baseDir, 'summary.md')
    const upstreamRawOk = `export type OperatorContractVersion = '1.11.0' | '1.12.0'
export const OPERATOR_CONTRACT_VERSION: OperatorContractVersion = '1.11.0'
`
    const {fetchJson, fetchText} = makeFetchers({tag_name: 'v0.122.3'}, upstreamRawOk)
    const outcome = await run({
      baseDir,
      fetchJson,
      fetchText,
      now: FIXED_NOW,
      stepSummaryPath: summaryPath,
    })
    expect(outcome.verdict).toBe('ok')
    expect(outcome.exitCode).toBe(0)
    expect(readFileSync(summaryPath, 'utf8')).toContain('## Operator-contract estate (rm-2063)')
  })

  it('exit 1 split-pins when the fork declarations disagree', async () => {
    const baseDir = fixtureBaseDir(
      SERVER_PIN_OK,
      CLIENT_PIN_OK.replace('1.11.0', '1.12.0'),
    )
    const {fetchJson, fetchText} = makeFetchers({tag_name: 'v0.122.3'}, UPSTREAM_RAW_OK)
    const outcome = await run({baseDir, fetchJson, fetchText, now: FIXED_NOW})
    expect(outcome.verdict).toBe('split-pins')
    expect(outcome.exitCode).toBe(1)
  })

  it('extraction failure rejects so main exits 2 (UNKNOWN, never silent-green)', async () => {
    const baseDir = fixtureBaseDir(SERVER_PIN_OK, CLIENT_PIN_OK)
    const fetchText = async () => {
      throw new Error('HTTP 503')
    }
    const fetchJson = async () => ({tag_name: 'v0.124.0'})
    await expect(run({baseDir, fetchJson, fetchText, now: FIXED_NOW})).rejects.toBeInstanceOf(
      Error,
    )
  })
})
