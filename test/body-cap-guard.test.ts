import {readdirSync, readFileSync, statSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

/**
 * rm-312: no route in src/ may parse a request body without a cap.
 *
 * The guard enumerates every request-body parse site (`c.req.text()` /
 * `c.req.json()` / `c.req.formData()` / `c.req.parseBody()` / `req.raw.text()`
 * …) across src/ and requires the site multiset to EXACTLY match the explicit
 * allowlist below: a new site fails the guard until it either reads through
 * the shared streaming cap (`readBodyCapped` from src/body-cap.ts) or gains a
 * recorded-justification entry here (a one-line edit).
 *
 * Recorded design decision: the scan is deliberately ALL of src/, not
 * "public paths only" — a file scan cannot reliably know server.ts's
 * isPublicPath classification, and an uncapped buffered read is a
 * memory-amplification hazard on every path class (worst on public pre-auth
 * routes: /auth/* sits OUTSIDE the rate limiter by design, rm-275).
 *
 * Detection is factored into `uncappedBodyParseSites(source, file)` so the
 * guard proves itself against a planted uncapped fixture route (below) rather
 * than trusting its regex.
 */

const repoRoot = process.cwd()

const BODY_PARSE_PATTERN = /\b(?:c\.req|req|request|raw)\s*\.\s*(text|json|formData|parseBody)\s*\(/g

interface BodyParseSite {
  file: string
  method: string
  line: number
}

function uncappedBodyParseSites(source: string, file: string): BodyParseSite[] {
  const sites: BodyParseSite[] = []
  const lines = source.split('\n')
  for (const [index, line] of lines.entries()) {
    // Whole-line comment prose (docblocks, // notes) is not a parse site —
    // the guard polices code, not documentation of code (rm-312: the shared
    // cap's own docblock names the very call it replaces). Trailing // notes
    // on a code line still leave the code matchable.
    const trimmed = line.trim()
    if (trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed.startsWith('//')) {
      continue
    }
    BODY_PARSE_PATTERN.lastIndex = 0
    const match = BODY_PARSE_PATTERN.exec(line)
    if (match?.[1] !== undefined) sites.push({file, method: match[1], line: index + 1})
  }
  return sites
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

// Sites allowed to parse a request body WITHOUT readBodyCapped — each with its
// recorded justification (rm-312's recorded-decision slot). Line numbers are
// deliberately not pinned: the guard pins the file+method COUNT and the
// justification, not churn-sensitive positions.
const ALLOWED_UNCAPPED_SITES = [
  {
    file: 'src/routes/operator-fixture-harness.ts',
    method: 'json',
    count: 3,
    reason:
      'DEV-ONLY fixture harness: mounted only when fixtureHarnessActive (NODE_ENV=development/test AND loopback bind AND DASHBOARD_FIXTURE_HARNESS_ENABLED=true) — never reachable on a production surface.',
  },
] as const

describe('request-body cap guard (rm-312)', () => {
  it('every request-body parse site in src/ is either readBodyCapped or allowlisted', () => {
    const actual = new Map<string, number>()
    const details: string[] = []
    for (const file of collectTypeScriptSources(resolve(repoRoot, 'src'))) {
      const rel = file.slice(repoRoot.length + 1)
      for (const site of uncappedBodyParseSites(readFileSync(file, 'utf8'), rel)) {
        const key = `${site.file}:${site.method}`
        actual.set(key, (actual.get(key) ?? 0) + 1)
        details.push(`${site.file}:${site.line} → ${site.method}()`)
      }
    }

    const expected = new Map<string, number>(
      ALLOWED_UNCAPPED_SITES.map(site => [`${site.file}:${site.method}`, site.count] as const),
    )
    const unexpected = [...actual.keys()].filter(key => !expected.has(key)).sort()
    const wrongCount = [...actual.entries()].filter(([key, n]) => expected.get(key) !== n)
    const stale = [...expected.keys()].filter(key => !actual.has(key)).sort()

    expect(
      {unexpected, wrongCount, stale},
      `a route in src/ parses a request body without the shared cap — route it through readBodyCapped (src/body-cap.ts) or add a recorded-justification allowlist entry (rm-312); sites seen: ${details.join(', ')}`,
    ).toEqual({unexpected: [], wrongCount: [], stale: []})
  })

  it('detects a planted uncapped fixture route (guard self-test, rm-312)', () => {
    const planted = [
      "import {Hono} from 'hono'",
      'const router = new Hono()',
      "router.post('/planted', async c => {",
      '  const body = await c.req.formData()',
      "  return c.text('ok')",
      '})',
    ].join('\n')
    // The planted formData() site must be flagged — this is the red the guard
    // would produce against any new uncapped route, pinned forever.
    expect(uncappedBodyParseSites(planted, 'src/routes/planted-fixture.ts')).toEqual([
      {file: 'src/routes/planted-fixture.ts', method: 'formData', line: 4},
    ])
  })
})
