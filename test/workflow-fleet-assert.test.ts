import {describe, expect, it} from 'vitest'

import {computeFleetState, parseManifest, type FleetManifestEntry} from '../scripts/workflow-fleet-assert.ts'

// rm-2141 workflow-fleet state assertion (2026-10-21, repository-maintenance
// cycle:4 run 18ef6d162e3f439991a7b3c1a729cec0). The estate's chronic
// silent-failure class — a workflow silently disabled or re-enabled behind
// our backs, an active ghost running with no file in the tree, a scheduled
// workflow silently going stale — becomes a designed-red check: the manifest
// plus scripts/workflow-fleet-assert.ts (run by the audit.yaml fleet-state
// job) must fail loudly on every divergence class. These tests pin the pure
// comparison logic against synthetic fleets, including the exact live estate
// shapes probed at mint time (ghost lockfile-guard id 375606447 active with
// no file; fro-bot 330819996 disabled_manually; dynamic/dependabot
// unfiled).

const NOW = '2026-10-21T12:00:00.000Z'

const MANIFEST = `workflows:
  - path: .github/workflows/main.yaml
    expected_state: active
    run_recency_hours: null
  - path: .github/workflows/weekly.yaml
    expected_state: active
    run_recency_hours: 192
  - path: .github/workflows/lockfile-guard.yaml
    id: 375606447
    expected_state: retired
    run_recency_hours: null
`

const TREE = [
  '.github/workflows/main.yaml',
  '.github/workflows/weekly.yaml',
  '.github/workflows/other.yaml',
]

describe('parseManifest', () => {
  it('parses entries with optional id and null horizons', () => {
    const entries = parseManifest(MANIFEST)
    expect(entries).toHaveLength(3)
    expect(entries[0]).toEqual({path: '.github/workflows/main.yaml', expected_state: 'active', run_recency_hours: null})
    expect(entries[2]).toEqual({
      path: '.github/workflows/lockfile-guard.yaml',
      id: 375606447,
      expected_state: 'retired',
      run_recency_hours: null,
    })
  })

  it('rejects malformed manifests loudly', () => {
    expect(() => parseManifest('')).toThrow(/valid YAML|empty/)
    expect(() => parseManifest('workflows: []')).toThrow(/no workflows list/)
    expect(() => parseManifest('workflows:\n  - path: src/nope.yaml\n    expected_state: active\n    run_recency_hours: null\n')).toThrow(
      /\.github\/workflows\/ path/,
    )
    expect(() =>
      parseManifest('workflows:\n  - path: .github/workflows/x.yaml\n    expected_state: maybe\n    run_recency_hours: null\n'),
    ).toThrow(/expected_state/)
    expect(() =>
      parseManifest('workflows:\n  - path: .github/workflows/x.yaml\n    expected_state: active\n    run_recency_hours: soon\n'),
    ).toThrow(/run_recency_hours/)
  })
})

describe('computeFleetState — clean fleet', () => {
  it('zero divergences when every entry matches reality', () => {
    const verdict = computeFleetState({
      entries: parseManifest(MANIFEST),
      liveWorkflows: [
        {id: 1, path: '.github/workflows/main.yaml', state: 'active'},
        {id: 2, path: '.github/workflows/weekly.yaml', state: 'active'},
        {id: 375606447, path: '.github/workflows/lockfile-guard.yaml', state: 'disabled_manually'},
      ],
      treeFiles: TREE.slice(0, 2),
      latestRuns: {1: '2026-10-21T11:00:00.000Z', 2: '2026-10-20T04:13:00.000Z'},
      now: NOW,
    })
    expect(verdict).toEqual({asserted: 3, divergences: []})
  })

  it('a retired entry with the live workflow fully absent is clean too', () => {
    const verdict = computeFleetState({
      entries: parseManifest(MANIFEST),
      liveWorkflows: [
        {id: 1, path: '.github/workflows/main.yaml', state: 'active'},
        {id: 2, path: '.github/workflows/weekly.yaml', state: 'active'},
      ],
      treeFiles: TREE.slice(0, 2),
      latestRuns: {1: NOW, 2: NOW},
      now: NOW,
    })
    expect(verdict.divergences).toEqual([])
  })

  it('ignores GitHub-managed dynamic workflows outside .github/workflows/', () => {
    const verdict = computeFleetState({
      entries: parseManifest(MANIFEST),
      liveWorkflows: [
        {id: 1, path: '.github/workflows/main.yaml', state: 'active'},
        {id: 2, path: '.github/workflows/weekly.yaml', state: 'active'},
        {id: 375606447, path: '.github/workflows/lockfile-guard.yaml', state: 'disabled_manually'},
        {id: 99, path: 'dynamic/dependabot/dependabot-updates', state: 'active'},
      ],
      treeFiles: TREE.slice(0, 2),
      latestRuns: {1: NOW, 2: NOW},
      now: NOW,
    })
    expect(verdict.divergences).toEqual([])
  })
})

describe('computeFleetState — divergence classes', () => {
  it('state-mismatch: live disabled while expected active (the fro-bot shape)', () => {
    const verdict = computeFleetState({
      entries: parseManifest(MANIFEST),
      liveWorkflows: [{id: 1, path: '.github/workflows/main.yaml', state: 'disabled_manually'}],
      treeFiles: TREE.slice(0, 2),
      latestRuns: {},
      now: NOW,
    })
    expect(verdict.divergences.map(d => [d.kind, d.path])).toEqual([['state-mismatch', '.github/workflows/main.yaml']])
  })

  it('state-mismatch: ghost live-active while expected retired (the birth divergence)', () => {
    const verdict = computeFleetState({
      entries: parseManifest(MANIFEST),
      liveWorkflows: [
        {id: 375606447, path: '.github/workflows/lockfile-guard.yaml', state: 'active'},
      ],
      treeFiles: [],
      latestRuns: {},
      now: NOW,
    })
    const divergence = verdict.divergences.find(d => d.path === '.github/workflows/lockfile-guard.yaml')
    expect(divergence?.kind).toBe('state-mismatch')
    expect(divergence?.detail).toContain('375606447')
  })

  it('state-mismatch: retired entry whose file is still in the tree', () => {
    const verdict = computeFleetState({
      entries: parseManifest(MANIFEST),
      liveWorkflows: [],
      treeFiles: ['.github/workflows/lockfile-guard.yaml'],
      latestRuns: {},
      now: NOW,
    })
    const divergence = verdict.divergences.find(d => d.path === '.github/workflows/lockfile-guard.yaml')
    expect(divergence?.kind).toBe('state-mismatch')
    expect(divergence?.detail).toContain('still carries the file')
  })

  it('file-without-workflow: expected active but no live object exists', () => {
    const verdict = computeFleetState({
      entries: parseManifest(MANIFEST),
      liveWorkflows: [],
      treeFiles: TREE.slice(0, 2),
      latestRuns: {},
      now: NOW,
    })
    const kinds = verdict.divergences.filter(d => d.kind === 'file-without-workflow').map(d => d.path)
    expect(kinds).toEqual(['.github/workflows/main.yaml', '.github/workflows/weekly.yaml'])
  })

  it('active-without-file: live active workflow whose file is absent (expected active)', () => {
    const verdict = computeFleetState({
      entries: parseManifest(MANIFEST),
      liveWorkflows: [
        {id: 1, path: '.github/workflows/main.yaml', state: 'active'},
        {id: 2, path: '.github/workflows/weekly.yaml', state: 'active'},
      ],
      treeFiles: ['.github/workflows/weekly.yaml'],
      latestRuns: {1: NOW, 2: NOW},
      now: NOW,
    })
    const divergence = verdict.divergences.find(d => d.path === '.github/workflows/main.yaml')
    expect(divergence?.kind).toBe('active-without-file')
  })

  it('stale-run-list: newest run beyond the horizon', () => {
    const verdict = computeFleetState({
      entries: parseManifest(MANIFEST),
      liveWorkflows: [
        {id: 1, path: '.github/workflows/main.yaml', state: 'active'},
        {id: 2, path: '.github/workflows/weekly.yaml', state: 'active'},
      ],
      treeFiles: TREE.slice(0, 2),
      latestRuns: {1: NOW, 2: '2026-10-02T04:13:00.000Z'}, // 19.3d old vs 192h horizon
      now: NOW,
    })
    const divergence = verdict.divergences.find(d => d.path === '.github/workflows/weekly.yaml')
    expect(divergence?.kind).toBe('stale-run-list')
    expect(divergence?.detail).toContain('192h horizon')
  })

  it('stale-run-list: scheduled workflow with no runs at all', () => {
    const verdict = computeFleetState({
      entries: parseManifest(MANIFEST),
      liveWorkflows: [
        {id: 1, path: '.github/workflows/main.yaml', state: 'active'},
        {id: 2, path: '.github/workflows/weekly.yaml', state: 'active'},
      ],
      treeFiles: TREE.slice(0, 2),
      latestRuns: {1: NOW},
      now: NOW,
    })
    expect(verdict.divergences.map(d => [d.kind, d.path])).toEqual([
      ['stale-run-list', '.github/workflows/weekly.yaml'],
    ])
  })

  it('null-horizon entries never produce staleness (push-triggered workflows)', () => {
    const verdict = computeFleetState({
      entries: parseManifest(MANIFEST),
      liveWorkflows: [{id: 1, path: '.github/workflows/main.yaml', state: 'active'}],
      treeFiles: ['.github/workflows/main.yaml'],
      latestRuns: {},
      now: NOW,
    })
    expect(verdict.divergences.filter(d => d.path === '.github/workflows/main.yaml')).toEqual([])
  })

  it('unmanifested: live file-backed workflow with no manifest entry', () => {
    const verdict = computeFleetState({
      entries: [],
      liveWorkflows: [{id: 1, path: '.github/workflows/main.yaml', state: 'active'}],
      treeFiles: ['.github/workflows/main.yaml'],
      latestRuns: {},
      now: NOW,
    })
    expect(verdict.divergences.map(d => [d.kind, d.path])).toEqual([
      ['unmanifested', '.github/workflows/main.yaml'],
    ])
  })

  it('unmanifested: tree file with no entry and no live workflow', () => {
    const verdict = computeFleetState({
      entries: [],
      liveWorkflows: [],
      treeFiles: ['.github/workflows/main.yaml'],
      latestRuns: {},
      now: NOW,
    })
    expect(verdict.divergences.map(d => [d.kind, d.path])).toEqual([
      ['unmanifested', '.github/workflows/main.yaml'],
    ])
  })
})

describe('computeFleetState — the live estate at mint time', () => {
  it('reports exactly the known fro-bot + ghost divergences for the probed fleet', () => {
    // Live shapes probed 2026-10-21 (assess phase): 14 file-backed workflows
    // all active EXCEPT fro-bot disabled_manually (expected active here), the
    // ghost lockfile-guard id 375606447 active with no file (expected
    // retired), and dynamic/dependabot out of scope.
    const entries: FleetManifestEntry[] = [
      {path: '.github/workflows/fro-bot.yaml', expected_state: 'active', run_recency_hours: 48},
      {path: '.github/workflows/lockfile-guard.yaml', id: 375606447, expected_state: 'retired', run_recency_hours: null},
    ]
    const verdict = computeFleetState({
      entries,
      liveWorkflows: [
        {id: 330819996, path: '.github/workflows/fro-bot.yaml', state: 'disabled_manually'},
        {id: 375606447, path: '.github/workflows/lockfile-guard.yaml', state: 'active'},
        {id: 42, path: 'dynamic/dependabot/dependabot-updates', state: 'active'},
      ],
      treeFiles: ['.github/workflows/fro-bot.yaml'],
      latestRuns: {},
      now: NOW,
    })
    expect(verdict.divergences.map(d => [d.kind, d.path])).toEqual([
      ['state-mismatch', '.github/workflows/fro-bot.yaml'],
      ['state-mismatch', '.github/workflows/lockfile-guard.yaml'],
    ])
  })
})
