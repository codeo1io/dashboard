/**
 * File-backed SnapshotStore (rm-198).
 *
 * Pins the fail-open contract of createFileSnapshotStore: the boot-time
 * bridge must never break the dashboard because of a bad cache file —
 * missing/corrupt/oversize/malformed inputs all yield null (empty boot),
 * persistence is best-effort, atomic (tmp + rename), and size-bounded.
 */

import type {AggregatorSnapshot, DashboardRepo, SnapshotStore} from '../src/github/aggregator.ts'

import {Buffer} from 'node:buffer'
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import fc from 'fast-check'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {createFileSnapshotStore, logPersistProblem} from '../src/github/snapshot-store.ts'
import {logger} from '../src/logger.ts'

// node:fs exports a frozen namespace, so rm-759's ordering proof mocks the
// module with a passthrough-wrapped readFileSync (every other export is the
// real one; readFileSync behaves identically until a test overrides it).
vi.mock('node:fs', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {...actual, readFileSync: vi.fn(actual.readFileSync)}
})

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

  it('persist is atomic — no .tmp residue after a clean write', () => {
    const {store, file} = makeStore()
    store.persist(makeSnapshot())
    expect(readFileSync(file, 'utf8')).toBe(JSON.stringify(makeSnapshot()))
    expect(() => readFileSync(`${file}.tmp`, 'utf8')).toThrow()
  })
})

describe('createFileSnapshotStore — size bound measures UTF-8 bytes, not UTF-16 code units (rm-701)', () => {
  const dirs: string[] = []
  const CAP = 1_048_576 // mirrors MAX_SNAPSHOT_BYTES (bytes, not code units)

  function makeStore(): {store: SnapshotStore; file: string} {
    const dir = mkdtempSync(join(tmpdir(), 'snapshot-store-rm701-'))
    dirs.push(dir)
    const file = join(dir, 'snapshot.json')
    return {store: createFileSnapshotStore(file) as SnapshotStore, file}
  }

  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, {recursive: true, force: true})
  })

  const bytes = (value: string): number => Buffer.byteLength(value, 'utf8')

  it('a file exactly at the cap still loads (inclusive byte bound)', () => {
    const {store, file} = makeStore()
    const base = JSON.stringify(makeSnapshot())
    expect(bytes(base)).toBeLessThan(CAP)
    // JSON tolerates trailing whitespace, so spaces pad to an exact byte size.
    writeFileSync(file, base + ' '.repeat(CAP - bytes(base)), 'utf8')
    expect(store.load()).not.toBeNull()
  })

  it('a file one byte over the cap is rejected', () => {
    const {store, file} = makeStore()
    writeFileSync(file, JSON.stringify(makeSnapshot()) + ' '.repeat(CAP + 1 - bytes(JSON.stringify(makeSnapshot()))), 'utf8')
    expect(store.load()).toBeNull()
  })

  it('load: CJK snapshot over the byte cap but under the code-unit cap is rejected (the rm-701 defect)', () => {
    const {store, file} = makeStore()
    // Pad INSIDE the JSON so the rejection can only come from the size check —
    // padding outside would fail JSON.parse under both old and new code.
    const padChars = Math.ceil((CAP + 32 - bytes(JSON.stringify(makeSnapshot()))) / 3)
    const snapshot: AggregatorSnapshot = {
      ...makeSnapshot(),
      repos: [{...makeRepoRow(), name: '倉'.repeat(padChars)}],
    }
    const serialized = JSON.stringify(snapshot)
    expect(bytes(serialized)).toBeGreaterThan(CAP)
    expect(serialized.length).toBeLessThan(CAP) // String.length would have let this through
    writeFileSync(file, serialized, 'utf8')
    expect(store.load()).toBeNull()
  })

  it('rm-802: the post-read byte bound logs the numeric size (structured payload, not a flattened object)', () => {
    const {store, file} = makeStore()
    // The stat gate passes on a small on-disk file; readFileSync is mocked to
    // return a payload that grew past the byte cap between stat and read —
    // the only path that exercises the post-read bound (the TOCTOU guard).
    writeFileSync(file, 'tiny', 'utf8')
    const readMock = vi.mocked(readFileSync)
    readMock.mockReturnValueOnce('x'.repeat(CAP + 1))
    const warnSpy = vi.spyOn(logger, 'warning')
    try {
      expect(store.load()).toBeNull()
      expect(warnSpy).toHaveBeenCalledTimes(1)
      const record = warnSpy.mock.calls[0]?.[1]
      expect(record).toBeDefined()
      expect(record?.bytes, 'the byte count must land as a numeric field, not a flattened object').toBe(CAP + 1)
      expect(record?.error).toBeUndefined()
    } finally {
      warnSpy.mockRestore()
      readMock.mockReset()
    }
  })

  it('persist: CJK snapshot over the byte cap but under the code-unit cap is not written', () => {
    const {store, file} = makeStore()
    const padChars = Math.ceil((CAP + 32 - bytes(JSON.stringify(makeSnapshot()))) / 3)
    const snapshot: AggregatorSnapshot = {
      ...makeSnapshot(),
      repos: [{...makeRepoRow(), name: '倉'.repeat(padChars)}],
    }
    const serialized = JSON.stringify(snapshot)
    expect(bytes(serialized)).toBeGreaterThan(CAP)
    expect(serialized.length).toBeLessThan(CAP)
    store.persist(snapshot)
    expect(() => readFileSync(file, 'utf8')).toThrow()
  })

  it('property: astral/CJK payloads at the boundary load iff at or under the byte cap, and round-trip under it', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(fc.integer({min: 0x4E00, max: 0x9FFF}), fc.integer({min: 0x10000, max: 0x10FFFF})),
          {maxLength: 60},
        ).map(cps => String.fromCodePoint(...cps)),
        fc.integer({min: CAP - 4, max: CAP + 4}),
        (name, target) => {
          const dir = mkdtempSync(join(tmpdir(), 'snapshot-store-rm701-prop-'))
          try {
            const file = join(dir, 'snapshot.json')
            const snapshot: AggregatorSnapshot = {
              ...makeSnapshot(),
              repos: [{...makeRepoRow(), name}],
            }
            const base = JSON.stringify(snapshot)
            const payload = target > bytes(base) ? base + ' '.repeat(target - bytes(base)) : base
            writeFileSync(file, payload, 'utf8')
            const store = createFileSnapshotStore(file) as SnapshotStore
            const loaded = store.load()
            if (bytes(payload) <= CAP) {
              expect(loaded).not.toBeNull()
              // Under the cap the store must still round-trip the payload.
              const roundTripped = JSON.stringify(loaded)
              expect(bytes(roundTripped)).toBeLessThanOrEqual(CAP)
              expect((loaded as AggregatorSnapshot).repos[0]?.name).toBe(name)
            } else {
              expect(loaded).toBeNull()
            }
          } finally {
            rmSync(dir, {recursive: true, force: true})
          }
        },
      ),
      {numRuns: 40},
    )
  })
})

describe('createFileSnapshotStore — size gate fires before the read (rm-759)', () => {
  const dirs: string[] = []

  function makeStore(): {store: SnapshotStore; file: string} {
    const dir = mkdtempSync(join(tmpdir(), 'snapshot-store-rm759-'))
    dirs.push(dir)
    const file = join(dir, 'snapshot.json')
    return {store: createFileSnapshotStore(file) as SnapshotStore, file}
  }

  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, {recursive: true, force: true})
  })

  it('an oversize file is rejected WITHOUT buffering it — readFileSync never runs', () => {
    const {store, file} = makeStore()
    // A tampered on-disk file above the cap: the pre-cure implementation
    // read the WHOLE thing into memory before rejecting it at the byte bound.
    writeFileSync(file, 'x'.repeat(1_048_577), 'utf8')
    const readMock = vi.mocked(readFileSync)
    readMock.mockImplementation(() => {
      throw new Error('readFileSync must not run for an oversize cache')
    })
    try {
      expect(store.load()).toBeNull()
    } finally {
      readMock.mockReset()
    }
  })

  it('rm-802: the stat-side size gate logs the numeric size (structured payload, not a flattened object)', () => {
    const {store, file} = makeStore()
    writeFileSync(file, 'x'.repeat(1_048_577), 'utf8')
    const warnSpy = vi.spyOn(logger, 'warning')
    try {
      expect(store.load()).toBeNull()
      expect(warnSpy).toHaveBeenCalledTimes(1)
      const record = warnSpy.mock.calls[0]?.[1]
      expect(record).toBeDefined()
      expect(record?.bytes, 'the byte count must land as a numeric field, not a flattened object').toBe(1_048_577)
      expect(record?.error).toBeUndefined()
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('an at-cap file still reads — the stat gate is inclusive, and the read count is exactly one', () => {
    const {store, file} = makeStore()
    const base = JSON.stringify(makeSnapshot())
    const CAP = 1_048_576
    writeFileSync(file, base + ' '.repeat(CAP - Buffer.byteLength(base, 'utf8')), 'utf8')
    const readMock = vi.mocked(readFileSync)
    readMock.mockClear()
    try {
      expect(store.load()).not.toBeNull()
      expect(readMock).toHaveBeenCalledTimes(1)
    } finally {
      readMock.mockReset()
    }
  })
})

describe('logPersistProblem — payload cannot shadow context keys (rm-880)', () => {
  it('drops payload path/error while keeping the context path and surviving fields', () => {
    const warnSpy = vi.spyOn(logger, 'warning').mockImplementation(() => {})
    try {
      logPersistProblem('persist problem', '/truth/cache.json', {
        path: '/shadow/path.json',
        error: 'shadow-error',
        bytes: 4096,
      })
      expect(warnSpy).toHaveBeenCalledTimes(1)
      const [message, fields] = warnSpy.mock.calls[0] ?? []
      expect(message).toBe('persist problem')
      expect(fields).toEqual({path: '/truth/cache.json', bytes: 4096})
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('Error details still land as the scalar error field, path preserved', () => {
    const warnSpy = vi.spyOn(logger, 'warning').mockImplementation(() => {})
    try {
      logPersistProblem('persist problem', '/truth/cache.json', new Error('disk on fire'))
      expect(warnSpy).toHaveBeenCalledTimes(1)
      const [, fields] = warnSpy.mock.calls[0] ?? []
      expect(fields).toEqual({path: '/truth/cache.json', error: 'disk on fire'})
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('scalar details stringify into the error field, path preserved', () => {
    const warnSpy = vi.spyOn(logger, 'warning').mockImplementation(() => {})
    try {
      logPersistProblem('persist problem', '/truth/cache.json', 'raw message')
      expect(warnSpy).toHaveBeenCalledTimes(1)
      const [, fields] = warnSpy.mock.calls[0] ?? []
      expect(fields).toEqual({path: '/truth/cache.json', error: 'raw message'})
    } finally {
      warnSpy.mockRestore()
    }
  })
})

/**
 * rm-1512 (adopted from lane 43cf6bc3 cycle:3): write a state file carrying the given annotation so
 * the loader sees exactly the mangled/well-formed shape under test.
 */
function writeCache(file: string, annotation: unknown): void {
  writeFileSync(file, JSON.stringify({...makeSnapshot(), platformStatus: annotation}), 'utf8')
}

describe('createFileSnapshotStore — platformStatus shape validation (rm-1512)', () => {
  const dirs: string[] = []

  function makeStore(): {store: SnapshotStore; file: string} {
    const dir = mkdtempSync(join(tmpdir(), 'snapshot-store-rm1500-'))
    dirs.push(dir)
    const file = join(dir, 'snapshot.json')
    return {store: createFileSnapshotStore(file) as SnapshotStore, file}
  }

  // The rm-1447 annotation is serve-time only — persist() never writes it —
  // but the field rides AggregatorSnapshot, so a cache that carries it (a
  // future writer, a hand-repaired state file) is shape-checked: mangled →
  // null (fail closed, like every other shape rejection here), well-formed →
  // loads. Absence stays valid — that is the only shape the current persist
  // path produces, covered by every round-trip test above.

  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, {recursive: true, force: true})
  })

  it('a well-formed annotation loads (boundary: overall may be the fallback \'unknown\', actions null, empty description)', () => {
    const {store, file} = makeStore()
    const snapshot: AggregatorSnapshot = {
      ...makeSnapshot(),
      platformStatus: {overall: 'unknown', overallDescription: '', actions: null, fetchedAt: 1_761_234_567_890},
    }
    writeFileSync(file, JSON.stringify(snapshot), 'utf8')
    expect(store.load()).toEqual(snapshot)
  })

  it('a well-formed annotation with a real indicator + component status loads', () => {
    const {store, file} = makeStore()
    const snapshot: AggregatorSnapshot = {
      ...makeSnapshot(),
      platformStatus: {
        overall: 'major',
        overallDescription: 'Elevated error rates across Actions',
        actions: 'major_outage',
        fetchedAt: 123.5,
      },
    }
    writeFileSync(file, JSON.stringify(snapshot), 'utf8')
    expect(store.load()).toEqual(snapshot)
  })

  it('annotation with a non-string overall → null (fail closed)', () => {
    const {store, file} = makeStore()
    writeCache(file, {overall: 3, overallDescription: 'x', actions: null, fetchedAt: 1})
    expect(store.load()).toBeNull()
  })

  it('annotation with an empty-string overall → null', () => {
    const {store, file} = makeStore()
    writeCache(file, {overall: '', overallDescription: 'x', actions: null, fetchedAt: 1})
    expect(store.load()).toBeNull()
  })

  it('annotation missing overallDescription → null', () => {
    const {store, file} = makeStore()
    writeCache(file, {overall: 'minor', actions: null, fetchedAt: 1})
    expect(store.load()).toBeNull()
  })

  it('annotation with a component status outside the vocabulary → null', () => {
    const {store, file} = makeStore()
    // 'on_fire' looks plausible but platform-status.ts can never emit it
    writeCache(file, {overall: 'minor', overallDescription: 'x', actions: 'on_fire', fetchedAt: 1})
    expect(store.load()).toBeNull()
  })

  it('annotation with a non-null non-string actions → null', () => {
    const {store, file} = makeStore()
    writeCache(file, {overall: 'minor', overallDescription: 'x', actions: 42, fetchedAt: 1})
    expect(store.load()).toBeNull()
  })

  it('annotation with a non-number fetchedAt → null', () => {
    const {store, file} = makeStore()
    writeCache(file, {overall: 'minor', overallDescription: 'x', actions: null, fetchedAt: 'now'})
    expect(store.load()).toBeNull()
  })

  it('annotation with a non-finite fetchedAt (JSON 1e999 → Infinity) → null', () => {
    const {store, file} = makeStore()
    writeFileSync(
      file,
      `${JSON.stringify(makeSnapshot()).slice(0, -1)},"platformStatus":{"overall":"minor","overallDescription":"x","actions":null,"fetchedAt":1e999}}`,
      'utf8',
    )
    expect(store.load()).toBeNull()
  })

  it('annotation null is off-type → null (the API DTO coalesces null itself; persisted null is corruption)', () => {
    const {store, file} = makeStore()
    writeCache(file, null)
    expect(store.load()).toBeNull()
  })

  it('annotation not an object → null', () => {
    const {store, file} = makeStore()
    writeCache(file, 'major')
    expect(store.load()).toBeNull()
  })
})
