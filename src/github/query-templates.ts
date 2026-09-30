/**
 * Live-destined GraphQL query templates + the registry that pins their
 * coverage (rm-177/rm-179/rm-225 lineage; extracted from
 * src/github/aggregator.ts by rm-321, 2026-10-01, run 7aa6908492a8).
 *
 * DEPENDENCY-FREE BY MANDATE: this module imports NOTHING — no node_modules
 * specifier, no workspace file. The zero-install GraphQL canary
 * (scripts/graphql-canary.ts, run by .github/workflows/canary.yaml on a bare
 * runner with no install step) imports this leaf directly, so a single bare
 * import here is fatal at canary load time (the ERR_MODULE_NOT_FOUND
 * '@bfra.me/es' class that killed the canary's first scheduled run,
 * 36417620616). Keep templates, the RegisteredQueryTemplate type, and the
 * registry here; keep response mapping in the aggregator, which is free to
 * import workspace seams.
 */

// ---------------------------------------------------------------------------
// Query templates (byte-stable — the canary logs their sha256 digests)
// ---------------------------------------------------------------------------

export const REPO_STATUS_QUERY = `
  query RepoStatus($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      defaultBranchRef {
        target {
          ... on Commit {
            statusCheckRollup {
              state
            }
            # GraphQL max page size; repos with >100 suites still understate failingChecks (documented ceiling, rm-110)
            checkSuites(first: 100) {
              nodes {
                # rm-192 drill-down: workflow identity + failing check names/URLs
                # (additive selection only — read-only query, no mutations)
                workflowRun {
                  displayTitle
                  runAttempt
                }
                checkRuns(first: 50, filterBy: { status: COMPLETED, conclusions: [FAILURE, TIMED_OUT, CANCELLED, ACTION_REQUIRED, STARTUP_FAILURE] }) {
                  totalCount
                  nodes {
                    name
                    detailsUrl
                  }
                }
              }
            }
          }
        }
      }
      pullRequests(states: OPEN) {
        totalCount
      }
      issues(states: OPEN) {
        totalCount
      }
      vulnerabilityAlerts(states: OPEN) {
        totalCount
      }
    }
  }
`

/**
 * Fallback query variant without vulnerabilityAlerts — used when the token
 * lacks the security_events/vulnerability_alerts scope. openAlertCount is set
 * to null (not stale) when this variant is used.
 */
export const REPO_STATUS_QUERY_NO_ALERTS = `
  query RepoStatusNoAlerts($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      defaultBranchRef {
        target {
          ... on Commit {
            statusCheckRollup {
              state
            }
            # GraphQL max page size; repos with >100 suites still understate failingChecks (documented ceiling, rm-110)
            checkSuites(first: 100) {
              nodes {
                # rm-192 drill-down: workflow identity + failing check names/URLs
                # (additive selection only — read-only query, no mutations)
                workflowRun {
                  displayTitle
                  runAttempt
                }
                checkRuns(first: 50, filterBy: { status: COMPLETED, conclusions: [FAILURE, TIMED_OUT, CANCELLED, ACTION_REQUIRED, STARTUP_FAILURE] }) {
                  totalCount
                  nodes {
                    name
                    detailsUrl
                  }
                }
              }
            }
          }
        }
      }
      pullRequests(states: OPEN) {
        totalCount
      }
      issues(states: OPEN) {
        totalCount
      }
    }
  }
`

// ---------------------------------------------------------------------------
// Registry (rm-225)
// ---------------------------------------------------------------------------

/** A registered query template — every live-destined GraphQL string the aggregator can send (rm-225). */
export interface RegisteredQueryTemplate {
  /** The exported constant's name, so canary logs name which exact template ran */
  readonly name: string
  /** The exact query text the aggregator sends — the registry never rewrites it */
  readonly query: string
}

/**
 * rm-225: every live-destined query template MUST be registered here. The
 * GraphQL canary (scripts/graphql-canary.ts) iterates this registry — not a
 * hand-picked import — so adding a template auto-extends live coverage, and
 * test/query-shape-guard.test.ts asserts the registry equals the module's
 * exported template set (a template constant without a registry entry fails
 * the suite). rm-177 shipped because the canary's predecessor covered
 * exactly one of two shipped templates; this registry is the structural fix
 * for that blind spot.
 */
export const REPO_STATUS_QUERY_REGISTRY: readonly RegisteredQueryTemplate[] = [
  {name: 'REPO_STATUS_QUERY', query: REPO_STATUS_QUERY},
  {name: 'REPO_STATUS_QUERY_NO_ALERTS', query: REPO_STATUS_QUERY_NO_ALERTS},
]
