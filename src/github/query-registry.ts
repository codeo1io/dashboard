/**
 * Registry of every live-destined GraphQL query template the aggregator can
 * send (rm-225).
 *
 * rm-288: dependency-free BY DESIGN. The GraphQL canary
 * (scripts/graphql-canary.ts) iterates this registry, and this module must
 * import nothing — not even `../result.ts`, whose `@bfra.me/es` re-export is
 * exactly what made the 2026-09-28 canary run die at module resolution when
 * the workflow still had no install step (rm-280 has since added one, but the
 * zero-import property stays load-bearing: the canary keeps running from a
 * pristine checkout with no node_modules and survives a missing or failed
 * install). String constants and types only; keep it that way.
 */

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
      # rm-117 security-posture drill-down (this cycle): node-level OPEN alerts
      # so the posture panel can render per-severity / per-EPSS histograms from
      # the existing per-refresh fetch — zero extra requests when alerts are
      # empty (the nodes array is the only added payload). first: 10 is the
      # server-side page cap for this connection (verified live 2026-10-03:
      # requesting more still returns 10; documented ceiling — openAlertCount's
      # totalCount stays authoritative beyond the sample, rm-110 discipline).
      vulnerabilityAlerts(states: OPEN, first: 10) {
        totalCount
        nodes {
          state
          createdAt
          fixedAt
          dismissedAt
          autoDismissedAt
          dismissReason
          dependencyScope
          # manifest PATH only — never the lockfile-CONTENTS field
          vulnerableManifestPath
          securityVulnerability {
            firstPatchedVersion {
              identifier
            }
            vulnerableVersionRange
          }
          dependabotUpdate {
            pullRequest {
              state
              url
            }
          }
          securityAdvisory {
            ghsaId
            cveId
            severity
            classification
            withdrawnAt
            cvssSeverities {
              cvssV3 {
                score
                vectorString
              }
              cvssV4 {
                score
                vectorString
              }
            }
            epss {
              percentage
              percentile
            }
            cwes(first: 5) {
              nodes {
                cweId
              }
            }
            identifiers {
              type
              value
            }
          }
        }
      }
    }
  }
`

/**
 * rm-117 recent-cures walk template (this cycle). GitHub's
 * vulnerabilityAlerts connection exposes NO orderBy and IGNORES `last`
 * (both verified live 2026-10-03) — it pages ascending from the OLDEST
 * alert, 10 nodes per page, so "recently cured" is reachable only by
 * walking `after:` cursors to the tail. The aggregator walks this template
 * TTL-gated (once per hour per repo, bounded pages per walk) carrying the
 * last endCursor: steady state converges to the tail and costs one request
 * per window; new cures append at the tail so the cursor stays valid.
 *
 * $curesAfter defaults to null so the canary's generic {owner, name}
 * invocation (and a cold start) walks from page 1 unchanged.
 */
export const REPO_RECENT_CURES_QUERY = `
  query RepoRecentCures($owner: String!, $name: String!, $curesAfter: String = null) {
    repository(owner: $owner, name: $name) {
      vulnerabilityAlerts(states: FIXED, first: 10, after: $curesAfter) {
        totalCount
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          state
          createdAt
          fixedAt
          dismissedAt
          autoDismissedAt
          dismissReason
          dependencyScope
          vulnerableManifestPath
          securityVulnerability {
            firstPatchedVersion {
              identifier
            }
            vulnerableVersionRange
          }
          dependabotUpdate {
            pullRequest {
              state
              url
            }
          }
          securityAdvisory {
            ghsaId
            cveId
            severity
            classification
            withdrawnAt
            cvssSeverities {
              cvssV3 {
                score
                vectorString
              }
              cvssV4 {
                score
                vectorString
              }
            }
            epss {
              percentage
              percentile
            }
            cwes(first: 5) {
              nodes {
                cweId
              }
            }
            identifiers {
              type
              value
            }
          }
        }
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
  {name: 'REPO_RECENT_CURES_QUERY', query: REPO_RECENT_CURES_QUERY},
]
