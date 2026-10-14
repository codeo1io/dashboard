import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'
import {buildNotification, KNOWN_FAILURE_LABELS} from './sw-notification.ts'

describe('buildNotification (gateway wire shape {title, body, data: {type, route, failureLabel?}})', () => {
  it('happy path: approval payload renders fixed "Approval needed" copy', () => {
    const result = buildNotification({
      title: 'Gateway title is ignored for known kinds',
      body: 'Gateway body is ignored for known kinds',
      data: {type: 'approval', route: '/'},
    })
    expect(result.title).toBe('Approval needed')
    expect(result.body).toBe('A run is waiting for your approval.')
    expect(result.data).toEqual({type: 'approval', route: '/'})
  })

  it('happy path: question payload renders fixed "Answer needed" copy', () => {
    const result = buildNotification({data: {type: 'question', route: '/'}})
    expect(result.title).toBe('Answer needed')
    expect(result.body).toBe('A run is waiting for your answer.')
    expect(result.data).toEqual({type: 'question', route: '/'})
  })

  it('happy path: run_failed with an allowlisted failureLabel renders that label', () => {
    for (const label of KNOWN_FAILURE_LABELS) {
      const result = buildNotification({data: {type: 'run_failed', failureLabel: label}})
      expect(result.title).toBe('Run failed')
      expect(result.body).toBe(`A run failed: ${label}.`)
    }
  })

  it('a failureLabel outside the allowlist is discarded, not reflected', () => {
    const result = buildNotification({data: {type: 'run_failed', failureLabel: 'sql-injection-attempt'}})
    expect(result.title).toBe('Run failed')
    expect(result.body).toBe('A run failed.')
    expect(result.body).not.toContain('sql-injection-attempt')
  })

  it('a non-string failureLabel is discarded', () => {
    const result = buildNotification({data: {type: 'run_failed', failureLabel: {label: 'timeout'}}})
    expect(result.title).toBe('Run failed')
    expect(result.body).toBe('A run failed.')
  })

  it('NEGATIVE (rm-1420): the pre-#615 top-level {type, ...} shape now renders the generic fallback', () => {
    // The old wire shape pinned by this suite before the #615 absorb. Those
    // payloads carry no `data` envelope, so the type is unreadable and the
    // mapping must degrade to the generic card — proving the re-pin replaced
    // the old contract instead of extending it.
    expect(buildNotification({type: 'approval'})).toEqual({
      title: 'Fro Bot',
      body: 'You have a new notification.',
      data: {type: 'unknown', route: '/'},
    })
    expect(buildNotification({type: 'question'}).title).toBe('Fro Bot')
    expect(buildNotification({type: 'run_failed', failureLabel: 'timeout'}).body).toBe('You have a new notification.')
  })

  it('#615 fallback: an unrecognized event kind surfaces the gateway\'s real title/body', () => {
    const result = buildNotification({
      title: 'Workspace restored',
      body: 'The workspace for a repository was restored from a snapshot.',
      data: {type: 'workspace_restored', route: '/operator/runs/99'},
    })
    expect(result.title).toBe('Workspace restored')
    expect(result.body).toBe('The workspace for a repository was restored from a snapshot.')
    expect(result.data).toEqual({type: 'unknown', route: '/'})
  })

  it('#615 fallback: missing or blank gateway title/body falls back to generic copy', () => {
    expect(buildNotification({data: {type: 'brand_new_kind'}})).toEqual({
      title: 'Fro Bot',
      body: 'You have a new notification.',
      data: {type: 'unknown', route: '/'},
    })
    expect(buildNotification({title: '   ', body: '\t', data: {type: 'brand_new_kind'}}).title).toBe('Fro Bot')
  })

  it('edge case: empty, null, array, and non-object payloads render the generic fallback', () => {
    const expected = {
      title: 'Fro Bot',
      body: 'You have a new notification.',
      data: {type: 'unknown', route: '/'},
    }
    expect(buildNotification({})).toEqual(expected)
    expect(buildNotification(null)).toEqual(expected)
    expect(buildNotification(undefined)).toEqual(expected)
    expect(buildNotification([])).toEqual(expected)
    expect(buildNotification(42)).toEqual(expected)
    expect(buildNotification('not-an-object')).toEqual(expected)
  })

  it('edge case: a payload whose data envelope is absent or not a plain object degrades safely', () => {
    expect(buildNotification({title: 'T', body: 'B'}).data.type).toBe('unknown')
    expect(buildNotification({title: 'T', data: 'not-an-object'}).data.type).toBe('unknown')
    expect(buildNotification({title: 'T', data: ['array-envelope']}).data.type).toBe('unknown')
    // A null data envelope is treated as absent, not as a crash.
    expect(buildNotification({title: 'T', data: null}).data.type).toBe('unknown')
  })

  it('privacy: a question payload\'s extra text fields are never reflected (wire shape)', () => {
    const sentinel = 'SENTINEL-question-text-9f3a'
    const result = buildNotification({
      title: sentinel,
      body: sentinel,
      data: {
        type: 'question',
        route: '/elsewhere',
        failureLabel: sentinel,
        text: sentinel,
        question: sentinel,
        options: [{label: sentinel}],
      },
    })
    expect(result.title).toBe('Answer needed')
    expect(result.body).toBe('A run is waiting for your answer.')
    expect(result.data).toEqual({type: 'question', route: '/'})
    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain(sentinel)
    expect(serialized).not.toContain('elsewhere')
  })

  it('privacy: known kinds render fixed copy even when the payload carries attacker-supplied title/body', () => {
    const result = buildNotification({title: 'Free money', body: 'Click here now', data: {type: 'approval'}})
    expect(result.title).toBe('Approval needed')
    expect(result.body).toBe('A run is waiting for your approval.')
  })

  it('privacy: the fallback path reflects ONLY title/body — every other payload field is discarded', () => {
    const result = buildNotification({
      title: 'Real event title',
      body: 'Real event body',
      repo: 'fro-bot/SENTINEL-repo',
      prompt: 'SENTINEL-prompt',
      path: '/etc/SENTINEL-path',
      endpoint: 'https://push.example.com/SENTINEL-endpoint',
      keys: {p256dh: 'SENTINEL-p256dh', auth: 'SENTINEL-auth'},
      data: {
        type: 'brand_new_kind',
        route: '/operator/SENTINEL-run',
        failureLabel: 'SENTINEL-raw-internal-kind',
      },
    })
    expect(result.title).toBe('Real event title')
    expect(result.body).toBe('Real event body')
    expect(result.data).toEqual({type: 'unknown', route: '/'})
    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain('SENTINEL')
    expect(serialized).not.toContain('/etc/')
    expect(serialized).not.toContain('push.example.com')
  })

  it('regression: all notification copy is dashboard-owned, never verbatim gateway copy', () => {
    const approval = buildNotification({data: {type: 'approval'}})
    const question = buildNotification({data: {type: 'question'}})
    const runFailed = buildNotification({data: {type: 'run_failed'}})
    expect(
      [approval, question, runFailed]
        .flatMap((notification) => Object.values(notification))
        .map((value) => JSON.stringify(value))
        .join(' '),
    ).not.toMatch(/\bhttps?:\/\/|\btoken\b|\bkey\b/i)
  })
})

describe('label parity with the served client (rm-1420)', () => {
  const operatorStreamSource = readFileSync(
    resolve(import.meta.dirname, '../../../public/operator-stream.js'),
    'utf8',
  )

  it('KNOWN_FAILURE_LABELS mirrors exactly the keys of FAILURE_REASON_LABELS in public/operator-stream.js', () => {
    const block = operatorStreamSource.match(/const FAILURE_REASON_LABELS = \{([^}]*)\}/)
    expect(block).not.toBeNull()
    const servedKeys = [...(block?.[1] ?? '').matchAll(/^\s*'?([a-z-]+)'?\s*:/gm)].map(match => match[1]).sort()
    expect(servedKeys.length).toBeGreaterThan(0)
    expect([...KNOWN_FAILURE_LABELS].sort()).toEqual(servedKeys)
  })
})
