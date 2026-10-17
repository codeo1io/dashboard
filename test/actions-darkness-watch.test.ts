import {describe, expect, it} from 'vitest'

import {
  classifyWorkflows,
  collectRuns,
  computeDarkness,
  DARKNESS_THRESHOLD_MS,
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
  })
}

describe('collectRuns', () => {
  const runAt = (ms: number) => ({workflowId: 1, createdAt: new Date(ms).toISOString()})
  const DAY = 24 * 60 * 60 * 1000
  const BASE = Date.parse('2026-10-17T12:00:00.000Z')

  it('marks the list exhausted on an empty page (the definitive list end)', async () => {
    const calls: string[] = []
    const result = await collectRuns({
      firstUrl: 'https://api.test/runs?per_page=100',
      boundMs: BASE - 7 * DAY,
      maxPages: 5,
      fetchPage: async url => {
        calls.push(url)
        if (url.endsWith('page=1')) {
          return {runs: [runAt(BASE - 10_000)], oldestCreatedMs: BASE - 10_000}
        }
        return {runs: [], oldestCreatedMs: null}
      },
    })
    expect(result.exhausted).toBe(true)
    expect(result.pages).toBe(2)
    expect(result.runs).toHaveLength(1)
    expect(calls).toEqual([
      'https://api.test/runs?per_page=100&page=1',
      'https://api.test/runs?per_page=100&page=2',
    ])
  })

  it('stops at the coverage bound without fetching the next page', async () => {
    const calls: string[] = []
    const result = await collectRuns({
      firstUrl: 'https://api.test/runs?per_page=100',
      boundMs: BASE - 2 * DAY,
      maxPages: 5,
      fetchPage: async url => {
        calls.push(url)
        return {
          runs: [runAt(BASE - 1000), runAt(BASE - 3 * DAY)],
          oldestCreatedMs: BASE - 3 * DAY,
        }
      },
    })
    expect(result.exhausted).toBe(false)
    expect(result.pages).toBe(1)
    expect(result.runs).toHaveLength(2)
    expect(calls).toEqual(['https://api.test/runs?per_page=100&page=1'])
  })

  it('throws when maxPages is exceeded before any stop condition', async () => {
    let calls = 0
    await expect(
      collectRuns({
        firstUrl: 'https://api.test/runs?per_page=100',
        boundMs: BASE - 30 * DAY,
        maxPages: 2,
        fetchPage: async () => {
          calls += 1
          return {
            runs: [runAt(BASE - 1000)],
            oldestCreatedMs: BASE - 1000,
          }
        },
      }),
    ).rejects.toThrow(/pagination exceeded 2 pages/)
    expect(calls).toBe(2)
  })

  it('treats a page with rows but no valid createdAt as having no bound marker', async () => {
    const result = await collectRuns({
      firstUrl: 'https://api.test/runs?per_page=100',
      boundMs: BASE - DAY,
      maxPages: 5,
      fetchPage: async url => {
        if (url.endsWith('page=1')) {
          return {runs: [{workflowId: 1, createdAt: 'not-a-date'}], oldestCreatedMs: null}
        }
        return {runs: [], oldestCreatedMs: null}
      },
    })
    // Invalid dates give no bound marker, so the walk must CONTINUE — it
    // cannot mistake an unparseable page for the list end.
    expect(result.exhausted).toBe(true)
    expect(result.pages).toBe(2)
    expect(result.runs).toHaveLength(1)
  })
})

describe('computeDarkness — pagination coverage', () => {
  it('reports pre-coverage instead of never when the run list was not exhausted', () => {
    // The live false-positive shape (run 09ea72cc assess): one page of 100+
    // fresh runs belonging to OTHER workflows, scheduled candidate absent.
    const freshRuns = Array.from({length: 100}, (_, i) => ({
      workflowId: 900 + i,
      createdAt: daysAgo(0.01),
    }))
    const result = computeDarkness({
      workflows: [{id: 1, path: '.github/workflows/audit.yaml', name: 'audit'}],
      runs: freshRuns,
      triggers: {'.github/workflows/audit.yaml': ['schedule']},
      pushedAt: PUSHED_RECENT,
      now: NOW,
      runsExhausted: false,
    })
    expect(result.verdict).toBe('DARK')
    expect(result.darkWorkflows).toHaveLength(1)
    expect(result.darkWorkflows[0]?.lastRun).toBe('pre-coverage')
    expect(result.darkWorkflows[0]?.ageDays).toBe(Number.POSITIVE_INFINITY)
  })

  it('keeps the first-hand never verdict when runsExhausted is omitted (default)', () => {
    const result = verdictFor({runs: []})
    expect(result.verdict).toBe('DARK')
    expect(result.darkWorkflows[0]?.lastRun).toBe('never')
  })
})

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
})
