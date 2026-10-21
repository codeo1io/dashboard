import {readdirSync, readFileSync, statSync} from 'node:fs'
import {relative, resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'
import {MAX_REQUEST_BODY_BYTES, readBodyCapped} from '../src/read-body.ts'

/**
 * rm-268 close-out, acceptance clause 3: "a repo-wide guard (test or lint
 * rule) that no other public route parses an uncapped body."
 *
 * ZERO-ALLOWLIST sweep: no file under src/ — except src/read-body.ts itself —
 * may contain an uncapped request-body parse form (`c.req.json(`,
 * `c.req.text(`, `c.req.parseBody(`, `c.req.formData(`). Every body-reading
 * route must go through the ONE shared bounded reader (src/read-body.ts,
 * hoisted at rm-497) so the cap fires BEFORE parsing — the rm-268 lesson:
 * a cap checked only after `await c.req.text()`/`c.req.json()` has already
 * buffered the whole stream is no cap at all.
 *
 * Strictly stronger than rm-268's public-route phrasing: the sweep covers
 * all of src/ with no route-class carve-outs, so the invariant is
 * machine-enforced for every future route (public, operator, ingest, or
 * dev-only fixture harness — the three harness parses were the last live
 * uncapped sites and now route through readBodyCapped too).
 *
 * `c.req.raw` uses are NOT violations: they pass the raw Request to
 * readBodyCapped (bounded) or use it for abort signals / identity keys
 * without reading the body.
 */

const repoRoot = process.cwd()

/** Hono context parse forms that buffer an unbounded body before any cap can fire. */
const UNCAPPED_PARSE_FORMS = [
  'c.req.json(',
  'c.req.text(',
  'c.req.parseBody(',
  'c.req.formData(',
] as const

interface SourceRecord {
  readonly path: string
  readonly text: string
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

/** Every .ts file under src/, as repo-relative (path, text) records. */
function sourcesUnderSrc(): SourceRecord[] {
  return collectTypeScriptSources(resolve(repoRoot, 'src')).map(file => ({
    path: relative(repoRoot, file),
    text: readFileSync(file, 'utf8'),
  }))
}

/**
 * The detector, extracted so its red side can be proven in-memory (guard
 * convention: a sweep that has never fired red is unproven). Returns one
 * string per (file, form) violation; excluded paths are skipped.
 */
function uncappedParseViolations(
  records: readonly SourceRecord[],
  excludedPaths: readonly string[],
): string[] {
  const excluded = new Set(excludedPaths)
  const violations: string[] = []
  for (const record of records) {
    if (excluded.has(record.path)) continue
    for (const form of UNCAPPED_PARSE_FORMS) {
      if (record.text.includes(form)) {
        violations.push(`${record.path}: uncapped parse form \`${form}\``)
      }
    }
  }
  return violations
}

describe('routes-body-cap-guard (rm-268 clause 3)', () => {
  it('positive control: src/read-body.ts exports the shared bounded reader and cap', () => {
    expect(typeof readBodyCapped).toBe('function')
    expect(MAX_REQUEST_BODY_BYTES).toBe(16384)
  })

  it('zero uncapped body-parse forms anywhere under src/ outside src/read-body.ts (zero allowlist)', () => {
    expect(uncappedParseViolations(sourcesUnderSrc(), ['src/read-body.ts'])).toEqual([])
  })

  it('detector self-proof (red-first): fires on synthetic violations, skips excluded paths, passes clean records', () => {
    const synthetic: SourceRecord[] = [
      {path: 'src/routes/synthetic-json.ts', text: 'const body = await c.req.json()'},
      {path: 'src/routes/synthetic-text.ts', text: 'return c.req.text()'},
      {path: 'src/routes/synthetic-parsebody.ts', text: 'const b = await c.req.parseBody()'},
      {path: 'src/routes/synthetic-formdata.ts', text: 'const f = await c.req.formData()'},
      // The shared reader itself is excluded — its own internals are the sanctioned site.
      {path: 'src/read-body.ts', text: 'await c.req.json( c.req.text( c.req.parseBody( c.req.formData('},
      // The sanctioned call shape.
      {path: 'src/routes/synthetic-clean.ts', text: 'const rawBody = await readBodyCapped(c.req.raw, MAX_REQUEST_BODY_BYTES)'},
    ]
    expect(uncappedParseViolations(synthetic, ['src/read-body.ts'])).toEqual([
      'src/routes/synthetic-json.ts: uncapped parse form `c.req.json(`',
      'src/routes/synthetic-text.ts: uncapped parse form `c.req.text(`',
      'src/routes/synthetic-parsebody.ts: uncapped parse form `c.req.parseBody(`',
      'src/routes/synthetic-formdata.ts: uncapped parse form `c.req.formData(`',
    ])
  })
})
