import {describe, expect, it} from 'vitest'

import {
  parseLaunchRunResponse,
  parseRunApprovalDecisionResponse,
  parseRunApprovalsResponse,
  parseRunSnapshotResponse,
} from '../src/gateway/operator-contract/index.ts'

const validSnapshot = {
  runId: 'run-1',
  status: 'running',
  owner: 'codeo1io',
  repo: 'dashboard',
  createdAt: '2026-09-25T00:00:00.000Z',
}

describe('parseLaunchRunResponse', () => {
  it('accepts a well-formed response and ignores extra fields', () => {
    const result = parseLaunchRunResponse({runId: 'run-1', extra: 'ignored'})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({runId: 'run-1'})
    }
  })

  it.each([
    ['non-object', 'nope'],
    ['array', ['run-1']],
    ['null', null],
    ['missing runId', {}],
    ['non-string runId', {runId: 42}],
    ['empty runId', {runId: ''}],
    ['oversized runId', {runId: 'x'.repeat(513)}],
  ])('fails closed on %s', (_label, input) => {
    const result = parseLaunchRunResponse(input)
    expect(result.success).toBe(false)
  })
})

describe('parseRunSnapshotResponse', () => {
  it('accepts a well-formed snapshot', () => {
    const result = parseRunSnapshotResponse(validSnapshot)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.updatedAt).toBeUndefined()
    }
  })

  it('keeps updatedAt when present', () => {
    const result = parseRunSnapshotResponse({...validSnapshot, updatedAt: '2026-09-25T01:00:00.000Z'})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.updatedAt).toBe('2026-09-25T01:00:00.000Z')
    }
  })

  it.each(['waiting_for_approval', 'blocked'])(
    'accepts endpoint-layer overlay status %s (snapshot layers them after projection)',
    status => {
      const result = parseRunSnapshotResponse({...validSnapshot, status})
      expect(result.success).toBe(true)
    },
  )

  it.each([
    ['unknown status', {...validSnapshot, status: 'exploded'}],
    ['missing owner', {...validSnapshot, owner: undefined}],
    ['missing createdAt', {runId: 'run-1', status: 'running', owner: 'o', repo: 'r'}],
    ['updatedAt wrong type', {...validSnapshot, updatedAt: 123}],
    ['non-object', 'nope'],
  ])('fails closed on %s', (_label, input) => {
    const result = parseRunSnapshotResponse(input)
    expect(result.success).toBe(false)
  })
})

describe('parseRunApprovalsResponse', () => {
  it('accepts well-formed approvals and copies only declared fields', () => {
    const result = parseRunApprovalsResponse({
      approvals: [
        {requestID: 'req-1', permission: 'bash', command: 'pnpm test', filepath: undefined},
        {requestID: 'req-2', permission: 'edit', extra: 'ignored'},
      ],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.approvals).toHaveLength(2)
      expect(result.data.approvals[1]).toEqual({requestID: 'req-2', permission: 'edit'})
    }
  })

  it('accepts an empty queue', () => {
    const result = parseRunApprovalsResponse({approvals: []})
    expect(result.success).toBe(true)
  })

  it.each([
    ['bare array', []],
    ['missing approvals key', {}],
    ['approvals non-array', {approvals: 'nope'}],
    ['one invalid item fails the whole list', {approvals: [{requestID: 'req-1', permission: 'bash'}, {requestID: ''}]}],
    ['missing permission', {approvals: [{requestID: 'req-1'}]}],
    ['wrong-type command', {approvals: [{requestID: 'r', permission: 'bash', command: 7}]}],
    ['oversized queue', {approvals: Array.from({length: 101}, () => ({requestID: 'r', permission: 'bash'}))}],
  ])('fails closed on %s', (_label, input) => {
    const result = parseRunApprovalsResponse(input)
    expect(result.success).toBe(false)
  })
})

describe('parseRunApprovalDecisionResponse', () => {
  it.each(['pending', 'claimed', 'already_claimed', 'scope_mismatch', 'failed_to_settle', 'unavailable'])(
    'accepts state %s',
    state => {
      const result = parseRunApprovalDecisionResponse({state})
      expect(result.success).toBe(true)
    },
  )

  it.each([
    ['unknown state', {state: 'maybe'}],
    ['non-string state', {state: 1}],
    ['missing state', {}],
    ['non-object', null],
  ])('fails closed on %s', (_label, input) => {
    const result = parseRunApprovalDecisionResponse(input)
    expect(result.success).toBe(false)
  })
})
