/**
 * Test suite for scripts/actions-cache-prune.ts (rm-278).
 *
 * Covers the pure policy core only — the plan builder and census grouping.
 * The `gh api` surface is exercised live in dry-run by the runbook probe, not
 * here (no test in this repo reaches the GitHub API).
 *
 * Covers:
 * - Keep-invariant: `opencode-` caches are never planned for deletion, even
 *   when they are old and match nothing else.
 * - Keep-invariant: a prune prefix overlapping a protected prefix is refused
 *   by the plan builder only if it would actually leak a protected key.
 * - Age filter: fresh target-prefix caches are skipped; stale ones pruned.
 * - Prefix filter: only requested prefixes are pruned.
 * - Byte accounting: pruneBytes equals the sum of planned sizes.
 * - Census grouping: counts/bytes grouped by first key segment, sorted by
 *   bytes descending.
 */

import {describe, expect, it} from 'vitest'

import {censusByPrefix, conflictsWithProtected, planPrune} from '../scripts/actions-cache-prune.ts'

const NOW = Date.parse('2026-10-01T12:00:00Z')
const nowMs = () => NOW

function cache(key: string, {ageDays = 30, bytes = 1024 ** 3, id = 1}: {ageDays?: number; bytes?: number; id?: number} = {}) {
  return {
    cache_id: id,
    key,
    created_at: new Date(NOW - ageDays * 24 * 60 * 60 * 1000).toISOString(),
    size_in_bytes: bytes,
  }
}

describe('planPrune keep-invariant', () => {
  it('never plans opencode- caches for deletion, however old', () => {
    const plan = planPrune({
      caches: [cache('opencode-abc', {ageDays: 400, id: 1}), cache('opencode-repaired-db', {ageDays: 400, id: 2})],
      nowMs,
    })
    expect(plan.toDelete).toEqual([])
    expect(plan.protectedKept).toBe(2)
    expect(plan.kept).toHaveLength(2)
  })

  it('keeps opencode- caches even when a caller passes an overlapping prune prefix', () => {
    // 'o' would prefix-match 'opencode-'; the plan builder must still keep
    // every protected cache out of the deletion set.
    const plan = planPrune({
      caches: [cache('opencode-abc', {ageDays: 400, id: 1}), cache('old-stuff-xyz', {ageDays: 400, id: 2})],
      prunePrefixes: ['o'],
      nowMs,
    })
    expect(plan.toDelete.map(entry => entry.key)).toEqual(['old-stuff-xyz'])
    expect(plan.protectedKept).toBe(1)
  })

  it('hard-protects opencode- even when passed as an explicit prune prefix', () => {
    // The module constant is applied on top of any arguments: routing keeps
    // the protected cache out of the deletion set, so the in-plan fail-closed
    // assertion never has to fire via public inputs.
    const plan = planPrune({
      caches: [cache('opencode-abc', {ageDays: 400, id: 1})],
      prunePrefixes: ['opencode-'],
      protectedPrefixes: [],
      nowMs,
    })
    expect(plan.toDelete).toEqual([])
    expect(plan.protectedKept).toBe(1)
  })
})

describe('conflictsWithProtected', () => {
  it('flags exact, shorter, and longer overlaps with protected prefixes', () => {
    expect(conflictsWithProtected(['opencode-'])).toEqual(['opencode-'])
    expect(conflictsWithProtected(['o'])).toEqual(['o'])
    expect(conflictsWithProtected(['opencode-extra-long'])).toEqual(['opencode-extra-long'])
  })

  it('passes the default prune prefixes and unrelated families', () => {
    expect(conflictsWithProtected(['node-', 'codeql-', 'cache-', 'trivy-'])).toEqual([])
    expect(conflictsWithProtected(['node-'])).toEqual([])
  })
})

describe('planPrune policy', () => {
  it('prunes stale caches under the default target prefixes', () => {
    const plan = planPrune({
      caches: [
        cache('node-abc', {ageDays: 30, bytes: 100, id: 1}),
        cache('codeql-xyz', {ageDays: 30, bytes: 200, id: 2}),
      ],
      nowMs,
    })
    expect(plan.toDelete.map(entry => entry.key).sort()).toEqual(['codeql-xyz', 'node-abc'])
    expect(plan.pruneBytes).toBe(300)
  })

  it('skips fresh target caches (default 7-day floor)', () => {
    const plan = planPrune({caches: [cache('node-fresh', {ageDays: 2, id: 1})], nowMs})
    expect(plan.toDelete).toEqual([])
    expect(plan.skippedFresh).toBe(1)
  })

  it('honors a custom age floor of 0 days', () => {
    const plan = planPrune({caches: [cache('node-fresh', {ageDays: 0, id: 1})], olderThanDays: 0, nowMs})
    expect(plan.toDelete.map(entry => entry.key)).toEqual(['node-fresh'])
  })

  it('prunes only requested prefixes', () => {
    const plan = planPrune({
      caches: [cache('node-abc', {ageDays: 30, id: 1}), cache('trivy-abc', {ageDays: 30, id: 2})],
      prunePrefixes: ['trivy-'],
      nowMs,
    })
    expect(plan.toDelete.map(entry => entry.key)).toEqual(['trivy-abc'])
    expect(plan.kept.map(entry => entry.key)).toEqual(['node-abc'])
  })

  it('exact-day boundary: exactly olderThanDays old is kept (strictly older is pruned)', () => {
    const exactlyOld = cache('node-edge', {ageDays: 7, id: 1})
    const oneSecondOlder = {
      ...cache('node-edge2', {ageDays: 7, id: 2}),
      created_at: new Date(NOW - 7 * 24 * 60 * 60 * 1000 - 1000).toISOString(),
    }
    const plan = planPrune({caches: [exactlyOld, oneSecondOlder], nowMs})
    expect(plan.toDelete.map(entry => entry.key)).toEqual(['node-edge2'])
  })
})

describe('censusByPrefix', () => {
  it('groups counts and bytes by first key segment, largest first', () => {
    const groups = censusByPrefix([
      cache('node-a', {bytes: 100, id: 1}),
      cache('node-b', {bytes: 50, id: 2}),
      cache('codeql-c', {bytes: 900, id: 3}),
      cache('opencode-d', {bytes: 5, id: 4}),
    ])
    expect(groups).toEqual([
      ['codeql-', {count: 1, bytes: 900}],
      ['node-', {count: 2, bytes: 150}],
      ['opencode-', {count: 1, bytes: 5}],
    ])
  })
})
