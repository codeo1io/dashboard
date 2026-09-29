/**
 * Operator-safe run-status projection.
 *
 * Mirrors fro-bot/agent's operator-contract/run-status.ts (v0.117.0, contract
 * 1.8.0 — grown from the v0.83.1/1.6.0 mirror on 2026-09-30, rm-252). The
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
// Checkout provenance / preparation (contract 1.7.0 / 1.8.0 — rm-252)
// ---------------------------------------------------------------------------

/**
 * Trimmed vendor of upstream v0.117.0 provenance.ts's OperatorCheckoutProvenance
 * discriminated union. The dashboard renders the checkout-advance summary
 * (head + worktree cleanliness + remote freshness), so the fork vendors exactly
 * the operator-safe fields it consumes; upstream's full DTO (obstruction lists,
 * layout-refusal detail, preparation reasons) stays upstream. Malformed or
 * absent values normalize to `undefined` at the parser boundary — never parsed
 * through, never echoed raw.
 */
export type OperatorCheckoutProvenance =
  | {readonly kind: 'observed'; readonly observation: OperatorCheckoutObservation; readonly remote: OperatorRemoteFreshness}
  | {readonly kind: 'unavailable'; readonly remote: OperatorRemoteFreshness}

/** Head + worktree + operation state observed under the repo lock. */
export interface OperatorCheckoutObservation {
  readonly head: {readonly kind: 'attached'; readonly branch: string; readonly sha: string} | {readonly kind: 'detached'; readonly sha: string}
  readonly worktree: {readonly kind: 'clean'} | {readonly kind: 'dirty'; readonly staged: number; readonly unstaged: number; readonly untracked: number; readonly conflicted: number}
  readonly operationInProgress: 'none' | 'merge' | 'rebase' | 'am' | 'cherry-pick' | 'revert' | 'bisect'
  readonly observedAt: string
}

/** Whether remote freshness was checked — present on every variant, never omitted. 1.8.0 adds `checked`. */
export type OperatorRemoteFreshness =
  | {readonly kind: 'not-checked'}
  | {readonly kind: 'checked'; readonly defaultBranch: string; readonly sha: string; readonly checkedAt: string; readonly change: 'unchanged'}
  | {readonly kind: 'checked'; readonly defaultBranch: string; readonly sha: string; readonly checkedAt: string; readonly change: 'fast-forward'; readonly fromSha: string}

/**
 * Trimmed vendor of upstream v0.117.0's OperatorCheckoutPreparation union —
 * what preparation reported for a run that never reached EXECUTING. The fork
 * keeps the outcome/reason discriminants it renders; detail payloads
 * (obstruction lists, disallowed keys) stay upstream.
 */
export type OperatorCheckoutPreparation =
  | {readonly outcome: 'refused'; readonly reason: 'needs-recovery' | 'checkout-substituted' | 'detached' | 'diverged' | 'ahead' | 'maintenance-hold' | 'unsupported-layout' | 'unsupported-config' | 'operation-in-progress' | 'dirty' | 'submodule-initialized' | 'non-default-branch' | 'obstructed'}
  | {readonly outcome: 'failed'; readonly reason: 'aborted' | 'inspection-failed' | 'fetch-auth-rejected' | 'fetch-not-found' | 'fetch-forbidden' | 'fetch-rate-limited' | 'fetch-unreachable' | 'fetch-timeout' | 'fetch-failed' | 'remote-moved' | 'apply-failed' | 'termination-unconfirmed'; readonly permanent: boolean}

/** Narrow an unknown value to a plain object record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Validate a checkoutProvenance payload shallowly against the vendored union. */
export function parseOperatorCheckoutProvenance(value: unknown): OperatorCheckoutProvenance | undefined {
  if (!isRecord(value)) return undefined
  if (value.kind === 'unavailable') {
    return isRecord(value.remote) ? {kind: 'unavailable', remote: value.remote as unknown as OperatorRemoteFreshness} : undefined
  }
  if (value.kind !== 'observed' || !isRecord(value.observation) || !isRecord(value.remote)) return undefined
  return {kind: 'observed', observation: value.observation as unknown as OperatorCheckoutObservation, remote: value.remote as unknown as OperatorRemoteFreshness}
}

/** Validate a checkoutPreparation payload shallowly against the vendored union. */
export function parseOperatorCheckoutPreparation(value: unknown): OperatorCheckoutPreparation | undefined {
  if (!isRecord(value)) return undefined
  if (value.outcome === 'failed') {
    return typeof value.reason === 'string' && typeof value.permanent === 'boolean'
      ? {outcome: 'failed', reason: value.reason as OperatorCheckoutPreparation extends {outcome: 'failed'; reason: infer R} ? R : never, permanent: value.permanent}
      : undefined
  }
  if (value.outcome === 'refused' && typeof value.reason === 'string') {
    return {outcome: 'refused', reason: value.reason as OperatorCheckoutPreparation extends {outcome: 'refused'; reason: infer R} ? R : never}
  }
  return undefined
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
  /** Contract 1.7.0+: what the run's checkout looked like when it started (optional, absent on pre-1.7.0 gateways). */
  readonly checkoutProvenance?: OperatorCheckoutProvenance
  /** Contract 1.8.0+: what checkout preparation reported for a run that never reached EXECUTING (optional). */
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
 */
export type OperatorFailureKind =
  | 'inactivity-timeout'
  | 'max-duration-timeout'
  | 'stream-ended'
  | 'workspace-unreachable'
  | 'workspace-unavailable'
  | 'checkout-substituted'
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
  'workspace-unavailable',
  'checkout-substituted',
  'session-error',
  'unknown',
])

/** Narrow an unknown value to OperatorFailureKind if it's in the allowlist. */
export function isOperatorFailureKind(value: unknown): value is OperatorFailureKind {
  return typeof value === 'string' && OPERATOR_FAILURE_KINDS.has(value as OperatorFailureKind)
}
