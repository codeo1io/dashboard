import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

// rm-223 (cycle:1 batch B3): visual.yaml's pull_request.paths filter covered
// only web/src/**, tests/visual/**, playwright.config.ts and the workflow
// itself — but a visual regression can arrive through four other render-input
// surfaces that never touch web/src:
//   - web/index.html     the document shell every screenshot renders inside
//   - web/vite.config.ts build plugin selection (tailwind/pwa) changes markup
//   - package.json       dependency version pins for the rendered bundle
//   - pnpm-lock.yaml     the actually-installed dependency tree
// Live instance at discovery: lockfile held vite 8.3.0 while the latest was
// 8.3.1 — a dep bump alone could shift rendered output with the gate silent.
// This guard parses the workflow as text (seconds of Node at PR time, no
// actionlint/docker) and pins the invariant: every render-input surface must
// be a visual PR trigger. Sibling of test/release-trigger-paths.test.ts
// (rm-154), same parsing style.

const repoRoot = process.cwd()

/** Extract the pull_request `paths:` entries from visual.yaml. */
function parseVisualYamlPaths(yamlText: string): string[] {
  // Line-based walk of the paths block (entries interleave `#` comment lines).
  // The block ends at the first line that is neither an entry nor a comment
  // at the entry indent (e.g. the `push:` key at 2 spaces).
  const lines = yamlText.split('\n')
  const pathsIndex = lines.indexOf('    paths:')
  if (pathsIndex === -1) return []
  const entries: string[] = []
  for (const line of lines.slice(pathsIndex + 1)) {
    if (!/^ {6}[-#]/.test(line)) break
    const raw = /^ {6}- (.+)$/.exec(line)?.[1]
    if (raw === undefined) continue // comment line
    const cleaned = raw.trim()
    const unquoted = cleaned.length >= 2 && /^['"].*['"]$/.test(cleaned) ? cleaned.slice(1, -1) : cleaned
    if (unquoted !== '') entries.push(unquoted)
  }
  return entries
}

// Every surface that feeds the rendered bundle the screenshots capture. The
// four rm-223 additions are load-bearing: each has shipped a render change
// without touching web/src in this repo's history (vite pin drift, shell
// edits) or can (plugin selection, dependency bumps).
const REQUIRED_PATHS = [
  'web/src/**',
  'web/index.html',
  'web/vite.config.ts',
  'tests/visual/**',
  'playwright.config.ts',
  'package.json',
  'pnpm-lock.yaml',
  '.github/workflows/visual.yaml',
] as const

describe('Visual-trigger completeness (rm-223)', () => {
  const visualYamlPath = resolve(repoRoot, '.github/workflows/visual.yaml')
  const yamlText = readFileSync(visualYamlPath, 'utf8')
  const paths = parseVisualYamlPaths(yamlText)

  it('parses the paths block non-vacuously', () => {
    // Sanity anchor: a zero-hit parse means the parser broke, not a clean repo.
    expect(paths.length).toBeGreaterThanOrEqual(REQUIRED_PATHS.length)
    expect(paths).toContain('web/src/**')
  })

  it('every render-input surface is a visual PR trigger', () => {
    const missing = REQUIRED_PATHS.filter(required => !paths.includes(required))
    expect(
      missing.map(m => `${m} feeds the rendered bundle but is absent from visual.yaml pull_request.paths — a render change through it would skip the visual gate`),
    ).toEqual([])
  })

  it('every literal path entry that names a file exists in the repo', () => {
    // A stale literal (renamed file) silently narrows the trigger set the
    // same way a missing entry does — the workflow still parses green.
    const literalEntries = paths.filter(p => !p.includes('*'))
    const missing = literalEntries.filter(p => p !== '.github/workflows/visual.yaml' && !existsQuiet(resolve(repoRoot, p)))
    expect(missing).toEqual([])
  })

  it('negative proof: the completeness check actually fails on a regression', () => {
    // Simulate the pre-rm-223 state (the four render-input entries removed).
    const regressed = paths.filter(
      p => !['web/index.html', 'web/vite.config.ts', 'package.json', 'pnpm-lock.yaml'].includes(p),
    )
    const missing = REQUIRED_PATHS.filter(required => !regressed.includes(required))
    expect(missing.sort()).toEqual(['package.json', 'pnpm-lock.yaml', 'web/index.html', 'web/vite.config.ts'])
  })
})

function existsQuiet(path: string): boolean {
  try {
    readFileSync(path)
    return true
  } catch {
    return false
  }
}
