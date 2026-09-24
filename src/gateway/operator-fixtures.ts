import type {CsrfDto, RunApprovalDecisionResponse, RunApprovalsResponse, RunApprovalSummary, RunStreamEvent, SessionDto} from './operator-client.ts'
/**
 * Typed fixtures for the operator UI skeleton.
 *
 * Security invariants:
 * - Fixture data must NOT contain real prompts, tool args, workspace paths,
 *   internal URLs, tokens, session cookies, or CSRF values.
 */

// ---------------------------------------------------------------------------
// Session fixtures
// ---------------------------------------------------------------------------

export const FIXTURE_SESSION: SessionDto = {
  operatorId: 1,
  login: 'fixture-operator',
  // expiresAt is ms-since-epoch (number) per canonical OperatorSessionInfo
  expiresAt: Date.parse('2099-01-01T00:00:00Z'),
}

export const FIXTURE_CSRF: CsrfDto = {
  // NOTE: This is a fixture placeholder — never a real CSRF token.
  // The token value is intentionally generic and not rendered in the UI.
  // Field is csrfToken per canonical OperatorCsrfToken (not token).
  csrfToken: 'fixture-csrf-placeholder',
}

// ---------------------------------------------------------------------------
// Failure-reason (Gateway 1.6.0) fixture constants — shared across the fixture
// harness route and SSE scenario builders so known/unknown reason values stay
// in lockstep. See src/gateway/operator-contract/run-status.ts for the
// canonical OPERATOR_FAILURE_KINDS allowlist.
// ---------------------------------------------------------------------------

/**
 * A known Gateway 1.6.0 operator failure-reason code, used by both the
 * fixture-harness recent-run entries and the live-stream reason scenarios so
 * a single known-reason case exercises both surfaces with the same value.
 */
export const FIXTURE_KNOWN_FAILURE_REASON = 'inactivity-timeout'

/**
 * A visibly synthetic, fixture-prefixed reason value that is deliberately NOT
 * in the OPERATOR_FAILURE_KINDS allowlist. Proves unrecognized reason codes
 * normalize to absent and never reach renderers, logs, or sanitizer output.
 */
export const FIXTURE_UNKNOWN_FAILURE_REASON = 'fixture-unrecognized-reason'

// ---------------------------------------------------------------------------
// Run stream event timeline fixture
// ---------------------------------------------------------------------------

export const FIXTURE_RUN_TIMELINE: readonly RunStreamEvent[] = [
  {
    type: 'ready',
    data: {contractVersion: '1.1.0'},
  },
  {
    type: 'status',
    data: {
      runId: 'run-fixture-running-002',
      entityRef: 'fro-bot/agent',
      surface: 'github',
      phase: 'PENDING',
      status: 'queued',
      startedAt: '2026-06-17T10:01:01Z',
      stale: false,
    },
  },
  {
    type: 'status',
    data: {
      runId: 'run-fixture-running-002',
      entityRef: 'fro-bot/agent',
      surface: 'github',
      phase: 'EXECUTING',
      status: 'running',
      startedAt: '2026-06-17T10:01:05Z',
      stale: false,
    },
  },
  {
    type: 'reset',
    data: {
      runId: 'run-fixture-running-002',
      reason: 'terminal',
    },
  },
]

// ---------------------------------------------------------------------------
// Run approval fixtures — 1.4.0 per-run routes
// ---------------------------------------------------------------------------

export const FIXTURE_RUN_APPROVAL: RunApprovalSummary = {
  requestID: 'req-fixture-pending-001',
  permission: 'tool_use',
  command: 'bash',
}

export const FIXTURE_RUN_APPROVALS: RunApprovalsResponse = {
  approvals: [FIXTURE_RUN_APPROVAL],
}

// ---------------------------------------------------------------------------
// Approval decision response fixtures — one per OperatorDecisionState
// ---------------------------------------------------------------------------

export const FIXTURE_DECISION_PENDING: RunApprovalDecisionResponse = {
  state: 'pending',
}

export const FIXTURE_DECISION_CLAIMED: RunApprovalDecisionResponse = {
  state: 'claimed',
}

export const FIXTURE_DECISION_ALREADY_CLAIMED: RunApprovalDecisionResponse = {
  // already_claimed: a second decision arrived while the first POST was still in-flight.
  // The entry has NOT settled yet — this is NOT 'already_settled'.
  state: 'already_claimed',
}

export const FIXTURE_DECISION_SCOPE_MISMATCH: RunApprovalDecisionResponse = {
  state: 'scope_mismatch',
}

export const FIXTURE_DECISION_FAILED_TO_SETTLE: RunApprovalDecisionResponse = {
  state: 'failed_to_settle',
}

export const FIXTURE_DECISION_UNAVAILABLE: RunApprovalDecisionResponse = {
  state: 'unavailable',
}

// ---------------------------------------------------------------------------
// Push notification fixtures (GET /operator/push/vapid-key, /operator/push/subscriptions)
// ---------------------------------------------------------------------------

/**
 * A real, valid P-256 VAPID public key (uncompressed point, base64url
 * encoded). Fixture-only: no corresponding private key is provided, so it
 * cannot be used to send pushes. VAPID public keys are safe to embed — they
 * are public by definition.
 */
export const FIXTURE_VAPID_PUBLIC_KEY =
  'BDHrxCLBc7E1yZoIRd85t_CibuCuzmVTv3LIxlY_JhdXoGM7mhohkKqUE_lXPDzetAdhm8LD_S2xUjveMFWRjl4'

export const FIXTURE_VAPID_KEY_VERSION = 'fixture-vapid-v1'
