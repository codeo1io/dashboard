import {readdirSync, readFileSync, statSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

/**
 * rm-214: README Configuration must document the complete env-var surface.
 *
 * Fails when a `DASHBOARD_*` / `RATE_LIMIT_*` variable is READ in `src/` but
 * missing from the README Configuration section (undocumented var), or when the
 * README documents one that `src/` no longer reads (stale row). Either direction
 * is drift; the table and the code must agree exactly.
 *
 * Extraction model — "read in src/" means one of:
 *   1. a direct `process.env.<TOKEN>` access, or
 *   2. any function called with the token as a string literal (the secret-reader
 *      / int-default helpers such as readOptionalSecret('…') / envIntOrDefault('…')).
 * `<VAR>_FILE` indirection names are constructed dynamically inside the secret
 * readers, so they are covered by the README's prose convention note, not rows.
 */
const repoRoot = process.cwd()
const ENV_TOKEN = '(?:DASHBOARD|RATE_LIMIT)_[A-Z0-9_]+'

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

/** The set of env vars actually read somewhere under src/. */
function envTokensReadInSrc(): Set<string> {
  const tokens = new Set<string>()
  for (const file of collectTypeScriptSources(resolve(repoRoot, 'src'))) {
    const text = readFileSync(file, 'utf8')
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
