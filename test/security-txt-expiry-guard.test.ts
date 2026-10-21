import {describe, expect, it} from 'vitest'
import {buildDashboardApp} from '../src/server.ts'

// rm-673 (ROADMAP.md security.txt refresh-freshness guard): the served
// security.txt Expires must keep a >= 60-day runway so a missed quarterly
// refresh cannot silently serve an expired security contact. test/server.test.ts
// already pins future + <= 366 days; this focused guard owns the runway floor
// alone. Per rm-673's acceptance, src/server.ts itself stays UNCHANGED — the
// guard asserts the served constant; it does not reshape it.
describe('security.txt expiry runway guard (rm-673)', () => {
  it('served Expires keeps at least a 60-day runway from now', async () => {
    const app = await buildDashboardApp()
    const res = await app.request('/.well-known/security.txt')
    expect(res.status).toBe(200)

    const match = (await res.text()).match(/^Expires: (.+)$/m)
    expect(match).not.toBeNull()

    const expiresValue = match?.[1]
    expect(typeof expiresValue).toBe('string')
    const expires = Date.parse(expiresValue ?? '')
    expect(Number.isNaN(expires)).toBe(false)

    const runwayMs = expires - Date.now()
    expect(runwayMs).toBeGreaterThanOrEqual(60 * 24 * 60 * 60 * 1000)
  })
})
