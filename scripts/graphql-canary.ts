/**
 * rm-179 reality canary — execute the REAL status query against the REAL API.
 *
 * Origin: 2026-09-24, run 6fe26972. Two failures that day shared one class —
 * green CI over broken reality: the aggregator's GraphQL templates carried
 * `//` comments GitHub rejects (rm-177; every transport in tests was faked,
 * so no suite could catch it), and the base-drift gate's digest extraction
 * was structurally empty while the workflow was believed green (rm-178).
 *
 * This script is the runtime half of the fix's defense-in-depth. It imports
 * the EXACT exported template the aggregator sends (so the shipped string is
 * what runs), substitutes this repository's own coordinates, executes one
 * read-only query with GITHUB_TOKEN, and exits non-zero on any of: transport
 * failure, GraphQL error, or a missing repository object. Scheduled weekly
 * by .github/workflows/canary.yaml — never a required check, never a write.
 */
import {createHash} from 'node:crypto'
import process from 'node:process'

import {REPO_STATUS_QUERY} from '../src/github/aggregator.ts'

const rawRepository = process.env.GITHUB_REPOSITORY ?? ''
// In Actions this is always 'owner/repo'; locally it may be unset or junk.
// Only a well-formed value overrides the default target — never trust a
// slash-less/empty-owner string to the API.
const repositoryMatches = /^([\w.-]+)\/([\w.-]+)$/.exec(rawRepository)
const owner = repositoryMatches?.[1] ?? 'codeo1io'
const name = repositoryMatches?.[2] ?? 'dashboard'

async function main(): Promise<void> {
  const token = process.env.GITHUB_TOKEN ?? ''
  if (token === '') {
    console.error('GITHUB_TOKEN is required (read-only metadata is sufficient for a public repo)')
    process.exit(1)
  }

  const query = REPO_STATUS_QUERY
  // The digest makes "which exact query text ran" auditable from the run log.
  console.log(`canary: query sha256 ${createHash('sha256').update(query).digest('hex')}`)
  console.log(`canary: target ${owner}/${name}`)

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
    console.error(`canary: transport failure — ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }

  const errors = (body as {errors?: unknown[]} | null)?.errors
  if (status !== 200) {
    console.error(`canary: HTTP ${status} — the real API would reject this query today`)
    console.error(JSON.stringify(body, null, 2))
    process.exit(1)
  }
  if (errors && errors.length > 0) {
    console.error('canary: GraphQL errors — the real API would reject this query today (rm-177 class):')
    console.error(JSON.stringify(errors, null, 2))
    process.exit(1)
  }

  const repository = (body as {data?: {repository?: object}} | null)?.data?.repository
  if (!repository) {
    console.error('canary: response contained no repository object — query shape drifted from the contract:')
    console.error(JSON.stringify(body, null, 2))
    process.exit(1)
  }

  // The shipped template deliberately selects no identity field (it is the
  // exact string the aggregator sends), so report the local target coords.
  console.log(`canary: OK — ${owner}/${name} answered the exact shipped REPO_STATUS_QUERY`)
}

await main()
