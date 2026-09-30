import {readdirSync, readFileSync, statSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

/**
 * rm-319: pin the hono import surface against the v4.13.10 adapter split.
 *
 * hono v4.13.10 split runtime adapters out of the core package and deprecated
 * `hono/<adapter>` subpath imports (e.g. hono/node-serve, hono/cloudflare-pages
 * — the latter deprecated without replacement) with REMOVAL in v5. This fork's
 * src/ imports only the stable surface enumerated below; this guard fails when
 * any hono-family import specifier outside the allowlist appears anywhere in
 * src/, so a future absorb or bump that silently introduces an adapter import
 * goes red now instead of surfacing at the v5 migration.
 *
 * Scope is src/ only: the web/ client is a Vite/React workspace that does not
 * import hono. Adding a legitimate import is a one-line allowlist edit.
 */

const repoRoot = process.cwd()

// The complete allowed hono-family import surface for src/ (explicit data).
const ALLOWED_HONO_SPECIFIERS = [
  'hono',
  'hono/cookie',
  'hono/secure-headers',
  '@hono/node-server',
  '@hono/node-server/conninfo',
  '@hono/node-server/serve-static',
] as const

const HONO_IMPORT_PATTERN = /(?:from\s*'|(?:import|require)\s*\(\s*')(hono[^']*|@hono\/[^']*)'/g

function honoImportSpecifiers(source: string): string[] {
  return [...source.matchAll(HONO_IMPORT_PATTERN)].map(match => match[1] ?? '')
}

function collectTypeScriptSources(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...collectTypeScriptSources(full))
    } else if (entry.endsWith('.ts')) {
      out.push(full)
    }
  }
  return out
}

describe('hono import surface guard (rm-319)', () => {
  it('src/ imports only allowlisted hono-family specifiers, and the allowlist carries no stale entries', () => {
    const allowed = new Set<string>(ALLOWED_HONO_SPECIFIERS)
    const seen = new Map<string, string[]>()
    for (const file of collectTypeScriptSources(resolve(repoRoot, 'src'))) {
      const rel = file.slice(repoRoot.length + 1)
      for (const specifier of honoImportSpecifiers(readFileSync(file, 'utf8'))) {
        seen.set(specifier, [...(seen.get(specifier) ?? []), rel])
      }
    }

    const unexpected = [...seen.keys()].filter(specifier => !allowed.has(specifier)).sort()
    const stale = [...allowed].filter(specifier => !seen.has(specifier)).sort()
    const where = [...seen.entries()].map(([k, v]) => `${k} (${v.join(', ')})`)

    expect(
      {unexpected, stale},
      `hono-family import outside the allowlist in src/ (or a stale allowlist entry) — hono v4.13.10 deprecated hono/<adapter> imports, removed in v5 (rm-319); imports seen: ${where.join('; ')}`,
    ).toEqual({unexpected: [], stale: []})
  })

  it('detects a planted deprecated adapter import (guard self-test, rm-319)', () => {
    const planted = [
      "import {Hono} from 'hono'",
      "import {serve} from 'hono/node-serve'",
      "import {serveStatic} from '@hono/node-server/serve-static'",
    ].join('\n')
    // The planted deprecated adapter import must be flagged by the same
    // extraction the real sweep uses — the red the guard produces against any
    // future adapter import, pinned forever.
    expect(honoImportSpecifiers(planted)).toContain('hono/node-serve')
  })
})
