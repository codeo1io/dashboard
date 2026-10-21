import {pathToFileURL} from 'node:url'
import {describe, expect, it} from 'vitest'
import {isMainEntryPoint} from '../src/server.ts'

/**
 * rm-702 — the src/server.ts tail's ESM entry guard.
 *
 * Before rm-702 the guard compared import.meta.url against a raw
 * `file://${process.argv[1]}` template, which is false whenever argv[1]
 * contains characters a file URL must percent-encode — a space-containing
 * checkout imported src/server.ts but silently never booted (assess-proven
 * 2026-10-20: `node /tmp/sp ace/x.mjs` → argv1 '/tmp/sp ace/x.mjs' vs meta
 * 'file:///tmp/sp%20ace/x.mjs' → match: false).
 *
 * These cases pin the pathToFileURL normalization on BOTH sides: detection
 * TRUE under a URL-encodable path (the recorded failure), and byte-identical
 * behavior for the plain paths that always worked.
 */
describe('server entry guard (rm-702)', () => {
  it('detects entry under a space-containing path (the recorded silent-no-boot)', () => {
    const argv1 = '/opt/sp ace/dashboard/src/server.ts'
    expect(isMainEntryPoint(pathToFileURL(argv1).href, argv1)).toBe(true)
  })

  it('detects entry under other URL-encodable path characters', () => {
    for (const argv1 of ['/opt/next#gen/src/server.ts', '/opt/hü dashboard/src/server.ts', '/opt/50% absorbed/src/server.ts']) {
      expect(isMainEntryPoint(pathToFileURL(argv1).href, argv1)).toBe(true)
    }
  })

  it('keeps plain-path behavior identical to the old raw template compare', () => {
    const argv1 = '/opt/dashboard/src/server.ts'
    expect(isMainEntryPoint(pathToFileURL(argv1).href, argv1)).toBe(true)
    // The old guard's own comparison text for a plain path — same answer, so
    // plain deployments see no behavior change.
    expect(`file://${argv1}`).toBe(pathToFileURL(argv1).href)
  })

  it('regression anchor: the old raw template compare REJECTED the space path', () => {
    const argv1 = '/opt/sp ace/dashboard/src/server.ts'
    expect(`file://${argv1}`).not.toBe(pathToFileURL(argv1).href)
  })

  it('rejects non-entry argv: mismatched path, undefined, empty string', () => {
    expect(isMainEntryPoint('file:///x/src/server.ts', '/y/src/server.ts')).toBe(false)
    expect(isMainEntryPoint('file:///x/src/server.ts', undefined)).toBe(false)
    expect(isMainEntryPoint('file:///x/src/server.ts', '')).toBe(false)
  })
})
