/**
 * Read-only-by-construction guard (rm-649, invariant #1 — AGENTS.md).
 *
 * The dashboard's core security invariant is PROSE today: "never add a write
 * code path". Upstream fro-bot/dashboard actively diverges — it carries an
 * isolated wiki-write capability as a `wiki-writer/` workspace package
 * (`@fro-bot/wiki-writer`, depending on `@fro-bot/wiki-write-core`, GitHub
 * REST `POST`/`DELETE` routes in wiki-writer/src/github-data-client.ts) — so
 * an absorb that rides a write surface in would land GREEN under the current
 * test suite. This guard converts the invariant into CI enforcement: a static
 * scan of the server tree (src/) plus the workspace manifests for every
 * forbidden write-capability shape.
 *
 * What it scans (import graph + call names, per rm-649 acceptance):
 * 1. Import/export specifiers reaching the wiki-writer family (package names
 *    or relative paths into wiki-writer/), and the package's presence as a
 *    workspace directory or dependency at all.
 * 2. Octokit REST routes with a mutating verb — the only sanctioned GitHub
 *    API transport here is `.request('GET …')` (installation tokens are also
 *    minted read-only, but this file must fail even if that mint-time guard
 *    regresses).
 * 3. Octokit REST-method families on write namespaces (repos/pulls/issues/
 *    git/apps) with a non-read method — get-prefixed and list-prefixed
 *    methods are reads; every other method on those namespaces mutates.
 * 4. GraphQL mutations — the aggregator's per-repo GraphQL is read queries
 *    only (query-registry).
 *
 * Red-on-seeded-violation is proven in-file: the same matchers run against a
 * synthetic violation corpus, so a matcher regression fails loudly here
 * instead of silently passing a real violation. Runs in the Main Test job via
 * the root vitest include (test files matching the test-directory glob →
 * `pnpm test`).
 */
import {readdir, readFile, stat} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..')
const srcRoot = path.join(repoRoot, 'src')

/**
 * Wiki-writer module family — the upstream write capability. Grounded in the
 * upstream tree (fro-bot/dashboard wiki-writer/package.json name and the
 * @fro-bot/wiki-write-core dependency), not in a guessed list.
 */
const FORBIDDEN_SPECIFIER_PATTERNS: {pattern: RegExp; label: string}[] = [
  {pattern: /(^|\/)wiki-writer(\/|$)/, label: 'wiki-writer workspace path'},
  {pattern: /@fro-bot\/wiki-writer\b/, label: '@fro-bot/wiki-writer package'},
  {pattern: /@fro-bot\/wiki-write-core\b/, label: '@fro-bot/wiki-write-core package'},
]

/** Mutating REST verbs — the GitHub API surface here is GET-only. */
const MUTATING_REST_VERBS = /['"`](?:POST|PATCH|PUT|DELETE)\s+\/[^'"`\s]*/g

/**
 * Octokit REST-method write shape: `octokit.pulls.create(`, `issues.update(`,
 * `repos.delete(`, `pulls.merge(` … on the write namespaces. get-prefixed and
 * list-prefixed methods are the reads; everything else on these namespaces
 * mutates. rm-756: the receiver set includes the `gh` alias spelling, and
 * the namespace set covers the non-CRUD write families (checks,
 * codeScanning, migrations, actions) whose methods carry no verb-stem
 * prefix (rerequestRun, uploadSarif, startForOrg, approveWorkflowRun …).
 * The alias/destructuring and `.rest` facets are rm-747's scope.
 */
const OCTOKIT_METHOD_WRITE = /\b(?:octokit|githubClient|gitHub|gh)\s*\.\s*(?:repos|pulls|issues|git|apps|users|orgs|checks|codeScanning|migrations|actions)\s*\.\s*(?!(?:get|list)(?:[A-Z]|\b))[\w$]+\s*\(/g

/** GraphQL mutation — the string/template must OPEN with `mutation`. */
const GRAPHQL_MUTATION = /['"`]mutation[\s{(]/g

/** Import/export specifier extraction — enough for a static guard. */
const SPECIFIER = /(?:import|export)[^'";]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g

export interface Violation {
  readonly file: string
  readonly line: number
  readonly kind: string
  readonly detail: string
}

function lineOf(text: string, index: number): number {
  let line = 1
  for (let i = 0; i < index; i++) {
    if (text.charCodeAt(i) === 10) line++
  }
  return line
}

/** Scan one file's text for every forbidden write-capability shape. */
export function scanText(file: string, text: string): Violation[] {
  const violations: Violation[] = []
  const push = (kind: string, detail: string, index: number) => {
    violations.push({file, line: lineOf(text, index), kind, detail})
  }

  for (const spec of text.matchAll(SPECIFIER)) {
    const specifier = spec[1] ?? spec[2] ?? spec[3] ?? ''
    if (!specifier) continue
    for (const forbidden of FORBIDDEN_SPECIFIER_PATTERNS) {
      if (forbidden.pattern.test(specifier)) {
        push('forbidden-import', `${forbidden.label}: ${specifier}`, spec.index ?? 0)
      }
    }
  }

  for (const match of text.matchAll(MUTATING_REST_VERBS)) {
    push('mutating-rest-route', match[0], match.index ?? 0)
  }
  for (const match of text.matchAll(OCTOKIT_METHOD_WRITE)) {
    push('octokit-write-method', match[0], match.index ?? 0)
  }
  for (const match of text.matchAll(GRAPHQL_MUTATION)) {
    push('graphql-mutation', match[0], match.index ?? 0)
  }
  return violations
}

async function collectTsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, {withFileTypes: true})
  const files: string[] = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await collectTsFiles(full)))
    else if (entry.name.endsWith('.ts')) files.push(full)
  }
  return files.sort()
}

describe('read-only invariant guard (rm-649) — src/ stays free of write-capability surfaces', () => {
  it('current tree is green: zero violations across src/', async () => {
    const files = await collectTsFiles(srcRoot)
    // Sanity: the scan actually reached the server tree.
    expect(files.length).toBeGreaterThan(10)
    const violations: Violation[] = []
    for (const file of files) {
      violations.push(...scanText(path.relative(repoRoot, file), await readFile(file, 'utf8')))
    }
    expect(violations).toEqual([])
  })

  it('no wiki-writer workspace directory and no wiki-writer dependency in manifests', async () => {
    // The upstream capability is a sibling workspace package — an absorb that
    // brings the package in (even before any src/ import exists) fails here.
    const wikiWriterDir = path.join(repoRoot, 'wiki-writer')
    await expect(stat(wikiWriterDir)).rejects.toThrow()
    const packageJson = await readFile(path.join(repoRoot, 'package.json'), 'utf8')
    expect(FORBIDDEN_SPECIFIER_PATTERNS.map(f => f.pattern).some(p => p.test(packageJson))).toBe(false)
  })

  it('red on seeded violations: every forbidden class is flagged by the same matchers', () => {
    const seeds: {kind: string; text: string; expectMatch: string}[] = [
      {
        kind: 'mutating-rest-route',
        text: `const r = await appClient.octokit.request('POST /repos/{owner}/{repo}/issues', {title})`,
        expectMatch: 'POST /repos',
      },
      {
        kind: 'mutating-rest-route',
        text: `const r = await request(octokit, 'DELETE /repos/{owner}/{repo}/git/refs/{ref}', params)`,
        expectMatch: 'DELETE /repos',
      },
      {
        kind: 'mutating-rest-route',
        text: 'const r = await request(octokit, `PATCH /repos/{owner}/{repo}/pulls/{pull_number}`, params)',
        expectMatch: 'PATCH /repos',
      },
      {kind: 'octokit-write-method', text: 'await octokit.pulls.create({title, head, base})', expectMatch: 'pulls.create'},
      {kind: 'octokit-write-method', text: 'await octokit.pulls.merge({pull_number: 1})', expectMatch: 'pulls.merge'},
      {kind: 'octokit-write-method', text: 'await octokit.issues.update({state: \'closed\'})', expectMatch: 'issues.update'},
      {kind: 'octokit-write-method', text: 'await octokit.repos.delete({owner, repo})', expectMatch: 'repos.delete'},
      // rm-756 red-first corpus — the verb-shape escape classes that passed
      // BOTH layered matchers before the rm-756 close: bare-verb last segments
      // on an aliased receiver (gh), and non-stem write methods on write
      // namespaces that were absent from the method-form list. Every shape is
      // a real mutating Octokit REST method.
      {kind: 'octokit-write-method', text: 'await gh.repos.delete({owner, repo})', expectMatch: 'gh.repos.delete'},
      {kind: 'octokit-write-method', text: 'await gh.pulls.merge({pull_number: 1})', expectMatch: 'gh.pulls.merge'},
      {kind: 'octokit-write-method', text: 'await octokit.checks.rerequestRun({owner, repo, check_run_id})', expectMatch: 'checks.rerequestRun'},
      {kind: 'octokit-write-method', text: 'await octokit.checks.rerequestSuite({owner, repo, check_suite_id})', expectMatch: 'checks.rerequestSuite'},
      {kind: 'octokit-write-method', text: 'await octokit.codeScanning.uploadSarif({owner, repo})', expectMatch: 'codeScanning.uploadSarif'},
      {kind: 'octokit-write-method', text: 'await octokit.codeScanning.defaultSetupUpdate({owner, repo})', expectMatch: 'codeScanning.defaultSetupUpdate'},
      {kind: 'octokit-write-method', text: 'await octokit.migrations.startForOrg({org})', expectMatch: 'migrations.startForOrg'},
      {kind: 'octokit-write-method', text: 'await octokit.actions.approveWorkflowRun({owner, repo, workflow_id})', expectMatch: 'actions.approveWorkflowRun'},
      {
        kind: 'forbidden-import',
        text: `import {writePage} from '@fro-bot/wiki-write-core'`,
        expectMatch: '@fro-bot/wiki-write-core',
      },
      {
        kind: 'forbidden-import',
        text: `import {m} from '../wiki-writer/src/contract.ts'`,
        expectMatch: 'wiki-writer workspace path',
      },
      {
        kind: 'forbidden-import',
        text: `const mod = await import('wiki-writer/src/write-operation.ts')`,
        expectMatch: 'wiki-writer workspace path',
      },
      {
        kind: 'graphql-mutation',
        text: 'const res = await octokit.graphql(`mutation { updateIssue(input: {id}) { id } }`, vars)',
        expectMatch: 'mutation',
      },
    ]
    for (const seed of seeds) {
      const hits = scanText('seeded.ts', seed.text).filter(
        v => v.kind === seed.kind && v.detail.includes(seed.expectMatch),
      )
      expect(hits.length, `seeded ${seed.kind} must be flagged: ${seed.text}`).toBeGreaterThan(0)
    }
  })

  it('green on the sanctioned read shapes: no false positives on today\u2019s call forms', () => {
    const sanctioned = [
      `const response = await appClient.octokit.request('GET /app/installations', {per_page})`,
      `const response = await request(octokit, 'GET /repos/{owner}/{repo}/installation', {owner, repo})`,
      'const res = await octokit.pulls.list({owner, repo})',
      'const res = await octokit.repos.getContent({owner, repo, path})',
      // rm-756: receiver/namespace extensions must not flag sanctioned reads —
      // the gh alias and the checks/codeScanning namespaces are policed by
      // method shape (get/list prefix), not by receiver or namespace alone.
      'const res = await gh.repos.getContent({owner, repo, path})',
      'const res = await gh.checks.listForRef({owner, repo, ref})',
      'const res = await octokit.codeScanning.listAlertsForRepo({owner, repo})',
      `import {createAppAuth} from '@octokit/auth-app'`,
      `import {Octokit} from '@octokit/core'`,
      'const data = await octokit.graphql(`query { viewer { login } }`)',
      `import {REPO_STATUS_QUERY} from './query-registry.ts'`,
    ]
    for (const text of sanctioned) {
      expect(scanText('sanctioned.ts', text), `sanctioned shape must not be flagged: ${text}`).toEqual([])
    }
  })

  it('a comment mentioning the word mutation is not a violation', () => {
    // src/routes/listener.ts:41 carries exactly this prose today.
    const text = `/** submitted on every ack mutation via the session middleware */`
    expect(scanText('comment.ts', text)).toEqual([])
  })
})
