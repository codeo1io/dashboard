/**
 * Structural response parsers for the run/approval operator routes.
 *
 * These back the MOCK-ONLY / DEFERRED DTOs in operator-client.ts
 * (LaunchRunResponse, RunSnapshotDto, RunApprovalsResponse,
 * RunApprovalDecisionResponse). They assert NO conformance to a frozen
 * upstream contract (see the operator-client DTO fence): validation is
 * permissive structural subtyping — extra fields ignored, declared fields
 * type- and length-checked, values copied into closed objects (never
 * spread). When the gateway routes freeze, realign these alongside the
 * DTOs.
 *
 * Approval items fail the WHOLE list on any invalid item (unlike the
 * run-summary list, which skips): an approval prompt must be complete to
 * be actionable, so a half-parsed queue is worse than an error.
 *
 * Error messages are fixed strings — never echo or interpolate input.
 */

import type {Result} from '../../result.ts'
import type {OperatorDecisionState} from './approval.ts'
import type {
  PendingQuestionsResponse,
  QuestionDecisionErrorResponse,
  QuestionDecisionInvalidReason,
  QuestionDecisionResponse,
  QuestionOptionDetail,
  QuestionPromptDetail,
  QuestionRequestDetail,
} from './question-frame.ts'
import type {OperatorWebStatus} from './run-status.ts'

import {err, ok} from '../../result.ts'

/** Response shape for POST /operator/runs (launch). */
export interface LaunchRunResponse {
  readonly runId: string
}

/** Snapshot projection for GET /operator/runs/:runId. */
export interface RunSnapshotResponse {
  readonly runId: string
  readonly status: OperatorWebStatus
  readonly owner: string
  readonly repo: string
  readonly createdAt: string
  readonly updatedAt?: string
}

/** A single open approval prompt from GET /operator/runs/:runId/approvals. */
export interface RunApprovalSummaryItem {
  readonly requestID: string
  readonly permission: string
  readonly command?: string
  readonly filepath?: string
}

/** Response shape for GET /operator/runs/:runId/approvals. */
export interface RunApprovalsListResponse {
  readonly approvals: readonly RunApprovalSummaryItem[]
}

/** Response shape for POST /operator/runs/:runId/approvals/:requestId/decision. */
export interface RunApprovalDecisionResult {
  readonly state: OperatorDecisionState
}

// Practical caps mirroring run-summary.ts: run/request IDs and owner/repo
// paths are well under 512 chars; ISO 8601 dates at most ~35 chars;
// permission names are short tokens; command/filepath preview strings are
// operator-visible text, not arbitrary documents.
const MAX_ID_LENGTH = 512
const MAX_DATE_LENGTH = 128
const MAX_PERMISSION_LENGTH = 128
const MAX_TEXT_LENGTH = 2048
const MAX_APPROVALS_LENGTH = 100

const VALID_WEB_STATUSES: ReadonlySet<string> = new Set([
  'queued',
  'blocked',
  'running',
  'waiting_for_approval',
  'waiting_for_question',
  'succeeded',
  'failed',
  'cancelled',
])

const VALID_DECISION_STATES: ReadonlySet<string> = new Set([
  'pending',
  'claimed',
  'already_claimed',
  'scope_mismatch',
  'failed_to_settle',
  'unavailable',
])

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCappedString(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max
}

function isOptionalCappedString(value: unknown, max: number): boolean {
  return value === undefined || isCappedString(value, max)
}

/** Parse an unknown value as a launch response. Fixed reason on failure. */
export function parseLaunchRunResponse(input: unknown): Result<LaunchRunResponse, Error> {
  if (!isObject(input) || !isCappedString(input.runId, MAX_ID_LENGTH)) {
    return err(new Error('invalid launch response shape'))
  }

  const response: LaunchRunResponse = {runId: input.runId}
  return ok(response)
}

/** Parse an unknown value as a run snapshot. Fixed reason on failure. */
export function parseRunSnapshotResponse(input: unknown): Result<RunSnapshotResponse, Error> {
  if (!isObject(input)) return err(new Error('invalid run snapshot shape'))

  if (
    !isCappedString(input.runId, MAX_ID_LENGTH) ||
    typeof input.status !== 'string' ||
    !VALID_WEB_STATUSES.has(input.status) ||
    !isCappedString(input.owner, MAX_ID_LENGTH) ||
    !isCappedString(input.repo, MAX_ID_LENGTH) ||
    !isCappedString(input.createdAt, MAX_DATE_LENGTH) ||
    !isOptionalCappedString(input.updatedAt, MAX_DATE_LENGTH)
  ) {
    return err(new Error('invalid run snapshot shape'))
  }

  const snapshot: RunSnapshotResponse = {
    runId: input.runId,
    status: input.status as OperatorWebStatus,
    owner: input.owner,
    repo: input.repo,
    createdAt: input.createdAt,
    ...(isCappedString(input.updatedAt, MAX_DATE_LENGTH) ? {updatedAt: input.updatedAt} : {}),
  }
  return ok(snapshot)
}

function hasValidApprovalShape(value: unknown): value is RunApprovalSummaryItem {
  if (!isObject(value)) return false
  return (
    isCappedString(value.requestID, MAX_ID_LENGTH) &&
    isCappedString(value.permission, MAX_PERMISSION_LENGTH) &&
    isOptionalCappedString(value.command, MAX_TEXT_LENGTH) &&
    isOptionalCappedString(value.filepath, MAX_TEXT_LENGTH)
  )
}

/** Parse an unknown value as an approvals listing. Any invalid item fails the whole list. */
export function parseRunApprovalsResponse(input: unknown): Result<RunApprovalsListResponse, Error> {
  if (!isObject(input) || !Array.isArray(input.approvals) || input.approvals.length > MAX_APPROVALS_LENGTH) {
    return err(new Error('invalid run approvals response shape'))
  }

  const approvals: RunApprovalSummaryItem[] = []
  for (const item of input.approvals) {
    if (!hasValidApprovalShape(item)) {
      return err(new Error('invalid run approvals response shape'))
    }

    const approval: RunApprovalSummaryItem = {
      requestID: item.requestID,
      permission: item.permission,
      ...('command' in item && item.command !== undefined ? {command: item.command} : {}),
      ...('filepath' in item && item.filepath !== undefined ? {filepath: item.filepath} : {}),
    }
    approvals.push(approval)
  }

  return ok({approvals})
}

/** Parse an unknown value as an approval-decision response. Fixed reason on failure. */
export function parseRunApprovalDecisionResponse(input: unknown): Result<RunApprovalDecisionResult, Error> {
  if (!isObject(input) || typeof input.state !== 'string' || !VALID_DECISION_STATES.has(input.state)) {
    return err(new Error('invalid run approval decision response shape'))
  }

  const response: RunApprovalDecisionResult = {state: input.state as OperatorDecisionState}
  return ok(response)
}

// ---------------------------------------------------------------------------
// Question surface (contract 1.9.0, rm-912) — GET questions / POST decision
// ---------------------------------------------------------------------------

/**
 * Gateway build-side bounds, mirrored from fro-bot/agent
 * approvals/question-detail.ts at v0.119.1: the registry refuses to register a
 * request outside these, so a CONFORMING gateway never emits beyond them.
 */
export const QUESTION_BUILD_BOUNDS = {
  maxQuestionsPerRequest: 8,
  maxOptionsPerQuestion: 64,
  maxHeaderLength: 128,
  maxTextLength: 4096,
  maxLabelLength: 256,
  maxDescriptionLength: 1024,
  maxAnswerTextLength: 4000,
} as const

/**
 * Wire-side parse tolerance: the gateway's own untrusted-array safety net caps
 * questions/options arrays at 256 before validation, and the pending-questions
 * listing is hard-capped at 50 requests per call. The consumer parser accepts
 * anything within these nets and fails closed above them.
 */
export const QUESTION_WIRE_CAPS = {
  maxArrayEntries: 256,
  maxPendingRequests: 50,
} as const

const QUESTION_DECISION_STATES: ReadonlySet<string> = new Set([
  'claimed',
  'already_claimed',
  'already_settled',
  'failed_to_settle',
])

const QUESTION_DECISION_REASONS: ReadonlySet<string> = new Set([
  'malformed',
  'arity-mismatch',
  'unknown-option',
  'multiple-not-allowed',
  'empty-value',
  'text-too-long',
])

function hasValidQuestionOptionShape(value: unknown): value is QuestionOptionDetail {
  if (!isObject(value)) return false
  return (
    isCappedString(value.label, QUESTION_BUILD_BOUNDS.maxLabelLength) &&
    isCappedString(value.description, QUESTION_BUILD_BOUNDS.maxDescriptionLength)
  )
}

function hasValidQuestionPromptShape(value: unknown): value is QuestionPromptDetail {
  if (!isObject(value)) return false
  if (
    !isCappedString(value.header, QUESTION_BUILD_BOUNDS.maxHeaderLength) ||
    !isCappedString(value.text, QUESTION_BUILD_BOUNDS.maxTextLength) ||
    typeof value.multiple !== 'boolean' ||
    typeof value.custom !== 'boolean' ||
    !Array.isArray(value.options) ||
    value.options.length > QUESTION_BUILD_BOUNDS.maxOptionsPerQuestion
  ) {
    return false
  }
  return value.options.every(option => hasValidQuestionOptionShape(option))
}

function hasValidQuestionRequestShape(value: unknown): value is QuestionRequestDetail {
  if (!isObject(value)) return false
  if (
    !isCappedString(value.requestID, MAX_ID_LENGTH) ||
    !Array.isArray(value.questions) ||
    value.questions.length === 0 ||
    value.questions.length > QUESTION_WIRE_CAPS.maxArrayEntries
  ) {
    return false
  }
  return value.questions.every(question => hasValidQuestionPromptShape(question))
}

/**
 * Parse an unknown value as a pending-questions listing response.
 *
 * Follows the approvals-listing precedent: any invalid item fails the whole
 * list (never a partial render of untrusted text). The requests array is
 * capped at the gateway's PENDING_QUESTIONS_MAX_RESULTS (50); a longer array
 * is protocol drift, not truncation to render.
 */
export function parsePendingQuestionsResponse(input: unknown): Result<PendingQuestionsResponse, Error> {
  if (!isObject(input) || !Array.isArray(input.requests) || input.requests.length > QUESTION_WIRE_CAPS.maxPendingRequests) {
    return err(new Error('invalid pending questions response shape'))
  }

  const requests: QuestionRequestDetail[] = []
  for (const item of input.requests) {
    if (!hasValidQuestionRequestShape(item)) {
      return err(new Error('invalid pending questions response shape'))
    }
    requests.push({
      requestID: item.requestID,
      questions: item.questions.map(question => ({
        header: question.header,
        text: question.text,
        options: question.options.map(option => ({label: option.label, description: option.description})),
        multiple: question.multiple,
        custom: question.custom,
      })),
    })
  }

  return ok({requests})
}

/** Parse an unknown value as a question-decision 200 response. Fixed reason on failure. */
export function parseQuestionDecisionResponse(input: unknown): Result<QuestionDecisionResponse, Error> {
  if (!isObject(input) || typeof input.state !== 'string' || !QUESTION_DECISION_STATES.has(input.state)) {
    return err(new Error('invalid question decision response shape'))
  }
  return ok({state: input.state as QuestionDecisionResponse['state']})
}

/**
 * Parse an unknown value as a question-decision 400 body: {error: 'bad request',
 * reason, questionIndex}. Used for typed refusal rendering (the prompt stays
 * open). Fixed reason on failure — an unparseable 400 is surfaced as 'malformed'
 * with questionIndex null rather than echoing any wire text.
 */
export function parseQuestionDecisionErrorResponse(input: unknown): QuestionDecisionErrorResponse {
  const fallback: QuestionDecisionErrorResponse = {error: 'bad request', reason: 'malformed', questionIndex: null}
  if (!isObject(input)) return fallback
  if (typeof input.reason !== 'string' || !QUESTION_DECISION_REASONS.has(input.reason)) return fallback
  const reason = input.reason as QuestionDecisionInvalidReason
  if (input.questionIndex === null) return {error: 'bad request', reason, questionIndex: null}
  if (typeof input.questionIndex !== 'number' || !Number.isInteger(input.questionIndex) || input.questionIndex < 0) {
    return fallback
  }
  return {error: 'bad request', reason, questionIndex: input.questionIndex}
}
