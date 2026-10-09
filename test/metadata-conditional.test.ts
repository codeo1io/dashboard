/**
 * rm-162 — conditional reads on the two production REST consumers:
 *
 * 1. the metadata contents read (fetchMetadataContents): If-None-Match from
 *    the stored ETag; 304 → cached decoded content unchanged, no decode, no
 *    store; 200 → decode + store {etag, content};
 * 2. the installation repo-list pagination (listInstallationReposPages):
 *    per-page ETags; a 304 page reuses cached items; a 200 refreshes;
 *    errors propagate to the caller's degraded-installation handling
 *    unchanged.
 *
 * All tests drive injectable request seams; no network. The metadata
 * fail-closed CONTRACT itself (err on transport failure etc.) is already
 * pinned in test/metadata.test.ts — what is pinned HERE is the conditional
 * behavior layered on top.
 */

import type {RestRequestFn} from '../src/github/conditional-reads.ts'

import {Buffer} from 'node:buffer'
import {describe, expect, it, vi} from 'vitest'
import {createConditionalContentCache} from '../src/github/conditional-reads.ts'
import {listInstallationReposPages} from '../src/github/installations.ts'
import {fetchMetadataContents, makeNotFoundError} from '../src/github/metadata.ts'

function b64(content: string): string {
  return Buffer.from(content, 'utf8').toString('base64')
}

function contents200(content: string, etag: string): Awaited<ReturnType<RestRequestFn>> {
  return {
    status: 200,
    data: {type: 'file', encoding: 'base64', content},
    headers: {etag},
  }
}

describe('fetchMetadataContents (conditional GET of metadata/repos.yaml)', () => {
  it('first read: no If-None-Match, decodes, stores {etag, content}', async () => {
    const cache = createConditionalContentCache(1)
    const request = vi.fn<(RestRequestFn)>().mockResolvedValue(contents200(b64('repos: []'), '"v1"'))
    await expect(fetchMetadataContents(request, cache, 'metadata/repos.yaml', 'data')).resolves.toBe('repos: []')
    expect(request).toHaveBeenCalledTimes(1)
    expect(request.mock.calls[0]?.[1]).toMatchObject({
      owner: 'codeo1io',
      repo: '.github',
      path: 'metadata/repos.yaml',
      ref: 'data',
    })
    expect(request.mock.calls[0]?.[1].headers).toEqual({}) // unconditional first read
    expect(cache.get('metadata/repos.yaml@data')).toEqual({etag: '"v1"', content: 'repos: []'})
  })

  it('second read: carries If-None-Match; 304 returns the cached content WITHOUT decoding or re-storing', async () => {
    const cache = createConditionalContentCache(1)
    const request = vi.fn<(RestRequestFn)>()
      .mockResolvedValueOnce(contents200(b64('version: 1'), '"v1"'))
      .mockResolvedValueOnce({status: 304, data: '', headers: {etag: '"v1"'}})

    await expect(fetchMetadataContents(request, cache, 'metadata/repos.yaml', 'data')).resolves.toBe('version: 1')
    await expect(fetchMetadataContents(request, cache, 'metadata/repos.yaml', 'data')).resolves.toBe('version: 1')

    expect(request).toHaveBeenCalledTimes(2)
    expect(request.mock.calls[1]?.[1].headers).toEqual({'If-None-Match': '"v1"'})
    // 304 must NOT touch the cache: the stored entry is the original one.
    expect(cache.get('metadata/repos.yaml@data')).toEqual({etag: '"v1"', content: 'version: 1'})
  })

  it('a changed file: 200 with a new ETag decodes the new content and overwrites the cache entry', async () => {
    const cache = createConditionalContentCache(1)
    const request = vi.fn<(RestRequestFn)>()
      .mockResolvedValueOnce(contents200(b64('version: 1'), '"v1"'))
      .mockResolvedValueOnce(contents200(b64('version: 2'), '"v2"'))

    await expect(fetchMetadataContents(request, cache, 'metadata/repos.yaml', 'data')).resolves.toBe('version: 1')
    await expect(fetchMetadataContents(request, cache, 'metadata/repos.yaml', 'data')).resolves.toBe('version: 2')
    expect(request.mock.calls[1]?.[1].headers).toEqual({'If-None-Match': '"v1"'})
    expect(cache.get('metadata/repos.yaml@data')).toEqual({etag: '"v2"', content: 'version: 2'})
  })

  it('base64 with GitHub\u2019s 60-char line wrapping decodes correctly (newline-tolerant, same behavior as the pre-rm-162 inline reader)', async () => {
    const cache = createConditionalContentCache(1)
    const content = `metadata:\n  ${'x'.repeat(120)}\n`
    const wrapped = b64(content).replaceAll(/(.{60})/g, '$1\n')
    const request = vi.fn<(RestRequestFn)>().mockResolvedValue(contents200(wrapped, '"v1"'))
    await expect(fetchMetadataContents(request, cache, 'metadata/repos.yaml', 'data')).resolves.toBe(content)
  })

  it('non-file / non-base64 bodies throw makeNotFoundError (unchanged classification)', async () => {
    const cache = createConditionalContentCache(1)
    const request = vi.fn<(RestRequestFn)>().mockResolvedValue({
      status: 200,
      data: {type: 'dir', encoding: 'none'},
      headers: {},
    })
    await expect(fetchMetadataContents(request, cache, 'metadata', 'data')).rejects.toMatchObject({
      code: makeNotFoundError('x').code,
    })
  })

  it('a defensive 304 with NO cached entry fails loud (makeNotFoundError), never silently serves empty content', async () => {
    const cache = createConditionalContentCache(1)
    const request = vi.fn<(RestRequestFn)>().mockResolvedValue({status: 304, data: '', headers: {}})
    await expect(fetchMetadataContents(request, cache, 'metadata/repos.yaml', 'data')).rejects.toMatchObject({
      code: makeNotFoundError('x').code,
    })
  })

  it('different refs memoize under distinct cache keys', async () => {
    const cache = createConditionalContentCache(4)
    const request = vi.fn<(RestRequestFn)>()
      .mockResolvedValueOnce(contents200(b64('main'), '"m"'))
      .mockResolvedValueOnce(contents200(b64('data'), '"d"'))
    await expect(fetchMetadataContents(request, cache, 'metadata/repos.yaml', 'main')).resolves.toBe('main')
    await expect(fetchMetadataContents(request, cache, 'metadata/repos.yaml', 'data')).resolves.toBe('data')
    expect(cache.get('metadata/repos.yaml@main')).toEqual({etag: '"m"', content: 'main'})
    expect(cache.get('metadata/repos.yaml@data')).toEqual({etag: '"d"', content: 'data'})
  })
})

function repoListPage200(repos: {id: number; node_id: string; owner: string; name: string}[], etag: string, totalCount = repos.length): Awaited<ReturnType<RestRequestFn>> {
  return {
    status: 200,
    data: {
      total_count: totalCount,
      repositories: repos.map(repo => ({
        id: repo.id,
        node_id: repo.node_id,
        owner: {login: repo.owner},
        name: repo.name,
        full_name: `${repo.owner}/${repo.name}`,
      })),
    },
    headers: {etag},
  }
}

describe('listInstallationReposPages (conditional repo-list pagination)', () => {
  const page200 = repoListPage200

  const repoA = {id: 1, node_id: 'NODE_A', owner: 'fro-bot', name: 'agent'}
  const repoB = {id: 2, node_id: 'NODE_B', owner: 'fro-bot', name: 'infra'}

  it('first walk: unconditional pages, normalized RepoRecords returned', async () => {
    const request = vi.fn<(RestRequestFn)>().mockResolvedValue(page200([repoA, repoB], '"p1"'))
    const repos = await listInstallationReposPages(request, 'token-1')
    expect(repos).toEqual([
      {node_id: 'NODE_A', database_id: 1, owner: 'fro-bot', name: 'agent', full_name: 'fro-bot/agent'},
      {node_id: 'NODE_B', database_id: 2, owner: 'fro-bot', name: 'infra', full_name: 'fro-bot/infra'},
    ])
    expect(request.mock.calls[0]?.[0]).toBe('GET /installation/repositories')
    expect(request.mock.calls[0]?.[1]).toMatchObject({per_page: 100, page: 1})
    expect(request.mock.calls[0]?.[1].headers).toEqual({})
  })

  it('second walk with the same token: every page carries If-None-Match and a 304 reuses the cached items', async () => {
    const request = vi.fn<(RestRequestFn)>()
      .mockResolvedValueOnce(page200([repoA, repoB], '"p1"')) // walk 1, page 1
      .mockResolvedValueOnce({status: 304, data: '', headers: {etag: '"p1"'}}) // walk 2, page 1
    await listInstallationReposPages(request, 'token-1')
    const repos = await listInstallationReposPages(request, 'token-1')

    expect(repos).toHaveLength(2)
    expect(repos[0]).toEqual({node_id: 'NODE_A', database_id: 1, owner: 'fro-bot', name: 'agent', full_name: 'fro-bot/agent'})
    expect(request).toHaveBeenCalledTimes(2)
    expect(request.mock.calls[1]?.[1].headers).toEqual({'If-None-Match': '"p1"'})
  })

  it('multi-page walk: page 2 changed (200) while page 1 is unchanged (304) — mixed responses compose', async () => {
    const page1Full = Array.from({length: 100}, (_unused, i) => ({id: i + 1, node_id: `NODE_${i}`, owner: 'fro-bot', name: `r${i}`}))
    const page2 = [repoA]
    const request = vi.fn<(RestRequestFn)>()
      // walk 1: two pages
      .mockResolvedValueOnce(page200(page1Full, '"p1"', 101))
      .mockResolvedValueOnce(page200(page2, '"p2"', 101))
      // walk 2: page 1 unchanged, page 2 changed
      .mockResolvedValueOnce({status: 304, data: '', headers: {}})
      .mockResolvedValueOnce(page200([repoB], '"p2b"', 101))

    const first = await listInstallationReposPages(request, 'token-2')
    expect(first).toHaveLength(101)
    const second = await listInstallationReposPages(request, 'token-2')
    expect(second).toHaveLength(101)
    expect(second[100]).toEqual({node_id: 'NODE_B', database_id: 2, owner: 'fro-bot', name: 'infra', full_name: 'fro-bot/infra'})
    expect(request.mock.calls[2]?.[1]).toMatchObject({page: 1})
    expect(request.mock.calls[2]?.[1].headers).toEqual({'If-None-Match': '"p1"'})
    expect(request.mock.calls[3]?.[1]).toMatchObject({page: 2})
    expect(request.mock.calls[3]?.[1].headers).toEqual({'If-None-Match': '"p2"'})
  })

  it('different tokens do not share page caches', async () => {
    const request = vi.fn<(RestRequestFn)>()
      .mockResolvedValueOnce(page200([repoA], '"t1"'))
      .mockResolvedValueOnce(page200([repoB], '"t2"'))
    await listInstallationReposPages(request, 'token-a')
    await listInstallationReposPages(request, 'token-b')
    expect(request.mock.calls[1]?.[1].headers).toEqual({}) // token-b's first walk is unconditional
  })

  it('errors propagate unchanged (degraded-installation handling in the caller keeps its meaning)', async () => {
    const request = vi.fn<(RestRequestFn)>().mockRejectedValue(new Error('boom'))
    await expect(listInstallationReposPages(request, 'token-x')).rejects.toThrow('boom')
  })

  it('defensive: a 304 with no cached entry re-requests unconditionally instead of serving an empty page (bounded: one extra call)', async () => {
    const request = vi.fn<(RestRequestFn)>()
      .mockResolvedValueOnce({status: 304, data: '', headers: {}}) // impossible in production — no prior cache for this token
      .mockResolvedValueOnce(page200([repoA], '"fresh"'))
    const repos = await listInstallationReposPages(request, 'token-defensive')
    expect(repos).toEqual([
      {node_id: 'NODE_A', database_id: 1, owner: 'fro-bot', name: 'agent', full_name: 'fro-bot/agent'},
    ])
    expect(request).toHaveBeenCalledTimes(2)
    expect(request.mock.calls[1]?.[1].headers).toEqual({}) // the re-request is unconditional
  })
})
