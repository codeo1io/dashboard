import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

/**
 * rm-177 closure: the aggregator's GraphQL must never contain JavaScript
 * line comments inside its query template literals.
 *
 * The API returns HTTP 400 with "Problems parsing GraphQL query" when a
 * request body contains `//`-style comments: the runtime strips them as a
 * JavaScript convenience, the GraphQL parser does not. The `#` to `//`
 * conversion happened during a refactor and shipped unnoticed because the
 * affected query only ran against the live endpoint (rm-177). The code-level
 * conversion has since been reverted; this guard keeps it reverted by
 * scanning every backtick template that contains GraphQL operation keywords
 * and failing on any `//` that is not inside a quoted string.
 */

const repoRoot = resolve(import.meta.dirname, '..')
const source = readFileSync(resolve(repoRoot, 'src/github/aggregator.ts'), 'utf8')

/**
 * Extract every backtick template literal in the file that carries a GraphQL
 * operation keyword, then flag `//` occurrences outside single/double quotes.
 * Interpolations are followed inline (a `${...}` splice cannot validly open a
 * comment that the parser would strip — but its text is scanned too, which is
 * strictly more conservative than the failure mode this guards against).
 */
function graphqlTemplatesWithLineComments(src: string): string[] {
  const offenders: string[] = []
  const template = /`(?:\\.|[^`\\])*`/gs
  for (const match of src.matchAll(template)) {
    const body = match[0]
    if (!/\b(?:query|mutation|fragment)\b/.test(body)) continue
    let inSingle = false
    let inDouble = false
    for (let i = 0; i < body.length - 1; i += 1) {
      const ch = body[i]
      if (ch === '\\') {
        i += 1
        continue
      }
      if (ch === "'" && !inDouble) inSingle = !inSingle
      else if (ch === '"' && !inSingle) inDouble = !inDouble
      else if (ch === '/' && body[i + 1] === '/' && !inSingle && !inDouble) {
        offenders.push(`${body.slice(Math.max(0, i - 40), i + 40)}`.replaceAll('\n', String.raw`\n`))
        break
      }
    }
  }
  return offenders
}

describe('aggregator GraphQL template hygiene (rm-177)', () => {
  it('contains no JavaScript line comments inside GraphQL templates', () => {
    const offenders = graphqlTemplatesWithLineComments(source)
    expect(offenders).toEqual([])
  })

  it('finds planted line comments (guard self-test)', () => {
    const planted = graphqlTemplatesWithLineComments(
      'const q = `query {\\n  viewer { login } // stale session?\\n}`',
    )
    expect(planted).toHaveLength(1)
  })

  it('does not flag comment markers inside quoted GraphQL strings', () => {
    const clean = graphqlTemplatesWithLineComments(
      'const q = `query($url: String!) { resource(url: $url) { title } }`',
    )
    expect(clean).toEqual([])
  })
})
