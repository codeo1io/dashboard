import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

/**
 * rm-781 U1 / rm-648: cve-tripwire ↔ Dockerfile base-image parity guard.
 *
 * cve-tripwire.yaml shipped `NODE_IMAGE: 'node:24-slim'` while rm-698 moved
 * the Dockerfile pin to `node:24-trixie-slim@sha256:…` — the Resolve step's
 * digest-grep consumed `${NODE_IMAGE}@sha256:` against the Dockerfile, found
 * nothing, and would have failed the workflow's FIRST scheduled fire
 * (Mon 2026-10-12 06:53Z) before trivy ever ran: the base-image CVE watch
 * dark from birth. The workflow now pins the Dockerfile ARG value verbatim
 * and the Resolve step asserts that identity at runtime; this guard makes
 * the same drift class a red TEST the moment the two pins diverge, instead
 * of a silent weekly red on the schedule.
 */

const workflowPath = join(process.cwd(), '.github', 'workflows', 'cve-tripwire.yaml')
const dockerfilePath = join(process.cwd(), 'Dockerfile')

function readText(path: string): string {
  expect(existsSync(path), `${path} must exist`).toBe(true)
  return readFileSync(path, 'utf8')
}

/**
 * Strip full-line comments so guard assertions target EXECUTABLE text, not
 * trap-documenting prose (mirrors base-drift-digest-readback.test.ts).
 */
function stripCommentLines(text: string): string {
  return text
    .split('\n')
    .filter(line => !line.trimStart().startsWith('#'))
    .join('\n')
}

/** The workflow's `env.NODE_IMAGE` value (single-quoted per the yml/quotes rule). */
function workflowNodeImage(): string {
  const m = readText(workflowPath).match(/^ {2}NODE_IMAGE: '([^']+)'$/m)
  expect(m, 'cve-tripwire.yaml must define a single-quoted env NODE_IMAGE').toBeDefined()
  return m?.[1] ?? ''
}

/** The Dockerfile's single ARG NODE_IMAGE default (every stage builds on it). */
function dockerfileNodeImage(): string {
  const m = readText(dockerfilePath).match(/^ARG NODE_IMAGE=(\S+)$/m)
  expect(m, 'Dockerfile must define an ARG NODE_IMAGE default').toBeDefined()
  return m?.[1] ?? ''
}

describe('cve-tripwire ↔ Dockerfile base-image parity (rm-781 U1)', () => {
  it('the workflow pins EXACTLY the Dockerfile ARG value, digest included', () => {
    expect(workflowNodeImage(), 'workflow env NODE_IMAGE must equal the Dockerfile ARG verbatim').toBe(dockerfileNodeImage())
  })

  it('the shared pin is a digest-pinned image reference (tag + 64-hex sha256)', () => {
    // Sentinel shape: a tag-only or digest-less pin reopens the class where
    // the tripwire scans something other than the shipped base.
    expect(workflowNodeImage()).toMatch(/^node:[^\s@]+@sha256:[0-9a-f]{64}$/)
  })

  it('the Dockerfile sentinel is live: every FROM stage builds on the pinned ARG', () => {
    // rm-698: ALL stages must stay on the one ARG (prod-deps compiles native
    // modules copied into runtime, so glibc must match).
    const fromLines = stripCommentLines(readText(dockerfilePath))
      .split('\n')
      .filter(line => line.startsWith('FROM '))
    expect(fromLines.length, 'Dockerfile must have FROM stages').toBeGreaterThan(0)
    for (const line of fromLines) {
      // Assembled from halves: a literal `${…}` inside a plain string trips
      // no-template-curly-in-string.
      const argRef = '$' + '{NODE_IMAGE}'
      expect(line.includes(argRef), `FROM stage off the shared pin: ${line}`).toBe(true)
    }
  })

  it('the Resolve step consumes the full pin against the Dockerfile (runtime parity, not a tag-only grep)', () => {
    const executable = stripCommentLines(readText(workflowPath))
    // Assembled from halves: a literal `${…}` inside a plain string trips
    // no-template-curly-in-string.
    const runtimeParityNeedle = 'grep -qF "ARG NODE_IMAGE=$' + '{NODE_IMAGE}"'
    expect(
      executable.includes(runtimeParityNeedle),
      'the Resolve step must assert the Dockerfile ARG equals the workflow pin verbatim (grep -qF) — a pattern or tag-only grep reopens the silent-drift class',
    ).toBe(true)
  })
})
