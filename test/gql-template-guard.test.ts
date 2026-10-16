/**
 * rm-177 directory-wide template guard — no GraphQL template ANYWHERE in
 * src/github may carry a `//`-prefixed line.
 *
 * Origin: 2026-10-16, run 528f458d. The original rm-177 guard
 * (test/query-shape-guard.test.ts, 2026-09-24) asserts comment syntax over
 * the REGISTRY — every template exported from query-registry.ts and
 * registered there. That net has a known residual hole: a live-destined
 * template inlined anywhere else in src/github (aggregator.ts,
 * app-client.ts, a future module) never passes through the registry, so a
 * `//` comment inside it would reach the GitHub GraphQL parser before any
 * test saw it — exactly the 2026-09-24 outage shape (every per-repo fetch
 * failed into the catch with CI green). This guard scans the raw source of
 * every src/github/*.ts file for backtick template literals, classifies
 * GraphQL-looking spans by their operation keyword, and asserts none has a
 * `//`-style comment line.
 *
 * Scanner honesty (negative-verified at introduction, like the rm-131
 * guard): the last test injects a synthetic source with a `//`-commented
 * GraphQL template alongside decoys (a line comment containing a backtick,
 * a single-quoted string containing a backtick, a non-GraphQL template) and
 * demands exactly the one offender comes back — so the scanner cannot rot
 * into vacuous green. The census assertion (≥ 2 real templates found) is
 * the anti-vacuity floor for the real tree.
 *
 * Scanner limits, by design: `${…}` interpolation bodies are consumed with
 * naive brace counting (no nested template literals inside interpolations —
 * none exist in src/github today; a mis-extracted span can only add
 * scrutiny, never remove it, because the census floor still demands the two
 * real templates).
 */
import {readdirSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

const GITHUB_DIR = fileURLToPath(new URL('../src/github/', import.meta.url))

/** Extract the body of every backtick template literal in TypeScript source. */
function extractTemplateBodies(source: string): string[] {
  const bodies: string[] = []
  let state: 'code' | 'single' | 'double' | 'lineComment' | 'blockComment' | 'template' = 'code'
  let body = ''
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]
    switch (state) {
      case 'code': {
        if (char === '/' && next === '/') {
          state = 'lineComment'
          index += 1
        } else if (char === '/' && next === '*') {
          state = 'blockComment'
          index += 1
        } else if (char === "'") state = 'single'
        else if (char === '"') state = 'double'
        else if (char === '`') {
          state = 'template'
          body = ''
        }
        break
      }
      case 'single': {
        if (char === '\\') index += 1
        else if (char === "'" || char === '\n') state = 'code'
        break
      }
      case 'double': {
        if (char === '\\') index += 1
        else if (char === '"' || char === '\n') state = 'code'
        break
      }
      case 'lineComment': {
        if (char === '\n') state = 'code'
        break
      }
      case 'blockComment': {
        if (char === '*' && next === '/') {
          state = 'code'
          index += 1
        }
        break
      }
      case 'template': {
        if (char === '\\') {
          body += char + (next ?? '')
          index += 1
        } else if (char === '`') {
          bodies.push(body)
          state = 'code'
        } else if (char === '$' && next === '{') {
          // Interpolation: consume to the matching close brace (naive depth
          // counting; documented limit above).
          body += '${'
          index += 1
          let depth = 1
          while (index + 1 < source.length && depth > 0) {
            index += 1
            const inner = source[index]
            if (inner === '{') depth += 1
            else if (inner === '}') depth -= 1
            if (depth > 0) body += inner
          }
          body += '}'
        } else body += char
        break
      }
    }
  }
  return bodies
}

/** A template is GraphQL-looking when any line opens with an operation keyword. */
function looksLikeGraphQL(body: string): boolean {
  const operationKeyword = /^\s*(?:query|mutation|fragment|subscription)\b/
  return body.split('\n').some(line => operationKeyword.test(line))
}

/** //-comment lines inside a template body — invalid GraphQL (UNKNOWN_CHAR). */
function slashCommentLines(body: string): string[] {
  return body.split('\n').filter(line => /^\s*\/\//.test(line))
}

function githubSources(): {file: string; source: string}[] {
  return readdirSync(GITHUB_DIR)
    .filter(name => name.endsWith('.ts'))
    .map(name => ({file: name, source: readFileSync(join(GITHUB_DIR, name), 'utf8')}))
}

describe('GraphQL template guard, directory-wide (rm-177 residual)', () => {
  it('every GraphQL-looking template in src/github is free of //-comment lines', () => {
    const offenders: string[] = []
    for (const {file, source} of githubSources()) {
      for (const body of extractTemplateBodies(source)) {
        if (!looksLikeGraphQL(body)) continue
        for (const line of slashCommentLines(body)) {
          offenders.push(`${file}: ${line.trim()}`)
        }
      }
    }
    expect(
      offenders,
      '//-comments are invalid GraphQL (UNKNOWN_CHAR at the API boundary) — use # comments; see test/query-shape-guard.test.ts for the registry-scoped twin',
    ).toEqual([])
  })

  it('the scan is not vacuous: at least 2 GraphQL templates exist in src/github today', () => {
    let census = 0
    for (const {source} of githubSources()) {
      for (const body of extractTemplateBodies(source)) {
        if (looksLikeGraphQL(body)) census += 1
      }
    }
    expect(census).toBeGreaterThanOrEqual(2)
  })

  it('scanner self-test: a // in a GraphQL template is caught; decoys are not', () => {
    const synthetic = [
      "const decoy = 'text with a ` backtick'", // quoted string — not a template
      '// comment with a ` backtick in it', // line comment — not a template
      'const html = `<div>not graphql</div>`', // template, not GraphQL-looking
      'const bad = `',
      '  query Synthetic($owner: String!) {',
      '    // this is the injected hazard',
      '    repository(owner: $owner) { id }',
      '  }',
      '`',
    ].join('\n')
    const offenders = extractTemplateBodies(synthetic).filter(looksLikeGraphQL).flatMap(slashCommentLines)
    expect(offenders).toEqual(['    // this is the injected hazard'])
    // And the decoy template must be classified out.
    expect(extractTemplateBodies(synthetic)).toHaveLength(2)
    expect(looksLikeGraphQL('<div>not graphql</div>')).toBe(false)
  })
})
