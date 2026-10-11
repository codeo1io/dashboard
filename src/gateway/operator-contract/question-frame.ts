/**
 * Operator run-stream question frame.
 *
 * Vendored from fro-bot/agent
 * packages/gateway/src/operator-contract/question-frame.ts
 * (gateway v0.119.0, PR #1749 — the agent→operator question bridge,
 * operator-contract 1.9.0).
 *
 * Delivered as `event: question` on GET /operator/runs/:runId/stream.
 * The frame is a discriminated union on `settled`:
 *
 * - settled:false (open) — the agent is blocked on an operator question
 *   request. `questions` carries the bounded question list: each item has a
 *   `header` and `text`, zero or more `options` (label + description), and the
 *   `multiple`/`custom` answer flags. ALL strings are untrusted plain text —
 *   they MUST be displayed as inert text (textContent assignment), never
 *   interpreted as HTML/Markdown/links, and never written to logs or push
 *   notifications.
 * - settled:true (settle) — the request is resolved (answered by any client,
 *   expired, or superseded by run teardown). Only `requestID` and `runId` are
 *   meaningful; every other field is ignored. The consumer must dismiss the
 *   corresponding open prompt and tombstone the `requestID` so that a late
 *   arriving open frame for the same id is ignored.
 *
 * Decisions are posted to
 * POST /operator/runs/:runId/questions/:requestId/decision (CSRF-gated):
 * {decision:'answer', answers:[{options?:number[], text?:string}]} where the
 * option numbers are ZERO-BASED indices into the displayed options list, or
 * {decision:'skip'}. Answers are validated for arity (one entry per question),
 * index bounds, multiple-permission, and a 4000-character text bound; 400
 * responses carry {reason, questionIndex} and leave the request pending.
 *
 * Consumers MUST validate `runId` and `requestID` as non-empty strings on both
 * variants, and the full `questions` structure on the open variant, before
 * acting on the frame. Malformed frames must be rejected fail-closed.
 */

// ---------------------------------------------------------------------------
// Open variant
// ---------------------------------------------------------------------------

export interface OperatorQuestionOption {
  readonly label: string
  readonly description: string
}

export interface OperatorQuestionItem {
  readonly header: string
  readonly text: string
  readonly options: readonly OperatorQuestionOption[]
  readonly multiple: boolean
  readonly custom: boolean
}

export interface OperatorQuestionFrameOpen {
  readonly runId: string
  readonly requestID: string
  readonly questions: readonly OperatorQuestionItem[]
  readonly settled: false
}

// ---------------------------------------------------------------------------
// Settle variant
// ---------------------------------------------------------------------------

export interface OperatorQuestionFrameSettle {
  readonly runId: string
  readonly requestID: string
  readonly settled: true
}

// ---------------------------------------------------------------------------
// Discriminated union
// ---------------------------------------------------------------------------

export type OperatorQuestionFrame = OperatorQuestionFrameOpen | OperatorQuestionFrameSettle
