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

  it('base-drift.yaml derives the checked tag AND the compared pin set from the ARG NODE_IMAGE line (rm-2008)', () => {
    const file = readWorkflowFiles().find(f => f.name === 'base-drift.yaml')
    expect(file, '.github/workflows/base-drift.yaml must exist').toBeDefined()
    const text = file?.text ?? ''
    // rm-2008: the checked tag stream is DERIVED from the Dockerfile's ARG
    // NODE_IMAGE pin — never a hardcoded sibling stream (the pre-fix shape
    // hardcoded node:24-slim while the pin tracked 24-trixie-slim).
    expect(
      text.includes("grep -E '^ARG NODE_IMAGE=' Dockerfile"),
      'base-drift.yaml must derive the checked tag from the Dockerfile ARG NODE_IMAGE line',
    ).toBe(true)
    expect(
      text.includes('imagetools inspect "$TAG"'),
      'base-drift.yaml must inspect the DERIVED tag, not a hardcoded stream',
    ).toBe(true)
    // rm-2008 review fix (2026-10-21): the compared pin set must ALSO come
    // from that line only. A whole-Dockerfile digest grep picks up the
    // oven/bun toolchain pin (a different image stream) and cross-compares
    // it against the node tag's live digest — a guaranteed weekly false red
    // on the two-pin post-Bun Dockerfile even with the node pin current.
    expect(
      text.includes("grep -E '^ARG NODE_IMAGE=' Dockerfile | grep -oE 'sha256:[0-9a-f]{64}'"),
      'base-drift.yaml must restrict the compared pin set to the ARG NODE_IMAGE line digest',
    ).toBe(true)
    expect(
      text.includes("grep -oE 'sha256:[0-9a-f]{64}' Dockerfile"),
      'base-drift.yaml must not whole-file grep the Dockerfile for digests (the oven/bun toolchain pin would be compared against the node tag live digest)',
    ).toBe(false)
  })
})
