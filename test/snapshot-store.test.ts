/**
 * File-backed SnapshotStore (rm-198).
 *
 * Pins the fail-open contract of createFileSnapshotStore: the boot-time
 * bridge must never break the dashboard because of a bad cache file —
 * missing/corrupt/oversize/malformed inputs all yield null (empty boot),
 * persistence is best-effort, atomic (tmp + rename), non-blocking (rm-902:
 * fs/promises publish path serialized through a promise chain), and
 * size-bounded.
 */

import type {AggregatorSnapshot, DashboardRepo, SnapshotStore} from '../src/github/aggregator.ts'

import {Buffer} from 'node:buffer'
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import fc from 'fast-check'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {createFileSnapshotStore} from '../src/github/snapshot-store.ts'

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

  it('round-trips a persisted snapshot', async () => {
    const {store, file} = makeStore()
    await store.persist(makeSnapshot())
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

  it('persist is atomic — no .tmp residue after a clean write', async () => {
    const {store, file} = makeStore()
    await store.persist(makeSnapshot())
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

  it('persist: CJK snapshot over the byte cap but under the code-unit cap is not written', async () => {
    const {store, file} = makeStore()
    const padChars = Math.ceil((CAP + 32 - bytes(JSON.stringify(makeSnapshot()))) / 3)
    const snapshot: AggregatorSnapshot = {
      ...makeSnapshot(),
      repos: [{...makeRepoRow(), name: '倉'.repeat(padChars)}],
    }
    const serialized = JSON.stringify(snapshot)
    expect(bytes(serialized)).toBeGreaterThan(CAP)
    expect(serialized.length).toBeLessThan(CAP)
    await store.persist(snapshot)
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

describe('createFileSnapshotStore — non-blocking atomic publish (rm-902)', () => {
  const dirs: string[] = []

  function makeStore(): {store: SnapshotStore; file: string} {
    const dir = mkdtempSync(join(tmpdir(), 'snapshot-store-rm902-'))
    dirs.push(dir)
    const file = join(dir, 'snapshot.json')
    return {store: createFileSnapshotStore(file) as SnapshotStore, file}
  }

  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, {recursive: true, force: true})
  })

  it('persist is non-blocking — the file is not on disk when persist returns', async () => {
    const {store, file} = makeStore()
    const pending = store.persist(makeSnapshot())
    expect(pending).toBeInstanceOf(Promise)
    // Synchronous code cannot be interrupted by the microtask that starts
    // the write, so the file is provably absent at return time.
    expect(() => readFileSync(file, 'utf8')).toThrow()
    await pending
    expect(readFileSync(file, 'utf8')).toBe(JSON.stringify(makeSnapshot()))
    expect(() => readFileSync(`${file}.tmp`, 'utf8')).toThrow()
  })

  it('serialized publishes land in order — the newest snapshot always wins, no tmp residue', async () => {
    const {store, file} = makeStore()
    const pendings: Promise<void>[] = []
    const expected: string[] = []
    for (let i = 0; i < 5; i++) {
      const snapshot = {...makeSnapshot(), driftCount: i}
      expected.push(JSON.stringify(snapshot))
      pendings.push(Promise.resolve(store.persist(snapshot)))
    }
    await Promise.all(pendings)
    expect(readFileSync(file, 'utf8')).toBe(expected[4])
    expect(() => readFileSync(`${file}.tmp`, 'utf8')).toThrow()
  })

  it('atomicity invariant under a concurrent reader — only complete snapshots are ever observable', async () => {
    const {store, file} = makeStore()
    // ~100KB payloads keep the writes on the thread pool long enough for
    // the reader loop to observe intermediate complete states.
    const pendings: Promise<void>[] = []
    const expected: string[] = []
    for (let i = 0; i < 8; i++) {
      const snapshot: AggregatorSnapshot = {
        ...makeSnapshot(),
        repos: [{...makeRepoRow(), name: `repo-${i}-${'x'.repeat(100_000)}`}],
      }
      expected.push(JSON.stringify(snapshot))
      pendings.push(Promise.resolve(store.persist(snapshot)))
    }
    let observations = 0
    let violations = 0
    const reader = (async () => {
      const deadline = Date.now() + 2_000
      for (;;) {
        await new Promise<void>(resolve => setImmediate(resolve))
        try {
          const raw = readFileSync(file, 'utf8')
          JSON.parse(raw)
          observations++
        } catch (error) {
          // ENOENT (before the first write) is fine; a present-but-unparseable
          // file would be a torn write leaking past the rename.
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') violations++
        }
        if (Date.now() >= deadline) break
      }
    })()
    await Promise.all(pendings)
    await reader
    expect(violations).toBe(0)
    expect(observations).toBeGreaterThan(0)
    expect(readFileSync(file, 'utf8')).toBe(expected[7])
    expect(() => readFileSync(`${file}.tmp`, 'utf8')).toThrow()
  })
})
