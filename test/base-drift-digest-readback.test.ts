import {execFileSync} from 'node:child_process'
import {existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
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

  it('base-drift.yaml derives the watched tag from the Dockerfile ARG, never a hardcoded family literal (rm-856)', () => {
    const file = readWorkflowFiles().find(f => f.name === 'base-drift.yaml')
    const text = file?.text ?? ''
    // rm-856 (cycle 2, 2026-10-17): the workflow was born inspecting a hardcoded
    // node:24-slim tag while the Dockerfile pins node:24-trixie-slim — the drift
    // comparison was structurally empty and the watcher stayed blind while the
    // real pin went dead (173f1258, 404). The tag must be derived from the
    // Dockerfile's ARG NODE_IMAGE line (mirrors the cve-tripwire derivation in
    // 43af4cf), so a family move only ever touches the Dockerfile.
    expect(
      text.includes(String.raw`sed -nE 's/^ARG NODE_IMAGE=(node:[^@[:space:]]+@sha256:[0-9a-f]{64})$/\1/p' Dockerfile`),
      'base-drift.yaml must derive the watched tag from the Dockerfile ARG NODE_IMAGE line',
    ).toBe(true)
    for (const literal of ['node:24-slim', 'node:24-trixie-slim', 'manifests/24-slim', 'manifests/24-trixie-slim']) {
      expect(
        text.includes(literal),
        `base-drift.yaml must not hardcode the watched family literal ${literal} — derive it from the Dockerfile ARG (rm-856)`,
      ).toBe(false)
    }
  })
})

// --- rm-856 acceptance bullet 2 (review fix, 2026-10-17): EXECUTE the derivation ---
// The static guards above only string-match the workflow. This probe extracts the
// derivation command FROM base-drift.yaml and runs it against fixture Dockerfiles:
//   - moved-tag fixtures prove the sed follows the Dockerfile ARG across a family move
//     (the trixie-move precedent shape) instead of any family literal;
//   - malformed shapes prove the derivation fails CLOSED (empty) exactly where the
//     workflow's empty-PINNED_REF guard turns empty into ::error:: + exit 1.
// A workflow that drops the derivation, or re-anchors it to one family, reds here.
function extractDerivationCommand(workflowText: string): string {
  const matches = [...workflowText.matchAll(/sed -nE '[^']+' Dockerfile \| head -n 1/g)]
  expect(
    matches,
    'base-drift.yaml must carry exactly one ARG NODE_IMAGE derivation command',
  ).toHaveLength(1)
  return matches[0]?.[0] ?? ''
}

function derivePinnedRef(derivationCommand: string, dockerfileText: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'rm-856-derive-'))
  try {
    writeFileSync(join(dir, 'Dockerfile'), dockerfileText)
    return execFileSync('sh', ['-c', derivationCommand], {cwd: dir, encoding: 'utf8'}).trim()
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
}

// Synthetic digests only — never real registry pins.
const MOVED_BOOKWORM_REF = `node:26-bookworm-slim@sha256:${'a'.repeat(64)}`
const MOVED_ALPINE_REF = `node:24-alpine@sha256:${'b'.repeat(64)}`

function fixtureDockerfile(...argLines: string[]): string {
  return `# fixture Dockerfile — synthetic digests, never real pins\n${argLines.join('\n')}\nFROM \${NODE_IMAGE}\n`
}

function sedProgramOfWorkflow(name: string): string | undefined {
  return readWorkflowFiles()
    .find(file => file.name === name)
    ?.text.match(/sed -nE '([^']+)' Dockerfile/)?.[1]
}

describe('base-drift derivation probe — fixture Dockerfiles (rm-856 acceptance bullet 2)', () => {
  const derivationCommand = extractDerivationCommand(
    readWorkflowFiles().find(file => file.name === 'base-drift.yaml')?.text ?? '',
  )

  it('derives the MOVED tag from the Dockerfile ARG — the trixie-move shape, not a family literal', () => {
    expect(
      derivePinnedRef(derivationCommand, fixtureDockerfile(`ARG NODE_IMAGE=${MOVED_BOOKWORM_REF}`)),
    ).toBe(MOVED_BOOKWORM_REF)
    expect(
      derivePinnedRef(derivationCommand, fixtureDockerfile(`ARG NODE_IMAGE=${MOVED_ALPINE_REF}`)),
    ).toBe(MOVED_ALPINE_REF)
  })

  it('fails closed on malformed ARG shapes — empty is what the workflow turns into exit 1', () => {
    const malformed = [
      'ARG NODE_IMAGE=node:26-bookworm-slim', // no digest
      `ARG NODE_IMAGE=node:26-bookworm-slim@sha256:${'a'.repeat(63)}`, // 63 hex
      `ARG NODE_IMAGE=node:26-bookworm-slim@sha256:${'g'.repeat(64)}`, // non-hex
      `ARG NODE_IMAGE=node:26-bookworm-slim@sha256:${'a'.repeat(64)} trailing`, // trailing content
      `# ARG NODE_IMAGE=${MOVED_BOOKWORM_REF}`, // commented out
      `ARG NODE_BASE=node:26-bookworm-slim@sha256:${'a'.repeat(64)}`, // wrong variable
    ]
    for (const argLine of malformed) {
      expect(derivePinnedRef(derivationCommand, fixtureDockerfile(argLine)), `must derive empty for: ${argLine}`).toBe('')
    }
    expect(derivePinnedRef(derivationCommand, fixtureDockerfile())).toBe('') // no ARG at all
  })

  it('takes the FIRST matching ARG line (the head -n 1 contract); the real Dockerfile carries exactly one', () => {
    const firstRef = `node:24-trixie-slim@sha256:${'c'.repeat(64)}`
    const twoArgs = fixtureDockerfile(`ARG NODE_IMAGE=${firstRef}`, `ARG NODE_IMAGE=${MOVED_BOOKWORM_REF}`)
    expect(derivePinnedRef(derivationCommand, twoArgs)).toBe(firstRef)

    const realDockerfile = readFileSync(join(process.cwd(), 'Dockerfile'), 'utf8')
    expect(realDockerfile.match(/^ARG NODE_IMAGE=/gm) ?? []).toHaveLength(1)
    expect(derivePinnedRef(derivationCommand, realDockerfile)).toMatch(/^node:[^@\s]+@sha256:[0-9a-f]{64}$/)
  })

  it('cve-tripwire resolves from the SAME Dockerfile ARG derivation — the two steps cannot disagree', () => {
    const baseDriftProgram = sedProgramOfWorkflow('base-drift.yaml')
    expect(baseDriftProgram, 'base-drift.yaml must derive from the Dockerfile ARG').toBeDefined()
    expect(
      sedProgramOfWorkflow('cve-tripwire.yaml'),
      'cve-tripwire.yaml must derive its resolve tag from the Dockerfile ARG (rm-856 bullet 3)',
    ).toBe(baseDriftProgram)
  })
})
