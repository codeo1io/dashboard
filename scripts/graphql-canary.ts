/**
 * rm-179/rm-225 reality canary — execute EVERY registered template against
 * the REAL API.
 *
 * Origin: 2026-09-24, run 6fe26972. Two failures that day shared one class —
 * green CI over broken reality: the aggregator's GraphQL templates carried
 * `//` comments GitHub rejects (rm-177; every transport in tests was faked,
 * so no suite could catch it), and the base-drift gate's digest extraction
 * was structurally empty while the workflow was believed green (rm-178).
 *
 * 2026-09-25, run aaa84dff (rm-225): the original canary imported
 * REPO_STATUS_QUERY only, while the aggregator ships a second live-destined
 * template (REPO_STATUS_QUERY_NO_ALERTS, the fallback used when an
 * installation lacks the security-events scope) that never executed anywhere.
 * The script now iterates REPO_STATUS_QUERY_REGISTRY — the same list the
 * aggregator draws from — so adding a template auto-extends live coverage;
 * test/query-shape-guard.test.ts enforces the registry's completeness
 * offline. Scheduled weekly by .github/workflows/canary.yaml (never a
 * required check, never a write) and dispatchable on demand.
 */
import {createHash} from 'node:crypto'
import {realpathSync} from 'node:fs'
import process from 'node:process'
import {fileURLToPath} from 'node:url'

import {isVulnerabilityAlertsPermissionError} from '../src/github/aggregator.ts'
import {REPO_STATUS_QUERY_REGISTRY} from '../src/github/query-registry.ts'

const rawRepository = process.env.GITHUB_REPOSITORY ?? ''
// In Actions this is always 'owner/repo'; locally it may be unset or junk.
// Only a well-formed value overrides the default target — never trust a
// slash-less/empty-owner string to the API.
const repositoryMatches = /^([\w.-]+)\/([\w.-]+)$/.exec(rawRepository)
const owner = repositoryMatches?.[1] ?? 'codeo1io'
const name = repositoryMatches?.[2] ?? 'dashboard'

/**
 * Best-effort message extraction for a raw GraphQL `errors[]` entry: they
 * arrive as plain objects (no Error class), unlike the Octokit
 * GraphqlResponseError the aggregator's classifier was built around — so
 * wrap them in an Error before reusing that classifier.
 */
function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error && typeof (error).message === 'string') {
    return (error as {message: string}).message
  }
  return String(error)
}

/**
 * Classify a template run's GraphQL errors (ledger rm-1973, cycle-18 batch
 * run 743f2e47 — the canary credential-parity half). 'scope-limited' means
 * EVERY error is a vulnerability-alerts permission denial — the exact class
 * the aggregator's own classifier recognizes (rm-170/rm-168) and the exact
 * reason the NO_ALERTS fallback template exists (rm-171): the template is
 * fine, the credential just lacks the optional alerts scope, and the weekly
 * canary must not go red over it. Anything else — or an empty error set,
 * which is not evidence of a scope limit — is 'query-drift', the red
 * outcome that means the shipped template and the live schema disagree.
 * Exported so it can be unit-tested offline (test/graphql-canary.test.ts).
 */
export function classifyGraphqlErrors(errors: readonly unknown[]): 'scope-limited' | 'query-drift' {
  if (errors.length === 0) return 'query-drift'
  return errors.every(error => isVulnerabilityAlertsPermissionError(new Error(errorMessage(error)))) ? 'scope-limited' : 'query-drift'
}

async function runTemplate(token: string, entry: {readonly name: string; readonly query: string}): Promise<void> {
  const query = entry.query
  // The digest makes "which exact query text ran" auditable from the run log.
  console.log(`canary: query ${entry.name} sha256 ${createHash('sha256').update(query).digest('hex')}`)

  let status: number
  let body: unknown
  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'content-type': 'application/json',
        'user-agent': 'dashboard-graphql-canary',
      },
      body: JSON.stringify({query, variables: {owner, name}}),
    })
    status = res.status
    body = await res.json()
  } catch (error) {
    console.error(`canary: ${entry.name} transport failure — ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }

  const errors = (body as {errors?: unknown[]} | null)?.errors
  if (status !== 200) {
    console.error(`canary: ${entry.name} HTTP ${status} — the real API would reject this query today`)
    console.error(JSON.stringify(body, null, 2))
    process.exit(1)
  }
  if (errors && errors.length > 0) {
    const classification = classifyGraphqlErrors(errors)
    if (classification === 'scope-limited') {
      // rm-1973: every error is a vulnerability-alerts permission denial —
      // the aggregator serves these targets via the NO_ALERTS fallback
      // (rm-171), so the primary template itself is proven sound; the
      // credential lacks the optional alerts scope. WARN, not a page.
      console.warn(`canary: WARN ${entry.name} scope-limited — every GraphQL error is a vulnerability-alerts permission denial (the aggregator would fall back to NO_ALERTS); not a template defect (rm-1973)`)
      return
    }
    console.error(`canary: ${entry.name} GraphQL errors — the real API would reject this query today (rm-177 class):`)
    console.error(JSON.stringify(errors, null, 2))
    process.exit(1)
  }

  const repository = (body as {data?: {repository?: object}} | null)?.data?.repository
  if (!repository) {
    console.error(`canary: ${entry.name} response contained no repository object — query shape drifted from the contract:`)
    console.error(JSON.stringify(body, null, 2))
    process.exit(1)
  }

  // The shipped templates deliberately select no identity field (each is the
  // exact string the aggregator sends), so report the local target coords.
  // rm-192: every template now also selects the failing-check drill-down
  // (workflowRun{displayTitle,runAttempt} + checkRuns nodes{name,detailsUrl}).
  // Report how many suites answered those selections so the weekly log gives
  // explicit evidence the new sub-selection round-trips against the live API
  // (absent selections are legitimate — suites may be empty on a green target).
  const rollupTarget = (body as {data?: {repository?: {defaultBranchRef?: {target?: {checkSuites?: {nodes?: unknown[] | null} | null} | null} | null} | null}} | null)?.data?.repository?.defaultBranchRef?.target
  const suites = (rollupTarget?.checkSuites?.nodes ?? []) as {workflowRun?: unknown; checkRuns?: {nodes?: unknown[] | null} | null}[]
  const suitesWithWorkflowRun = suites.filter(suite => suite.workflowRun !== null && suite.workflowRun !== undefined).length
  const suitesWithCheckRunNodes = suites.filter(suite => (suite.checkRuns?.nodes ?? []).length > 0).length
  console.log(`canary: drill-down coverage — ${suites.length} check suite(s), ${suitesWithWorkflowRun} with workflowRun, ${suitesWithCheckRunNodes} with check-run nodes (rm-192, ${entry.name})`)
  console.log(`canary: OK — ${owner}/${name} answered the exact shipped ${entry.name}`)
}

async function main(): Promise<void> {
  const token = process.env.GITHUB_TOKEN ?? ''
  if (token === '') {
    console.error('GITHUB_TOKEN is required (read-only metadata is sufficient for a public repo)')
    process.exit(1)
  }
  // rm-1973 registry-emptiness failsafe: an empty registry would loop zero
  // times and report success without proving anything.
  if (REPO_STATUS_QUERY_REGISTRY.length === 0) {
    console.error('canary: FAIL — REPO_STATUS_QUERY_REGISTRY is empty; no template was proven against the live API (failsafe, rm-1973)')
    process.exit(1)
  }
  console.log(`canary: target ${owner}/${name} — ${REPO_STATUS_QUERY_REGISTRY.length} registered template(s)`)
  for (const entry of REPO_STATUS_QUERY_REGISTRY) {
    await runTemplate(token, entry)
  }
}

/**
 * Direct-invocation guard (rm-1973; the round's P3-2 cure): importing this
 * module — e.g. from a unit test — must NOT fire the live run (which would
 * demand GITHUB_TOKEN and process.exit on it). Only a direct
 * `node scripts/graphql-canary.ts` invocation runs main().
 */
function isDirectInvocation(): boolean {
  const argvPath = process.argv[1]
  if (argvPath === undefined) return false
  try {
    return realpathSync(argvPath) === realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
}

if (isDirectInvocation()) {
  await main()
}
