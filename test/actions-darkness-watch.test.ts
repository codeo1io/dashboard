import {afterEach, describe, expect, it, vi} from 'vitest'

import {
  classifyWorkflows,
  computeDarkness,
  DARKNESS_THRESHOLD_MS,
  main,
} from '../scripts/actions-darkness-watch.ts'

const NOW = '2026-10-15T12:00:00.000Z'
const PUSHED_RECENT = '2026-10-14T21:00:00.000Z'

function daysAgo(days: number): string {
  return new Date(Date.parse(NOW) - days * 24 * 60 * 60 * 1000).toISOString()
}

function jsonResponse(body: unknown): Response {
  return {ok: true, status: 200, json: async () => body} as unknown as Response
}

function errorResponse(): Response {
  return {ok: false, status: 503, json: async () => ({})} as unknown as Response
}

function stubGitHubApi(responses: {workflows: unknown; runs: unknown; repo: unknown}): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: unknown) => {
      const href = String(url)
      if (href.endsWith('/actions/workflows?per_page=100')) {
        return jsonResponse(responses.workflows)
      }
      if (href.endsWith('/actions/runs?per_page=100')) {
        return jsonResponse(responses.runs)
      }
      if (href.endsWith('/repos/codeo1io/dashboard')) {
        return jsonResponse(responses.repo)
      }
      throw new Error(`unexpected url: ${href}`)
    }),
  )
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

describe('main exit ladder', () => {
  // The exit codes are the watchdog's contract with the estate-tripwire
  // ladder (0 GREEN / 1 UNKNOWN / 3 DARK), so they are pinned through main()
  // itself with the GitHub REST reads stubbed. The local trigger index is
  // real: .github/workflows/main.yaml is push-triggered in this repository.
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  const workflowFixtures = {
    workflows: {
      workflows: [{id: 900001, path: '.github/workflows/main.yaml', name: 'Main'}],
    },
    repo: {pushed_at: daysAgo(1)},
  }

  it('exits 0 (GREEN) when the freshest candidate is within budget', async () => {
    vi.stubEnv('ACTIONS_DARKNESS_REPO', 'codeo1io/dashboard')
    vi.stubEnv('ACTIONS_DARKNESS_NOW', NOW)
    stubGitHubApi({
      ...workflowFixtures,
      runs: {workflow_runs: [{workflow_id: 900001, created_at: daysAgo(0.1)}]},
    })
    await expect(main()).resolves.toBe(0)
  })

  it('exits 3 (DARK) when a candidate is days-stale and owed a run', async () => {
    vi.stubEnv('ACTIONS_DARKNESS_REPO', 'codeo1io/dashboard')
    vi.stubEnv('ACTIONS_DARKNESS_NOW', NOW)
    stubGitHubApi({
      ...workflowFixtures,
      runs: {workflow_runs: [{workflow_id: 900001, created_at: daysAgo(6)}]},
    })
    await expect(main()).resolves.toBe(3)
  })

  it('exits 1 (UNKNOWN) when the API reads fail', async () => {
    vi.stubEnv('ACTIONS_DARKNESS_REPO', 'codeo1io/dashboard')
    vi.stubEnv('ACTIONS_DARKNESS_NOW', NOW)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => errorResponse()),
    )
    await expect(main()).resolves.toBe(1)
  })
})
