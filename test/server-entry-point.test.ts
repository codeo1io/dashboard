/**
 * ESM entry-point detection (rm-702; extended by run 8521c80a CU3).
 *
 * src/server.ts historically gated autostart on the literal template
 * `file://${process.argv[1]}` — false whenever the entry path contains
 * URL-encoded characters (a space is enough), so the server booted WITHOUT
 * its listener. isMainEntryPoint compared via pathToFileURL instead — but
 * Node realpath-resolves import.meta.url while argv[1] keeps symlinked
 * directories as written, so an entry reached through a symlink also compared
 * unequal (silent headless boot; run 8521c80a assess F3). The comparison now
 * canonicalizes BOTH sides through realpathSync. These tests pin the pure
 * comparison and run real Node processes whose entry files live in a
 * space-containing path and behind a directory symlink — mirroring the
 * empirical probes that exposed both defects.
 */

import {spawnSync} from 'node:child_process'
import {mkdtempSync, rmSync, symlinkSync, writeFileSync} from 'node:fs'
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

function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  dirs.push(dir)
  return dir
}

describe('isMainEntryPoint (rm-702 + 8521c80a symlink cure)', () => {
  it('true for a plain real path (behavior preserved)', () => {
    const dir = tempDir('entry-plain-')
    const entry = join(dir, 'server.ts')
    writeFileSync(entry, '', 'utf8')
    expect(isMainEntryPoint(pathToFileURL(entry).href, entry)).toBe(true)
  })

  it('true under a space-containing path — the rm-702 defect case', () => {
    // Old template: `file:///tmp/dir with space/server.ts` !== import.meta.url
    // (`file:///tmp/dir%20with%20space/server.ts`) → listener never started.
    const dir = tempDir('dir with space ')
    const entry = join(dir, 'server.ts')
    writeFileSync(entry, '', 'utf8')
    expect(entry.includes(' ')).toBe(true)
    expect(isMainEntryPoint(pathToFileURL(entry).href, entry)).toBe(true)
  })

  it('true under other URL-encodable characters (parentheses, non-ASCII)', () => {
    for (const name of ['rün(s)', 'a+b%z']) {
      const dir = tempDir(`entry-${name}-`)
      const entry = join(dir, 'server.ts')
      writeFileSync(entry, '', 'utf8')
      expect(isMainEntryPoint(pathToFileURL(entry).href, entry)).toBe(true)
    }
  })

  it('true when argv[1] reaches the entry through a directory symlink — the 8521c80a defect case', () => {
    // import.meta.url is realpath-resolved by Node; argv[1] keeps the symlink
    // as written. The pre-cure comparator declared the SAME file unequal and
    // the server booted headless.
    const realDir = tempDir('entry-symlink-real-')
    const entry = join(realDir, 'server.ts')
    writeFileSync(entry, '', 'utf8')
    const parent = tempDir('entry-symlink-parent-')
    const linkDir = join(parent, 'link')
    symlinkSync(realDir, linkDir)
    const viaSymlink = join(linkDir, 'server.ts')
    expect(viaSymlink).not.toBe(entry)
    expect(isMainEntryPoint(pathToFileURL(entry).href, viaSymlink)).toBe(true)
  })

  it('true when BOTH sides arrive through (different) symlinks', () => {
    const realDir = tempDir('entry-symlink2-real-')
    const entry = join(realDir, 'server.ts')
    writeFileSync(entry, '', 'utf8')
    const parent = tempDir('entry-symlink2-parent-')
    symlinkSync(realDir, join(parent, 'linkA'))
    symlinkSync(realDir, join(parent, 'linkB'))
    expect(
      isMainEntryPoint(
        pathToFileURL(join(parent, 'linkA', 'server.ts')).href,
        join(parent, 'linkB', 'server.ts'),
      ),
    ).toBe(true)
  })

  it('false when argv points elsewhere (both paths real)', () => {
    const dirA = tempDir('entry-elsewhere-a-')
    const dirB = tempDir('entry-elsewhere-b-')
    const a = join(dirA, 'server.ts')
    const b = join(dirB, 'other.ts')
    writeFileSync(a, '', 'utf8')
    writeFileSync(b, '', 'utf8')
    expect(isMainEntryPoint(pathToFileURL(a).href, b)).toBe(false)
  })

  it('false for absent/empty argv and for a non-existent argv path', () => {
    expect(isMainEntryPoint('file:///a/server.ts', undefined)).toBe(false)
    expect(isMainEntryPoint('file:///a/server.ts', '')).toBe(false)
    // realpath cannot resolve it — never autostart on an imaginary entry.
    expect(isMainEntryPoint('file:///a/server.ts', '/no/such/path/server.ts')).toBe(false)
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

  it('empirical: a Node entry file reached through a directory symlink detects itself as entry', () => {
    // Mirror of the 8521c80a assess probe: pre-cure, argv[1] (symlink-kept)
    // compared unequal to the realpath-resolved import.meta.url and the entry
    // reported FALSE, booting the server without its listener.
    const realDir = tempDir('sym-real-')
    const probe = join(realDir, 'probe-entry.ts')
    writeFileSync(
      probe,
      [
        `import {isMainEntryPoint} from '${pathToFileURL(resolve('src/server.ts')).href}'`,
        'console.log(isMainEntryPoint(import.meta.url, process.argv[1]) ? "ENTRY-TRUE" : "ENTRY-FALSE")',
        '',
      ].join('\n'),
      'utf8',
    )
    const parent = tempDir('sym-parent-')
    const linkDir = join(parent, 'link')
    symlinkSync(realDir, linkDir)
    const result = spawnSync(process.execPath, [join(linkDir, 'probe-entry.ts')], {
      encoding: 'utf8',
    })
    expect(result.status).toBe(0)
    expect(result.stdout.trim()).toBe('ENTRY-TRUE')
  })
})
