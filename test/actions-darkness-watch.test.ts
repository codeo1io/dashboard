import {describe, expect, it} from 'vitest'

import {
  classifyWorkflows,
  computeDarkness,
  DARKNESS_THRESHOLD_MS,
  extractSchedules,
  laneThresholdMs,
  maxCronGapMs,
} from '../scripts/actions-darkness-watch.ts'

const NOW = '2026-10-15T12:00:00.000Z'
const PUSHED_RECENT = '2026-10-14T21:00:00.000Z'

function daysAgo(days: number): string {
  return new Date(Date.parse(NOW) - days * 24 * 60 * 60 * 1000).toISOString()
}

function verdictFor(options: {
  workflows?: {id: number; path: string; name: string}[]
  runs?: {workflowId: number; createdAt: string}[]
  triggers?: Record<string, string[]>
  schedules?: Record<string, string[]>
  pushedAt?: string
  now?: string
}) {
  return computeDarkness({
    workflows: options.workflows ?? [
      {id: 1, path: '.github/workflows/main.yaml', name: 'Main'},
      {id: 2, path: '.github/workflows/manual.yaml', name: 'Manual'},
    ],
    runs: options.runs ?? [{workflowId: 1, createdAt: daysAgo(0.1)}],
    triggers: options.triggers ?? {
      '.github/workflows/main.yaml': ['push'],
      '.github/workflows/manual.yaml': ['workflow_dispatch'],
    },
    pushedAt: options.pushedAt ?? PUSHED_RECENT,
    now: options.now ?? NOW,
    schedules: options.schedules ?? {},
  })
}

describe('classifyWorkflows', () => {
  it('normalizes the mapping form of on:', () => {
    const index = classifyWorkflows({
      'main.yaml': 'on:\n  push:\n    branches: [main]\n  schedule:\n    - cron: "0 6 * * *"\n',
    })
    expect(index['main.yaml']).toEqual(['push', 'schedule'])
  })

  it('normalizes the array and bare-string forms of on:', () => {
    const index = classifyWorkflows({
      'array.yaml': 'on: [push, workflow_dispatch]\n',
      'bare.yaml': 'on: push\n',
    })
    expect(index['array.yaml']).toEqual(['push', 'workflow_dispatch'])
    expect(index['bare.yaml']).toEqual(['push'])
  })

  it('reads the legacy boolean on-key form (true:)', () => {
    const index = classifyWorkflows({'legacy.yaml': 'true:\n  push:\njobs:\n  x:\n'})
    expect(index['legacy.yaml']).toEqual(['push'])
  })

  it('skips unparseable and non-mapping documents', () => {
    const index = classifyWorkflows({
      'broken.yaml': 'on: [push\n',
      'empty.yaml': '',
    })
    expect(index).toEqual({})
  })
})

describe('computeDarkness', () => {
  it('returns GREEN when every candidate ran after the last push', () => {
    const result = verdictFor({})
    expect(result.verdict).toBe('GREEN')
    expect(result.candidates).toBe(1)
    expect(result.darkWorkflows).toEqual([])
  })

  it('returns DARK when a candidate is days-stale and a run is owed', () => {
    const result = verdictFor({
      runs: [{workflowId: 1, createdAt: daysAgo(6)}],
      pushedAt: daysAgo(1),
    })
    expect(result.verdict).toBe('DARK')
    expect(result.darkWorkflows).toHaveLength(1)
    expect(result.darkWorkflows[0]?.name).toBe('Main')
    expect(result.darkWorkflows[0]?.lastRun).toBe(daysAgo(6))
    expect(result.darkWorkflows[0]?.ageDays).toBe(6)
  })

  it('treats a candidate that never ran as dark once anything was pushed', () => {
    const result = verdictFor({runs: []})
    expect(result.verdict).toBe('DARK')
    expect(result.darkWorkflows[0]?.lastRun).toBe('never')
  })

  it('does not flag staleness at exactly the threshold (strictly greater)', () => {
    const exactlyAtThreshold = Date.parse(NOW) - DARKNESS_THRESHOLD_MS
    const result = verdictFor({
      runs: [{workflowId: 1, createdAt: new Date(exactlyAtThreshold).toISOString()}],
      pushedAt: daysAgo(3),
    })
    expect(result.verdict).toBe('GREEN')
  })

  it('returns GREEN when stale but nothing was pushed since the last run', () => {
    const result = verdictFor({
      runs: [{workflowId: 1, createdAt: daysAgo(6)}],
      pushedAt: daysAgo(7),
    })
    expect(result.verdict).toBe('GREEN')
  })

  it('ignores workflows without push or schedule triggers', () => {
    const result = verdictFor({
      triggers: {
        '.github/workflows/main.yaml': ['workflow_dispatch'],
        '.github/workflows/manual.yaml': ['workflow_dispatch'],
      },
      runs: [],
    })
    expect(result.verdict).toBe('GREEN')
    expect(result.candidates).toBe(0)
  })

  it('counts only the workflow-run timestamps of the matching workflow id', () => {
    const result = verdictFor({
      runs: [
        {workflowId: 2, createdAt: daysAgo(0.1)},
        {workflowId: 1, createdAt: daysAgo(6)},
      ],
      pushedAt: daysAgo(1),
    })
    expect(result.verdict).toBe('DARK')
    expect(result.darkWorkflows).toHaveLength(1)
  })

  it('reports every dark candidate, not just the first', () => {
    const result = verdictFor({
      workflows: [
        {id: 1, path: '.github/workflows/main.yaml', name: 'Main'},
        {id: 3, path: '.github/workflows/canary.yaml', name: 'Canary'},
      ],
      triggers: {
        '.github/workflows/main.yaml': ['push'],
        '.github/workflows/canary.yaml': ['schedule'],
      },
      runs: [{workflowId: 1, createdAt: daysAgo(6)}],
      pushedAt: daysAgo(1),
    })
    expect(result.verdict).toBe('DARK')
    expect(result.darkWorkflows.map(w => w.name)).toEqual(['Main', 'Canary'])
  })

  it('treats schedule-only workflows as candidates', () => {
    const result = verdictFor({
      triggers: {'.github/workflows/main.yaml': ['schedule']},
      runs: [],
    })
    expect(result.candidates).toBe(1)
    expect(result.verdict).toBe('DARK')
  })

  it('fails closed to UNKNOWN when run timestamps are unparseable', () => {
    const result = verdictFor({
      runs: [{workflowId: 1, createdAt: 'not-a-date'}],
      pushedAt: daysAgo(3),
    })
    expect(result.verdict).toBe('UNKNOWN')
    expect(result.darkWorkflows).toHaveLength(0)
    expect(result.unknownWorkflows).toHaveLength(1)
    expect(result.unknownWorkflows[0]?.lastRun).toBe('unparseable')
  })

  it('keeps a weekly-cron lane green inside its cadence window', () => {
    const result = verdictFor({
      triggers: {'.github/workflows/main.yaml': ['schedule']},
      schedules: {'.github/workflows/main.yaml': ['0 6 * * 1']},
      runs: [{workflowId: 1, createdAt: daysAgo(3)}],
      pushedAt: daysAgo(5),
    })
    expect(result.verdict).toBe('GREEN')
  })

  it('marks a weekly-cron lane dark past its cadence without any push owed', () => {
    const result = verdictFor({
      triggers: {'.github/workflows/main.yaml': ['schedule']},
      schedules: {'.github/workflows/main.yaml': ['0 6 * * 1']},
      runs: [{workflowId: 1, createdAt: daysAgo(8)}],
      pushedAt: daysAgo(30),
    })
    expect(result.verdict).toBe('DARK')
    expect(result.darkWorkflows[0]?.thresholdDays).toBe(7.5)
  })
})

describe('cron thresholds', () => {
  it('measures the longest union gap over a week', () => {
    expect(maxCronGapMs(['0 6 * * 1'])).toBe(7 * 24 * 60 * 60 * 1000)
    expect(maxCronGapMs(['0 6,18 * * *'])).toBe(12 * 60 * 60 * 1000)
    expect(maxCronGapMs(['30 */4 * * *'])).toBe(4 * 60 * 60 * 1000)
  })

  it('falls back to a week for unparseable crons', () => {
    expect(maxCronGapMs(['garbage'])).toBe(7 * 24 * 60 * 60 * 1000)
    expect(maxCronGapMs([])).toBe(7 * 24 * 60 * 60 * 1000)
  })

  it('floors lane thresholds at the stale threshold and adds grace', () => {
    expect(laneThresholdMs('.github/workflows/x.yaml', undefined)).toBe(DARKNESS_THRESHOLD_MS)
    expect(laneThresholdMs('.github/workflows/x.yaml', {})).toBe(DARKNESS_THRESHOLD_MS)
    expect(laneThresholdMs('.github/workflows/x.yaml', {'.github/workflows/x.yaml': ['0 6 * * 1']})).toBe(
      7 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000,
    )
    expect(laneThresholdMs('.github/workflows/x.yaml', {'.github/workflows/x.yaml': ['0 6,18 * * *']})).toBe(
      DARKNESS_THRESHOLD_MS,
    )
  })

  it('extracts cron schedules from workflow texts', () => {
    const schedules = extractSchedules({
      'main.yaml': 'on:\n  push:\n    branches: [main]\n  schedule:\n    - cron: "0 6 * * 1"\n',
      'array.yaml': 'on: [push]\n',
      'broken.yaml': 'on: [push\n',
    })
    expect(schedules['main.yaml']).toEqual(['0 6 * * 1'])
    expect(schedules['array.yaml']).toBeUndefined()
    expect(schedules['broken.yaml']).toBeUndefined()
  })
})
