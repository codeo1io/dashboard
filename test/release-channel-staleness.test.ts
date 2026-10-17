/**
 * rm-740 — release-channel staleness evaluation (fixture unit tests).
 * Repaired with rm-1465: PATCH is an unbounded counter (not a day), and the
 * GitHub Releases lane is the verdict-driving PRIMARY signal while the
 * calver tag stream is a labeled, non-verdict SECONDARY.
 *
 * Pins every branch of the pure core of scripts/release-channel-staleness.ts
 * with synthetic release/tag/decision fixtures — the CLI wrapper (including
 * the gh api releases probe) is exercised end-to-end by the scheduled
 * workflow and was smoke-run against live refs at implementation time:
 * 1. calver SELECTION is numeric, not lexical, across unbounded PATCH
 *    values (2026.08.9 vs 2026.08.10; 2026.10.42 vs 2026.10.142);
 * 2. the releases-lane verdict: ABSENCE (no GitHub Release) = red by
 *    design; present release ages healthy/stale against the threshold;
 *    the tag stream NEVER flips the verdict (foreign-polluted namespace);
 * 3. the dormancy-decision semantics: retired-with-owner suppresses the
 *    red, absent-or-live decision never does, and a MALFORMED decision
 *    record is an extraction error, not a silent green;
 * 4. no calver tags at all = extraction error (fail loud on empty evidence,
 *    never a healthy verdict — rm-166 lesson);
 * 5. the step summary names rm-740/rm-1465 and, on stale, the decision
 *    owner rm-714.
 */
import {describe, expect, it} from 'vitest'
import {
  buildSummaryLines,
  evaluateReleaseChannelStaleness,
  parseCalverTag,
  parseDormancyDecision,
  selectNewestCalverTag,
  type CalverTagInfo,
} from '../scripts/release-channel-staleness.ts'

const DAY_MS = 86_400_000
const NOW = Date.UTC(2026, 9, 16, 12, 0, 0) // 2026-10-16T12:00Z

const tags = (entries: [name: string, dateUnix: number][]): CalverTagInfo[] =>
  entries.map(([name, dateUnix]) => ({name, dateUnix}))

describe('rm-740/rm-1465: calver tag parsing and newest selection', () => {
  it('parses this repo calver shapes with PATCH as an unbounded counter', () => {
    expect(parseCalverTag('2026.08.9')).toEqual({year: 2026, month: 8, patch: 9})
    expect(parseCalverTag('2026.10.28')).toEqual({year: 2026, month: 10, patch: 28})
    // rm-1465 inversion: the third component is max(N)+1 PATCH, not a day —
    // 2026.08.32 and three-digit patches are REAL and VALID (the old parser
    // rejected them as "day out of range", discarding 11 live tags).
    expect(parseCalverTag('2026.08.32')).toEqual({year: 2026, month: 8, patch: 32})
    expect(parseCalverTag('2026.10.42')).toEqual({year: 2026, month: 10, patch: 42})
    expect(parseCalverTag('2026.10.142')).toEqual({year: 2026, month: 10, patch: 142})
    expect(parseCalverTag('v1.2.3')).toBeNull()
    expect(parseCalverTag('2026.13.1')).toBeNull() // month out of range
    expect(parseCalverTag('2026.10.0')).toBeNull() // patch counter starts at 1
    expect(parseCalverTag('2026.8')).toBeNull() // not the three-part shape
  })

  it('selects the newest tag NUMERICALLY — 2026.08.10 beats 2026.08.9 despite lexical order', () => {
    // Refname STRING sort puts '2026.08.9' after '2026.08.10' ('9' > '1') — a
    // lexical sort would wrongly crown 2026.08.9. Numeric patch compare crowns
    // 2026.08.10.
    const set = tags([
      ['2026.08.10', 1],
      ['2026.08.9', 2],
      ['2026.07.31', 3],
    ])
    expect(selectNewestCalverTag(set)?.name).toBe('2026.08.10')
  })

  it('multi-digit patches across the series still select numerically (the CI-observed shape)', () => {
    const set = tags([
      ['2026.10.2', 1],
      ['2026.10.9', 2],
      ['2026.10.10', 3],
      ['2026.10.14', 4],
    ])
    expect(selectNewestCalverTag(set)?.name).toBe('2026.10.14')
  })

  it('three-digit patches outrank two-digit ones numerically (the 2026.10.42 vs 2026.10.142 trap)', () => {
    // Lexical ('1' < '4') would crown 2026.10.42; numeric crowns 2026.10.142.
    const set = tags([
      ['2026.10.42', 1],
      ['2026.10.142', 2],
      ['2026.10.9', 3],
    ])
    expect(selectNewestCalverTag(set)?.name).toBe('2026.10.142')
  })

  it('rolls month/year boundaries correctly', () => {
    const set = tags([
      ['2026.08.9', 1],
      ['2026.09.1', 2],
      ['2025.12.31', 3],
    ])
    expect(selectNewestCalverTag(set)?.name).toBe('2026.09.1')
  })

  it('ignores non-calver tags entirely (nightly, v-tags, peels)', () => {
    const set = tags([
      ['v0.118.2', 5],
      ['nightly-20261008', 5],
      ['2026.08.9', 1],
    ])
    expect(selectNewestCalverTag(set)?.name).toBe('2026.08.9')
  })
})

describe('rm-740/rm-1465: releases-lane PRIMARY verdict', () => {
  it('an absent releases lane is STALE by design (the dead release-App failure the check exists to detect)', () => {
    const result = evaluateReleaseChannelStaleness({
      nowMs: NOW,
      latestRelease: null,
      tags: tags([['2026.10.25', Math.floor((NOW - 1 * DAY_MS) / 1000)]]),
      thresholdDays: 45,
      decision: null,
    })
    expect(result.status).toBe('stale')
    expect(result.latestRelease).toBeNull()
    expect(result.releaseAgeDays).toBeNull()
    // The fresh secondary tag must NOT rescue the verdict.
    expect(result.newestTag).toBe('2026.10.25')
    expect(result.ageDays).toBe(1)
  })

  it('a release inside the threshold is healthy', () => {
    const result = evaluateReleaseChannelStaleness({
      nowMs: NOW,
      latestRelease: {tagName: '2026.09.20', publishedAtUnix: Math.floor((NOW - 18 * DAY_MS) / 1000)},
      tags: tags([['2026.10.25', Math.floor((NOW - 1 * DAY_MS) / 1000)]]),
      thresholdDays: 45,
      decision: null,
    })
    expect(result.status).toBe('healthy')
    expect(result.releaseAgeDays).toBe(18)
  })

  it('a release older than the threshold is stale even when the tag stream is fresh', () => {
    const result = evaluateReleaseChannelStaleness({
      nowMs: NOW,
      latestRelease: {tagName: '2026.08.9', publishedAtUnix: Math.floor((NOW - 60 * DAY_MS) / 1000)},
      tags: tags([['2026.10.42', Math.floor((NOW - 2 * DAY_MS) / 1000)]]),
      thresholdDays: 45,
      decision: null,
    })
    expect(result.status).toBe('stale')
    expect(result.releaseAgeDays).toBe(60)
    expect(result.ageDays).toBe(2)
  })

  it('a STALE TAG STREAM alone never flips a healthy release lane', () => {
    const result = evaluateReleaseChannelStaleness({
      nowMs: NOW,
      latestRelease: {tagName: '2026.09.25', publishedAtUnix: Math.floor((NOW - 13 * DAY_MS) / 1000)},
      tags: tags([['2026.08.15', Math.floor((NOW - 62 * DAY_MS) / 1000)]]),
      thresholdDays: 45,
      decision: null,
    })
    expect(result.status).toBe('healthy')
    expect(result.ageDays).toBe(62)
  })

  it('the boundary day itself is healthy (release age == threshold is not stale)', () => {
    const result = evaluateReleaseChannelStaleness({
      nowMs: NOW,
      latestRelease: {tagName: '2026.08.24', publishedAtUnix: Math.floor((NOW - 45 * DAY_MS) / 1000)},
      tags: tags([['2026.08.24', Math.floor((NOW - 45 * DAY_MS) / 1000)]]),
      thresholdDays: 45,
      decision: null,
    })
    expect(result.status).toBe('healthy')
  })
})

describe('rm-740/rm-1465: dormancy decision semantics', () => {
  const absentLaneInputs = {
    nowMs: NOW,
    latestRelease: null,
    tags: tags([['2026.10.25', Math.floor((NOW - 1 * DAY_MS) / 1000)]]),
    thresholdDays: 45,
  }

  it('retired-with-owner suppresses the absent-lane red (recorded outcome stands)', () => {
    const result = evaluateReleaseChannelStaleness({
      ...absentLaneInputs,
      decision: {retired: true, ownerDefId: 'rm-714', recordedAt: '2026-10-08', note: 'branch-b'},
    })
    expect(result.status).toBe('retired')
  })

  it('retired: false is an explicit live-channel statement — the absent-lane red stands', () => {
    const result = evaluateReleaseChannelStaleness({
      ...absentLaneInputs,
      decision: {retired: false, ownerDefId: 'rm-714', recordedAt: '2026-10-08'},
    })
    expect(result.status).toBe('stale')
  })

  it('a retirement decision on a HEALTHY lane does not fake staleness', () => {
    const result = evaluateReleaseChannelStaleness({
      nowMs: NOW,
      latestRelease: {tagName: '2026.09.25', publishedAtUnix: Math.floor((NOW - 13 * DAY_MS) / 1000)},
      tags: tags([['2026.09.25', Math.floor((NOW - 13 * DAY_MS) / 1000)]]),
      thresholdDays: 45,
      decision: {retired: true, ownerDefId: 'rm-714', recordedAt: '2026-10-08'},
    })
    expect(result.status).toBe('healthy')
  })

  it('absent decision file content parses to null (undecided)', () => {
    expect(parseDormancyDecision(null)).toBeNull()
  })

  it('a well-formed decision file parses', () => {
    const decision = parseDormancyDecision(
      '{"retired": true, "ownerDefId": "rm-714", "recordedAt": "2026-10-08", "note": "x"}',
    )
    expect(decision).toEqual({retired: true, ownerDefId: 'rm-714', recordedAt: '2026-10-08', note: 'x'})
  })

  it('malformed decision content THROWS — a broken record must never silently green the check', () => {
    expect(() => parseDormancyDecision('{not json')).toThrow(/not valid JSON/)
    expect(() => parseDormancyDecision('{"retired": "yes"}')).toThrow(/"retired" must be a boolean/)
    expect(() => parseDormancyDecision('{"retired": true, "ownerDefId": ""}')).toThrow(
      /"ownerDefId" must be a non-empty string/,
    )
    expect(() => parseDormancyDecision('{"retired": true, "ownerDefId": "rm-714", "recordedAt": "yesterday"}')).toThrow(
      /"recordedAt"/,
    )
  })
})

describe('rm-740/rm-1465: empty evidence is an extraction error, never healthy', () => {
  it('no calver tags at all throws (tags-not-fetched / never-tagged channel)', () => {
    expect(() =>
      evaluateReleaseChannelStaleness({nowMs: NOW, latestRelease: null, tags: [], thresholdDays: 45, decision: null}),
    ).toThrow(/no calver tags/)
    // Non-calver tags present but no calver ones — same class.
    expect(() =>
      evaluateReleaseChannelStaleness({
        nowMs: NOW,
        latestRelease: null,
        tags: tags([['v1.0.0', 5]]),
        thresholdDays: 45,
        decision: null,
      }),
    ).toThrow(/no calver tags/)
  })
})

describe('rm-740/rm-1465: step summary rendering', () => {
  const secondaryCommon = {
    newestTag: '2026.10.25',
    newestTagDateUnix: Math.floor((NOW - 1 * DAY_MS) / 1000),
    ageDays: 1,
    thresholdDays: 45,
  }

  it('names the owning defs rm-740/rm-1465 and labels the tag line SECONDARY non-verdict', () => {
    const lines = buildSummaryLines({
      status: 'healthy',
      latestRelease: {tagName: '2026.09.25', publishedAtUnix: Math.floor((NOW - 13 * DAY_MS) / 1000)},
      releaseAgeDays: 13,
      decision: null,
      ...secondaryCommon,
    })
    const text = lines.join('\n')
    expect(text).toContain('rm-740')
    expect(text).toContain('rm-1465')
    expect(text).toContain('2026.09.25')
    expect(text).toContain('13')
    expect(text).toContain('SECONDARY (non-verdict)')
    expect(text).toContain('2026.10.25')
  })

  it('an absent-lane summary names the dead release-App mechanism and decision owner rm-714', () => {
    const lines = buildSummaryLines({
      status: 'stale',
      latestRelease: null,
      releaseAgeDays: null,
      decision: null,
      ...secondaryCommon,
    })
    const text = lines.join('\n')
    expect(text).toContain('ABSENT')
    expect(text).toContain('HAS_RELEASE_APP')
    expect(text).toContain('rm-714')
    expect(text).toContain('BY DESIGN')
    expect(text).toContain('STALE')
  })

  it('a retired summary names the recording owner def', () => {
    const lines = buildSummaryLines({
      status: 'retired',
      latestRelease: null,
      releaseAgeDays: null,
      decision: {retired: true, ownerDefId: 'rm-714', recordedAt: '2026-10-01'},
      ...secondaryCommon,
    })
    const text = lines.join('\n')
    expect(text).toContain('retired-with-owner')
    expect(text).toContain('rm-714')
  })
})
