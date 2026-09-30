// Operator API contract version — build-time pinned, never negotiated over the wire.
//
// Increment policy:
//   MAJOR — breaking change to a frozen type (field removed, renamed, or type narrowed)
//   MINOR — additive change (new optional field, new type added to the surface)
//   PATCH — documentation or typo correction only; no structural change
//
// This constant is the single source of truth. Downstream consumers (e.g. the dashboard)
// pin this value; no second copy should exist. Human-bumped on breaking changes, like
// STORAGE_VERSION in packages/runtime/src/shared/constants.ts.
//
// Security constraint: the version is BUILD-TIME pinned and is never supplied or
// negotiated over the wire. Any endpoint reading a version header must reject
// unrecognized versions fail-closed.
//
// Pin (rm-252, cycle 20): 1.6.0 → 1.8.0 forward-support. Ladder (agent
// releases, gh api repos/fro-bot/agent/releases — authoritative):
//   v0.114.1 = 1.6.0 (runbook deployed pin)
//   v0.115.x = 1.7.0 (checkout provenance on run-status; approvalId on approval
//              references; cancelRun writer mutation)
//   v0.117.0 = 1.8.0 (checkout-advance provenance; 'workspace-preparation'
//              failure kind; decideRunApproval writer mutation) — latest
//              release as of 2026-09-27.
// Contract 1.9.0 (dequeueMessageBatch POST + 'message:dequeue-batch' tombstone)
// is UNRELEASED on agent main as of 2026-09-30 — forward window only; do not
// pre-parse.
export const OPERATOR_CONTRACT_VERSION = '1.8.0'

// Forward-support gate set: the run-stream reader accepts a gateway serving any
// of these on the ready frame; anything older or newer drifts fail-closed
// (field-compatible union — every 1.7.0/1.8.0 field is optional on the wire, so
// a 1.6.0 stream simply omits them). Bump the pin and this set together.
export const SUPPORTED_OPERATOR_CONTRACT_VERSIONS: ReadonlySet<string> = new Set([
  '1.6.0',
  '1.7.0',
  '1.8.0',
])
