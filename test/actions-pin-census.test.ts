import {strict as assert} from 'node:assert'
import {describe, it} from 'vitest'

// rm-1931 (run 65d41c1b9f8e4c63aad7a7588d4cad09): the actions pin census
// ladder is exercised entirely offline on synthetic workflow text — no
// network, no CI lane (the probe exists precisely because those are dark).

import {
  collectPins,
  compareWithLatest,
  evaluateCensus,
  exitFor,
  pickLatestLineTag,
  type PinSighting,
} from '../scripts/actions-pin-census.ts'

function pins(text: string): PinSighting[] {
  return collectPins(text, 'fixture.yaml')
}

const GREEN_TREE = [
  'jobs:',
  '  build:',
  '    steps:',
  '      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v7.0.1',
  '      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0',
].join('\n')

describe('collectPins', () => {
  it('extracts action, ref, and comment with 1-based line numbers', () => {
    const [first, second] = pins(GREEN_TREE)
    assert.ok(first !== undefined && second !== undefined)
    assert.equal(first.action, 'actions/checkout')
    assert.equal(first.ref, '11bd71901bbe5b1630ceea73d27597364c9af683')
    assert.equal(first.comment, 'v7.0.1')
    assert.equal(first.line, 4)
    assert.equal(second.line, 5)
  })

  it('records missing comments as empty strings', () => {
    const [sighting] = pins('      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683\n')
    assert.ok(sighting !== undefined)
    assert.equal(sighting.comment, '')
  })

  it('ignores docker:// refs and uses lines without a ref', () => {
    const text = [
      '      - uses: docker://alpine:3.20',
      '      - run: echo hi',
    ].join('\n')
    assert.deepEqual(pins(text), [])
  })
})

describe('evaluateCensus', () => {
  it('returns GREEN for a fully-pinned tree with true full-semver comments', () => {
    const result = evaluateCensus(pins(GREEN_TREE))
    assert.equal(result.verdict, 'GREEN')
    assert.deepEqual(result.issues, [])
  })

  it('flags a bare-major comment as STALE', () => {
    const text = '      - uses: pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413 # v6\n'
    const result = evaluateCensus(pins(text))
    assert.equal(result.verdict, 'STALE')
    assert.ok(result.issues.some(issue => issue.kind === 'bare-comment'))
  })

  it('flags a missing comment as STALE without drift', () => {
    const text = '      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683\n'
    const result = evaluateCensus(pins(text))
    assert.equal(result.verdict, 'STALE')
    assert.ok(result.issues.some(issue => issue.kind === 'missing-comment'))
  })

  it('flags an unpinned tag ref as DRIFT', () => {
    const text = '      - uses: actions/checkout@v7\n'
    const result = evaluateCensus(pins(text))
    assert.equal(result.verdict, 'DRIFT')
    assert.ok(result.issues.some(issue => issue.kind === 'unpinned'))
  })

  it('flags a split pin (one action, two digests) as DRIFT', () => {
    const text = [
      '      - uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1',
      '      - uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2',
    ].join('\n')
    const result = evaluateCensus(pins(text))
    assert.equal(result.verdict, 'DRIFT')
    const split = result.issues.find(issue => issue.kind === 'split-pin')
    assert.ok(split)
    assert.ok(split.detail.includes('043fb46d1a93'))
    assert.ok(split.detail.includes('cf430e030ddb'))
  })

  it('flags inconsistent comments across sites of one action', () => {
    const text = [
      '      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v7.0.1',
      '      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v7.0.0',
    ].join('\n')
    const result = evaluateCensus(pins(text))
    assert.ok(result.issues.some(issue => issue.kind === 'inconsistent-comment'))
    assert.equal(result.verdict, 'STALE')
  })

  it('DRIFT outranks STALE when both are present', () => {
    const text = [
      '      - uses: actions/checkout@v7',
      '      - uses: pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413 # v6',
    ].join('\n')
    const result = evaluateCensus(pins(text))
    assert.equal(result.verdict, 'DRIFT')
  })

  it('censuses sightings across files together (the split-pin catch)', () => {
    const a = collectPins(
      '      - uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1\n',
      'release.yaml',
    )
    const b = collectPins(
      '      - uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2\n',
      'scorecard.yaml',
    )
    const result = evaluateCensus([...a, ...b])
    assert.equal(result.verdict, 'DRIFT')
    assert.ok(result.issues.some(issue => issue.kind === 'split-pin'))
  })
})

describe('compareWithLatest', () => {
  const latest = {
    action: 'actions/setup-node',
    tag: 'v7.1.0',
    digest: '949feb2413d6458794dcd2491c4babbbce0c15c1',
  }

  it('returns no issues when digest and comment match the latest release', () => {
    assert.deepEqual(compareWithLatest(
      'actions/setup-node',
      ['949feb2413d6458794dcd2491c4babbbce0c15c1'],
      ['v7.1.0'],
      latest,
    ), [])
  })

  it('flags digest drift when upstream moved', () => {
    const issues = compareWithLatest(
      'actions/setup-node',
      ['820762786026740c76f36085b0efc47a31fe5020'],
      ['v7.0.0'],
      latest,
    )
    assert.equal(issues.length, 1)
    const issue = issues[0]
    assert.ok(issue !== undefined)
    assert.equal(issue.kind, 'digest-drift')
    assert.ok(issue.detail.includes('949feb2413d6'))
  })

  it('flags a stale comment when the digest is current but unnamed', () => {
    const issues = compareWithLatest(
      'actions/setup-node',
      ['949feb2413d6458794dcd2491c4babbbce0c15c1'],
      ['v7'],
      latest,
    )
    assert.equal(issues.length, 1)
    const issue = issues[0]
    assert.ok(issue !== undefined)
    assert.equal(issue.kind, 'comment-mismatch')
  })
})

describe('pickLatestLineTag', () => {
  it('picks the highest tag on the comment major line and ignores other lines', () => {
    const tags = [
      'v4.9.0',
      'v4.39.0',
      'v4.39.1',
      'codeql-bundle-v2.27.2',
      'v3.121.0',
    ]
    assert.equal(pickLatestLineTag(tags, 4), 'v4.39.1')
    assert.equal(pickLatestLineTag(tags, 3), 'v3.121.0')
  })

  it('returns null when no tag shares the major line', () => {
    assert.equal(pickLatestLineTag(['v5.0.0'], 4), null)
    assert.equal(pickLatestLineTag([], 4), null)
  })
})

describe('exitFor', () => {
  it('maps verdicts onto the darkness-watch ladder 0/1/3', () => {
    assert.equal(exitFor({verdict: 'GREEN', issues: []}), 0)
    assert.equal(exitFor({verdict: 'STALE', issues: []}), 1)
    assert.equal(exitFor({verdict: 'DRIFT', issues: []}), 3)
  })
})
