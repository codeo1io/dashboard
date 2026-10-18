/**
 * rm-740 — release-channel staleness evaluation (fixture unit tests).
 *
 * Pins every branch of the pure core of scripts/release-channel-staleness.ts
 * with synthetic tag/decision fixtures — the CLI wrapper is exercised
 * end-to-end by the scheduled workflow (and was smoke-run against the live
 * tag set at implementation time):
 * 1. calver SELECTION is numeric, not lexical (2026.08.9 beats 2026.08.10
 *    lexically-reversed — the trap this guards);
 * 2. the age verdict (healthy/stale) against the stated threshold;
 * 3. the dormancy-decision semantics: retired-with-owner suppresses the red,
 *    absent-or-live decision never does, and a MALFORMED decision record is
 *    an extraction error, not a silent green;
 * 4. no calver tags at all = extraction error (fail loud on empty evidence,
 *    never a healthy verdict — rm-166 lesson);
 * 5. the step summary names rm-740 and, on stale, the decision owner rm-714;
 * 6. rm-1932: the third calver component is a per-month RELEASE COUNTER
 *    (counter-form >31 valid — the census shapes .32/.43/.57), and the
 *    verdict set is SCOPED to fork-reachable tags: foreign upstream tags are
 *    excluded from the verdict and counted in the summary (a foreign tag
 *    crown is exactly the false-healthy this fix kills).
 */
import {describe, expect, it} from 'vitest'
import {
  buildSummaryLines,
  evaluateReleaseChannelStaleness,
  parseCalverTag,
  parseDormancyDecision,
  scopeCalverTagsToForkReachable,
  scopeToChannel,
  selectNewestCalverTag,
  type CalverTagInfo,
} from '../scripts/release-channel-staleness.ts'

const DAY_MS = 86_400_000
const NOW = Date.UTC(2026, 9, 8, 12, 0, 0) // 2026-10-08T12:00Z

const tags = (entries: [name: string, dateUnix: number][]): CalverTagInfo[] =>
  entries.map(([name, dateUnix]) => ({name, dateUnix}))

describe('rm-740: calver tag parsing and newest selection', () => {
  it('parses this repo calver shapes and rejects non-calver tags', () => {
    expect(parseCalverTag('2026.08.9')).toEqual({year: 2026, month: 8, counter: 9})
    expect(parseCalverTag('2026.10.28')).toEqual({year: 2026, month: 10, counter: 28})
    expect(parseCalverTag('v1.2.3')).toBeNull()
    expect(parseCalverTag('2026.13.1')).toBeNull() // month out of range
    expect(parseCalverTag('2026.8')).toBeNull() // not the three-part shape
  })

  it('rm-1932: the third component is a per-month RELEASE COUNTER, not a day — counter-form >31 is valid', () => {
    // Live census 2026-10-17: this repo's tag namespace carries
    // 2026.06.31-.57, 2026.07.32-.43, 2026.08.32-.36, 2026.10.32-.43 — the
    // pre-rm-1932 `day > 31` rejection silently dropped every one of them,
    // mis-naming the channel newest (the gate reported 2026.10.31 while
    // 2026.10.43 existed). Day-shaped 1-31 is the legacy subset and stays
    // valid; counters of any width are accepted.
    expect(parseCalverTag('2026.08.32')).toEqual({year: 2026, month: 8, counter: 32})
    expect(parseCalverTag('2026.10.43')).toEqual({year: 2026, month: 10, counter: 43})
    expect(parseCalverTag('2026.06.57')).toEqual({year: 2026, month: 6, counter: 57})
    expect(parseCalverTag('2026.07.0')).toBeNull() // zero counter rejected (rm-1932)
    expect(parseCalverTag('2026.06.15.1')).toBeNull() // 4-part sub-tag stays ignored
  })

  it('counter-form tags outrank same-month day-form tags NUMERICALLY (2026.10.43 beats 2026.10.31)', () => {
    const set = tags([
      ['2026.10.31', 1],
      ['2026.10.43', 2],
    ])
    expect(selectNewestCalverTag(set)?.name).toBe('2026.10.43')
  })

  it('selects the newest tag NUMERICALLY — 2026.08.10 beats 2026.08.9 despite lexical order', () => {
    // Refname STRING sort puts '2026.08.9' after '2026.08.10' ('9' > '1') — a
    // lexical sort would wrongly crown 2026.08.9. Numeric day compare crowns
    // 2026.08.10 (August 10 is newer than August 9).
    const set = tags([
      ['2026.08.10', 1],
      ['2026.08.9', 2],
      ['2026.07.31', 3],
    ])
    expect(selectNewestCalverTag(set)?.name).toBe('2026.08.10')
  })

  it('multi-digit days across the series still select numerically (the CI-observed shape)', () => {
    // Observed live on this host: tags 2026.10.0 .. 2026.10.14 — a string
    // sort crowns '2026.10.9'; numeric crowns '2026.10.14'.
    const set = tags([
      ['2026.10.2', 1],
      ['2026.10.9', 2],
      ['2026.10.10', 3],
      ['2026.10.14', 4],
    ])
    expect(selectNewestCalverTag(set)?.name).toBe('2026.10.14')
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

describe('rm-1932: verdict scoping — foreign upstream tags never feed the verdict', () => {
  it('partitions the gathered set into fork-reachable and foreign, counting the exclusion', () => {
    const gathered = tags([
      ['2026.10.23', 1], // fork-reachable (upstream tag on a commit main contains)
      ['2026.10.40', 2], // foreign — cut on upstream commits main does NOT contain
      ['2026.10.43', 3], // foreign
      ['2026.08.15', 4], // fork-reachable
    ])
    const {scoped, foreignExcludedCount} = scopeCalverTagsToForkReachable(
      gathered,
      new Set(['2026.10.23', '2026.08.15']),
    )
    expect(scoped.map(t => t.name)).toEqual(['2026.10.23', '2026.08.15'])
    expect(foreignExcludedCount).toBe(2)
  })

  it('a foreign newest tag never crowns the channel — the scoped newest decides', () => {
    // The exact false-healthy rm-1932 kills: unscoped, 2026.10.43 (foreign,
    // 1 day old) would crown and report healthy while the fork-reachable
    // newest is months old.
    const {scoped, foreignExcludedCount} = scopeCalverTagsToForkReachable(
      tags([
        ['2026.10.43', Math.floor((NOW - 1 * DAY_MS) / 1000)],
        ['2026.08.15', Math.floor((NOW - 54 * DAY_MS) / 1000)],
      ]),
      new Set(['2026.08.15']),
    )
    const result = evaluateReleaseChannelStaleness({
      nowMs: NOW,
      tags: scoped,
      thresholdDays: 45,
      decision: null,
      foreignExcludedCount,
    })
    expect(result.status).toBe('stale')
    expect(result.newestTag).toBe('2026.08.15')
    expect(result.foreignExcludedCount).toBe(1)
  })

  it('a scope set that drops EVERY calver tag is an extraction error, not an empty healthy', () => {
    const {scoped, foreignExcludedCount} = scopeCalverTagsToForkReachable(
      tags([['2026.10.43', Math.floor((NOW - 1 * DAY_MS) / 1000)]]),
      new Set(),
    )
    expect(() =>
      evaluateReleaseChannelStaleness({
        nowMs: NOW,
        tags: scoped,
        thresholdDays: 45,
        decision: null,
        foreignExcludedCount,
      }),
    ).toThrow(/no fork-reachable calver tags/)
  })

  it('the summary names the verdict scope: fork-reachable count and foreign exclusion count', () => {
    const lines = buildSummaryLines({
      status: 'healthy',
      newestTag: '2026.10.23',
      newestTagDateUnix: Math.floor((NOW - 13 * DAY_MS) / 1000),
      ageDays: 13,
      thresholdDays: 45,
      decision: null,
      scopedTagCount: 141,
      foreignExcludedCount: 20,
      upstreamExcludedCount: 26,
    })
    const text = lines.join('\n')
    expect(text).toContain('141 fork-channel')
    expect(text).toContain('20 foreign upstream tag(s) excluded')
  })
})

describe('rm-740: age verdict against the threshold', () => {
  it('a tag inside the threshold is healthy', () => {
    const result = evaluateReleaseChannelStaleness({
      nowMs: NOW,
      tags: tags([['2026.09.20', Math.floor((NOW - 18 * DAY_MS) / 1000)]]),
      thresholdDays: 45,
      decision: null,
    })
    expect(result.status).toBe('healthy')
    expect(result.ageDays).toBe(18)
  })

  it('a tag older than the threshold is stale (undecided channel — red BY DESIGN)', () => {
    const result = evaluateReleaseChannelStaleness({
      nowMs: NOW,
      tags: tags([['2026.08.9', Math.floor((NOW - 60 * DAY_MS) / 1000)]]),
      thresholdDays: 45,
      decision: null,
    })
    expect(result.status).toBe('stale')
    expect(result.ageDays).toBe(60)
  })

  it('the boundary day itself is healthy (age == threshold is not stale)', () => {
    const result = evaluateReleaseChannelStaleness({
      nowMs: NOW,
      tags: tags([['2026.08.24', Math.floor((NOW - 45 * DAY_MS) / 1000)]]),
      thresholdDays: 45,
      decision: null,
    })
    expect(result.status).toBe('healthy')
  })

  it('age is measured from the NEWEST tag only — older tags do not count', () => {
    const result = evaluateReleaseChannelStaleness({
      nowMs: NOW,
      tags: tags([
        ['2026.05.1', Math.floor((NOW - 160 * DAY_MS) / 1000)],
        ['2026.09.25', Math.floor((NOW - 13 * DAY_MS) / 1000)],
      ]),
      thresholdDays: 45,
      decision: null,
    })
    expect(result.status).toBe('healthy')
    expect(result.newestTag).toBe('2026.09.25')
  })
})

describe('rm-740: dormancy decision semantics', () => {
  const staleInputs = {
    nowMs: NOW,
    tags: tags([['2026.08.9', Math.floor((NOW - 60 * DAY_MS) / 1000)]]),
    thresholdDays: 45,
  }

  it('retired-with-owner suppresses the red (recorded outcome stands)', () => {
    const result = evaluateReleaseChannelStaleness({
      ...staleInputs,
      decision: {retired: true, ownerDefId: 'rm-714', recordedAt: '2026-10-08', note: 'branch-b'},
    })
    expect(result.status).toBe('retired')
  })

  it('retired: false is an explicit live-channel statement — the red stands', () => {
    const result = evaluateReleaseChannelStaleness({
      ...staleInputs,
      decision: {retired: false, ownerDefId: 'rm-714', recordedAt: '2026-10-08'},
    })
    expect(result.status).toBe('stale')
  })

  it('a retirement decision on a HEALTHY channel does not fake staleness', () => {
    const result = evaluateReleaseChannelStaleness({
      nowMs: NOW,
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

describe('rm-740: empty evidence is an extraction error, never healthy', () => {
  it('no calver tags at all throws (tags-not-fetched / never-tagged channel)', () => {
    expect(() =>
      evaluateReleaseChannelStaleness({nowMs: NOW, tags: [], thresholdDays: 45, decision: null}),
    ).toThrow(/no fork-reachable calver tags/)
    // Non-calver tags present but no calver ones — same class.
    expect(() =>
      evaluateReleaseChannelStaleness({
        nowMs: NOW,
        tags: tags([['v1.0.0', 5]]),
        thresholdDays: 45,
        decision: null,
      }),
    ).toThrow(/no fork-reachable calver tags/)
  })
})

describe('rm-740: step summary rendering', () => {
  it('names the owning def rm-740 and carries tag/age/threshold facts', () => {
    const lines = buildSummaryLines({
      status: 'healthy',
      newestTag: '2026.09.25',
      newestTagDateUnix: Math.floor((NOW - 13 * DAY_MS) / 1000),
      ageDays: 13,
      thresholdDays: 45,
      decision: null,
      scopedTagCount: 2,
      foreignExcludedCount: 0,
      upstreamExcludedCount: 0,
    })
    const text = lines.join('\n')
    expect(text).toContain('rm-740')
    expect(text).toContain('2026.09.25')
    expect(text).toContain('13')
    expect(text).toContain('45')
  })

  it('a stale summary names the decision owner rm-714 and the BY-DESIGN red', () => {
    const lines = buildSummaryLines({
      status: 'stale',
      newestTag: '2026.08.9',
      newestTagDateUnix: Math.floor((NOW - 60 * DAY_MS) / 1000),
      ageDays: 60,
      thresholdDays: 45,
      decision: null,
      scopedTagCount: 1,
      foreignExcludedCount: 0,
      upstreamExcludedCount: 0,
    })
    const text = lines.join('\n')
    expect(text).toContain('rm-714')
    expect(text).toContain('BY DESIGN')
    expect(text).toContain('STALE')
  })

  it('a retired summary names the recording owner def', () => {
    const lines = buildSummaryLines({
      status: 'retired',
      newestTag: '2026.08.9',
      newestTagDateUnix: Math.floor((NOW - 60 * DAY_MS) / 1000),
      ageDays: 60,
      thresholdDays: 45,
      decision: {retired: true, ownerDefId: 'rm-714', recordedAt: '2026-10-01'},
      scopedTagCount: 1,
      foreignExcludedCount: 0,
      upstreamExcludedCount: 0,
    })
    const text = lines.join('\n')
    expect(text).toContain('retired-with-owner')
    expect(text).toContain('rm-714')
  })
})

describe('rm-1932 tier 2: absorbed-upstream-lineage exclusion (scopeToChannel)', () => {
  it('excludes tags reachable from BOTH base and upstream (absorbed upstream releases)', () => {
    const all = tags([
      ['2026.10.43', 100], // foreign (not reachable from base)
      ['2026.10.23', 90], // absorbed upstream release: reachable from base AND upstream
      ['2026.08.15', 80], // fork channel tag: reachable from base only
    ])
    const baseNames = new Set(['2026.10.23', '2026.08.15'])
    const upstreamNames = new Set(['2026.10.23'])

    const {scoped, foreignExcludedCount, upstreamExcludedCount} = scopeToChannel(all, baseNames, upstreamNames)

    expect(scoped.map(t => t.name)).toEqual(['2026.08.15'])
    expect(foreignExcludedCount).toBe(1)
    expect(upstreamExcludedCount).toBe(1)
  })

  it('null upstreamNames = tier-1-only scoping (no upstream concept configured)', () => {
    const all = tags([
      ['2026.10.23', 90],
      ['2026.08.15', 80],
    ])
    const baseNames = new Set(['2026.10.23', '2026.08.15'])

    const {scoped, upstreamExcludedCount} = scopeToChannel(all, baseNames, null)

    expect(scoped.map(t => t.name)).toEqual(['2026.10.23', '2026.08.15'])
    expect(upstreamExcludedCount).toBe(0)
  })

  it('empty channel after tier-2 exclusion still reaches evaluate, which throws the no-tags red (never a healthy)', () => {
    // The empirically-observed live shape (2026-10-17): every reachable calver
    // tag in this repo is absorbed upstream lineage — the honest verdict is
    // the never-minted red, NOT a healthy borrowed from upstream's cadence.
    const all = tags([['2026.10.23', 90]])
    const baseNames = new Set(['2026.10.23'])
    const upstreamNames = new Set(['2026.10.23'])

    const {scoped} = scopeToChannel(all, baseNames, upstreamNames)
    expect(scoped).toHaveLength(0)
    expect(() => evaluateReleaseChannelStaleness({nowMs: NOW, tags: scoped, thresholdDays: 45, decision: null})).toThrow(
      /no fork-reachable calver tags/,
    )
  })

  it('summary names both exclusion counts (scope transparency)', () => {
    const result = evaluateReleaseChannelStaleness({
      nowMs: NOW,
      tags: tags([['2026.08.15', Math.floor((NOW - 10 * DAY_MS) / 1000)]]),
      thresholdDays: 45,
      decision: null,
      foreignExcludedCount: 20,
      upstreamExcludedCount: 9,
    })
    const lines = buildSummaryLines(result)
    const scopeLine = lines.find(l => l.includes('Verdict scope'))
    expect(scopeLine).toContain('20 foreign upstream tag(s) excluded')
    expect(scopeLine).toContain('9 absorbed-upstream-lineage tag(s) excluded')
  })
})
