import {resolve} from 'node:path'
/**
 * serveStatic double-decode regression guard (rm-313).
 *
 * GHSA-5r4p-p66f-jhc7 (hono < 4.13.11) and GHSA-rmxm-3fg6-px4f
 * (@hono/node-server < 2.1.3), both published 2026-09-29: serveStatic decoded
 * the request path a SECOND time after routing, so a crafted percent-encoded
 * request could be routed as one path and served as another — bypassing any
 * middleware mounted on a static prefix. The patch refuses (falls through as
 * 404) any path that still contains percent-encoding after routing, unless
 * `allowPercentInPath` is explicitly opted into.
 *
 * This repo's mounts are public-only (server.ts `/static/*` and `/assets/*`
 * are isPublicPath, no auth middleware on a served sub-prefix), so local
 * exploitability was low — but the regression stays pinned. The mounts below
 * mirror src/server.ts's exact shapes (the `/static/*` rewrite mount and the
 * plain `/assets/*` mount), so a future bump or upstream absorb that
 * reintroduces the second decode goes red here instead of surfacing at the v5
 * adapter-split migration (rm-319 tracks that split).
 *
 * Fixtures: test/fixtures/serve-static-double-decode/ holds `assets/app.txt`
 * and the percent-named `assets/%61pp.txt` — a request for `%2561pp.txt`
 * decodes once to the literal `%61pp.txt` filename; a SECOND decode resolves
 * `app.txt`. Which body comes back is the single/double-decode oracle.
 * test/fixtures/serve-static-escape-canary.txt lives OUTSIDE the root and is
 * the traversal escape marker.
 */
import process from 'node:process'
import {serveStatic} from '@hono/node-server/serve-static'
import {Hono} from 'hono'
import {describe, expect, it} from 'vitest'

const fixtureRoot = resolve(process.cwd(), 'test/fixtures/serve-static-double-decode')

function buildApp(): Hono {
  const app = new Hono()
  app.use(
    '/static/*',
    serveStatic({root: fixtureRoot, rewriteRequestPath: path => path.replace(/^\/static/, '')}),
  )
  app.use('/assets/*', serveStatic({root: fixtureRoot}))
  return app
}

describe('serveStatic double-decode guard (rm-313)', () => {
  it('serves a plain unencoded asset path (baseline)', async () => {
    const res = await buildApp().request('/assets/app.txt')
    expect(res.status).toBe(200)
    expect((await res.text()).trim()).toBe('double-decode-canary-asset')
  })

  it('serves through the /static/* rewrite mount (baseline)', async () => {
    const res = await buildApp().request('/static/assets/app.txt')
    expect(res.status).toBe(200)
    expect((await res.text()).trim()).toBe('double-decode-canary-asset')
  })

  it('refuses paths that still contain percent-encoding after routing — no second decode', async () => {
    const app = buildApp()
    for (const path of [
      '/assets/%2561pp.txt',
      '/assets/%2561%70%70.txt',
      '/static/assets/%2561pp.txt',
    ]) {
      const res = await app.request(path)
      expect(res.status, path).toBe(404)
      expect(await res.text(), path).not.toContain('double-decode-canary')
    }
  })

  it('double-encoded traversal can never escape the static root', async () => {
    const app = buildApp()
    for (const path of [
      '/assets/%252e%252e/serve-static-escape-canary.txt',
      '/assets/%252e%252e%252fserve-static-escape-canary.txt',
      '/assets/%2e%2e/serve-static-escape-canary.txt',
      '/assets/..%252fserve-static-escape-canary.txt',
      '/static/assets/%252e%252e/%252e%252e/serve-static-escape-canary.txt',
    ]) {
      const res = await app.request(path)
      expect(res.status, path).toBe(404)
      expect(await res.text(), path).not.toContain('serve-static-escape-canary-marker')
    }
  })
})
