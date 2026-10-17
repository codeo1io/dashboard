import {describe, expect, it} from 'vitest'
import {OPERATOR_PUSH_HEALTH_STATUSES as VENDORED_STATUSES} from '../public/operator-run-index.js'
import {OPERATOR_PUSH_HEALTH_STATUSES as CONTRACT_STATUSES} from '../src/gateway/operator-contract/responses.ts'
// The web runtime's vocabulary — importing through the client source keeps
// this a true cross-tree pin (root test/ importing web/src + public/ + src/).
import {PUSH_HEALTH_STATUSES as WEB_STATUSES} from '../web/src/push/health.ts'

// rm-1446: the push-health vocabulary must agree across the operator
// contract (the parser strips unknown statuses — parse.ts), the web runtime
// (web/src/push/health.ts renders it), and the vendored client twin
// (public/operator-run-index.js). Any drift strands one surface on a stale
// vocabulary while its siblings move — exactly the class the contract's
// three-way version parity already guards against.
describe('operator push-health three-way vocabulary parity (rm-1446)', () => {
  it('contract, web runtime, and vendored twin expose the same static list', () => {
    expect([...CONTRACT_STATUSES]).toEqual(['ready', 'degraded', 'unknown'])
    expect([...WEB_STATUSES]).toEqual([...CONTRACT_STATUSES])
    expect([...VENDORED_STATUSES]).toEqual([...CONTRACT_STATUSES])
  })

  it('the contract tuple stays frozen at the documented cardinality', () => {
    expect(CONTRACT_STATUSES).toHaveLength(3)
  })
})
