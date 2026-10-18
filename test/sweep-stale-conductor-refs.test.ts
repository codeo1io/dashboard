/**
 * rm-742 — stale conductor/* validation-ref sweep selection (fixture unit
 * tests). Pins the pure selection/parsing core of
 * scripts/sweep-stale-conductor-refs.ts:
 * 1. namespace containment (only conductor/ci-*, conductor/ci-base-* and
 *    conductor/run-* — never main, never conductor branches outside the
 *    ephemeral namespaces, never conductor/visual-*);
 * 2. the age cutoff (stale = newest commit older than --cutoff-days);
 * 3. --exclude globs protecting named refs from deletion;
 * 4. for-each-ref output parsing (temp-namespace → origin-ref mapping);
 * 5. dry-run is the DEFAULT posture — apply never happens implicitly (the
 *    CLI wrapper's --apply gate is reviewed in code; these tests pin the
 *    selection it would apply).
 */
import {describe, expect, it} from 'vitest'
import {
  DEFAULT_CUTOFF_DAYS,
  isInSweepNamespace,
  matchGlob,
  parseForEachRef,
  selectStaleRefs,
  type ConductorRef,
} from '../scripts/sweep-stale-conductor-refs.ts'

const DAY_MS = 86_400_000
const NOW = Date.UTC(2026, 9, 8, 12, 0, 0) // 2026-10-08T12:00Z

const ref = (name: string, daysAgo: number, email = 'conductor@example.com'): ConductorRef => ({
  ref: name,
  sha: 'a'.repeat(40),
  committerDateUnix: Math.floor((NOW - daysAgo * DAY_MS) / 1000),
  committerEmail: email,
})

describe('rm-742: namespace containment', () => {
  it('accepts both ephemeral validation namespaces', () => {
    expect(isInSweepNamespace('refs/heads/conductor/ci-20261001-abc')).toBe(true)
    expect(isInSweepNamespace('refs/heads/conductor/ci-base-20261001-abc')).toBe(true)
  })

  it('accepts the run- namespace too (rm-2004 — the dominant live residue fleet)', () => {
    expect(isInSweepNamespace('refs/heads/conductor/run-00f7bf29ef2a')).toBe(true)
    expect(isInSweepNamespace('refs/heads/conductor/run-528f458d245a')).toBe(true)
  })

  it('rejects everything else — main, visual capture, other conductor branches, tags', () => {
    expect(isInSweepNamespace('refs/heads/main')).toBe(false)
    // rm-2004's recorded decision: visual-baseline capture refs are long-lived
    // artifacts by design, NOT <1d validation residue — excluded, not silently
    // uncovered.
    expect(isInSweepNamespace('refs/heads/conductor/visual-capture-9698b395')).toBe(false)
    expect(isInSweepNamespace('refs/heads/renovate/pnpm-12')).toBe(false)
    expect(isInSweepNamespace('refs/tags/2026.08.15')).toBe(false)
    // Near-miss: the ci- prefix must be exact, not merely contained.
    expect(isInSweepNamespace('refs/heads/conductor/x-ci-thing')).toBe(false)
    // Near-miss: runs- is not the run- namespace.
    expect(isInSweepNamespace('refs/heads/conductor/runs-thing')).toBe(false)
  })

  it('selectStaleRefs never returns an out-of-namespace ref however old', () => {
    const candidates = selectStaleRefs(
      [ref('refs/heads/main', 400), ref('refs/heads/conductor/ci-old', 400)],
      NOW,
      14,
    )
    expect(candidates.map(candidate => candidate.ref)).toEqual(['refs/heads/conductor/ci-old'])
  })
})

describe('rm-2004: run- namespace sweep selection', () => {
  it('stale run- refs are candidates; fresh ones and out-of-namespace visuals are not', () => {
    const candidates = selectStaleRefs(
      [
        ref('refs/heads/conductor/run-00f7bf29ef2a', 30),
        ref('refs/heads/conductor/run-1108172d68c2', 2),
        ref('refs/heads/conductor/visual-capture-9698b395', 400),
      ],
      NOW,
      DEFAULT_CUTOFF_DAYS,
    )
    expect(candidates.map(candidate => candidate.ref)).toEqual([
      'refs/heads/conductor/run-00f7bf29ef2a',
    ])
  })

  it('an exact-name exclude still protects a named run- ref (the --exclude escape hatch)', () => {
    const candidates = selectStaleRefs(
      [ref('refs/heads/conductor/run-keep', 30), ref('refs/heads/conductor/run-drop', 30)],
      NOW,
      14,
      ['refs/heads/conductor/run-keep'],
    )
    expect(candidates.map(candidate => candidate.ref)).toEqual(['refs/heads/conductor/run-drop'])
  })
})

describe('rm-742: age cutoff', () => {
  it('refs older than the cutoff are candidates; fresh ones never are', () => {
    const candidates = selectStaleRefs(
      [ref('refs/heads/conductor/ci-1', 30), ref('refs/heads/conductor/ci-2', 2), ref('refs/heads/conductor/ci-base-3', 20)],
      NOW,
      DEFAULT_CUTOFF_DAYS,
    )
    expect(candidates.map(candidate => candidate.ref)).toEqual([
      'refs/heads/conductor/ci-1',
      'refs/heads/conductor/ci-base-3',
    ])
    expect(candidates[0]?.ageDays).toBe(30)
  })

  it('the boundary day itself is NOT stale (age == cutoff is within the window)', () => {
    const candidates = selectStaleRefs([ref('refs/heads/conductor/ci-edge', 14)], NOW, 14)
    expect(candidates).toEqual([])
  })

  it('a custom --cutoff-days widens the window', () => {
    const candidates = selectStaleRefs([ref('refs/heads/conductor/ci-1', 30)], NOW, 60)
    expect(candidates).toEqual([])
  })

  it('output is oldest-first for readable review', () => {
    const candidates = selectStaleRefs(
      [ref('refs/heads/conductor/ci-newer', 20), ref('refs/heads/conductor/ci-older', 40)],
      NOW,
      14,
    )
    expect(candidates.map(candidate => candidate.ref)).toEqual(['refs/heads/conductor/ci-older', 'refs/heads/conductor/ci-newer'])
  })
})

describe('rm-742: --exclude protection', () => {
  it('an exact-name exclude protects that ref while other stale refs sweep', () => {
    const candidates = selectStaleRefs(
      [ref('refs/heads/conductor/ci-keep', 30), ref('refs/heads/conductor/ci-drop', 30)],
      NOW,
      14,
      ['refs/heads/conductor/ci-keep'],
    )
    expect(candidates.map(candidate => candidate.ref)).toEqual(['refs/heads/conductor/ci-drop'])
  })

  it('a glob exclude protects a whole family', () => {
    const candidates = selectStaleRefs(
      [
        ref('refs/heads/conductor/ci-base-2026-09-01-aaa', 30),
        ref('refs/heads/conductor/ci-base-2026-09-02-bbb', 30),
        ref('refs/heads/conductor/ci-run-ccc', 30),
      ],
      NOW,
      14,
      ['refs/heads/conductor/ci-base-2026-09-*'],
    )
    expect(candidates.map(candidate => candidate.ref)).toEqual(['refs/heads/conductor/ci-run-ccc'])
  })

  it('matchGlob: `*` spans path segments, `?` is one char, literals are literal', () => {
    expect(matchGlob('refs/heads/conductor/ci-base-x', 'refs/heads/conductor/ci-base-*')).toBe(true)
    expect(matchGlob('refs/heads/conductor/ci-base-x', 'refs/heads/conductor/ci-?ase-x')).toBe(true)
    expect(matchGlob('refs/heads/conductor/ci-run', 'refs/heads/conductor/ci-base-*')).toBe(false)
  })
})

describe('rm-742: for-each-ref parsing (temp namespace → origin ref)', () => {
  it('maps temp-namespace rows back to their origin ref names', () => {
    const date = Math.floor((NOW - 30 * DAY_MS) / 1000)
    const sha = 'b'.repeat(40)
    const parsed = parseForEachRef(
      `refs/conductor-sweep/conductor/ci-20261001-abc ${sha} ${date} Conductor <conductor@example.com>\n` +
      `refs/conductor-sweep/conductor/ci-base-20261001-def ${sha} ${date} <bot@example.com>\n` +
      `refs/conductor-sweep/conductor/run-00f7bf29ef2a ${sha} ${date} <bot@example.com>\n`,
    )
    expect(parsed.map(entry => entry.ref)).toEqual([
      'refs/heads/conductor/ci-20261001-abc',
      'refs/heads/conductor/ci-base-20261001-def',
      'refs/heads/conductor/run-00f7bf29ef2a',
    ])
    expect(parsed[0]?.committerEmail).toBe('Conductor <conductor@example.com>')
    expect(parsed[0]?.sha).toBe(sha)
    expect(parsed[0]?.committerDateUnix).toBe(date)
  })

  it('skips malformed rows (bad sha, non-numeric date) instead of throwing', () => {
    const parsed = parseForEachRef(
      `refs/conductor-sweep/conductor/ci-x notasha 123 <a@b.c>\n` +
      `refs/conductor-sweep/conductor/ci-y ${'c'.repeat(40)} nodate <a@b.c>\n`,
    )
    expect(parsed).toEqual([])
  })

  it('rows outside the temp namespace are ignored', () => {
    const parsed = parseForEachRef(`refs/heads/conductor/ci-z ${'d'.repeat(40)} 100 <a@b.c>`)
    expect(parsed).toEqual([])
  })
})
