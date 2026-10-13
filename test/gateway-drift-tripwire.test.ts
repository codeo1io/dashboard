import {describe, expect, it} from 'vitest'

import {
  classify,
  compareSemver,
  dryRunActions,
  parseAgentPins,
  parseContractDeclaration,
  parseStreamPin,
  releasesBehind,
  renderReport,
  type AgentPin,
  type GatewayMetadata,
  type TripwireState,
} from '../scripts/gateway-drift-tripwire.ts'

const FRO_BOT_YAML_EXCERPT = `
      - name: Run agent
        uses: fro-bot/agent@a710bd5e67e55abd9e56e2cd48dd798fb823b227 # v0.119.1
        with:
          output-mode: branch-pr
`

const FRO_BOT_YAML_TWO_PINS = `
      - name: Run agent
        uses: fro-bot/agent@29cc02f0457b4eb5e203d1d6a02c52ad731ea0f0 # v0.120.0
        with:
          output-mode: branch-pr
      - name: Run agent again
        uses: fro-bot/agent@a710bd5e67e55abd9e56e2cd48dd798fb823b227 # v0.119.1
`

const VERSION_TS_EXCERPT = `
export const OPERATOR_CONTRACT_VERSION = '1.9.0';
`

const OPERATOR_STREAM_EXCERPT = `
const PINNED_CONTRACT_VERSION = '1.9.0';
`

function state(overrides: Partial<TripwireState> = {}): TripwireState {
  const pins: AgentPin[] = [
    {sha: 'a710bd5e67e55abd9e56e2cd48dd798fb823b227', version: 'v0.119.1', file: '.github/workflows/fro-bot.yaml'},
  ]
  const metadata: GatewayMetadata = {
    latestRelease: {tag: 'v0.121.0', publishedAt: '2026-10-12T07:43:15Z'},
    releases: [
      {tag: 'v0.121.0', publishedAt: '2026-10-12T07:43:15Z'},
      {tag: 'v0.120.0', publishedAt: '2026-10-11T23:24:55Z'},
      {tag: 'v0.119.1', publishedAt: '2026-10-10T20:01:12Z'},
    ],
    contractAtPin: '1.10.0',
    contractAtLatest: '1.10.0',
  }
  return {pins, repoContract: '1.9.0', streamPin: '1.9.0', metadata, ...overrides}
}

describe('parseAgentPins', () => {
  it('extracts sha + comment version from the fro-bot.yaml pin format', () => {
    const pins = parseAgentPins(FRO_BOT_YAML_EXCERPT)
    expect(pins).toHaveLength(1)
    expect(pins[0]).toEqual({
      sha: 'a710bd5e67e55abd9e56e2cd48dd798fb823b227',
      version: 'v0.119.1',
      file: '.github/workflows/fro-bot.yaml',
    })
  })

  it('collects every distinct pin and dedupes repeats', () => {
    const pins = parseAgentPins(FRO_BOT_YAML_TWO_PINS + FRO_BOT_YAML_EXCERPT)
    expect(pins.map(p => p.version)).toEqual(['v0.120.0', 'v0.119.1'])
  })

  it('returns [] when no agent pin exists', () => {
    expect(parseAgentPins('uses: actions/checkout@v7')).toEqual([])
  })
})

describe('contract declarations', () => {
  it('parses OPERATOR_CONTRACT_VERSION from version.ts', () => {
    expect(parseContractDeclaration(VERSION_TS_EXCERPT)).toBe('1.9.0')
  })

  it('parses PINNED_CONTRACT_VERSION from operator-stream.js', () => {
    expect(parseStreamPin(OPERATOR_STREAM_EXCERPT)).toBe('1.9.0')
  })

  it('returns undefined when the declaration is absent', () => {
    expect(parseContractDeclaration('export const OTHER = 1;')).toBeUndefined()
    expect(parseStreamPin('const OTHER = 1;')).toBeUndefined()
  })
})

describe('semver helpers', () => {
  it('orders numeric segments, not lexically', () => {
    expect(compareSemver('1.9.0', '1.10.0')).toBeLessThan(0)
    expect(compareSemver('v0.119.1', 'v0.120.0')).toBeLessThan(0)
    expect(compareSemver('1.10.0', '1.10.0')).toBe(0)
  })

  it('counts releases behind the pin, newest first', () => {
    const releases = [
      {tag: 'v0.121.0', publishedAt: 'a'},
      {tag: 'v0.120.0', publishedAt: 'b'},
      {tag: 'v0.119.1', publishedAt: 'c'},
    ]
    expect(releasesBehind(releases, 'v0.119.1')).toBe(2)
    expect(releasesBehind(releases, 'v0.121.0')).toBe(0)
  })
})

describe('classify', () => {
  it('flags the live red state: stale pin + contract split vs the pinned gateway', () => {
    const findings = classify(state())
    const kinds = findings.map(f => f.kind)
    expect(kinds).toContain('workflow-pin-stale')
    expect(kinds).toContain('contract-split-pin')
    const stale = findings.find(f => f.kind === 'workflow-pin-stale')
    expect(stale?.title).toContain('v0.121.0')
    expect(stale?.body).toContain('2 release(s) behind')
    expect(stale?.body).toContain('Sunday/Wednesday 20:00 UTC')
  })

  it('flags in-repo stream-pin split residue independently', () => {
    const findings = classify(state({streamPin: '1.8.0'}))
    expect(findings.map(f => f.kind)).toContain('stream-pin-split')
  })

  it('flags deployed-contract drift when the deployed gateway disagrees (rm-204 rider)', () => {
    const findings = classify(
      state({deployed: {url: 'https://gateway.example', ok: true, contractVersion: '1.10.0'}}),
    )
    const deployed = findings.find(f => f.kind === 'deployed-contract-drift')
    expect(deployed?.body).toContain('https://gateway.example')
  })

  it('stays green when every pin matches the latest release and mirrors agree', () => {
    const green: TripwireState = {
      pins: [{sha: 'f'.repeat(40), version: 'v0.121.0', file: '.github/workflows/fro-bot.yaml'}],
      repoContract: '1.10.0',
      streamPin: '1.10.0',
      metadata: {
        latestRelease: {tag: 'v0.121.0', publishedAt: '2026-10-12T07:43:15Z'},
        releases: [{tag: 'v0.121.0', publishedAt: '2026-10-12T07:43:15Z'}],
        contractAtPin: '1.10.0',
        contractAtLatest: '1.10.0',
      },
      deployed: {url: 'https://gateway.example', ok: true, contractVersion: '1.10.0'},
    }
    expect(classify(green)).toEqual([])
    expect(renderReport(green, [])).toContain('GREEN')
    expect(dryRunActions([])).toHaveLength(1)
    expect(dryRunActions([])[0]).toContain('would-close')
  })

  it('skips drift kinds whose data is absent rather than fabricating splits', () => {
    // empty contractAtPin (unparseable upstream state) must not raise contract-split-pin
    const findings = classify(
      state({metadata: {...state().metadata, contractAtPin: ''}}),
    )
    expect(findings.map(f => f.kind)).not.toContain('contract-split-pin')
  })
})
