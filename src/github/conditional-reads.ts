/**
 * Conditional-request (If-None-Match / ETag) helpers for GitHub REST reads
 * (rm-162). GitHub documents 304 Not Modified responses as FREE against the
 * primary rate limit (docs.github.com REST best-practices) — carrying a
 * stored ETag on unchanged reads is the cheapest API-budget lever available
 * to a 60s polling dashboard.
 *
 * Two consumers:
 * - the metadata contents read (server.ts metadata reader): one GET per
 *   cycle for metadata/repos.yaml at ref data → 304 → serve the cached
 *   decoded content unchanged;
 * - the installation repo-list pagination (installations.ts): per-(token,
 *   page) ETags → 304 → reuse that page's cached items.
 *
 * This module owns only the pure pieces (bounded cache + header shaping +
 * the 304 decision). Callers keep their existing error/timeout discipline —
 * a failed conditional read behaves exactly like a failed plain read
 * (fail-visible per the metadata fail-closed contract; the ETag is never
 * trusted as data).
 */

/**
 * Octokit.request-compatible invocation seam (route string + params),
 * narrowed to the fields conditional reads consume. Tests drive this with a
 * fake; production passes an authenticated Octokit's bound `request`.
 * Headers mirror @octokit/types ResponseHeaders (values may be number).
 */
export type RestRequestFn = (
  route: string,
  params: Record<string, unknown>,
) => Promise<{status: number; data: unknown; headers: Record<string, string | number | undefined>}>

/**
 * Bounded insert-ordered cache of last-known-good content per logical key
 * (`<path>@<ref>` for the metadata reader, `<token>|<page>` for repo-list
 * pages). Insert order doubles as recency: when the bound is hit, the
 * oldest entry is evicted.
 */
export interface ConditionalContentCache {
  get: (key: string) => {etag: string | null; content: string} | undefined
  store: (key: string, etag: string | null, content: string) => void
  invalidate: (key: string) => void
}

export function createConditionalContentCache(maxEntries = 64): ConditionalContentCache {
  const entries = new Map<string, {etag: string | null; content: string}>()
  return {
    get(key) {
      return entries.get(key)
    },
    store(key, etag, content) {
      entries.delete(key)
      entries.set(key, {etag, content})
      while (entries.size > maxEntries) {
        const oldest = entries.keys().next().value
        if (oldest === undefined) break
        entries.delete(oldest)
      }
    },
    invalidate(key) {
      entries.delete(key)
    },
  }
}

/**
 * The conditional header to send for a cached read. Weak validators
 * (`W/"..."`) are passed through verbatim — GitHub's REST API emits them
 * and honors them on If-None-Match.
 */
export function ifNoneMatchHeader(etag: string | null): Record<string, string> {
  if (etag === null || etag === '') return {}
  return {'If-None-Match': etag}
}

/** Normalize an ETag response header to the cacheable form (null when absent/blank). */
export function normalizeEtag(headerValue: unknown): string | null {
  if (typeof headerValue !== 'string') return null
  const trimmed = headerValue.trim()
  return trimmed === '' ? null : trimmed
}
