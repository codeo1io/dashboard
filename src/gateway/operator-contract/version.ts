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
// Changelog (latest first; entry text never restates the version literal — the
// conformance suite enforces the const below as the directory's only literal):
//   current — added the closed set of push notification trigger kinds
//             (`OperatorPushTriggerKind` / `OPERATOR_PUSH_TRIGGER_KINDS`), also the wire `data.type`, and
//             optional authenticated-session push health in the operator session-info response
//             (`OperatorSessionInfo.push` / `OperatorPushHealthStatus` / `OPERATOR_PUSH_HEALTH_STATUSES`).
export const OPERATOR_CONTRACT_VERSION = '1.10.0'
