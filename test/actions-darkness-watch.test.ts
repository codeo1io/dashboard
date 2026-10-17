import {describe, expect, it, vi} from 'vitest'

import {
  classifyWorkflows,
  collectRuns,
  collectWorkflows,
  computeDarkness,
  DARKNESS_THRESHOLD_MS,
  fetchJson,
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

describe('actions-darkness-watch probe truthfulness (rm-1478)', () => {
  it('never-ran under a capped runs census is UNKNOWN, not DARK', () => {
    const result = computeDarkness({
      workflows: [{id: 6, path: '.github/workflows/main.yaml', name: 'Main'}],
      runs: [],
      triggers: {'.github/workflows/main.yaml': ['push']},
      pushedAt: PUSHED_RECENT,
      now: NOW,
      runsCoverage: 'capped',
    })
    expect(result.verdict).toBe('UNKNOWN')
    expect(result.darkWorkflows).toEqual([])
    expect(result.unknownWorkflows).toEqual([
      {name: 'Main', path: '.github/workflows/main.yaml', reason: 'pagination-cap'},
    ])
    expect(result.candidateClassifications[0]?.state).toBe('UNKNOWN')
  })

  it('DARK still wins when another candidate was seen stale and owed under a capped census', () => {
    const result = computeDarkness({
      workflows: [
        {id: 1, path: '.github/workflows/seen.yaml', name: 'Seen'},
        {id: 2, path: '.github/workflows/unseen.yaml', name: 'Unseen'},
      ],
      runs: [{workflowId: 1, createdAt: daysAgo(20)}],
      triggers: {
        '.github/workflows/seen.yaml': ['push'],
        '.github/workflows/unseen.yaml': ['schedule'],
      },
      pushedAt: PUSHED_RECENT,
      now: NOW,
      runsCoverage: 'capped',
    })
    expect(result.verdict).toBe('DARK')
    expect(result.darkWorkflows).toHaveLength(1)
    expect(result.darkWorkflows[0]?.name).toBe('Seen')
    expect(result.unknownWorkflows).toEqual([
      {name: 'Unseen', path: '.github/workflows/unseen.yaml', reason: 'pagination-cap'},
    ])
  })

  it('a capped census where every candidate was observed stays decisive', () => {
    const result = computeDarkness({
      workflows: [{id: 1, path: '.github/workflows/seen.yaml', name: 'Seen'}],
      runs: [{workflowId: 1, createdAt: daysAgo(20)}],
      triggers: {'.github/workflows/seen.yaml': ['push']},
      pushedAt: PUSHED_RECENT,
      now: NOW,
      runsCoverage: 'capped',
    })
    expect(result.verdict).toBe('DARK')
    expect(result.unknownWorkflows).toEqual([])
  })

  it('dry-run details state the true reason: owed-but-young is not "ran after the last push" (rm-1478)', () => {
    const result = computeDarkness({
      workflows: [{id: 1, path: '.github/workflows/main.yaml', name: 'Main'}],
      runs: [{workflowId: 1, createdAt: daysAgo(0.1)}],
      triggers: {'.github/workflows/main.yaml': ['push']},
      pushedAt: '2026-10-15T11:00:00.000Z', // newer than the run, older than NOW: owed but young
      now: NOW,
    })
    expect(result.verdict).toBe('GREEN')
    expect(result.candidateClassifications[0]?.state).toBe('GREEN')
    expect(result.candidateClassifications[0]?.detail).toBe(
      'owed a run by a newer push but under the staleness threshold',
    )
    expect(result.candidateClassifications[0]?.detail).not.toContain('ran after the last push')
  })

  it('a never-ran candidate in a never-pushed repo still gets a dry-run line (GREEN, nothing owed)', () => {
    const result = computeDarkness({
      workflows: [{id: 1, path: '.github/workflows/main.yaml', name: 'Main'}],
      runs: [],
      triggers: {'.github/workflows/main.yaml': ['push']},
      pushedAt: '', // never pushed — nothing can be owed
      now: NOW,
    })
    expect(result.verdict).toBe('GREEN')
    expect(result.darkWorkflows).toEqual([])
    expect(result.candidateClassifications).toEqual([
      {
        name: 'Main',
        path: '.github/workflows/main.yaml',
        state: 'GREEN',
        lastRun: 'never',
        ageDays: Number.POSITIVE_INFINITY,
        detail: 'never ran but nothing is owed (repository never pushed)',
      },
    ])
  })
})

describe('rm-1478 paginated runs census (collectRuns)', () => {
  const ids = new Set([42])

  it('a short page terminates the census with complete coverage', async () => {
    const pages: number[] = []
    const census = await collectRuns(async page => {
      pages.push(page)
      return page === 1
        ? [
            {workflowId: 7, createdAt: '2026-10-16T00:00:00Z'},
            {workflowId: 8, createdAt: '2026-10-15T00:00:00Z'},
          ]
        : []
    }, ids)
    expect(census.coverage).toBe('complete')
    expect(census.runs).toHaveLength(2)
    expect(pages).toEqual([1])
  })

  it('an empty first page is a complete census with zero runs', async () => {
    const census = await collectRuns(async () => [], ids)
    expect(census.coverage).toBe('complete')
    expect(census.runs).toEqual([])
  })

  it('hitting the page cap with an unobserved candidate yields capped coverage', async () => {
    let calls = 0
    const census = await collectRuns(
      async () => {
        calls += 1
        return [
          {workflowId: 99, createdAt: '2026-10-16T00:00:00Z'},
          {workflowId: 98, createdAt: '2026-10-15T00:00:00Z'},
        ]
      },
      ids,
      {maxPages: 3, perPage: 2},
    )
    expect(calls).toBe(3)
    expect(census.coverage).toBe('capped')
    expect(census.runs).toHaveLength(6)
  })

  it('stops as soon as every candidate has been observed', async () => {
    let calls = 0
    const census = await collectRuns(
      async () => {
        calls += 1
        return [{workflowId: 42, createdAt: '2026-10-16T00:00:00Z'}]
      },
      ids,
      {maxPages: 10, perPage: 2},
    )
    expect(calls).toBe(1)
    expect(census.coverage).toBe('complete')
  })

  it('a capped census where every candidate was observed stays complete', async () => {
    const census = await collectRuns(
      async () => [{workflowId: 42, createdAt: '2026-10-16T00:00:00Z'}],
      ids,
      {maxPages: 2, perPage: 1},
    )
    expect(census.coverage).toBe('complete')
  })

  it('propagates fetch errors so the probe reports UNKNOWN (error page)', async () => {
    await expect(
      collectRuns(async () => {
        throw new Error('GET https://api.github.com/… -> HTTP 503')
      }, ids),
    ).rejects.toThrow('HTTP 503')
  })
})

describe('rm-1478 paginated workflows census (collectWorkflows)', () => {
  it('terminates on a short page', async () => {
    const seen: number[] = []
    const workflows = await collectWorkflows(
      async page => {
        seen.push(page)
        if (page === 1) {
          return [
            {id: 1, path: '.github/workflows/a.yaml', name: 'A'},
            {id: 2, path: '.github/workflows/b.yaml', name: 'B'},
          ]
        }
        return [{id: 3, path: '.github/workflows/c.yaml', name: 'C'}] // short page (1 < 2)
      },
      {maxPages: 5, perPage: 2},
    )
    expect(workflows).toHaveLength(3)
    expect(seen).toEqual([1, 2])
  })

  it('throws when the page cap is reached without a short page', async () => {
    await expect(
      collectWorkflows(
        async () => [
          {id: 1, path: '.github/workflows/a.yaml', name: 'A'},
          {id: 2, path: '.github/workflows/b.yaml', name: 'B'},
        ],
        {maxPages: 2, perPage: 2},
      ),
    ).rejects.toThrow('workflow census exceeded the page cap')
  })
})

describe('rm-1478 bounded fetches (fetchJson)', () => {
  it('attaches an AbortSignal timeout to every request', async () => {
    const calls: {signal: unknown}[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        calls.push({signal: init?.signal})
        return {ok: true, status: 200, json: async () => ({})} as unknown as Response
      }),
    )
    try {
      await fetchJson('https://api.github.com/robots', undefined)
      expect(calls[0]?.signal).toBeInstanceOf(AbortSignal)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
