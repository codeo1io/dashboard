import {existsSync, readdirSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

/**
 * rm-166 (cycle 11): workflow-statics guard for the base-digest readback class.
 *
 * The base-drift sentinel ran red with an EMPTY live digest (run 35970747110,
 * 2026-09-24) because it piped `docker manifest inspect` — which prints the raw
 * manifest JSON with NO `Digest:` header — into an awk that only matches
 * `^Digest:` lines. The pin then "drifted" against the empty string. The same
 * hour, the Release workflow's `docker buildx imagetools inspect` readback
 * parsed fine on the identical runner image: the pretty dump DOES print the
 * `Digest:` header line.
 *
 * This is the #3317 lesson transposed to the wrong subcommand (buildx's
 * `--format '{{.Manifest.Digest}}'` template is silently ignored for
 * attestation-bearing indexes — parse the Digest: line instead). These tests
 * fail on BOTH failure shapes anywhere they may creep back in:
 *   1. any workflow piping `docker manifest inspect` into a `^Digest:` awk;
 *   2. base-drift.yaml not using the buildx readback + empty-digest guard.
 */

const workflowsDir = join(process.cwd(), '.github', 'workflows')

/**
 * Strip full-line comments so guard assertions target EXECUTABLE workflow text,
 * not trap-documenting prose (the comments explaining this trap legitimately
 * mention the forbidden subcommands). Inline `#` is untouched.
 */
function stripCommentLines(text: string): string {
  return text
    .split('\n')
    .filter(line => !line.trimStart().startsWith('#'))
    .join('\n')
}

function readWorkflowFiles(): {name: string; text: string}[] {
  if (!existsSync(workflowsDir)) return []
  return readdirSync(workflowsDir)
    .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
    .map(name => ({name, text: stripCommentLines(readFileSync(join(workflowsDir, name), 'utf8'))}))
}

/**
 * rm-1478 (run 475b46bc, 2026-10-17): the pullability leg + live-tag derivation.
 *
 * Drift (pin vs live tag) reads green the moment pin and tag agree — it never
 * asks whether the pinned DIGEST itself still resolves, which is exactly how
 * sha256:173f1258 (deleted from Docker Hub) broke release builds while the
 * weekly check looked structurally fine. These statics pin the wiring that
 * keeps that class covered: base-drift.yaml must RUN the pullability script,
 * and the drift job must derive its live tag from the Dockerfile's ARG
 * (the hardcoded `node:24-slim` compared a different tag's digest against the
 * trixie pins — permanent false drift).
 */
describe('base-drift pullability + live-tag derivation — workflow statics (rm-1478)', () => {
  const file = readWorkflowFiles().find(f => f.name === 'base-drift.yaml')

  it('base-drift.yaml runs the pullability script as a job step', () => {
    expect(file, '.github/workflows/base-drift.yaml must exist').toBeDefined()
    const text = file?.text ?? ''
    expect(
      text.includes('base-pin-pullability'),
      'base-drift.yaml must invoke scripts/base-pin-pullability.ts — the digest-pullability class has no other weekly coverage',
    ).toBe(true)
    expect(
      text.includes('pullability:'),
      'base-drift.yaml must carry a dedicated pullability job',
    ).toBe(true)
  })

  it('the drift job derives the live tag from the Dockerfile ARG, not a hardcoded tag', () => {
    const text = file?.text ?? ''
    expect(
      text.includes(String.raw`sed -n 's/^ARG NODE_IMAGE=\([^@]*\)@sha256:.*/\1/p' Dockerfile`),
      'the drift job must derive the live tag from the Dockerfile ARG NODE_IMAGE (rm-1478)',
    ).toBe(true)
    expect(
      text,
      'no hardcoded official-image live tag may reappear in the drift comparison — the pinned image is the source of truth',
    ).not.toContain('inspect node:24-slim')
  })
})

describe('base-drift digest readback — workflow statics (rm-166)', () => {
  it('no workflow pipes `docker manifest inspect` into a ^Digest: awk parse', () => {
    // `docker manifest inspect` emits raw manifest JSON — there is no
    // `Digest:` header line to parse, so this pipeline always yields empty.
    for (const {name, text} of readWorkflowFiles()) {
      for (const line of text.split('\n')) {
        expect(
          line.includes('docker manifest inspect') && line.includes("awk '/^Digest:/"),
          `${name} parses a manifest-inspect pipeline for a Digest: header that subcommand never prints (use docker buildx imagetools inspect): ${line.trim()}`,
        ).toBe(false)
      }
    }
  })

  it('no workflow uses the silently-ignored buildx --format digest template', () => {
    // #3317: on attestation-bearing OCI indexes `buildx imagetools inspect
    // --format '{{.Manifest.Digest}}'` is ignored and the default dump prints.
    for (const {name, text} of readWorkflowFiles()) {
      expect(
        text.includes('--format'),
        `${name} uses a buildx --format template digest readback that is silently ignored on attestation-bearing indexes (#3317) — parse the Digest: line with awk instead`,
      ).toBe(false)
    }
  })

  it('base-drift.yaml reads the live digest via buildx imagetools inspect + Digest-line awk', () => {
    const file = readWorkflowFiles().find(f => f.name === 'base-drift.yaml')
    expect(file, '.github/workflows/base-drift.yaml must exist').toBeDefined()
    const text = file?.text ?? ''
    expect(
      text.includes('docker buildx imagetools inspect') && text.includes("awk '/^Digest:/{print $2; exit}'"),
      'base-drift.yaml must use the buildx imagetools pretty dump + Digest-line awk readback',
    ).toBe(true)
    expect(
      text.includes('docker manifest inspect'),
      'base-drift.yaml must not shell out to docker manifest inspect at all',
    ).toBe(false)
  })

  it('base-drift.yaml guards an empty LIVE_DIGEST as a readback error, not drift', () => {
    const file = readWorkflowFiles().find(f => f.name === 'base-drift.yaml')
    const text = file?.text ?? ''
    // The empty guard must exist: an empty live digest must exit red with an
    // error message, never fall through to a pin-vs-empty "drift" comparison.
    expect(
      text.includes('[ -z "$LIVE_DIGEST" ]'),
      'base-drift.yaml must fail loudly when the live digest readback comes back empty',
    ).toBe(true)
  })
})
