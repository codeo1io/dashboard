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
 *
 * 2026-09-26, run 743f2e47 (rm-228 credential parity): the workflow's
 * GITHUB_TOKEN may lack the optional security-events read the alerts-carrying
 * template selects (the hosted token's Dependabot-alerts grant is not
 * provable from inside the workflow). Production degrades exactly this gap
 * via the NO_ALERTS fallback (rm-170), so the canary degrades the same way:
 * when EVERY error of a template run is the vulnerability-alerts permission
 * class, that template is reported SCOPE-LIMITED (not red), and the
 * no-alerts template — which the registry always runs — carries the
 * query-contract proof. Red still means exactly one thing: the real API
 * would reject our query today.
 */
import {createHash} from 'node:crypto'
import process from 'node:process'

import {isVulnerabilityAlertsPermissionError, REPO_STATUS_QUERY_REGISTRY} from '../src/github/aggregator.ts'

const rawRepository = process.env.GITHUB_REPOSITORY ?? ''
// In Actions this is always 'owner/repo'; locally it may be unset or junk.
// Only a well-formed value overrides the default target — never trust a
// slash-less/empty-owner string to the API.
const repositoryMatches = /^([\w.-]+)\/([\w.-]+)$/.exec(rawRepository)
const owner = repositoryMatches?.[1] ?? 'codeo1io'
const name = repositoryMatches?.[2] ?? 'dashboard'

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  const message = (error as {message?: unknown} | null)?.message
  return typeof message === 'string' ? message : String(error)
}

async function runTemplate(token: string, entry: {readonly name: string; readonly query: string}): Promise<'ok' | 'scope-limited'> {
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
    console.error(`canary: ${entry.name} transport failure — ${errorMessage(error)}`)
    process.exit(1)
  }

  const errors = (body as {errors?: unknown[]} | null)?.errors
  if (status !== 200) {
    console.error(`canary: ${entry.name} HTTP ${status} — the real API would reject this query today`)
    console.error(JSON.stringify(body, null, 2))
    process.exit(1)
  }
  if (errors && errors.length > 0) {
    if (errors.every(error => isVulnerabilityAlertsPermissionError(new Error(errorMessage(error))))) {
      // rm-228: credential parity, not query drift — the token lacks the
      // optional security-events read that only the alerts selection needs.
      // Production fails over to the no-alerts template for exactly this
      // error (rm-170); the canary mirrors that instead of crying red on a
      // credentials gap it cannot fix from inside the workflow.
      console.warn(`canary: ${entry.name} SCOPE-LIMITED — token lacks the optional vulnerability-alerts read (rm-170 class); the no-alerts template carries the contract proof`)
      return 'scope-limited'
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
  console.log(`canary: OK — ${owner}/${name} answered the exact shipped ${entry.name}`)
  return 'ok'
}

async function main(): Promise<void> {
  const token = process.env.GITHUB_TOKEN ?? ''
  if (token === '') {
    console.error('GITHUB_TOKEN is required (read-only metadata is sufficient for a public repo)')
    process.exit(1)
  }
  console.log(`canary: target ${owner}/${name} — ${REPO_STATUS_QUERY_REGISTRY.length} registered template(s)`)
  let provedContract = false
  for (const entry of REPO_STATUS_QUERY_REGISTRY) {
    if ((await runTemplate(token, entry)) === 'ok') provedContract = true
  }
  if (!provedContract) {
    // Unreachable while the registry keeps a no-alerts template; guards a
    // future registry that somehow drops it — scope degradation must never
    // silently leave the query contract unproven.
    console.error('canary: no template ran to completion — query contract unproven, failing visible')
    process.exit(1)
  }
  console.log('canary: done — every registered template exercised (scope-limited templates degraded like production)')
}

await main()
