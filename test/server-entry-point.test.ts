/**
 * ESM entry-point detection (rm-702).
 *
 * src/server.ts historically gated autostart on the literal template
 * `file://${process.argv[1]}` — false whenever the entry path contains
 * URL-encoded characters (a space is enough), so the server booted WITHOUT
 * its listener. isMainEntryPoint compares via pathToFileURL instead. These
 * tests pin the pure comparison AND run a real Node process whose entry
 * file lives in a space-containing path, mirroring the empirical probe that
 * exposed the defect.
 */

import {spawnSync} from 'node:child_process'
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import process from 'node:process'
import {pathToFileURL} from 'node:url'
import {afterEach, describe, expect, it} from 'vitest'
import {isMainEntryPoint} from '../src/server.ts'

const dirs: string[] = []

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, {recursive: true, force: true})
})

describe('isMainEntryPoint (rm-702)', () => {
  it('true for a plain path (behavior preserved)', () => {
    const entry = '/opt/dashboard/src/server.ts'
    expect(isMainEntryPoint(pathToFileURL(entry).href, entry)).toBe(true)
  })

  it('true under a space-containing path — the defect case', () => {
    // Old template: `file:///tmp/dir with space/server.ts` !== import.meta.url
    // (`file:///tmp/dir%20with%20space/server.ts`) → listener never started.
    const entry = '/tmp/dir with space/server.ts'
    expect(entry.includes(' ')).toBe(true)
    expect(isMainEntryPoint(pathToFileURL(entry).href, entry)).toBe(true)
  })

  it('true under other URL-encodable characters (parentheses, non-ASCII)', () => {
    for (const entry of ['/tmp/rün(s)/server.ts', '/tmp/a+b%z/server.ts']) {
      expect(isMainEntryPoint(pathToFileURL(entry).href, entry)).toBe(true)
    }
  })

  it('false when argv points elsewhere', () => {
    expect(isMainEntryPoint(pathToFileURL('/a/server.ts').href, '/b/other.ts')).toBe(false)
  })

  it('false for absent/empty argv', () => {
    expect(isMainEntryPoint('file:///a/server.ts', undefined)).toBe(false)
    expect(isMainEntryPoint('file:///a/server.ts', '')).toBe(false)
  })

  it('empirical: a Node entry file in a space-containing path detects itself as entry', () => {
    // Mirror of the assess probe (node x.mjs from '/tmp/dir with space' → the
    // old check evaluated FALSE), now pinning the repaired behavior by
    // actually running Node with argv[1] containing a space.
    const dir = mkdtempSync(join(tmpdir(), 'dir with space '))
    dirs.push(dir)
    const probe = join(dir, 'probe-entry.ts')
    writeFileSync(
      probe,
      [
        `import {isMainEntryPoint} from '${pathToFileURL(resolve('src/server.ts')).href}'`,
        'console.log(isMainEntryPoint(import.meta.url, process.argv[1]) ? "ENTRY-TRUE" : "ENTRY-FALSE")',
        '',
      ].join('\n'),
      'utf8',
    )
    const result = spawnSync(process.execPath, [probe], {encoding: 'utf8'})
    expect(result.status).toBe(0)
    expect(result.stdout.trim()).toBe('ENTRY-TRUE')
  })
})
