import {createHmac} from 'node:crypto'
import {describe, expect, it} from 'vitest'
import {
  buildDeadManMessage,
  buildIngestRequest,
  expectedWindowStarts,
  judgeMonitor,
  MONITORS,
  parseWeeklyMondayCron,
  signIngestPayload,
  type MonitorRun,
  type MonitorSpec,
  type MonitorVerdict,
} from '../scripts/monitor-fleet-heartbeat.ts'
import {parseIngestBody} from '../src/listener/contract.ts'
import {createListenerStore} from '../src/listener/store.ts'
import {buildListenerRouter} from '../src/routes/listener.ts'

const AUDIT = MONITORS.find(monitor => monitor.name === 'audit')
if (!AUDIT) throw new Error('audit monitor missing from MONITORS')

function iso(ms: number): string {
  return new Date(ms).toISOString()
}

function run(minutesAfterWindowStart: number, windowStartMs: number): MonitorRun {
  return {createdAtMs: windowStartMs + minutesAfterWindowStart * 60_000}
}

function signedFor(ms: number, rawBody: string): string {
  return signIngestPayload(Math.floor(ms / 1000), rawBody, 'test-key')
}

describe('parseWeeklyMondayCron', () => {
  it('parses a valid Monday cron', () => {
    expect(parseWeeklyMondayCron('37 3 * * 1')).toEqual({hour: 3, minute: 37})
  })
  it('rejects non-Monday, malformed, and out-of-range crons', () => {
    expect(parseWeeklyMondayCron('37 3 * * 2')).toBeNull()
    expect(parseWeeklyMondayCron('nonsense')).toBeNull()
    expect(parseWeeklyMondayCron('99 3 * * 1')).toBeNull()
    expect(parseWeeklyMondayCron('37 25 * * 1')).toBeNull()
  })
})

describe('expectedWindowStarts', () => {
  it('returns the three Mondays at or before a Sunday now, oldest first', () => {
    // 2026-10-18 is a Sunday; audit fires Monday 03:37 UTC.
    const nowMs = Date.parse('2026-10-18T12:00:00Z')
    const starts = expectedWindowStarts(AUDIT.cron, nowMs, 3)
    expect(starts.map(iso)).toEqual([
      '2026-09-28T03:37:00.000Z',
      '2026-10-05T03:37:00.000Z',
      '2026-10-12T03:37:00.000Z',
    ])
  })
  it('uses the current Monday once the fire instant has passed', () => {
    const nowMs = Date.parse('2026-10-12T03:37:00.001Z') // Monday, 1ms after fire
    const starts = expectedWindowStarts(AUDIT.cron, nowMs, 1)
    expect(starts.map(iso)).toEqual(['2026-10-12T03:37:00.000Z'])
  })
  it('steps back a full week before the fire instant', () => {
    const nowMs = Date.parse('2026-10-12T03:36:59.999Z')
    const starts = expectedWindowStarts(AUDIT.cron, nowMs, 1)
    expect(starts.map(iso)).toEqual(['2026-10-05T03:37:00.000Z'])
  })
})

describe('judgeMonitor', () => {
  const nowMs = Date.parse('2026-10-18T12:00:00Z') // all three windows judged
  const starts = expectedWindowStarts(AUDIT.cron, nowMs, 3)
  expect(starts).toHaveLength(3)
  const w0 = starts[0]!
  const w1 = starts[1]!
  const w2 = starts[2]!

  it('healthy when every judged window has a run', () => {
    const runs = [run(5, w0), run(5, w1), run(5, w2)]
    const verdict = judgeMonitor(AUDIT, runs, nowMs)
    expect(verdict.consecutiveMisses).toBe(0)
    expect(verdict.deadMan).toBe(false)
    expect(verdict.pendingWindow).toBe(false)
    expect(verdict.lastRunAtMs).toBe(runs.at(-1)!.createdAtMs)
  })

  it('one missed window warns but is not a dead man', () => {
    const runs = [run(5, w0), run(5, w1)] // latest window empty
    const verdict = judgeMonitor(AUDIT, runs, nowMs)
    expect(verdict.consecutiveMisses).toBe(1)
    expect(verdict.deadMan).toBe(false)
  })

  it('two consecutive missed windows is a dead man', () => {
    const runs = [run(5, w0)] // w1 and w2 empty
    const verdict = judgeMonitor(AUDIT, runs, nowMs)
    expect(verdict.consecutiveMisses).toBe(2)
    expect(verdict.deadMan).toBe(true)
    expect(verdict.lastRunAtMs).toBe(runs[0]!.createdAtMs)
  })

  it('a run later in the week covers its window', () => {
    const runs = [run(5, w0), {createdAtMs: w1 + 6 * 24 * 60 * 60 * 1000}] // Sunday run
    const verdict = judgeMonitor(AUDIT, runs, nowMs)
    expect(verdict.windows[1]!.covered).toBe(true)
    expect(verdict.consecutiveMisses).toBe(1)
  })

  it('an unelapsed window is pending, never missed', () => {
    // 2026-10-12T04:00Z: latest window (03:37) is inside the 2h grace.
    const earlyNow = Date.parse('2026-10-12T04:00:00Z')
    const runs = [run(5, w0), run(5, w1)]
    const verdict = judgeMonitor(AUDIT, runs, earlyNow)
    expect(verdict.pendingWindow).toBe(true)
    expect(verdict.windows[2]!.judged).toBe(false)
    expect(verdict.consecutiveMisses).toBe(0)
  })

  it('a monitor that never ran is a dead man', () => {
    const verdict = judgeMonitor(AUDIT, [], nowMs)
    expect(verdict.consecutiveMisses).toBe(3)
    expect(verdict.deadMan).toBe(true)
    expect(verdict.lastRunAtMs).toBeNull()
  })
})

describe('dead-man message + ingest request', () => {
  const nowMs = Date.parse('2026-10-18T12:00:00Z')
  const starts = expectedWindowStarts(AUDIT.cron, nowMs, 3)
  const firstWindowStart = starts[0]!

  function deadVerdict(monitor: MonitorSpec): MonitorVerdict {
    return judgeMonitor(monitor, [run(5, firstWindowStart)], nowMs)
  }

  const verdicts = [deadVerdict(AUDIT)]
  const message = buildDeadManMessage(verdicts, 'codeo1io/dashboard', nowMs)

  it('builds a critical infra message with an https link and dated dedupe key', () => {
    expect(message.source).toBe('infra')
    expect(message.kind).toBe('monitor-heartbeat')
    expect(message.severity).toBe('critical')
    expect(message.links[0]?.url).toMatch(/^https:\/\//)
    expect(message.dedupeKey).toBe('monitor-heartbeat:2026-10-05')
    expect(message.title).toContain('dead-man')
  })

  it('signs exactly like src/listener/ingest-auth.ts verifies', () => {
    const rawBody = JSON.stringify(message)
    const expected = `sha256=${createHmac('sha256', 'test-key')
      .update(`${Math.floor(nowMs / 1000)}.${rawBody}`)
      .digest('hex')}`
    expect(signedFor(nowMs, rawBody)).toBe(expected)
  })

  it('targets /api/listener/ingest with seconds-precision headers', () => {
    const plan = buildIngestRequest('https://dashboard.example/', 'test-key', message, nowMs)
    expect(plan.url).toBe('https://dashboard.example/api/listener/ingest')
    expect(plan.headers['x-listener-timestamp']).toBe(String(Math.floor(nowMs / 1000)))
    expect(plan.headers['x-listener-signature']).toMatch(/^sha256=[0-9a-f]{64}$/)
    expect(plan.body).toBe(JSON.stringify(message))
  })

  it('satisfies the listener ingest contract (parseIngestBody)', () => {
    const result = parseIngestBody(JSON.parse(JSON.stringify(message)))
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.kind).toBe('monitor-heartbeat')
      expect(result.data.severity).toBe('critical')
    }
  })
})

describe('ingest boundary against the mounted route', () => {
  it('a signed dead-man plan is accepted (200) and a tampered one is rejected (401)', async () => {
    const store = createListenerStore(':memory:')
    const router = buildListenerRouter({store, ingestKey: 'test-key', ackCsrf: null})
    const nowMs = Date.now()
    const message = buildDeadManMessage(
      [judgeMonitor(AUDIT, [], nowMs)],
      'codeo1io/dashboard',
      nowMs,
    )
    const plan = buildIngestRequest('https://dashboard.example', 'test-key', message, nowMs)

    const accepted = await router.request('/ingest', {method: 'POST', headers: plan.headers, body: plan.body})
    expect(accepted.status).toBe(202)
    const acceptedJson = (await accepted.json()) as {id?: string; receivedAt?: string}
    expect(typeof acceptedJson.id).toBe('string')
    expect(Number.isNaN(Date.parse(acceptedJson.receivedAt ?? ''))).toBe(false)

    const tampered = await router.request('/ingest', {
      method: 'POST',
      headers: plan.headers,
      body: plan.body.replace('critical', 'info'),
    })
    expect(tampered.status).toBe(401)
  })
})
