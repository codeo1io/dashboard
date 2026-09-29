/**
 * Operator-safe run-status projection.
 *
 * Mirrors fro-bot/agent's operator-contract/run-status.ts (v0.83.1; types refreshed
 * to v0.117.0 at contract 1.8.0 — adds checkout provenance/preparation fields and
 * the 'checkout-substituted'/'workspace-unavailable' failure kinds). The
 * projection helper (toOperatorRunStatus) and internal error-kind mapping
 * are intentionally omitted — the dashboard only consumes the closed public
 * types below directly from the gateway API.
 *
 * Security: OperatorRunStatus carries only operator-safe fields. Internal
 * coordination fields (holder_id, thread_id, details) are excluded by
 * construction — they do not appear in this type.
 */

import type {OperatorCheckoutPreparation, OperatorCheckoutProvenance} from './provenance.ts'

// ---------------------------------------------------------------------------
// Inlined boundary types from @fro-bot/runtime (minimal, frozen literals only)
// ---------------------------------------------------------------------------

/** Run lifecycle phases (exact frozen literal values from the upstream contract). */
export type RunPhase = 'PENDING' | 'ACKNOWLEDGED' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

/** Terminal run phases (exact frozen literal values from the upstream contract). */
export type TerminalPhase = 'COMPLETED' | 'FAILED' | 'CANCELLED'

/** Surface discriminant — the integration surface that initiated the run. */
export type Surface = 'github' | 'discord' | 'web'

// Re-export the checkout provenance/preparation surface (contract 1.7.0/1.8.0),
// mirroring the upstream barrel's re-export from run-status.
export type {
  OperatorCheckoutHead,
  OperatorCheckoutObservation,
  OperatorCheckoutOperation,
  OperatorCheckoutPreparation,
  OperatorCheckoutPreparationFailed,
  OperatorCheckoutPreparationRefused,
  OperatorCheckoutProvenance,
  OperatorLayoutRefusalReason,
  OperatorObstructionKind,
  OperatorRemoteFreshness,
  OperatorUpdateFailureReason,
  OperatorWorktreeState,
} from './provenance.ts'

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
   * What this run started from (checked-out commit/branch, worktree cleanliness,
   * any in-progress operation). Present ONLY on runs that reached EXECUTING — a
   * run that fails before EXECUTING (e.g. 'checkout-substituted',
   * 'workspace-unavailable') has no checkout provenance to report; its reason is
   * carried in `failureKind` instead. Absent (`undefined`) for a run that never
   * reached EXECUTING, a run recorded before this field existed (contract < 1.7.0),
   * or a malformed stored value — all collapse to the same "no provenance
   * recorded" state. Never a claim about the CURRENT tree — an agent that edits
   * files or switches branches mid-run changes it; this describes the start point.
   */
  readonly checkoutProvenance?: OperatorCheckoutProvenance
  /**
   * What preparation reported when it refused or failed BEFORE the run reached
   * EXECUTING (contract 1.8.0). Mutually exclusive with `checkoutProvenance` in
   * practice but structurally independent — nothing here enforces the exclusivity.
   * Absent for a run that reached EXECUTING, one that predates this contract
   * version, or a malformed stored value.
   */
  readonly checkoutPreparation?: OperatorCheckoutPreparation
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
 *
 * This union may gain values over time as new RunCoreErrorKind cases get their own
 * operator-facing bucket. Consumers that switch over it must handle unrecognized
 * or future values gracefully (a default/fallback branch) rather than assuming the
 * set is fixed. Contract 1.7.0/1.8.0 additions: 'checkout-substituted' (a correctness
 * failure — the checkout was substituted) and 'workspace-unavailable' (non-retriable —
 * the clone failed for a reason that will not resolve on its own, e.g. the repo does
 * not exist or is inaccessible; do not invite a retry).
 */
export type OperatorFailureKind =
  | 'inactivity-timeout'
  | 'max-duration-timeout'
  | 'stream-ended'
  | 'workspace-unreachable'
  | 'session-error'
  | 'checkout-substituted'
  | 'workspace-unavailable'
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
  'session-error',
  'checkout-substituted',
  'workspace-unavailable',
  'unknown',
])

/** Narrow an unknown value to OperatorFailureKind if it's in the allowlist. */
export function isOperatorFailureKind(value: unknown): value is OperatorFailureKind {
  return typeof value === 'string' && OPERATOR_FAILURE_KINDS.has(value as OperatorFailureKind)
}
