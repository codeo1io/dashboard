/**
 * Tests for scripts/check-gateway-contract-parity.ts (rm-1493).
 *
 * The decision table (evaluateParity) is pure and covered exhaustively offline;
 * runCheck is exercised end-to-end through the offline override triple so the
 * red birth state (fork 1.9.0 vs agent 1.11.0) and a synthetic matched pair
 * are both proven without network. readForkPins is additionally proven against
 * the REAL repository files, so moving a pin constant without updating the
 * script's regexes turns this suite red before the weekly workflow ever runs.
 */
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import process from 'node:process'
import {afterEach, describe, expect, it} from 'vitest'

import {
  evaluateParity,
  newestReleaseTag,
  ParityResolutionError,
  readForkPins,
  runCheck,
  type ParityInputs,
} from '../scripts/check-gateway-contract-parity.ts'

const PIN_SHA = '15dc1d9d9d144668b569efb994e65803aadf52d8'

/** The exact state the check was born red into (2026-10-16, run 74d2adff). */
function birthInputs(): ParityInputs {
  return {
    versionContract: '1.9.0',
    streamContract: '1.9.0',
    agentPinSha: PIN_SHA,
    agentPinTag: 'v0.122.1',
    agentContractAtPin: '1.11.0',
    latestTag: 'v0.122.3',
    agentContractAtLatest: '1.11.0',
  }
}

function matchedInputs(): ParityInputs {
  return {
    versionContract: '1.11.0',
    streamContract: '1.11.0',
    agentPinSha: PIN_SHA,
    agentPinTag: 'v0.122.1',
    agentContractAtPin: '1.11.0',
    latestTag: 'v0.122.1',
    agentContractAtLatest: '1.11.0',
  }
}

describe('evaluateParity — decision table', () => {
  it('the birth drift is red: fork pins 1.9.0 vs pinned agent 1.11.0, plus a plain pin-lag warning', () => {
    const findings = evaluateParity(birthInputs())
    const red = findings.filter(finding => finding.level === 'red')
    expect(red).toHaveLength(1)
    expect(red[0]?.message).toContain('dashboard pins operator contract 1.9.0')
    expect(red[0]?.message).toContain('v0.122.1 (15dc1d9)')
    expect(red[0]?.message).toContain('ships 1.11.0')
    const warn = findings.filter(finding => finding.level === 'warn')
    expect(warn).toHaveLength(1)
    expect(warn[0]?.message).toContain('workflow pins v0.122.1, latest is v0.122.3')
  })

  it('a matched pair is green with exactly one ok finding', () => {
    const findings = evaluateParity(matchedInputs())
    expect(findings).toHaveLength(1)
    expect(findings[0]?.level).toBe('ok')
    expect(findings[0]?.message).toContain('dashboard 1.11.0 == agent pin v0.122.1')
  })

  it('twin fork pins that disagree are red on their own', () => {
    const findings = evaluateParity({...matchedInputs(), streamContract: '1.9.0'})
    expect(findings.some(finding => finding.level === 'red' && finding.message.includes("fork's two contract pins disagree"))).toBe(true)
  })

  it('a fork pin AHEAD of the agent is equally red (mismatch is symmetric)', () => {
    const findings = evaluateParity({...matchedInputs(), versionContract: '2.0.0', streamContract: '2.0.0'})
    expect(findings.some(finding => finding.level === 'red' && finding.message.includes('dashboard pins operator contract 2.0.0'))).toBe(true)
  })

  it('a contract that moved past the pin is red drift-in-waiting (no mere tag-lag warning)', () => {
    const findings = evaluateParity({...matchedInputs(), latestTag: 'v0.123.0', agentContractAtLatest: '1.12.0'})
    const red = findings.filter(finding => finding.level === 'red')
    expect(red).toHaveLength(1)
    expect(red[0]?.message).toContain('latest agent v0.123.0 ships 1.12.0')
    expect(red[0]?.message).toContain('the next pin bump must carry a contract absorb')
    expect(findings.some(finding => finding.level === 'warn' && finding.message.includes('pin lag'))).toBe(false)
  })

  it('a plain tag lag with an unchanged contract stays warn-only (exit 0)', () => {
    const findings = evaluateParity({...matchedInputs(), latestTag: 'v0.122.3'})
    expect(findings.some(finding => finding.level === 'red')).toBe(false)
    expect(findings.some(finding => finding.level === 'warn' && finding.message.includes('contract unchanged at 1.11.0'))).toBe(true)
    expect(findings.some(finding => finding.level === 'ok')).toBe(false)
  })
})

describe('readForkPins — the real repository files', () => {
  it('parses the vendored twin pins (which must agree) and the workflow agent pin', () => {
    const pins = readForkPins('.')
    expect(pins.versionContract).toMatch(/^\d+\.\d+\.\d+$/)
    expect(pins.streamContract).toBe(pins.versionContract)
    expect(pins.agentPinSha).toMatch(/^[0-9a-f]{7,40}$/)
    expect(pins.agentPinTag).toMatch(/^v\d+\.\d+\.\d+$/)
  })

  it('rejects a workflow pin without the # vX.Y.Z comment (the comment feeds the lag report)', () => {
    const root = makeFixtureRoot({pinLine: `        uses: fro-bot/agent@${PIN_SHA}`})
    expect(() => readForkPins(root)).toThrow(ParityResolutionError)
    expect(() => readForkPins(root)).toThrow(/keep the version comment/)
  })

  it('refuses a workflow carrying a second agent pin instead of silently checking the first', () => {
    const root = makeFixtureRoot({
      pinLine: `        uses: fro-bot/agent@${PIN_SHA} # v0.122.1\n        uses: fro-bot/agent@deadbeefdeadbeefdeadbeefdeadbeefdeadbeef # v0.121.0`,
    })
    expect(() => readForkPins(root)).toThrow(ParityResolutionError)
    expect(() => readForkPins(root)).toThrow(/2 'uses: fro-bot\/agent@<sha>' pins found .* exactly one deployment surface/)
  })

  it('rejects a tree missing a pin file with a resolution error', () => {
    expect(() => readForkPins('/tmp')).toThrow(ParityResolutionError)
  })
})

describe('newestReleaseTag — the latest-tip picker', () => {
  it('takes the first listed tag: a prerelease-only tip still counts as the tip', () => {
    expect(newestReleaseTag([{tag_name: 'v0.123.0-rc.1'}, {tag_name: 'v0.122.3'}])).toBe('v0.123.0-rc.1')
  })

  it('skips entries without a usable string tag instead of mistaking one for the tip', () => {
    expect(newestReleaseTag([{tag_name: 3}, {name: 'not a tag'}, {tag_name: ''}, {tag_name: 'v0.122.3'}])).toBe('v0.122.3')
  })

  it('treats an empty or non-list payload as a resolution failure', () => {
    expect(() => newestReleaseTag([])).toThrow(ParityResolutionError)
    expect(() => newestReleaseTag({message: 'Not Found'})).toThrow(ParityResolutionError)
  })
})

describe('runCheck — offline end-to-end', () => {
  const roots: string[] = []

  afterEach(() => {
    for (const root of roots) rmSync(root, {recursive: true, force: true})
    roots.length = 0
  })

  function fixture(pins: {version: string; stream: string}): string {
    const root = makeFixtureRoot({versionContract: pins.version, pinnedContract: pins.stream})
    roots.push(root)
    return root
  }

  it('the birth state exits 1 and names the drift in the markdown summary', async () => {
    const result = await runCheck({
      root: fixture({version: '1.9.0', stream: '1.9.0'}),
      agentContractAtPin: '1.11.0',
      latestTag: 'v0.122.3',
      agentContractAtLatest: '1.11.0',
      print: () => {},
    })
    expect(result.exitCode).toBe(1)
    expect(result.markdownLines.join('\n')).toContain('| dashboard version.ts | 1.9.0 |')
    expect(result.markdownLines.join('\n')).toContain('| agent @ pin v0.122.1 (15dc1d9) | 1.11.0 |')
  })

  it('a synthetic matched pair exits 0, writes the step summary, and emits no error annotation', async () => {
    const summaryFile = join(tmpdir(), `parity-summary-${process.pid}.md`)
    const result = await runCheck({
      root: fixture({version: '1.11.0', stream: '1.11.0'}),
      agentContractAtPin: '1.11.0',
      latestTag: 'v0.122.1',
      agentContractAtLatest: '1.11.0',
      stepSummaryFile: summaryFile,
      print: () => {},
    })
    expect(result.exitCode).toBe(0)
    const printed = result.markdownLines.join('\n')
    expect(printed).toContain('contract parity holds')
    const summary = readFileSync(summaryFile, 'utf8')
    expect(summary).toContain('## Gateway contract parity (rm-1493)')
    expect(summary).toContain('contract parity holds')
    rmSync(summaryFile, {force: true})
  })

  it('partial offline overrides are a usage error (all three or none)', async () => {
    await expect(runCheck({
      root: fixture({version: '1.9.0', stream: '1.9.0'}),
      agentContractAtPin: '1.11.0',
      print: () => {},
    })).rejects.toThrow(ParityResolutionError)
  })
})

function makeFixtureRoot(options: {versionContract?: string; pinnedContract?: string; pinLine?: string}): string {
  const root = mkdtempSync(join(tmpdir(), 'contract-parity-'))
  const versionDir = join(root, 'src', 'gateway', 'operator-contract')
  const workflowsDir = join(root, '.github', 'workflows')
  mkdirSync(versionDir, {recursive: true})
  mkdirSync(join(root, 'public'), {recursive: true})
  mkdirSync(workflowsDir, {recursive: true})
  writeFileSync(join(versionDir, 'version.ts'), `export const OPERATOR_CONTRACT_VERSION = '${options.versionContract ?? '1.9.0'}'\n`)
  writeFileSync(join(root, 'public', 'operator-stream.js'), `export const PINNED_CONTRACT_VERSION = '${options.pinnedContract ?? '1.9.0'}'\n`)
  writeFileSync(join(workflowsDir, 'fro-bot.yaml'), `${options.pinLine ?? `        uses: fro-bot/agent@${PIN_SHA} # v0.122.1`}\n`)
  return root
}
