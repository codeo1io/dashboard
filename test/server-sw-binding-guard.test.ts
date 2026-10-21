import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

// ---------------------------------------------------------------------------
// rm-2077 — server-side service-worker binding comments tell the shipped truth
//
// web/src/sw.ts ships a workbox precache + NavigationRoute offline shell
// (denylist includes /privacy) with prompt-gated SKIP_WAITING and
// push/notificationclick handlers — it is NOT a cacheless kill-switch. A
// reader trusting stale 'SW-off'/'cacheless' phrasing in src/server.ts might
// delete the load-bearing /privacy denylist exemption (pinned server-side in
// web/src/sw.test.ts). This guard keeps the falsified phrasing out of the
// server tree and pins that the /privacy route comment names the real
// binding. (web/src/sw.test.ts is the SW-source battery; this file guards
// the server-side comment that used to contradict it.)
// ---------------------------------------------------------------------------

const serverSource = readFileSync(resolve(import.meta.dirname, '../src/server.ts'), 'utf8')

describe('rm-2077 — server-side SW binding comments match the shipped service worker', () => {
  it('src/server.ts contains no SW-off / cacheless kill-switch claims', () => {
    expect(serverSource).not.toMatch(/SW-off/i)
    expect(serverSource).not.toMatch(/cacheless/i)
  })

  it('the /privacy route comment names the load-bearing NavigationRoute denylist exemption', () => {
    // Anchor on the ROUTE REGISTRATION (unique), then inspect the comment
    // block immediately above it — an indexOf on the section banner would
    // collide with the earlier isPublicPath comment at src/server.ts:990.
    const route = serverSource.indexOf("app.get('/privacy'")
    expect(route).toBeGreaterThan(-1)
    const block = serverSource.slice(Math.max(0, route - 2_000), route)
    expect(block).toMatch(/NavigationRoute/)
    expect(block).toMatch(/denylist/)
    // And the truth claim itself: the SW serves an offline shell (precache),
    // which is exactly why the exemption is load-bearing.
    expect(block).toMatch(/precache/)
  })
})
