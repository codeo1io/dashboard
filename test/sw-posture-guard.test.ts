/**
 * Service-worker posture guard (rm-1985 + rm-1986, 2026-10-18).
 *
 * The 2026.10.43 absorb (c51597ad) silently took upstream's full sw.ts +
 * sw.test.ts while leaving this fork's no-op ReloadPrompt and kill-switch docs
 * in place — an unregistered full SW with three doc surfaces lying about it.
 * This guard pins the RECONCILED posture (registration restored, rm-1985) so
 * no future absorb can silently flip it in either direction, and makes the
 * divergence manifest (docs/runbooks/upstream-divergence-manifest.md, rm-1986)
 * executable rather than prose.
 *
 * Posture contract:
 *  - the full Workbox SW ships and is REGISTERED (ReloadPrompt is real);
 *  - activation stays prompt-gated (SKIP_WAITING only on Refresh click);
 *  - navigation stays network-always (the shell cache is write-only);
 *  - the kill-switch shape must not silently reappear;
 *  - every [DIV:*] entry in the manifest has an assertion here.
 */

import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p: string): string => readFileSync(join(repoRoot, p), 'utf8')

const sw = read('web/src/sw.ts')
const reloadPrompt = read('web/src/pwa/ReloadPrompt.tsx')
const appShell = read('web/src/shell/AppShell.tsx')
const viteConfig = read('web/vite.config.ts')
const readme = read('README.md')
const swTest = read('web/src/sw.test.ts')
const manifest = read('docs/runbooks/upstream-divergence-manifest.md')

describe('SW posture guard — full SW, registered, prompt-gated (rm-1985)', () => {
  it('sw.ts is the full Workbox SW (not the kill-switch)', () => {
    expect(sw).toMatch(/\bprecacheAndRoute\b/)
    expect(sw).toMatch(/\bregisterRoute\b/)
    expect(sw).toMatch(/NavigationRoute/)
  })

  it('sw.ts does NOT contain the kill-switch shape (self-purge + self-unregister)', () => {
    // rm-272's kill-switch unregistered itself and purged every cache with no
    // fetch routing. If these lines reappear, the posture flipped silently.
    expect(sw).not.toMatch(/unregister\(\)/)
    expect(sw).not.toMatch(/self-unregister/)
  })

  it('ReloadPrompt is real: registers via virtual:pwa-register/react and sends SKIP_WAITING on click', () => {
    expect(reloadPrompt).toContain(`from 'virtual:pwa-register/react'`)
    expect(reloadPrompt).toMatch(/useRegisterSW\s*\(/)
    expect(reloadPrompt).toMatch(/updateServiceWorker\(true\)/)
    // The no-op stub this fork carried after the 2026.10.43 absorb must never
    // come back silently.
    expect(reloadPrompt).not.toMatch(/No-op/i)
  })

  it('AppShell renders the ReloadPrompt (registration is mounted in the app)', () => {
    expect(appShell).toMatch(/<ReloadPrompt\s*\/>/)
  })

  it('prompt-gated activation is still behaviorally pinned in sw.test.ts', () => {
    // The SW only skipWaiting()s on a SKIP_WAITING message; sw.test.ts pins
    // that contract. Absorbs must keep the pin.
    expect(swTest).toMatch(/SKIP_WAITING/)
    expect(swTest).toMatch(/skipWaiting/)
  })

  it('doc surfaces tell the truth about the posture (no kill-switch claims)', () => {
    // README.md and vite.config.ts described a kill-switch that no longer
    // existed — the assess-phase finding. These greps are the doc-truth pins.
    for (const [name, content] of [
      ['README.md', readme],
      ['web/vite.config.ts', viteConfig],
      ['web/src/pwa/ReloadPrompt.tsx', reloadPrompt],
    ] as const) {
      expect(content, `${name} must not claim a kill-switch SW`).not.toMatch(
        /kill-switch/i,
      )
    }
  })

  it('registration helper is served but never precached (server + build contract)', () => {
    // sw.test.ts pins that registerSW.js is NOT in the precache list; the
    // server serves it no-store. Both halves must survive absorbs.
    expect(swTest).toMatch(/registerSW\.js/)
    expect(read('src/server.ts')).toMatch(/\/registerSW\.js/)
  })
})

describe('Divergence manifest is executable (rm-1986)', () => {
  it('manifest exists and carries the three deliberate divergences', () => {
    for (const id of ['[DIV:read-only]', '[DIV:redaction]', '[DIV:sw-posture]']) {
      expect(manifest).toContain(id)
    }
  })

  it('[DIV:read-only] — no write-scope permission grants in the GitHub client', () => {
    const appClient = read('src/github/app-client.ts')
    // The token mint requests read-only permissions; a write-scope grant here
    // would break the fork's first critical invariant.
    expect(appClient).not.toMatch(/permissions:\s*\{[^}]*'(contents|metadata|pull_requests|issues|checks|security_events|vulnerability_alerts)':\s*'write'/s)
    expect(appClient).toMatch(/permissions/)
  })

  it('[DIV:redaction] — denylist exclusion and fail-closed still in place', () => {
    expect(read('src/github/metadata.ts')).toMatch(/redactedNodeIds/)
    expect(read('src/github/aggregator.ts')).toMatch(/redactedNodeIds/)
  })

  it('[DIV:sw-posture] — manifest entry matches the code state asserted above', () => {
    expect(manifest).toMatch(/useRegisterSW/)
    expect(manifest).toMatch(/updateServiceWorker\(true\)/)
    expect(manifest).toMatch(/write-only/)
  })
})
