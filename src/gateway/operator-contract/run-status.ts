/**
 * Operator-safe run-status projection.
 *
 * Mirrors fro-bot/agent's operator-contract/run-status.ts (v0.83.1). The
 * projection helper (toOperatorRunStatus) and internal error-kind mapping
 * are intentionally omitted — the dashboard only consumes the closed public
 * types below directly from the gateway API.
 *
 * Security: OperatorRunStatus carries only operator-safe fields. Internal
 * coordination fields (holder_id, thread_id, details) are excluded by
 * construction — they do not appear in this type.
 */

// ---------------------------------------------------------------------------
// Inlined boundary types from @fro-bot/runtime (minimal, frozen literals only)
// ---------------------------------------------------------------------------

/** Run lifecycle phases (exact frozen literal values from the upstream contract). */
export type RunPhase = 'PENDING' | 'ACKNOWLEDGED' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

/** Terminal run phases (exact frozen literal values from the upstream contract). */
export type TerminalPhase = 'COMPLETED' | 'FAILED' | 'CANCELLED'

/** Surface discriminant — the integration surface that initiated the run. */
export type Surface = 'github' | 'discord' | 'web'

// ---------------------------------------------------------------------------
// OperatorWebStatus
// ---------------------------------------------------------------------------

/**
 * The 7-value operator-facing web status set (snake_case).
 *
 * 'blocked' and 'waiting_for_approval' are endpoint-layer overlays derived from
 * queue/registry state — they are NOT produced by toOperatorRunStatus (which maps
 * RunPhase only). The snapshot endpoint layers them on top after projection.
 */
export type OperatorWebStatus =
  | 'queued'
  | 'blocked'
  | 'running'
  | 'waiting_for_approval'
  | 'succeeded'
  | 'failed'
  | 'cancelled'

/**
 * Maps a RunPhase to its operator-facing web status.
 *
 * 'blocked' and 'waiting_for_approval' are NOT in this map — they are
 * endpoint-layer overlays, not derivable from RunPhase alone.
 */
export const PHASE_TO_WEB_STATUS: Readonly<Record<RunPhase, OperatorWebStatus>> = {
  PENDING: 'queued',
  ACKNOWLEDGED: 'running',
  EXECUTING: 'running',
  COMPLETED: 'succeeded',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
}

// ---------------------------------------------------------------------------
// OperatorRunStatus
// ---------------------------------------------------------------------------

/**
 * Operator-safe projection of a run's status.
 *
 * Carries only the fields safe to expose to an operator web client.
 * Internal coordination fields (holder_id, thread_id, details) are excluded
 * by construction — they do not appear in this type.
 */
export interface OperatorRunStatus {
  readonly runId: string
  readonly entityRef: string
  readonly surface: Surface
  readonly phase: RunPhase
  readonly status: OperatorWebStatus
  readonly startedAt: string
  readonly stale: boolean
  readonly failureKind?: OperatorFailureKind
  /**
   * Checkout provenance (contract 1.7.0; checkout-advance signal 1.8.0).
   *
   * Optional and additive: a 1.6.0 stream simply omits it. `ref`/`commit`
   * identify the workspace checkout the run was created from; `advanced`
   * (1.8.0) is true when the workspace checkout has advanced ahead of the
   * state the gateway recorded for the run — an operator-actionable signal
   * (recovery per the gateway access runbook), not a run failure.
   */
  readonly checkout?: {
    readonly ref?: string
    readonly commit?: string
    readonly advanced?: boolean
  }
}

// ---------------------------------------------------------------------------
// OperatorFailureKind
// ---------------------------------------------------------------------------

/**
 * The operator-facing failure-reason enum.
 *
 * A closed allowlist vendored verbatim from upstream (derived from
 * RunCoreErrorKind, the internal error-kind vocabulary). 'unknown' is the
 * fallback for any internal kind with no mapping entry (defense-in-depth:
 * unmapped/future/unrecognized kinds never leak past this gate).
 */
export type OperatorFailureKind =
  | 'inactivity-timeout'
  | 'max-duration-timeout'
  | 'stream-ended'
  | 'workspace-unreachable'
  | 'workspace-preparation'
  | 'session-error'
  | 'unknown'

/**
 * Allowlist of OperatorFailureKind values, for gating untrusted input.
 * 'unknown' is the fallback for any internal kind with no mapping — unmapped
 * or unrecognized kinds never leak past this gate.
 */
export const OPERATOR_FAILURE_KINDS: ReadonlySet<OperatorFailureKind> = new Set([
  'inactivity-timeout',
  'max-duration-timeout',
  'stream-ended',
  'workspace-unreachable',
  // Contract 1.8.0: the run failed before the workspace was ready (distinct
  // from 'workspace-unreachable': preparation failures are operator-actionable
  // — the gateway may report the workspace as unavailable with HTTP 401 per the
  // v0.116.0 semantics change; see the gateway access runbook).
  'workspace-preparation',
  'session-error',
  'unknown',
])

/** Narrow an unknown value to OperatorFailureKind if it's in the allowlist. */
export function isOperatorFailureKind(value: unknown): value is OperatorFailureKind {
  return typeof value === 'string' && OPERATOR_FAILURE_KINDS.has(value as OperatorFailureKind)
}
