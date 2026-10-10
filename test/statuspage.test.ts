import {strict as assert} from 'node:assert'
import {afterEach, describe, it} from 'vitest'
import {readActionsComponentStatus, resetStatuspageCacheForTests} from '../src/github/statuspage.ts'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json'}})
}

const GOOD_BODY = {
  components: [
    {id: 'c0', name: 'Git Operations', status: 'operational'},
    {id: 'c1', name: 'Actions', status: 'operational'},
  ],
}

describe('rm-917 statuspage reader (annotation-only, fail-open)', () => {
  afterEach(() => {
    resetStatuspageCacheForTests()
  })

  it('reads the Actions component state from the components feed', async () => {
    const body = {components: [{name: 'Actions', status: 'degraded_performance'}]}
    const result = await readActionsComponentStatus(async () => jsonResponse(body))
    assert.ok(result !== null)
    assert.equal(result.state, 'degraded_performance')
    assert.equal(typeof result.fetchedAt, 'number')
  })

  it('returns null when the feed answers non-200 (fail-open, no annotation)', async () => {
    assert.equal(await readActionsComponentStatus(async () => jsonResponse({components: []}, 503)), null)
  })

  it('returns null when the feed shape is malformed (no components array)', async () => {
    assert.equal(await readActionsComponentStatus(async () => jsonResponse({})), null)
  })

  it('returns null when the Actions component is missing or its status is not a string', async () => {
    assert.equal(await readActionsComponentStatus(async () => jsonResponse({components: [{name: 'Other'}]})), null)
    assert.equal(
      await readActionsComponentStatus(async () => jsonResponse({components: [{name: 'Actions', status: 7}]})),
      null,
    )
  })

  it('returns null when the fetch throws (network down) — never propagates', async () => {
    assert.equal(
      await readActionsComponentStatus(async () => {
        throw new Error('boom')
      }),
      null,
    )
  })

  it('caches a good answer for the TTL window (second read does not refetch)', async () => {
    let calls = 0
    const fetcher = async () => {
      calls += 1
      return jsonResponse(GOOD_BODY)
    }
    const first = await readActionsComponentStatus(fetcher)
    const second = await readActionsComponentStatus(fetcher)
    assert.equal(calls, 1)
    assert.equal(first?.state, 'operational')
    assert.equal(second?.state, 'operational')
  })

  it('does NOT cache failures — a failed read retries on the next call', async () => {
    let fail = true
    let goodCalls = 0
    const fetcher = async () => {
      if (fail) throw new Error('down')
      goodCalls += 1
      return jsonResponse({components: [{name: 'Actions', status: 'major_outage'}]})
    }
    assert.equal(await readActionsComponentStatus(fetcher), null)
    fail = false
    const second = await readActionsComponentStatus(fetcher)
    assert.equal(goodCalls, 1)
    assert.equal(second?.state, 'major_outage')
  })

  it('shares the in-flight promise for concurrent callers (single-fetch fan-out)', async () => {
    let calls = 0
    const fetcher = async () => {
      calls += 1
      await new Promise(resolve => setTimeout(resolve, 5))
      return jsonResponse(GOOD_BODY)
    }
    const [a, b] = await Promise.all([readActionsComponentStatus(fetcher), readActionsComponentStatus(fetcher)])
    assert.equal(calls, 1)
    assert.equal(a?.state, 'operational')
    assert.equal(b?.state, 'operational')
  })
})
