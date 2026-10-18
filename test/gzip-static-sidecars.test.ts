import {execFileSync} from 'node:child_process'
import {randomBytes} from 'node:crypto'
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import process from 'node:process'
import {gunzipSync} from 'node:zlib'
import {afterEach, describe, expect, it} from 'vitest'

// ---------------------------------------------------------------------------
// rm-1489 (repository-maintenance cycle 4, run 9ee060d1) — stale-sidecar
// cleanup in scripts/gzip-static-sidecars.ts.
//
// The script's walk is not the whole job: `serveStatic({precompressed: true})`
// serves whatever `<name>.gz` exists, so a rebuild must also remove sidecars
// whose truth changed or vanished — (a) orphans whose source file no longer
// exists (removed/renamed between builds; hashed bundles rename every content
// change) and (b) sidecars of sources that no longer take one (stopped
// shrinking), where stale compressed bytes would shadow the fresh identity
// fallback. These tests drive the real script as a child process against a
// temp tree, the same way `pnpm build:web` runs it.
// ---------------------------------------------------------------------------

const SCRIPT = resolve(import.meta.dirname, '../scripts/gzip-static-sidecars.ts')

const tempDirs: string[] = []

function makeTree(): string {
  const dir = mkdtempSync(join(tmpdir(), 'gzip-sidecars-'))
  tempDirs.push(dir)
  return dir
}

function runScript(root: string): string {
  return execFileSync(process.execPath, [SCRIPT, root], {encoding: 'utf8'})
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, {recursive: true, force: true})
})

describe('gzip sidecar stale cleanup (rm-1489)', () => {
  it('unlinks an orphaned sidecar whose source file no longer exists (recursively)', () => {
    const dir = makeTree()
    writeFileSync(join(dir, 'gone.js.gz'), 'stale-compressed-bytes')
    mkdirSync(join(dir, 'assets'))
    writeFileSync(join(dir, 'assets', 'gone.css.gz'), 'stale-nested')

    const stdout = runScript(dir)

    expect(existsSync(join(dir, 'gone.js.gz'))).toBe(false)
    expect(existsSync(join(dir, 'assets', 'gone.css.gz'))).toBe(false)
    expect(stdout).toContain('removed 2 stale sidecars')
  })

  it('unlinks the old sidecar of a source that no longer shrinks (identity fallback must not be shadowed)', () => {
    const dir = makeTree()
    // High-entropy bytes: gzip framing cannot shrink them, so the source now
    // takes NO sidecar — but a sidecar from an earlier, compressible version
    // of the file still sits next to it and would be served instead.
    writeFileSync(join(dir, 'tiny.js'), randomBytes(512))
    writeFileSync(join(dir, 'tiny.js.gz'), 'stale-compressed-bytes')

    runScript(dir)

    expect(existsSync(join(dir, 'tiny.js'))).toBe(true)
    expect(existsSync(join(dir, 'tiny.js.gz'))).toBe(false)
  })

  it('still writes fresh sidecars and reports them', () => {
    const dir = makeTree()
    writeFileSync(join(dir, 'big.js'), 'const x = 1;\n'.repeat(500))

    const stdout = runScript(dir)

    const sidecar = join(dir, 'big.js.gz')
    expect(existsSync(sidecar)).toBe(true)
    expect(gunzipSync(readFileSync(sidecar)).equals(readFileSync(join(dir, 'big.js')))).toBe(true)
    expect(stdout).toContain('1/1 compressible files')
    expect(stdout).toContain('removed 0 stale sidecars')
  })

  it('conservative scope: a .gz whose source EXISTS but is not compressible is left untouched', () => {
    const dir = makeTree()
    writeFileSync(join(dir, 'img.png'), 'png bytes here')
    writeFileSync(join(dir, 'img.png.gz'), 'not-ours-to-judge')

    runScript(dir)

    expect(existsSync(join(dir, 'img.png'))).toBe(true)
    // img.png is not a compressible type, so this scheme never produced its
    // sidecar; the base exists, so the orphan rule does not apply either.
    expect(existsSync(join(dir, 'img.png.gz'))).toBe(true)
  })

  it('rewrites a stale sidecar in place when the source still takes one', () => {
    const dir = makeTree()
    writeFileSync(join(dir, 'app.js'), 'old compressible content\n'.repeat(100))
    runScript(dir)
    const firstSidecar = readFileSync(join(dir, 'app.js.gz'))
    writeFileSync(join(dir, 'app.js'), 'completely different but still compressible content\n'.repeat(50))
    runScript(dir)

    const secondSidecar = readFileSync(join(dir, 'app.js.gz'))
    expect(secondSidecar.equals(firstSidecar)).toBe(false)
    expect(gunzipSync(secondSidecar).equals(readFileSync(join(dir, 'app.js')))).toBe(true)
  })
})
