/**
 * rm-896: fixture `/api/monitoring` seam — deterministic monitoring shapes for
 * the visual/a11y environment and future browser tests.
 *
 * The Monitoring view (`web/src/views/Monitoring.tsx`) fetches `/api/monitoring`
 * on the same origin; before this seam the fixture/visual environment could
 * only ever serve the fail-closed cold-start DTO, so the board (red cards,
 * drill-down details, capped-count row, stale cards, footer) had zero visual
 * or a11y coverage.
 *
 * Security posture mirrors the `/__fixture/operator/*` harness exactly:
 * - This router is only mounted when the fixture harness is active, which
 *   already requires NODE_ENV=development|test + a loopback bind host + the
 *   explicit `DASHBOARD_FIXTURE_HARNESS_ENABLED=true` flag (double-guarded in
 *   `src/server.ts`; construction throws otherwise).
 * - The route stays behind the auth middleware like the real `/api/monitoring`
 *   (the visual server runs `DASHBOARD_DEV_AUTOLOGIN=true`).
 * - Fixture rows use `fixture-org/*` names, `FIXTURE_NODE_*` node_ids, and
 *   example.com detail URLs — never a real repository name (harness invariant).
 * - Every timestamp is a fixed epoch constant so screenshots are reproducible.
 */
import type {AggregatorSnapshot, FailingCheckDetail} from '../github/aggregator.ts'
import {Hono} from 'hono'
import {COLD_START_SNAPSHOT} from '../github/aggregator.ts'
import {toMonitoringDto} from './api.ts'

/** Selectable fixture shapes. `mixed` = red + stale + green rows; `cold-start` = the fail-closed DTO. */
export const FIXTURE_MONITORING_SHAPES = ['mixed', 'cold-start'] as const

export type FixtureMonitoringShape = (typeof FIXTURE_MONITORING_SHAPES)[number]

export function isFixtureMonitoringShape(value: unknown): value is FixtureMonitoringShape {
  return value === 'mixed' || value === 'cold-start'
}

/**
 * Fixed wall-clock anchors — deterministic by construction (never Date.now()).
 * 2025-11-01T00:00:00.000Z renders as a stable `toLocaleString()` under the
 * visual suite's pinned TZ=UTC.
 */
export const FIXTURE_MONITORING_REFRESHED_AT_MS = 1_762_252_800_000
export const FIXTURE_MONITORING_FETCHED_AT_MS = 1_762_252_700_000
export const FIXTURE_MONITORING_REFRESH_DURATION_MS = 4_213

function fixtureDetail(checkName: string, workflowTitle: string, runAttempt: number, slug: string): FailingCheckDetail {
  return {
    workflowTitle,
    runAttempt,
    checkName,
    detailsUrl: `https://example.com/fixture/check-runs/${slug}`,
  }
}

/**
 * The `mixed` board: one red repo (3 failing checks, 2 drill-down details —
 * exercises the capped-count row), one stale/unknown repo, one green repo,
 * attention-first ordered exactly as the aggregator would sort them.
 */
const MIXED_SNAPSHOT: AggregatorSnapshot = {
  repos: [
    {
      node_id: 'FIXTURE_NODE_RED',
      owner: 'fixture-org',
      name: 'fixture-ci-red',
      full_name: 'fixture-org/fixture-ci-red',
      discovery_channel: 'collab',
      status: {
        rollupState: 'red',
        failingChecks: 3,
        failingCheckDetails: [
          fixtureDetail('fixture-lint', 'Fixture CI', 1, 'lint'),
          fixtureDetail('fixture-test-matrix', 'Fixture CI', 2, 'test-matrix'),
        ],
        openPrCount: 1,
        openIssueCount: 2,
        openAlertCount: 0,
        stale: false,
        fetchedAt: FIXTURE_MONITORING_FETCHED_AT_MS,
      },
    },
    {
      node_id: 'FIXTURE_NODE_STALE',
      owner: 'fixture-org',
      name: 'fixture-stale-walk',
      full_name: 'fixture-org/fixture-stale-walk',
      discovery_channel: 'discovered',
      status: {
        rollupState: 'unknown',
        failingChecks: 0,
        failingCheckDetails: [],
        openPrCount: 0,
        openIssueCount: 1,
        openAlertCount: null,
        stale: true,
        fetchedAt: FIXTURE_MONITORING_FETCHED_AT_MS,
      },
    },
    {
      node_id: 'FIXTURE_NODE_GREEN',
      owner: 'fixture-org',
      name: 'fixture-green',
      full_name: 'fixture-org/fixture-green',
      discovery_channel: 'collab',
      status: {
        rollupState: 'green',
        failingChecks: 0,
        failingCheckDetails: [],
        openPrCount: 0,
        openIssueCount: 0,
        openAlertCount: 0,
        stale: false,
        fetchedAt: FIXTURE_MONITORING_FETCHED_AT_MS,
      },
    },
  ],
  staleBanner: false,
  driftCount: 2,
  enumerationIncomplete: 0,
  refreshedAt: FIXTURE_MONITORING_REFRESHED_AT_MS,
  refreshDurationMs: FIXTURE_MONITORING_REFRESH_DURATION_MS,
  refreshDegraded: false,
} satisfies AggregatorSnapshot

/**
 * Current harness-selected shape. Module state, like the harness's
 * `runScenarioMap` — reset via `resetFixtureMonitoringShapeForTesting()`
 * (wired into `resetFixtureHarnessForTesting`).
 */
let fixtureMonitoringShape: FixtureMonitoringShape = 'mixed'

export function getFixtureMonitoringShape(): FixtureMonitoringShape {
  return fixtureMonitoringShape
}

export function setFixtureMonitoringShape(shape: FixtureMonitoringShape): void {
  fixtureMonitoringShape = shape
}

export function resetFixtureMonitoringShapeForTesting(): void {
  fixtureMonitoringShape = 'mixed'
}

/** Snapshot for the current (or explicitly requested) shape. */
export function getFixtureMonitoringSnapshot(shape?: FixtureMonitoringShape): AggregatorSnapshot {
  const resolved = shape ?? fixtureMonitoringShape
  return resolved === 'cold-start' ? COLD_START_SNAPSHOT : MIXED_SNAPSHOT
}

/**
 * The fixture `/api` router — one route, `GET /monitoring`. server.ts mounts
 * it BEFORE the real `/api` router whenever the fixture harness is active, so
 * the fixture wins the path and every other `/api/*` route falls through to
 * the production router untouched. Responses are `no-store` (deterministic
 * reads must never be cached across shape switches).
 */
export function buildMonitoringFixtureApiRouter(): Hono {
  const router = new Hono()

  router.get('/monitoring', c => {
    const requested = c.req.query('shape')
    if (requested !== undefined && !isFixtureMonitoringShape(requested)) {
      // Non-echoing 400, mirroring the harness's inbound-echo discipline.
      return c.json({error: 'invalid-shape'}, 400, {'cache-control': 'no-store'})
    }
    const snapshot = getFixtureMonitoringSnapshot(requested)
    return c.json(toMonitoringDto(snapshot), 200, {'cache-control': 'no-store'})
  })

  return router
}
