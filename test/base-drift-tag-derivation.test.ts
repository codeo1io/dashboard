'use strict'

import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

/**
 * Workflow-statics guard for rm-856 (run 091c9117 cycle:2): the tag-derivation class.
 *
 * base-drift.yaml was born comparing every Dockerfile digest pin against the
 * hardcoded moving alias `node:24-slim` (6b417e2). The Dockerfile moved to
 * node:24-trixie-slim (ad8f21e) and the Debian forky-era alias divergence then
 * made the weekly sentinel permanently red on FALSE drift — run 39233283793
 * fired `drift: pin 7f486cab… != live a5f4366e…` while the pinned
 * 24-trixie-slim tag itself was current. The cure (rm-856) derives every
 * inspected tag from the Dockerfile's own ref literals — the same ARG
 * NODE_IMAGE sed shape cve-tripwire landed for its resolve step (rm-779) —
 * so a base-image family move only ever touches the Dockerfile.
 *
 * These tests fail if the hardcoded-alias class creeps back: they pin the
 * workflow's OWN sed/grep patterns (extracted from the file, not copied here)
 * against fixture Dockerfiles, including the moved-tag family shape that
 * caused the original false red.
 */

function readWorkflow(): string {
  const path = join(process.cwd(), '.github', 'workflows', 'base-drift.yaml')
  return readFileSync(path, 'utf8')
}

function stripCommentLines(text: string): string {
  return text
    .split('\n')
    .map(line => line.replace(/^\s*#.*$/, ''))
    .join('\n')
}

function sedEreToRegExp(ere: string): RegExp {
  // sed -nE matches per line; the JS port needs the multiline flag so ^/$
  // anchor to each fixture Dockerfile line the same way. POSIX classes are
  // converted in their single-bracket form — inside `[^@[:space:]]` the
  // class text is `[:space:]` (the extra `[`/`]` belong to the outer class).
  return new RegExp(ere.replaceAll('[:space:]', String.raw`\s`), 'm')
}

function mustCapture(match: RegExpMatchArray | null): string {
  if (match?.[1] === undefined) {
    throw new Error('workflow pattern capture not found — guard extraction failed')
  }
  return match[1]
}

const HEX64 = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

const fixtureDockerfileCurrent = [
  `FROM \${NODE_IMAGE} AS runtime`,
  `ARG NODE_IMAGE=node:24-trixie-slim@sha256:7f486cab${HEX64.slice(8)}`,
  '',
].join('\n')

const fixtureDockerfileMovedFamily = [
  `ARG NODE_IMAGE=node:26-bookworm-slim@sha256:${'b'.repeat(64)}`,
  `FROM \${NODE_IMAGE} AS runtime`,
  '',
].join('\n')

const fixtureDockerfileTwoRefs = [
  `ARG NODE_IMAGE=node:24-trixie-slim@sha256:${'a'.repeat(64)}`,
  `FROM oven/bun:1.4.3@sha256:${'c'.repeat(64)} AS build`,
  `FROM \${NODE_IMAGE} AS runtime`,
  '',
].join('\n')

describe('workflow statics (base-drift) — rm-856 tag derivation', () => {
  it('keeps the digest-readback contract guard intact (rm-166/rm-178/rm-182)', () => {
    const text = stripCommentLines(readWorkflow())
    expect(text).toContain('docker buildx imagetools inspect')
    expect(text).toContain("awk '/^Digest:/{print $2; exit}'")
    expect(text).toContain('[ -z "$LIVE_DIGEST" ]')
    expect(text).not.toContain('docker manifest inspect')
  })

  it('never inspects a hardcoded node tag literal — the false-drift class is gone', () => {
    const text = stripCommentLines(readWorkflow())
    expect(text).not.toContain('node:24-slim')
    expect(text).not.toContain('manifests/24-slim')
    expect(text).not.toContain('inspect node:')
  })

  it('derives the base ref from ARG NODE_IMAGE with the rm-779 sed shape', () => {
    const raw = readWorkflow()
    const ere = mustCapture(raw.match(/sed -nE 's\/(.+)\/\\1\/p'/))
    expect(ere).toContain('ARG NODE_IMAGE')
    const re = sedEreToRegExp(ere)

    const current = re.exec(fixtureDockerfileCurrent)
    expect(current?.[1]).toBe(`node:24-trixie-slim@sha256:7f486cab${HEX64.slice(8)}`)

    const moved = re.exec(fixtureDockerfileMovedFamily)
    expect(moved?.[1]).toBe(`node:26-bookworm-slim@sha256:${'b'.repeat(64)}`)
  })

  it('scans every literal image:tag@sha256 ref — moved families and extra pinned stages both count', () => {
    const raw = readWorkflow()
    const scanEre = mustCapture(raw.match(/grep -oE '([^']+)'/))
    expect(scanEre).toContain('sha256:[0-9a-f]{64}')
    const re = new RegExp(scanEre, 'g')

    const refs = [...fixtureDockerfileTwoRefs.matchAll(re)].map(m => m[0])
    expect(refs).toHaveLength(2)
    expect(refs).toContain(`node:24-trixie-slim@sha256:${'a'.repeat(64)}`)
    expect(refs).toContain(`oven/bun:1.4.3@sha256:${'c'.repeat(64)}`)

    const single = [...fixtureDockerfileCurrent.matchAll(new RegExp(scanEre, 'g'))].map(m => m[0])
    expect(single).toEqual([`node:24-trixie-slim@sha256:7f486cab${HEX64.slice(8)}`])
  })

  it('requires the ARG-derived base ref to be present in the ref scan — the two extraction shapes cannot disagree', () => {
    const text = stripCommentLines(readWorkflow())
    expect(text).toContain('BASE_REF=')
    expect(text).toContain('REFS=')
    expect(text).toContain('case "$REFS" in')
  })
})
