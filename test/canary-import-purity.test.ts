/**
 * rm-225 import-purity guard — the canary's static import graph must be
 * bare-specifier-free, or the zero-install workflow contract is broken.
 *
 * Origin: 2026-09-29, run c670b67f assess/implement (attempt b03663bd/248a73ff).
 * Scheduled canary run 36417620616 (2026-09-28T11:46Z, at tip d89ffe7) failed
 * with ERR_MODULE_NOT_FOUND: `Cannot find package '@bfra.me/es' imported from
 * src/result.ts`. The canary workflow (canary.yaml) deliberately installs NO
 * dependencies (checkout + setup-node + `node scripts/graphql-canary.ts`), so
 * the canary entry and EVERY module it statically reaches must confine its
 * imports to node: builtins — or the reality-guard dies before it can observe
 * anything (a standing red that masks real query-contract rot, the rm-177
 * class the canary exists to catch).
 *
 * This suite walks the canary's static import graph (import / re-export-from
 * statements, following relative specifiers only) and fails on any non-node:
 * bare specifier it finds. The fix shape it enforces: the query registry lives
 * in src/github/repo-status-queries.ts, a dependency-free leaf. Negatively
 * verified at introduction by pointing the canary's registry import back at
 * src/github/aggregator.ts (whose transitive graph value-imports @bfra.me/es)
 * and observing this suite red.
 */
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))

/** Linear import-specifier extraction: every `from '<spec>'` plus side-effect `import '<spec>'`. */
function importSpecifiers(source: string): string[] {
  const specifiers: string[] = []
  for (const line of source.split('\n')) {
    const trimmed = line.trimStart()
    if (!trimmed.startsWith('import ') && !trimmed.startsWith('export ')) continue
    // import ... from '<spec>' | export ... from '<spec>' — take the text after
    // the LAST `from` on the line so multi-token import clauses stay simple.
    const fromAt = trimmed.lastIndexOf("from '")
    if (fromAt !== -1) {
      const rest = trimmed.slice(fromAt + 6)
      const close = rest.indexOf("'")
      if (close !== -1) specifiers.push(rest.slice(0, close))
      continue
    }
    // side-effect import '<spec>'
    if (trimmed.startsWith("import '")) {
      const rest = trimmed.slice(7)
      const close = rest.indexOf("'")
      if (close !== -1) specifiers.push(rest.slice(0, close))
    }
  }
  return specifiers
}

/** Resolve a relative specifier against the importing file; repo specifiers carry explicit .ts. */
function resolveSpecifier(specifier: string, importerPath: string): string {
  const base = importerPath.slice(0, importerPath.lastIndexOf('/') + 1)
  let resolved = base + specifier
  while (resolved.includes('/./')) resolved = resolved.replace('/./', '/')
  while (true) {
    const at = resolved.indexOf('/../')
    if (at === -1) break
    const head = resolved.slice(0, at)
    const slash = head.lastIndexOf('/')
    resolved = (slash === -1 ? '' : head.slice(0, slash)) + resolved.slice(at + 3)
  }
  if (!resolved.endsWith('.ts')) resolved += '.ts'
  return resolved
}

function walk(entryPath: string): {violations: string[]; visited: string[]} {
  const violations: string[] = []
  const visited: string[] = []
  const queue = [entryPath]
  while (queue.length > 0) {
    const current = queue.pop() ?? ''
    if (visited.includes(current)) continue
    visited.push(current)
    const source = readFileSync(current, 'utf8')
    for (const specifier of importSpecifiers(source)) {
      if (specifier.startsWith('node:')) continue
      if (specifier.startsWith('./') || specifier.startsWith('../')) {
        queue.push(resolveSpecifier(specifier, current))
        continue
      }
      violations.push(`${current.replace(repoRoot, '')} imports '${specifier}'`)
    }
  }
  return {violations, visited}
}

describe('GraphQL canary import purity (rm-225)', () => {
  const canaryEntry = `${repoRoot}scripts/graphql-canary.ts`
  const {violations, visited} = walk(canaryEntry)

  it('every non-relative specifier in the canary import graph is a node: builtin', () => {
    expect(violations).toEqual([])
  })

  it('the walk reaches the dependency-free query-registry leaf', () => {
    // Guards the guard: an empty or stub walk would pass vacuously. The canary
    // must statically reach src/github/repo-status-queries.ts (the rm-225 leaf).
    expect(visited.map(path => path.replace(repoRoot, ''))).toContain('src/github/repo-status-queries.ts')
  })

  it('the registry leaf itself declares zero imports of any kind', () => {
    const leaf = `${repoRoot}src/github/repo-status-queries.ts`
    expect(importSpecifiers(readFileSync(leaf, 'utf8'))).toEqual([])
  })
})
