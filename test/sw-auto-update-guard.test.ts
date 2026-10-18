import {existsSync, readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

// rm-1960 auto-update contract. The service worker used to be prompt-gated:
// activation required a SKIP_WAITING message that no production code ever
// posted (assess 2026-10-17, run 51bbda58), so installed clients stayed on a
// stale app shell until every tab closed. The recorded decision switched the
// build to registerType: 'autoUpdate' with the worker skipping waiting itself
// and claiming clients on activate. This guard pins that contract so the dead
// prompt path cannot silently return.

const swSource = readFileSync('web/src/sw.ts', 'utf8')
const viteConfig = readFileSync('web/vite.config.ts', 'utf8')

describe('rm-1960: service worker auto-update contract (source)', () => {
  it('sw.ts calls self.skipWaiting() at worker top level (not only on message)', () => {
    // The message listener spells it e.waitUntil(self.skipWaiting()) — a
    // standalone statement on its own line is the unconditional startup call.
    const bareCall = /^\s*self\.skipWaiting\(\)\s*$/m
    expect(bareCall.test(swSource), 'expected a top-level self.skipWaiting() call').toBe(true)
  })

  it('sw.ts claims clients on activate so open pages move to the new worker', () => {
    const activateBlock = /addEventListener\('activate'[^{]*\{[\s\S]{0,400}?clients\.claim\(\)/
    expect(activateBlock.test(swSource), 'expected an activate listener calling clients.claim()').toBe(true)
  })

  it('sw.ts keeps the SKIP_WAITING message listener (workbox-window compat)', () => {
    expect(swSource).toMatch(/addEventListener\('message'[\s\S]{0,600}?SKIP_WAITING/)
  })

  it('vite.config.ts declares registerType: autoUpdate', () => {
    expect(viteConfig).toMatch(/registerType:\s*'autoUpdate'/)
  })

  it('vite.config.ts no longer documents a retired kill-switch or prompt mode', () => {
    expect(viteConfig).not.toMatch(/kill-switch/i)
    expect(viteConfig).not.toMatch(/registerType omitted|defaults to 'prompt'/)
  })

  it('sw.ts docs no longer claim prompt-gated activation is the only path', () => {
    expect(swSource).not.toMatch(/kill-switch/i)
    expect(swSource).not.toMatch(/prompt-gated activation|PROMPT-GATED ACTIVATION/)
  })
})

describe('rm-1960: built artifacts (when web/dist exists)', () => {
  const distPresent = existsSync('web/dist/sw.js') && existsSync('web/dist/registerSW.js')

  it.skipIf(!distPresent)('built sw.js carries the skipWaiting activation call', () => {
    const built = readFileSync('web/dist/sw.js', 'utf8')
    expect(built).toMatch(/skipWaiting\(\)/)
    expect(built).toMatch(/claim\(\)/)
  })

  it.skipIf(!distPresent)('built registerSW.js exists and index.html injects it', () => {
    expect(existsSync('web/dist/registerSW.js')).toBe(true)
    const html = readFileSync('web/dist/index.html', 'utf8')
    expect(html).toMatch(/registerSW\.js/)
  })
})
