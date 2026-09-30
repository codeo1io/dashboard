import {readdirSync, readFileSync, statSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

/**
 * rm-214: README Configuration must document the complete env-var surface.
 *
 * Fails when a `DASHBOARD_*` / `RATE_LIMIT_*` / `GATEWAY_*` variable is READ in
 * `src/` but missing from the README Configuration section (undocumented var),
 * or when the README documents one that `src/` no longer reads (stale row).
 * Either direction is drift; the table and the code must agree exactly.
 *
 * Extraction model — "read in src/" means one of:
 *   1. a direct `process.env.<TOKEN>` access, or
 *   2. any function called with the token as a string literal (the secret-reader
 *      / int-default helpers such as readOptionalSecret('…') / envIntOrDefault('…')).
 * `<VAR>_FILE` indirection names are constructed dynamically inside the secret
 * readers, so they are covered by the README's prose convention note, not rows.
 *
 * rm-316: the token class is widened to the `GATEWAY_*` family — rm-214's
 * `(?:DASHBOARD|RATE_LIMIT)_` prefix list was structurally blind to it, so a
 * whole family could go undocumented while the guard stayed green. The class
 * stays a scoped prefix list (NOT "every uppercase env read") on purpose:
 * `NODE_ENV` and friends are outside the documented surface. The planted
 * self-test below pins that a `GATEWAY_*` read is caught by the same
 * extraction, in both drift directions.
 */
const repoRoot = process.cwd()
const ENV_TOKEN = '(?:DASHBOARD|RATE_LIMIT|GATEWAY)_[A-Z0-9_]+'

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

/** The env vars read in one source text, by rm-214's extraction model. */
function envTokensReadInSource(text: string): Set<string> {
  const tokens = new Set<string>()
  for (const match of text.matchAll(new RegExp(String.raw`process\.env\.(${ENV_TOKEN})`, 'g'))) {
    tokens.add(match[1] ?? '')
  }
  // `readServerBindConfig(env = process.env)` destructures the env object into
  // a parameter — its reads appear as bare `env.DASHBOARD_*` accesses.
  for (const match of text.matchAll(new RegExp(String.raw`\benv\.(${ENV_TOKEN})`, 'g'))) {
    tokens.add(match[1] ?? '')
  }
  for (const match of text.matchAll(
    new RegExp(String.raw`\(\s*[\x27\x60](${ENV_TOKEN})[\x27\x60]`, 'g'),
  )) {
    tokens.add(match[1] ?? '')
  }
  return tokens
}

/** The set of env vars actually read somewhere under src/. */
function envTokensReadInSrc(): Set<string> {
  const tokens = new Set<string>()
  for (const file of collectTypeScriptSources(resolve(repoRoot, 'src'))) {
    for (const token of envTokensReadInSource(readFileSync(file, 'utf8'))) {
      tokens.add(token)
    }
  }
  return tokens
}

/**
 * Same-named CODE CONSTANTS in src/server.ts — they are not environment
 * variables, so the README footnote may mention them as code without them
 * counting as env rows. The liveness check below forces this list to track
 * reality: if a constant is renamed or removed, this guard goes red until the
 * list (and the README footnote) is updated.
 */
const NON_ENV_CONSTANTS = [
  'RATE_LIMIT_CLASSES',
  'RATE_LIMIT_MAX',
  'RATE_LIMIT_MAX_PER_CLASS',
  'RATE_LIMIT_WINDOW_MS',
] as const

/** Backticked env tokens inside the README "Configuration" section (table rows + prose). */
function envTokensDocumentedInReadme(): Set<string> {
  const readme = readFileSync(resolve(repoRoot, 'README.md'), 'utf8')
  const start = readme.indexOf('## Configuration')
  expect(start, 'README.md must contain a "## Configuration" section').toBeGreaterThan(-1)
  const end = readme.indexOf('\n## ', start + 1)
  const section = readme.slice(start, end === -1 ? undefined : end)
  const tokens = [...section.matchAll(new RegExp(`\`(${ENV_TOKEN})\``, 'g'))]
    .map(match => match[1] ?? '')
    .filter(token => token !== '')
  return new Set(tokens)
}

describe('environment-variable documentation coverage (rm-214)', () => {
  it('a planted GATEWAY_* read is caught by the extraction — the widened class is not decorative (rm-316)', () => {
    const planted = [
      'const raw = process.env.GATEWAY_PLANTED_PROBE',
      "raw = readOptionalSecret('GATEWAY_PLANTED_STRING_ARG')",
      'const scoped = env.GATEWAY_PLANTED_DESTRUCTURED',
      'const noise = process.env.NODE_ENV',
    ].join('\n')
    const tokens = envTokensReadInSource(planted)
    expect(tokens.has('GATEWAY_PLANTED_PROBE')).toBe(true)
    expect(tokens.has('GATEWAY_PLANTED_STRING_ARG')).toBe(true)
    expect(tokens.has('GATEWAY_PLANTED_DESTRUCTURED')).toBe(true)
    // The class stays scoped: NODE_ENV must NOT be pulled into the documented
    // surface by this widening.
    expect(tokens.has('NODE_ENV')).toBe(false)
    // A GATEWAY_* row the README carries but src/ stopped reading would land in
    // the stale list by the same compare — pinned here at the README seam.
    const readme = readFileSync(resolve(repoRoot, 'README.md'), 'utf8')
    expect(readme, 'the GATEWAY_* widening must be reflected in the prose class list').toContain(
      '`DASHBOARD_*` / `RATE_LIMIT_*` / `GATEWAY_*`',
    )
  })

  it('the NON_ENV_CONSTANTS list still names real constants in src/server.ts', () => {
    const serverSource = readFileSync(resolve(repoRoot, 'src/server.ts'), 'utf8')
    for (const name of NON_ENV_CONSTANTS) {
      expect(serverSource, `${name} must exist as a constant in src/server.ts`).toMatch(
        new RegExp(String.raw`(?:const|let) ${name}\b`),
      )
    }
  })

  it('every DASHBOARD_*/RATE_LIMIT_* var read in src/ is documented in README Configuration, and no stale rows exist', () => {
    const read = envTokensReadInSrc()
    const documented = envTokensDocumentedInReadme()
    const nonEnv = new Set<string>(NON_ENV_CONSTANTS)

    const undocumented = [...read].filter(token => !documented.has(token)).sort()
    const stale = [...documented]
      .filter(token => !read.has(token) && !nonEnv.has(token))
      .sort()

    expect(
      {undocumented, stale},
      'README Configuration env table and src/ read sites disagree — add the missing rows or drop the stale ones (rm-214)',
    ).toEqual({undocumented: [], stale: []})
  })
})
