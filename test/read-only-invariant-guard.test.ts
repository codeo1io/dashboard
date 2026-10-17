/**
 * rm-649 — machine-check the fork's #1 security invariant: the dashboard is
 * READ-ONLY BY CONSTRUCTION against GitHub.
 *
 * AGENTS.md "Critical security invariants" #1 states every GitHub App
 * installation token is minted with an explicit read-only permissions subset
 * and that no write code path may ever be added. Until now that invariant
 * was enforced only by prose review + the `Record<string, 'read'>` mint
 * signature (types are castable around). This guard freezes it mechanically
 * in three assertion families:
 *
 * 1. SOURCE SCAN — no write-capable GitHub API usage anywhere under src/ and
 *    web/src/ and public/ (write endpoint method calls or mutation route
 *    literals). Verified zero at introduction (2026-10-16, run e178a946
 *    cycle:3); the denylist below is the obvious write surface, deliberately
 *    non-exhaustive but extensible — a red here means the invariant needs an
 *    explicit, deliberate decision, not a quiet drift.
 * 2. MINT-SITE PERMISSIONS — the exported permission objects in
 *    src/github/installations.ts carry only `'read'` values and exactly the
 *    AGENTS-declared subset (core: pull_requests/checks/issues/contents/
 *    metadata; optional: security_events/vulnerability_alerts), AND the
 *    mint-boundary seams in src/github/app-client.ts keep `permissions`
 *    typed as Record<string, 'read'> (interface + factory signature) with a
 *    verbatim pass-through into auth-app — frozen textually because types
 *    are castable around; no 'write'/'admin' VALUE may appear in either
 *    mint-site file.
 * 3. BITE-PROOF — the detector is exercised against synthetic write-capable
 *    snippets so the green in family 1 is a proven detector, not a
 *    pass-through that would stay green if a write call landed tomorrow.
 *
 * Boundary (documented): this guard covers the REST/method surface and route
 * literals. GraphQL mutation coverage lives in
 * test/query-shape-guard.test.ts ("no mutations anywhere in the templates")
 * plus the weekly live canary — comment prose in src/ legitimately says
 * "no mutations", so raw `mutation`-keyword scanning is deliberately NOT part
 * of this guard.
 */
import {readdirSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

import {
  CORE_READ_PERMISSIONS,
  FULL_READ_PERMISSIONS,
  OPTIONAL_READ_PERMISSIONS,
} from '../src/github/installations.ts'

// ---------------------------------------------------------------------------
// Detector
// ---------------------------------------------------------------------------

/**
 * Octokit REST endpoint methods that write (create/update/delete/merge) —
 * the obvious write surface in endpoint-method style. Anything matching here
 * is a read-only-invariant violation by definition.
 */
const WRITE_ENDPOINT_METHODS: readonly string[] = [
  // repository contents / commits / refs
  'createOrUpdateFileContents',
  'createCommit',
  'createCommitComment',
  'createCommitStatus',
  'createRef',
  'updateRef',
  'deleteRef',
  'pushFiles',
  'deleteFile',
  'createTree',
  // pull requests / reviews / comments
  'createPullRequest',
  'updatePullRequest',
  'mergePullRequest',
  'createPullRequestReview',
  'createPullRequestReviewComment',
  'createReviewRequest',
  'createIssueComment',
  // issues / labels / projects
  'createIssue',
  'updateIssue',
  'closeIssue',
  'reopenIssue',
  'addLabels',
  'removeLabels',
  'createLabel',
  // releases / deployments
  'createRelease',
  'updateRelease',
  'deleteRelease',
  'uploadReleaseAsset',
  'createDeployment',
  'createDeploymentStatus',
  // actions / workflows
  'createDispatchEvent',
  'createWorkflowDispatch',
  'reRunWorkflow',
  'reRunJob',
  'createRegistrationToken',
  'createRemoveToken',
  // checks / statuses / webhooks / everything else write-shaped
  'createCheckRun',
  'updateCheckRun',
  'createCheckSuite',
  'rerequestCheckSuite',
  'createWebhook',
  'updateWebhook',
  'deleteWebhook',
  'createRepository',
  'updateRepository',
  'createFork',
  'createInOrg',
  'createUsingTemplate',
]

/**
 * Mutation route literals — `octokit.request('POST /repos/...')` and any
 * string-form route with a writing verb. GET routes are read-only and pass.
 */
const MUTATION_ROUTE_PATTERN = /['`](?:POST|PUT|PATCH|DELETE)\s+\/\S/

const WRITE_METHOD_PATTERNS: readonly RegExp[] = WRITE_ENDPOINT_METHODS.map(
  method => new RegExp(String.raw`\.${method}\s*\(`),
)

/** A permission VALUE literal that is not 'read' — `{contents: 'write'}` etc. */
const NON_READ_PERMISSION_VALUE = /:\s*'(?:write|admin)'/

export interface WriteUsageFinding {
  readonly file: string
  readonly line: number
  readonly match: string
}

/** Line-based detector shared by the live scan and the bite-proof suite. */
export function detectWriteUsage(source: string, file: string): WriteUsageFinding[] {
  const findings: WriteUsageFinding[] = []
  source.split('\n').forEach((line, index) => {
    for (const pattern of WRITE_METHOD_PATTERNS) {
      const match = line.match(pattern)
      if (match) {
        findings.push({file, line: index + 1, match: match[0]})
      }
    }
    const route = line.match(MUTATION_ROUTE_PATTERN)
    if (route) {
      findings.push({file, line: index + 1, match: route[0]})
    }
  })
  return findings
}

function collectSourceFiles(dir: string, extensions: readonly string[]): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...collectSourceFiles(full, extensions))
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      out.push(full)
    }
  }
  return out
}

function scanTree(root: string, extensions: readonly string[]): WriteUsageFinding[] {
  const findings: WriteUsageFinding[] = []
  for (const file of collectSourceFiles(root, extensions)) {
    findings.push(...detectWriteUsage(readFileSync(file, 'utf8'), file))
  }
  return findings
}

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------

describe('read-only invariant guard (rm-649)', () => {
  it('the scanner reads the real trees this guard freezes (scan is not empty)', () => {
    const repoRoot = fileURLToPath(new URL('..', import.meta.url))
    const serverFiles = collectSourceFiles(join(repoRoot, 'src'), ['.ts'])
    const webFiles = collectSourceFiles(join(repoRoot, 'web/src'), ['.ts', '.tsx'])
    // If either tree disappears or moves, the green below would be vacuous —
    // fail loudly instead. 40+/30+ files at introduction (2026-10-16).
    expect(serverFiles.length).toBeGreaterThanOrEqual(40)
    expect(webFiles.length).toBeGreaterThanOrEqual(30)
  })

  it('src/, web/src/, and public/ contain ZERO write-capable GitHub API usage (the invariant, frozen)', () => {
    const repoRoot = fileURLToPath(new URL('..', import.meta.url))
    const findings = [
      ...scanTree(join(repoRoot, 'src'), ['.ts']),
      ...scanTree(join(repoRoot, 'web/src'), ['.ts', '.tsx']),
      ...scanTree(join(repoRoot, 'public'), ['.js']),
    ]
    expect(findings).toEqual([])
  })

  it('bite-proof: the detector flags every write-capable snippet family it must catch', () => {
    const synthetic = [
      'await octokit.rest.repos.createOrUpdateFileContents({owner, path, content})',
      'await octokit.pulls.createPullRequest({title, head, base})',
      'await octokit.pulls.mergePullRequest({pull_number})',
      "await client.octokit.issues.addLabels({labels: ['x']})",
      'await octokit.rest.actions.createWorkflowDispatch({workflow_id, ref})',
      "await octokit.request('POST /repos/{owner}/{repo}/git/refs', params)",
      "await octokit.request('DELETE /repos/{owner}/{repo}', {})",
    ]
    for (const snippet of synthetic) {
      expect(detectWriteUsage(snippet, 'synthetic.ts')).not.toEqual([])
    }
  })

  it('bite-proof: the detector does NOT flag read-only usage (no false-positive pass-through)', () => {
    const readOnly = [
      'await octokit.rest.apps.listInstallations({})',
      "await octokit.request('GET /repos/{owner}/{repo}/installation', params)",
      'const created = new Date(row.created_at)',
      "const label = row.labels.create ? 'a' : 'b'",
    ]
    for (const snippet of readOnly) {
      expect(detectWriteUsage(snippet, 'readonly.ts')).toEqual([])
    }
  })

  it('mint-site permission objects carry ONLY read values and exactly the AGENTS-declared subset', () => {
    for (const [name, permissions] of [
      ['CORE_READ_PERMISSIONS', CORE_READ_PERMISSIONS],
      ['OPTIONAL_READ_PERMISSIONS', OPTIONAL_READ_PERMISSIONS],
      ['FULL_READ_PERMISSIONS', FULL_READ_PERMISSIONS],
    ] as const) {
      const entries = Object.entries(permissions)
      expect(entries.length).toBeGreaterThan(0)
      for (const [scope, access] of entries) {
        expect(access, `${name}.${scope}`).toBe('read')
      }
    }
    expect(new Set(Object.keys(CORE_READ_PERMISSIONS))).toEqual(
      new Set(['pull_requests', 'checks', 'issues', 'contents', 'metadata']),
    )
    expect(new Set(Object.keys(OPTIONAL_READ_PERMISSIONS))).toEqual(
      new Set(['security_events', 'vulnerability_alerts']),
    )
    expect(new Set(Object.keys(FULL_READ_PERMISSIONS))).toEqual(
      new Set([...Object.keys(CORE_READ_PERMISSIONS), ...Object.keys(OPTIONAL_READ_PERMISSIONS)]),
    )
  })

  it('app-client.ts mint seams keep write/admin scopes unrepresentable (type wall + verbatim pass-through)', () => {
    const repoRoot = fileURLToPath(new URL('..', import.meta.url))
    const source = readFileSync(join(repoRoot, 'src/github/app-client.ts'), 'utf8')
    // The DashboardAppClient interface + the factory's mintInstallationToken
    // signature are the boundary's type walls (stewardship sites ~:116/:163/
    // :170) — write/admin scopes must stay unrepresentable there by
    // construction. Line numbers drift; the pattern is the contract.
    const typeWalls = source.match(/permissions:\s*Record<string, 'read'>/g) ?? []
    expect(typeWalls.length).toBeGreaterThanOrEqual(2)
    // The auth-app hook passes the CALLER's permissions object through
    // verbatim — no scope synthesis at the transport seam.
    expect(source).toMatch(/type:\s*'installation',\s*permissions,/)
    // And neither mint-site file may carry a non-'read' permission VALUE.
    for (const mintFile of ['src/github/app-client.ts', 'src/github/installations.ts']) {
      const text = readFileSync(join(repoRoot, mintFile), 'utf8')
      expect(
        NON_READ_PERMISSION_VALUE.test(text),
        `${mintFile}: non-'read' permission value literal present`,
      ).toBe(false)
    }
  })

  it('bite-proof: the mint-seam value scan flags write/admin literals and passes read', () => {
    expect(NON_READ_PERMISSION_VALUE.test("const p = {contents: 'write'}")).toBe(true)
    expect(NON_READ_PERMISSION_VALUE.test("const p = {metadata: 'admin'}")).toBe(true)
    expect(NON_READ_PERMISSION_VALUE.test("const p = {contents: 'read'}")).toBe(false)
    expect(NON_READ_PERMISSION_VALUE.test("type: 'installation', permissions,")).toBe(false)
  })
})
