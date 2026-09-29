Source: fro-bot/agent  | Tag: v0.117.0
Path: packages/gateway/src/operator-contract/ (contract barrel) + packages/gateway/src/web/sse/ (SSE surface)
Contract: OPERATOR_CONTRACT_VERSION = 1.8.0
Vendored copy — do not hand-edit behavior. Refresh by re-copying upstream and
re-applying the documented import rewrites (@fro-bot/runtime → ../../result.ts;
inlined boundary types for RunPhase/Surface/RunState).

Per-file vendoring tags (files refresh independently as upstream changes reach the
surfaces this dashboard consumes):

- `provenance.ts`, `version.ts`, `run-status.ts` (types), `index.ts` — refreshed at
  v0.117.0 on 2026-09-29 (contract 1.6.0 → 1.8.0; rm-157 absorb).
- Other files unchanged since their own last refresh; see each file's header.

## Files and their upstream sources

- `run-status.ts`, `approval.ts`, `identity.ts`, `parse.ts`, `redaction.ts`,
  `responses.ts`, `version.ts`, `provenance.ts` — vendored from the operator-contract
  barrel (packages/gateway/src/operator-contract/).
- `sse-frames.ts` — vendored from the gateway's web/sse/ surface
  (packages/gateway/src/web/sse/). This is a parallel surface to
  the contract barrel; it is NOT part of the upstream operator-contract barrel
  export. The SSE frame types (ReadyFrame, StatusFrameData, ResetFrameData,
  RunStreamFrame, ResetReason) are re-exported from the dashboard's contract
  barrel for convenience.
- `repo-summary.ts` — locally authored (PR #968 adds RepoSummary to the upstream
  contract at v0.73.0, but no upstream parse helper exists). The type definition
  is faithful to the upstream interface; the parse guards follow the same
  hand-rolled type-guard + fixed-reason-string pattern as parse.ts.
- `push.ts` — locally authored for the dashboard's operator Web Push companion
  feature (`docs/plans/2026-07-08-001-feat-operator-push-notifications-dashboard-plan.md`).
  `VapidKeyResponse` mirrors the Gateway's `GET /operator/push/vapid-key`
  response and deliberately omits any version field beyond `keyVersion` — the
  Gateway returns only `{publicKey, keyVersion}`, no `contractVersion`.
  `PushSubscriptionMetadata` mirrors the Gateway's safe-metadata response from
  `GET /operator/push/subscriptions` (opaque `endpointHash` only — never the
  raw endpoint, `p256dh`, or `auth` keys). `PushHandoffState` is client-derived,
  not a wire field: the Gateway exposes no handoff-state route, so the
  dashboard computes it from subscription metadata plus local browser state.
  It is defined here so the vendored contract and the web-side duplicate
  (`web/src/push/push-types.ts`) share one canonical string set.

## Omissions vs upstream

The following upstream exports are omitted because they depend on upstream-only types:

- `toOperatorDecisionState` — requires `DecisionOutcome` from `../approvals/registry.js`
- `toOperatorRunStatus` — requires `RunState` from `@fro-bot/runtime`
- `DecisionInput` — requires `ApprovalActor` from `../approvals/registry.js`

The PUBLIC frozen types (OperatorDecisionState, OperatorWebStatus, OperatorRunStatus,
OperatorSessionInfo, OperatorCsrfToken, OperatorOk, OperatorError, OperatorIdentity,
RunPhase, Surface, PermissionReply, RedactionContext, ReadyFrame, StatusFrameData,
ResetFrameData, RunStreamFrame, ResetReason) are all present and correct.

## Import rewrites applied

- `parse.ts`: `import type {Result} from '@fro-bot/runtime'` → `import type {Result} from '../../result.ts'`
- `parse.ts`: `import {err, ok} from '@fro-bot/runtime'` → `import {err, ok} from '../../result.ts'`
- `run-status.ts`: `import type {RunPhase, RunState, Surface} from '@fro-bot/runtime'` → inlined as local type definitions
- `approval.ts`: `import type {ApprovalActor, DecisionOutcome} from '../approvals/registry.js'` → removed (dependent helpers omitted)
- `sse-frames.ts`: `import type {OperatorRunStatus} from '@fro-bot/runtime'` → `import type {OperatorRunStatus} from './run-status.ts'`
