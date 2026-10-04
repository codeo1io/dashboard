// PWA registration guard — rm-138 branch (a) pin.
//
// The production client must NOT register a service worker. web/vite.config.ts
// sets injectRegister: false while strategies: 'injectManifest' keeps emitting
// the sw.ts kill-switch, so the built output must carry NEITHER the
// vite-plugin-pwa register-sw script tag NOR the registerSW.js helper. A stray
// tag or file here means every production page load registers the
// self-destructing kill-switch SW again — the regression class introduced by
// commit dfa3f80 and pinned by this run's assessment (F1).
//
// This suite runs against web/dist, which `pnpm test` builds via pretest
// (direct vitest invocations bypass that — see
// docs/solutions/workflow-issues/targeted-vitest-without-pretest-build-webdist-404s-2026-09-24.md).
// A missing web/dist fails loudly rather than skipping: the guard guards a
// build-output invariant, so it must never silently no-op.
import {existsSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

const DIST_DIR = resolve('./web/dist')

function requireDistFile(name: string): string {
  const file = resolve(DIST_DIR, name)
  if (!existsSync(file)) {
    throw new Error(`This test suite requires web/dist (run pnpm build:web): missing ${file}`)
  }
  return readFileSync(file, 'utf8')
}

describe('PWA registration guard — no build-level SW registration (rm-138)', () => {
  it('built index.html contains no vite-plugin-pwa register-sw script tag', () => {
    const html = requireDistFile('index.html')
    expect(html).not.toContain('vite-plugin-pwa:register-sw')
    expect(html).not.toContain('registerSW.js')
  })

  it('registerSW.js is absent from web/dist', () => {
    expect(existsSync(resolve(DIST_DIR, 'registerSW.js'))).toBe(false)
  })

  it('the kill-switch sw.js is still emitted (migration net for stranded clients)', () => {
    // injectRegister: false stops REGISTRATION; strategies: 'injectManifest'
    // must keep emitting sw.js so browsers holding a previously registered SW
    // still fetch, byte-diff, and install the update that unregisters it.
    requireDistFile('sw.js')
  })
})
