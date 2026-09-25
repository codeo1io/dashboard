/**
 * File-backed SnapshotStore (rm-198).
 *
 * Pins the fail-open contract of createFileSnapshotStore: the boot-time
 * bridge must never break the dashboard because of a bad cache file —
 * missing/corrupt/oversize/malformed inputs all yield null (empty boot),
 * persistence is best-effort, atomic (tmp + rename), and size-bounded.
 */

import type {AggregatorSnapshot, DashboardRepo, SnapshotStore} from '../src/github/aggregator.ts'

import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
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

  it('persist is atomic — no .tmp residue after a clean write', () => {
    const {store, file} = makeStore()
    store.persist(makeSnapshot())
    expect(readFileSync(file, 'utf8')).toBe(JSON.stringify(makeSnapshot()))
    expect(() => readFileSync(`${file}.tmp`, 'utf8')).toThrow()
  })
})
