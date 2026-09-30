/**
 * Operator-safe checkout-provenance projection.
 *
 * Vendored from fro-bot/agent packages/gateway/src/operator-contract/
 * provenance.ts (v0.117.0, operator contract 1.7.0 — rm-157, 2026-09-29).
 * The dashboard consumes the closed public types below directly from the
 * gateway API; deserialization is absent-tolerant so an older gateway pin
 * (still speaking 1.6.0) never trips this surface.
 *
 * Security: carries only operator-safe fields. Commit author EMAILS and any
 * internal coordination fields are excluded by construction — upstream sends
 * authorName only; this mirror does not add fields upstream omits.
 */

/** Operator-safe commit summary inside a provenance payload. */
export interface OperatorProvenanceCommit {
  readonly sha: string
  readonly message: string
  readonly authorName: string
  readonly authoredAt: string
}

/**
 * Checkout provenance for a workspace at the time the gateway reported it.
 * `kind` is the SSE frame discriminant ('provenance').
 */
export interface OperatorCheckoutProvenance {
  readonly kind: 'provenance'
  readonly headSha: string
  readonly detached: boolean
  readonly dirty: boolean
  readonly operationInProgress: boolean
  readonly headBranch: string | null
  readonly headRefSlug: string | null
  readonly aheadCount: number
  readonly behindCount: number
  readonly commits: readonly OperatorProvenanceCommit[]
  readonly fetchedAt: string
}

/** Frame schema discriminant vendored from upstream provenance.ts. */
export const OPERATOR_PROVENANCE_SCHEMA_V1 = 'operator-provenance/1'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isProvenanceCommit(value: unknown): value is OperatorProvenanceCommit {
  if (!isRecord(value)) return false
  return (
    typeof value.sha === 'string' &&
    typeof value.message === 'string' &&
    typeof value.authorName === 'string' &&
    typeof value.authoredAt === 'string'
  )
}

/**
 * Narrow an untrusted frame to OperatorCheckoutProvenance.
 *
 * Absent-tolerant: returns null for anything that is not a schema-carrying,
 * well-formed provenance frame — an older gateway pin never sends one, and a
 * malformed/partial payload degrades to "no provenance" instead of leaking
 * unvalidated fields into the operator view.
 */
export function deserializeProvenanceEvent(frame: unknown): OperatorCheckoutProvenance | null {
  if (!isRecord(frame)) return null
  if (frame.schema !== OPERATOR_PROVENANCE_SCHEMA_V1) return null
  if (frame.kind !== 'provenance') return null
  if (
    typeof frame.headSha !== 'string' ||
    typeof frame.detached !== 'boolean' ||
    typeof frame.dirty !== 'boolean' ||
    typeof frame.operationInProgress !== 'boolean' ||
    typeof frame.fetchedAt !== 'string' ||
    typeof frame.aheadCount !== 'number' ||
    typeof frame.behindCount !== 'number'
  ) {
    return null
  }
  const headBranch = typeof frame.headBranch === 'string' ? frame.headBranch : null
  const headRefSlug = typeof frame.headRefSlug === 'string' ? frame.headRefSlug : null
  if (!Array.isArray(frame.commits) || !frame.commits.every(isProvenanceCommit)) return null
  return {
    kind: 'provenance',
    headSha: frame.headSha,
    detached: frame.detached,
    dirty: frame.dirty,
    operationInProgress: frame.operationInProgress,
    headBranch,
    headRefSlug,
    aheadCount: frame.aheadCount,
    behindCount: frame.behindCount,
    commits: frame.commits,
    fetchedAt: frame.fetchedAt,
  }
}
