/**
 * File-backed SnapshotStore (rm-198).
 *
 * Pins the fail-open contract of createFileSnapshotStore: the boot-time
 * bridge must never break the dashboard because of a bad cache file —
 * missing/corrupt/oversize/malformed inputs all yield null (empty boot),
 * persistence is best-effort, atomic (tmp + rename), and size-bounded.
 */

import type {AggregatorSnapshot, DashboardRepo, SnapshotStore} from '../src/github/aggregator.ts'

import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'
import {createFileSnapshotStore} from '../src/github/snapshot-store.ts'

function makeRepoRow(): DashboardRepo {
  return {
    node_id: 'R_kgDOFake',
    owner: 'fro-bot',
    name: 'agent',
    full_name: 'fro-bot/agent',
    discovery_channel: 'collab',
    status: {
      rollupState: 'green',
      failingChecks: 0,
      // Required since main's rm-192 failing-check drill-down landed (the
      // batch's tree pre-dates that interface widening).
      failingCheckDetails: [],
      openPrCount: 0,
      openIssueCount: 0,
      openAlertCount: null,
      stale: false,
      fetchedAt: 1234,
    },
  }
}

function makeSnapshot(): AggregatorSnapshot {
  return {
    repos: [makeRepoRow()],
    staleBanner: false,
    driftCount: 2,
    enumerationIncomplete: 0,
    refreshedAt: 4242,
    // Required since the cycle-9 rm-156 watchdog fields landed (interface
    // widening on AggregatorSnapshot — and isValidSnapshotShape rejects a
    // persisted snapshot without refreshDegraded, so the persist→load
    // round-trip below needs the fields present).
    refreshDurationMs: null,
    refreshDegraded: false,
  }
}

describe('createFileSnapshotStore — enablement', () => {
  it('returns undefined (disabled) for unset, empty, and blank paths', () => {
    expect(createFileSnapshotStore(undefined)).toBeUndefined()
    expect(createFileSnapshotStore('')).toBeUndefined()
    expect(createFileSnapshotStore('   ')).toBeUndefined()
  })

  it('returns a store for a real path', () => {
    expect(createFileSnapshotStore(join(tmpdir(), 'x.json'))).toBeDefined()
  })
})

describe('createFileSnapshotStore — load (fail-open)', () => {
  const dirs: string[] = []

  function makeStore(): {store: SnapshotStore; file: string} {
    const dir = mkdtempSync(join(tmpdir(), 'snapshot-store-'))
    dirs.push(dir)
    const file = join(dir, 'snapshot.json')
    return {store: createFileSnapshotStore(file) as SnapshotStore, file}
  }

  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, {recursive: true, force: true})
  })

  it('round-trips a persisted snapshot', () => {
    const {store, file} = makeStore()
    store.persist(makeSnapshot())
    expect(readFileSync(file, 'utf8')).toBe(JSON.stringify(makeSnapshot()))

    const loaded = store.load()
    expect(loaded).toEqual(makeSnapshot())
  })

  it('missing file → null (first boot)', () => {
    const {store} = makeStore()
    expect(store.load()).toBeNull()
  })

  it('corrupt JSON → null', () => {
    const {store, file} = makeStore()
    writeFileSync(file, '{"repos": [truncat', 'utf8')
    expect(store.load()).toBeNull()
  })

  it('valid JSON but wrong shape → null', () => {
    const {store, file} = makeStore()
    // Every field present but one repo row missing its identity keys
    writeFileSync(
      file,
      JSON.stringify({...makeSnapshot(), repos: [{owner: 'fro-bot'}]}),
      'utf8',
    )
    expect(store.load()).toBeNull()
  })

  it('oversize file → null (size-bounded)', () => {
    const {store, file} = makeStore()
    writeFileSync(file, JSON.stringify({...makeSnapshot(), driftCount: 0}) + ' '.repeat(1_048_577), 'utf8')
    expect(store.load()).toBeNull()
  })

  it('rm-604: astral-heavy payload within the UTF-16 limit but over the BYTE limit is rejected at persist and load', () => {
    const dir = mkdtempSync(join(tmpdir(), 'snapshot-store-rm604-'))
    const file = join(dir, 'snapshot.json')
    try {
      const store = createFileSnapshotStore(file) as SnapshotStore
      // '𝐀' (U+1D400) is ONE code point but TWO UTF-16 units and FOUR UTF-8
      // bytes — the old .length guard undercounted it 2x. 524 000 of them:
      // ≈1 048 000 UTF-16 units (inside the 1 048 576 bound the old guard
      // measured) but ≈2 096 000 bytes (far outside what the bound means).
      const astral = '𝐀'.repeat(524_000)
      const oversizeBytes = {...makeSnapshot(), driftCount: 0}
      oversizeBytes.repos = [{...makeRepoRow(), name: astral}]

      // Persist-side guard: no file may appear (old guard happily wrote ~2 MB).
      store.persist(oversizeBytes)
      expect(existsSync(file)).toBe(false)

      // Load-side guard: hand-place the oversize-bytes file; it must yield
      // null even though its .length is inside the old bound.
      writeFileSync(file, JSON.stringify(oversizeBytes), 'utf8')
      expect(store.load()).toBeNull()
    } finally {
      rmSync(dir, {recursive: true, force: true})
    }
  })

  it('rm-604 control: ASCII snapshots under the bound in both units round-trip unchanged', () => {
    const dir = mkdtempSync(join(tmpdir(), 'snapshot-store-rm604-ascii-'))
    const file = join(dir, 'snapshot.json')
    try {
      const store = createFileSnapshotStore(file) as SnapshotStore
      const snapshot = makeSnapshot() // ASCII: .length == byteLength, far under the bound
      store.persist(snapshot)
      expect(store.load()).toEqual(snapshot)
    } finally {
      rmSync(dir, {recursive: true, force: true})
    }
  })

  it('persist is atomic — no .tmp residue after a clean write', () => {
    const {store, file} = makeStore()
    store.persist(makeSnapshot())
    expect(readFileSync(file, 'utf8')).toBe(JSON.stringify(makeSnapshot()))
    expect(() => readFileSync(`${file}.tmp`, 'utf8')).toThrow()
  })
})
