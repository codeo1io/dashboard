import {readFileSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'

/**
 * Fences the rm-761 semantic coupling in .github/workflows/release.yaml: the
 * Trivy SARIF upload channel must mirror the Enforce gate exactly (same action
 * pin, same image-ref, same scanners/severity, same ignore-unfixed filter),
 * while the code-scanning category stays a digest-independent constant so
 * that instances dropped from the SARIF auto-close their stale code-scanning
 * rows on the next release upload.
 *
 * Seeded red before the repair: the SARIF step lacked `ignore-unfixed` while
 * the Enforce gate carried it — the exact disagreement that left 43 stale
 * unfixed rows open (frozen at updated_at 2026-09-16T20:30:21Z) across seven
 * weeks of green releases.
 */
const here = path.dirname(fileURLToPath(import.meta.url))
const yaml = readFileSync(
  path.join(here, '..', '.github', 'workflows', 'release.yaml'),
  'utf8',
)

function trivyStepBlocks(text: string): string[] {
  const lines = text.split('\n')
  const blocks: string[] = []
  let current: string[] | null = null
  for (const line of lines) {
    if (/^\s*-\s+name:/.test(line)) {
      if (current) blocks.push(current.join('\n'))
      current = null
      continue
    }
    if (/uses:\s*aquasecurity\/trivy-action@/.test(line)) {
      current = [line]
      continue
    }
    if (current) current.push(line)
  }
  if (current) blocks.push(current.join('\n'))
  return blocks
}

describe('release.yaml Trivy scan-vs-upload semantic parity (rm-761)', () => {
  const blocks = trivyStepBlocks(yaml)

  it('has exactly two trivy-action steps (SARIF channel + Enforce gate)', () => {
    expect(blocks).toHaveLength(2)
  })

  it('both steps pin the same immutable action commit and version', () => {
    for (const block of blocks) {
      expect(block).toMatch(/aquasecurity\/trivy-action@[0-9a-f]{40} # v0\.36\.0/)
    }
    const pins = blocks.map(b => b.match(/aquasecurity\/trivy-action@([0-9a-f]{40})/)?.[1])
    expect(pins[0]).toBe(pins[1])
  })

  it('both steps scan the same freshly built digest', () => {
    for (const block of blocks) {
      expect(block).toMatch(
        /image-ref: ghcr\.io\/\$\{\{ github\.repository \}\}@\$\{\{ steps\.build\.outputs\.digest \}\}/,
      )
    }
  })

  it('both steps carry scanners: vuln and severity: HIGH,CRITICAL', () => {
    for (const block of blocks) {
      expect(block).toMatch(/scanners: vuln/)
      expect(block).toMatch(/severity: HIGH,CRITICAL/)
    }
  })

  it('both steps carry ignore-unfixed: true (the rm-761 parity cure)', () => {
    // Red before the repair: only the Enforce gate filtered unfixed findings.
    // Parity makes the code-scanning list agree with the gate by construction
    // and lets the constant-category replace semantics drain the frozen rows.
    for (const block of blocks) {
      expect(block).toMatch(/ignore-unfixed: true/)
    }
  })

  it('code-scanning category stays a digest-independent constant', () => {
    expect(yaml).toMatch(/category: trivy\/release-image\n/)
    const categories = [...yaml.matchAll(/^\s*category: (\S+)$/gm)].map(m => m[1])
    expect(categories.length).toBeGreaterThanOrEqual(1)
    for (const category of categories) {
      expect(category).toBe('trivy/release-image')
    }
  })

  it('the SARIF file uploaded is the one the scan step wrote', () => {
    expect(yaml).toMatch(
      /output: trivy-results-\$\{\{ steps\.digest\.outputs\.normalized \}\}\.sarif/,
    )
    expect(yaml).toMatch(
      /sarif_file: trivy-results-\$\{\{ steps\.digest\.outputs\.normalized \}\}\.sarif/,
    )
  })
})
