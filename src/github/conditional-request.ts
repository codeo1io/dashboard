/**
 * Conditional GET helpers (rm-162): If-None-Match / 304 Not Modified support
 * for GitHub reads on the refresh path.
 *
 * GitHub documents 304 responses as FREE against the primary rate limit
 * (docs.github.com REST best-practices), so every steady-state re-read that
 * answers 304 costs nothing. Octokit surfaces a 304 as a thrown RequestError
 * with `status === 304` — `isNotModifiedResponse` recognizes both that shape
 * and our own `NotModifiedError`, and `readWithEtagCache` turns it back into
 * the cached body.
 *
 * The cache is an explicit mutable-ref box (`{current: entry | undefined}`) so
 * callers own its lifetime: per-build for the metadata reader, per
 * installation+page for repo-list pagination. Entries are replaced in place —
 * the footprint is bounded by the number of distinct read sites, never by
 * cycle count.
 */

/**
 * Signals "upstream answered 304 Not Modified" inside a conditional read.
 * Thrown by call sites after translating Octokit's 304 RequestError; caught
 * by {@link readWithEtagCache}.
 */
export class NotModifiedError extends Error {
  constructor() {
    super('Not modified')
    this.name = 'NotModifiedError'
  }
}

/** A cached response body plus the ETag that vouches for it. */
export interface EtagCacheEntry {
  readonly etag: string
  readonly body: string
}

/** Mutable cache box owned by the call site. */
export interface EtagCacheRef {
  current: EtagCacheEntry | undefined
}

/**
 * True when the error represents a 304 Not Modified response — either our own
 * {@link NotModifiedError} or an Octokit RequestError carrying status 304.
 */
export function isNotModifiedResponse(error: unknown): boolean {
  if (error instanceof NotModifiedError) return true
  return error instanceof Error && (error as {status?: unknown}).status === 304
}

/** True when the error carries the given HTTP status (Octokit RequestError shape). */
export function hasErrorStatus(error: unknown, status: number): boolean {
  return error instanceof Error && (error as {status?: unknown}).status === status
}

/**
 * Performs a read through the ETag cache.
 *
 * - Fresh 200: stores `{etag, body}` when both are present and returns the body.
 * - 304 (read throws {@link NotModifiedError}): returns the previously cached
 *   body — the caller never sees the miss.
 * - 304 with NO cached entry: throws (a 304 for a body we never held is a
 *   protocol violation — fail loud rather than return undefined).
 * - Any other error propagates unchanged and leaves the cache untouched.
 */
export async function readWithEtagCache(
  read: (ifNoneMatch: string | undefined) => Promise<{readonly etag: string | undefined; readonly body: string}>,
  cache: EtagCacheRef,
): Promise<string> {
  const entry = cache.current
  try {
    const result = await read(entry?.etag)
    if (result.etag !== undefined && result.body !== undefined) {
      cache.current = {etag: result.etag, body: result.body}
    }
    return result.body
  } catch (error) {
    if (isNotModifiedResponse(error)) {
      if (entry === undefined) {
        throw new Error('Conditional read answered 304 but no cached body exists')
      }
      return entry.body
    }
    throw error
  }
}
