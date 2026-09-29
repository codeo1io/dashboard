import {describe, expect, it, vi} from 'vitest'
import type {EtagCacheRef} from '../src/github/conditional-request.ts'
import {isNotModifiedResponse, NotModifiedError, readWithEtagCache} from '../src/github/conditional-request.ts'

describe('readWithEtagCache', () => {
  it('fresh 200 stores etag+body and returns the body; second read sends If-None-Match', async () => {
    const cache: EtagCacheRef = {current: undefined}
    const read = vi.fn(async (ifNoneMatch: string | undefined) => {
      expect(ifNoneMatch).toBeUndefined()
      return {etag: '"abc123"', body: 'first-body'}
    })
    await expect(readWithEtagCache(read, cache)).resolves.toBe('first-body')
    expect(cache.current).toEqual({etag: '"abc123"', body: 'first-body'})

    // Second call must receive the stored ETag as the conditional header value
    const read2 = vi.fn(async (ifNoneMatch: string | undefined) => {
      expect(ifNoneMatch).toBe('"abc123"')
      return {etag: '"abc123"', body: 'second-body'}
    })
    await expect(readWithEtagCache(read2, cache)).resolves.toBe('second-body')
    expect(read2).toHaveBeenCalledOnce()
  })

  it('304 NotModifiedError returns the cached body without exposing the miss', async () => {
    const cache: EtagCacheRef = {current: {etag: '"v1"', body: 'cached-body'}}
    const read = vi.fn(async (_ifNoneMatch: string | undefined) => {
      throw new NotModifiedError()
    })
    await expect(readWithEtagCache(read, cache)).resolves.toBe('cached-body')
    // Cache entry survives (the 304 confirms it is still current)
    expect(cache.current).toEqual({etag: '"v1"', body: 'cached-body'})
  })

  it('304 with no cached entry fails loud instead of returning undefined', async () => {
    const cache: EtagCacheRef = {current: undefined}
    const read = vi.fn(async () => {
      throw new NotModifiedError()
    })
    await expect(readWithEtagCache(read, cache)).rejects.toThrow('no cached body exists')
  })

  it('a 200 without an etag leaves the previous cache untouched and still returns the body', async () => {
    const cache: EtagCacheRef = {current: {etag: '"v1"', body: 'cached-body'}}
    const read = vi.fn(async () => ({etag: undefined, body: 'fresh-but-etagless'}))
    await expect(readWithEtagCache(read, cache)).resolves.toBe('fresh-but-etagless')
    expect(cache.current).toEqual({etag: '"v1"', body: 'cached-body'})
  })

  it('non-304 errors propagate unchanged and leave the cache untouched', async () => {
    const cache: EtagCacheRef = {current: {etag: '"v1"', body: 'cached-body'}}
    const boom = new Error('upstream down')
    const read = vi.fn(async () => {
      throw boom
    })
    await expect(readWithEtagCache(read, cache)).rejects.toBe(boom)
    expect(cache.current).toEqual({etag: '"v1"', body: 'cached-body'})
  })
})

describe('isNotModifiedResponse', () => {
  it('recognizes NotModifiedError', () => {
    expect(isNotModifiedResponse(new NotModifiedError())).toBe(true)
  })

  it('recognizes the Octokit 304 RequestError shape (Error with status 304)', () => {
    const error = new Error('Not modified') as Error & {status: number}
    error.status = 304
    expect(isNotModifiedResponse(error)).toBe(true)
  })

  it('rejects ordinary errors and 4xx/5xx statuses', () => {
    const notFound = new Error('Not Found') as Error & {status: number}
    notFound.status = 404
    expect(isNotModifiedResponse(notFound)).toBe(false)
    expect(isNotModifiedResponse(new Error('boom'))).toBe(false)
    expect(isNotModifiedResponse('not an error')).toBe(false)
  })
})
