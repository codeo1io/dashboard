import {readdirSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

// rm-649: static read-only-invariant guard.
//
// The dashboard is read-only BY CONSTRUCTION: every GitHub App installation
// token is minted with an explicit read-only permissions subset at mint time
// (src/github/installations.ts:24-43) and no write code path may exist. That
// invariant is otherwise enforced only by review convention — this guard
// machine-checks it on every Main Test run, and doubles as the standing trip
// wire for the upstream-absorb hazard: upstream fro-bot/dashboard has adopted
// an isolated repository-editing (wiki) capability (see AGENTS.md — standing
// never-absorb item, upstream PR #498), so any future absorb that carries
// write-capability machinery into src/ fails here loudly.
//
// Design: three independent detectors run over every tracked src/*.ts file —
// (1) forbidden write-capability module specifiers (the wiki surface family),
// (2) forbidden non-GET GitHub REST request literals and write-verb call
//     families on Octokit receivers,
// (3) the mint-time permission sets in src/github/installations.ts must
//     contain only `:read` scopes.
// A seeded-red fixture proves the detectors bite before they are trusted on
// the real tree: the same detector functions must fire on an inline violation
// sample, so a detector that silently matches nothing can never pass.

const repoRoot = process.cwd()

// Upstream's wiki-edit capability family and any module specifier that
// carries write-capable GitHub machinery. Matched case-insensitively against
// the specifier segment of import/require/dynamic-import statements.
const FORBIDDEN_SPECIFIER_PATTERNS = [
  /wiki/,
  /github-graphql-write/,
  /repository-edit/,
  /repo-edit/,
] as const

// GitHub REST verbs that mutate. A read-only client may only ever issue GETs;
// `octokit.request('POST …')`-style literals are unambiguous write attempts.
const FORBIDDEN_REQUEST_VERBS = /^(?:POST|PUT|PATCH|DELETE)\b/i

// Write-verb call families on Octokit receivers. Readonly Octokit APIs are
// uniformly `get*`/`list*`; any create/update/delete/add/remove/merge/edit/
// cancel/rerun/dismiss call name is a write surface regardless of receiver.
const WRITE_CALL_NAME =
  /^(?:create|update|delete|add|remove|set|merge|edit|cancel|rerun|dismiss|close|reopen|lock|unlock|archive|transfer|enable|disable)[A-Z]/u

// Receivers whose method calls are Octokit API surfaces. Static scanning
// without type info cannot know every receiver, so this matches call chains
// starting at the shapes that appear in this codebase (`octokit.*`, `client.*`,
// `app.*`, `gh.*`, `api.*`) — including nested namespaces like
// `gh.repos.createOrUpdateFileContents(…)` — and inspects the LAST segment
// (the actual method name) against the write-verb families.
const API_CALL_CHAIN =
  /\b(?:octokit|client|app|gh|api)((?:\.[A-Za-z_$][\w$]*)+)\(/u

// Mint-time permission grants. Only 'read' values may ever appear in the
// two exported permission objects (see src/github/installations.ts:24-43);
// the objects are additionally compiler-pinned by `satisfies
// Record<string, 'read'>`, which the test asserts is still present.
const PERMISSION_FILE = 'src/github/installations.ts'
const PERMISSION_SCOPE = /([a-z_]+)\s*:\s*'(read|write|admin)'/gu
const PERMISSION_SATISFIES = /satisfies Record<string, 'read'>/gu

interface Violation {detector: string; file: string; line: number; excerpt: string}

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    const full = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...walk(full))
    } else if (entry.name.endsWith('.ts')) {
      out.push(full)
    }
  }
  return out
}

function relativize(file: string): string {
  return file.slice(resolve(repoRoot).length + 1)
}

function detect(source: string, relFile: string): Violation[] {
  const violations: Violation[] = []
  const lines = source.split('\n')

  lines.forEach((line, idx) => {
    const lineno = idx + 1
    const excerpt = line.trim().slice(0, 120)

    // (1) import/require/dynamic-import specifier carrying a forbidden module.
    const specifier =
      /(?:import\s[^'"]*?from\s*|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/u.exec(
        line,
      )
    const spec = specifier?.[1] ?? ''
    if (spec !== '') {
      for (const pattern of FORBIDDEN_SPECIFIER_PATTERNS) {
        if (pattern.test(spec)) {
          violations.push({
            detector: 'forbidden-module',
            file: relFile,
            line: lineno,
            excerpt,
          })
        }
      }
    }

    // (2a) non-GET REST request literals.
    const request = /\.request\s*\(\s*['"]([^'"]+)['"]/u.exec(line)
    if (request && FORBIDDEN_REQUEST_VERBS.test(request[1] ?? '')) {
      violations.push({
        detector: 'write-request-literal',
        file: relFile,
        line: lineno,
        excerpt,
      })
    }

    // (2b) write-verb call names on Octokit-style receiver chains.
    const chain = API_CALL_CHAIN.exec(line)?.[1] ?? ''
    if (chain !== '') {
      const segments = chain.split('.').filter(Boolean)
      const method = segments.at(-1) ?? ''
      if (WRITE_CALL_NAME.test(method)) {
        violations.push({
          detector: 'write-call-family',
          file: relFile,
          line: lineno,
          excerpt,
        })
      }
    }
  })

  // (3) mint-time permission values must be 'read' — anywhere in the file,
  // so a scope smuggled into any shape (map, union, fallback) still trips.
  if (relFile === PERMISSION_FILE) {
    for (const match of source.matchAll(PERMISSION_SCOPE)) {
      if (match[2] !== 'read') {
        const lineno = source.slice(0, match.index ?? 0).split('\n').length
        violations.push({
          detector: 'write-permission-scope',
          file: relFile,
          line: lineno,
          excerpt: match[0],
        })
      }
    }
  }

  return violations
}

describe('read-only invariant guard (rm-649)', () => {
  it('detectors bite: seeded-red fixture must fire every detector', () => {
    const fixture = [
      `import { downloadWikiTarball } from '@fro-bot/wiki-sync'`,
      `await octokit.request('PUT /repos/{owner}/{repo}/git/refs', { ref })`,
      `const gh = await gh.repos.createOrUpdateFileContents({...})`,
      `export const P = { contents: 'write' } as const`,
    ].join('\n')
    const violations = detect(fixture, PERMISSION_FILE) // permission scope check rides the fixture file name
    const detectors = new Set(violations.map(v => v.detector))
    expect([...detectors].sort()).toEqual([
      'forbidden-module',
      'write-call-family',
      'write-permission-scope',
      'write-request-literal',
    ])
  })

  it('src/ contains no write-capability surface', () => {
    const files = walk(resolve(repoRoot, 'src'))
    expect(files.length).toBeGreaterThan(20) // walker sanity: it must actually find the tree
    const violations = files.flatMap(file =>
      detect(readFileSync(file, 'utf8'), relativize(file)),
    )
    expect(violations).toEqual([])
  })

  it('mint-time permission sets grant read scopes only', () => {
    const source = readFileSync(resolve(repoRoot, PERMISSION_FILE), 'utf8')
    const scopes = [...source.matchAll(PERMISSION_SCOPE)].map(m => `${m[1]}:'${m[2]}'`)
    expect(scopes.length).toBeGreaterThanOrEqual(7) // CORE 5 + OPTIONAL 2 — the file must still be the permission surface
    for (const scope of scopes) {
      expect(scope.endsWith(":'read'")).toBe(true)
    }
    // The compiler-side belt: both permission objects must stay pinned by the
    // `satisfies Record<string, 'read'>` clause, not just lint-clean by value.
    expect(source.match(PERMISSION_SATISFIES)?.length ?? 0).toBeGreaterThanOrEqual(2)
  })
})
