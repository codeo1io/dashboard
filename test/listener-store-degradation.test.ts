/**
 * rm-187: corrupt-links degradation — the listener store's `links` cell is
 * the only free-form JSON it persists, and a corrupt cell (hand-edit, torn
 * write, schema drift) must degrade to "no links" instead of 500ing the
 * whole messages endpoint. The guard landed in rowToMessage (parseLinksCell);
 * these tests pin the acceptance: no throw, other fields intact, endpoint
 * 200 with the healthy rows, and the degradation observable (warn log).
 */
import {Buffer} from 'node:buffer'
import {randomUUID} from 'node:crypto'
import {mkdtempSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {DatabaseSync} from 'node:sqlite'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createListenerStore} from '../src/listener/store.ts'

describe('listener store rm-187 (degraded links cell never 500s the messages read)', () => {
  let dir: string
  let dbPath: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'dashboard-rm187-'))
    dbPath = join(dir, `listener-${randomUUID()}.db`)
  })

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true})
  })

  function seedThreeRows(): {healthy: string; corrupt: string; nonArray: string} {
    const store = createListenerStore(dbPath)
    const insert = (title: string) =>
      store.insert({
        source: 'infra',
        kind: 'deploy-health',
        severity: 'warning',
        title,
        body: 'b',
        links: [{label: 'L', url: 'https://example.com'}],
        dedupeKey: null,
        createdAt: '2026-10-09T10:00:00Z',
      }).id
    return {healthy: insert('healthy row'), corrupt: insert('corrupt json row'), nonArray: insert('non-array row')}
  }

  function corruptViaSecondHandle(id: string, linksValue: string): void {
    const handle = new DatabaseSync(dbPath)
    try {
      handle.prepare('UPDATE messages SET links = ? WHERE id = ?').run(linksValue, id)
    } finally {
      handle.close()
    }
  }

  it('degrades a corrupt (non-JSON) cell to empty links, keeps other fields, and logs the degradation', () => {
    const ids = seedThreeRows()
    corruptViaSecondHandle(ids.corrupt, '{not json')

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = createListenerStore(dbPath)
    const page = store.list({})

    expect(page.messages).toHaveLength(3)
    const degraded = page.messages.find(m => m.title === 'corrupt json row')
    expect(degraded).toBeDefined()
    expect(degraded!.links).toEqual([])
    expect(degraded!.kind).toBe('deploy-health')
    expect(degraded!.severity).toBe('warning')
    expect(degraded!.body).toBe('b')
    // The healthy rows keep their links.
    expect(page.messages.find(m => m.title === 'healthy row')!.links).toEqual([{label: 'L', url: 'https://example.com'}])
    // Observable by design: every degraded read logs once.
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('degraded links cell on message'))
    warn.mockRestore()
  })

  it('degrades valid-JSON-but-not-an-array cells (JSON null, JSON string, empty string) the same way', () => {
    const ids = seedThreeRows()
    corruptViaSecondHandle(ids.corrupt, 'null')
    corruptViaSecondHandle(ids.nonArray, '"just-a-string"')

    const store = createListenerStore(dbPath)
    const page = store.list({})

    expect(page.messages).toHaveLength(3)
    expect(page.messages.find(m => m.title === 'corrupt json row')!.links).toEqual([])
    expect(page.messages.find(m => m.title === 'non-array row')!.links).toEqual([])
    expect(page.messages.find(m => m.title === 'healthy row')!.links).toHaveLength(1)
  })

  it('GET /api/listener/messages returns 200 with the healthy rows when a links cell is corrupt (endpoint-level)', async () => {
    const ids = seedThreeRows()
    corruptViaSecondHandle(ids.corrupt, '{not json')

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const {buildDashboardApp} = await import('../src/server.ts')
    const {SessionManager} = await import('../src/session.ts')
    const TEST_KEY = Buffer.from('testkey-ABCDEFGHIJKLMNOPQRSTUV12', 'utf8') // 32 bytes
    const store = createListenerStore(dbPath)
    const app = await buildDashboardApp({
      operatorLogin: 'octocat',
      cookieKey: TEST_KEY,
      listenerStore: store,
      listenerIngestKey: 'shared-ingest-key-for-tests',
    })

    const res = await app.request('/api/listener/messages', {
      headers: {cookie: `session=${new SessionManager(TEST_KEY).sign('octocat')}`},
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as {messages: {title: string; links: {label: string; url: string}[]}[]}
    expect(body.messages).toHaveLength(3)
    expect(body.messages.find(m => m.title === 'corrupt json row')!.links).toEqual([])
    expect(body.messages.find(m => m.title === 'healthy row')!.links).toEqual([{label: 'L', url: 'https://example.com'}])
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('a healthy store (no corruption) never logs a degradation', () => {
    seedThreeRows()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = createListenerStore(dbPath)
    const page = store.list({})
    expect(page.messages).toHaveLength(3)
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
