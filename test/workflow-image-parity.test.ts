import {readdirSync, readFileSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'

/**
 * Guards the rm-755 class of drift: every image-tag constant across the
 * workflow fleet must match the Dockerfile `ARG NODE_IMAGE=<tag>@sha256:…`
 * pin. rm-744's Trixie migration swept `base-drift.yaml`'s six tag sites and
 * missed `cve-tripwire.yaml`'s `NODE_IMAGE`, whose digest-resolve grep then
 * returned empty — the exact regression that would turn the first scheduled
 * 2026-10-12 06:53Z fire red before the cure (tag-site list repaired here;
 * test adopted from run 8521c80a's convergent unlanded vehicle, runner-pin
 * describe trimmed — that unit rides their own batch).
 */
const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(here, '..')
const dockerfile = readFileSync(path.join(repoRoot, 'Dockerfile'), 'utf8')
const workflowsDir = path.join(repoRoot, '.github', 'workflows')

// The Dockerfile pin is the single source of truth: ARG NODE_IMAGE=<tag>@<digest>.
const pinned = dockerfile.match(/^ARG NODE_IMAGE=(node:\d[^\s@]+)@sha256:[0-9a-f]{64}$/m)
expect(pinned).not.toBeNull()
const canonicalTag = pinned?.[1] as string

describe('workflow image-tag constants match the Dockerfile ARG (rm-755)', () => {
  it('Dockerfile pins a canonical node base image tag+digest', () => {
    expect(canonicalTag).toBe('node:24-trixie-slim')
  })

  it('every node:24-* reference in every workflow equals the canonical tag', () => {
    const offenders: string[] = []
    for (const file of readdirSync(workflowsDir)) {
      if (!file.endsWith('.yaml')) continue
      const content = readFileSync(path.join(workflowsDir, file), 'utf8')
      for (const match of content.matchAll(/node:24-[a-z0-9.-]+/g)) {
        if (match[0] !== canonicalTag) {
          offenders.push(`${file}: ${match[0]}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('cve-tripwire resolves the canonical tag (the pre-repair red, kept as the rationale)', () => {
    const tripwire = readFileSync(path.join(workflowsDir, 'cve-tripwire.yaml'), 'utf8')
    // Before the rm-755 repair this env held 'node:24-slim' while the Dockerfile
    // had already moved to the trixie variant: the resolve grep at :54 found no
    // pin and the workflow failed with a misleading precondition error.
    expect(tripwire).toMatch(/NODE_IMAGE: 'node:24-trixie-slim'/)
    expect(tripwire).not.toMatch(/NODE_IMAGE: 'node:24-slim'/)
  })
})
