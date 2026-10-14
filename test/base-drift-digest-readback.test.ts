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
})

/**
 * rm-856 (repository-maintenance cycle:1, 2026-10-15): base-tag
 * single-sourcing guard.
 *
 * base-drift.yaml used to probe the MOVING ALIAS `node:24-slim` at both
 * readback sites while the Dockerfile's `ARG NODE_IMAGE=…@sha256:…` line owns
 * the real pinned base (node:24-trixie-slim today). The two only coincide
 * while the alias and the pinned tag name the same manifest — a Debian tag
 * family move (bookworm→trixie was ad8f21e) would make the sentinel compare a
 * deliberate pin against a DIFFERENT tag family: false drift, or a "fix"
 * that drags the Dockerfile off its pinned family.
 *
 * These tests fail on BOTH regression shapes:
 *   1. a literal tag family returning to any probe site (the buildx inspect
 *      ref or the registry-HEAD fallback URL) instead of the ARG-derived
 *      values, or the expected-pin compare widening back to every sha256 in
 *      the Dockerfile;
 *   2. a broken derivation — the fixture probes run the workflow's OWN
 *      extraction commands (pulled verbatim out of the run block) against
 *      fixture Dockerfiles, including a moved-tag (trixie→forky) shape.
 */
const repoRoot = process.cwd()

interface DerivationFixture {
  name: string
  dockerfile: string
  expectTag: string
  expectDigest: string
}

// The pre-fix sentinel kept probing node:24-slim across a family move; the
// forky fixture is the red-first shape that proves the derivation FOLLOWS the
// ARG (a literal probe derives nothing and these tests cannot even extract
// the derivation commands).
const DERIVATION_FIXTURES: DerivationFixture[] = [
  {
    name: 'current trixie pin (the live Dockerfile shape)',
    dockerfile: [
      '# syntax=docker/dockerfile:1',
      'ARG NODE_IMAGE=node:24-trixie-slim@sha256:173f125896c3087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6',
      '',
    ].join('\n'),
    expectTag: 'node:24-trixie-slim',
    expectDigest: 'sha256:173f125896c3087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6',
  },
  {
    name: 'moved tag family (trixie→forky, the ad8f21e precedent shape)',
    dockerfile: [
      '# syntax=docker/dockerfile:1',
      'ARG NODE_IMAGE=node:24-forky-slim@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      '',
    ].join('\n'),
    expectTag: 'node:24-forky-slim',
    expectDigest: 'sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  },
]

/**
 * Pull a `VAR="$(command)"` assignment out of base-drift.yaml's EXECUTABLE
 * text and return the command string. Greedy to the closing `)"` so sed
 * programs containing parens survive intact.
 */
function extractDerivationCommand(text: string, varName: string): string {
  const match = text.match(new RegExp(String.raw`^\s*${varName}="\$\((.*)\)"\s*$`, 'm'))
  expect(match, `base-drift.yaml must assign ${varName} via a \"$(…)\" command substitution (rm-856 derivation)`).not.toBeNull()
  return match?.[1] ?? ''
}

/** Run the workflow's own extraction command against a Dockerfile on disk. */
function runDerivation(command: string, cwd: string): string {
  return execFileSync('bash', ['-c', command], {cwd, encoding: 'utf8'}).trim()
}

describe('base-drift base-tag derivation — workflow statics (rm-856)', () => {
  it('derives the probe tag from ARG NODE_IMAGE — no literal tag family at any probe site', () => {
    const file = readWorkflowFiles().find(f => f.name === 'base-drift.yaml')
    expect(file, '.github/workflows/base-drift.yaml must exist').toBeDefined()
    const text = file?.text ?? ''

    expect(
      text.includes('ARG NODE_IMAGE'),
      'base-drift.yaml must derive its probe tag from the Dockerfile ARG NODE_IMAGE line (rm-856)',
    ).toBe(true)
    expect(
      text.includes('imagetools inspect "$BASE_TAG"'),
      'the buildx readback must inspect the ARG-derived tag, not a literal tag family',
    ).toBe(true)
    expect(
      text,
      'the registry-HEAD fallback URL must reference the ARG-derived name + tag',
    ).toMatch(/\/library\/\$\{BASE_NAME\}\/manifests\/\$\{BASE_TAGPART\}/)

    // The pre-rm-856 probe shapes must not creep back in.
    expect(
      text,
      'base-drift.yaml must not inspect a literal node:<version> tag (rm-856: a family move makes a literal probe silently guard the wrong tag)',
    ).not.toMatch(/imagetools inspect ['"]?node:\d/)
    expect(
      text,
      'the registry-HEAD fallback must not address a literal manifests/<tag> path (rm-856)',
    ).not.toMatch(/manifests\/\d/)
  })

  it('scopes the expected-pin comparison to the ARG digest, not every sha256 in the Dockerfile', () => {
    const file = readWorkflowFiles().find(f => f.name === 'base-drift.yaml')
    const text = file?.text ?? ''
    expect(
      text,
      'the expected pin must be derived from ARG NODE_IMAGE only — the pre-rm-856 every-sha256 grep turns any future second digest in the Dockerfile into unowned drift signal',
    ).not.toContain("grep -oE 'sha256:[0-9a-f]{64}' Dockerfile")
  })
})

describe('base-drift base-tag derivation — fixture probes (rm-856)', () => {
  it('the workflow\'s own derivation commands follow a moved ARG tag (trixie→forky shape)', () => {
    const file = readWorkflowFiles().find(f => f.name === 'base-drift.yaml')
    const text = file?.text ?? ''
    const tagCommand = extractDerivationCommand(text, 'BASE_TAG')
    const digestCommand = extractDerivationCommand(text, 'PINNED_DIGEST')

    const scratch = mkdtempSync(join(tmpdir(), 'rm-856-fixture-'))
    try {
      for (const fixture of DERIVATION_FIXTURES) {
        writeFileSync(join(scratch, 'Dockerfile'), fixture.dockerfile)
        expect(
          runDerivation(tagCommand, scratch),
          `${fixture.name}: derived tag must follow the ARG line`,
        ).toBe(fixture.expectTag)
        expect(
          runDerivation(digestCommand, scratch),
          `${fixture.name}: derived digest must follow the ARG line`,
        ).toBe(fixture.expectDigest)
      }
    } finally {
      rmSync(scratch, {recursive: true, force: true})
    }
  })

  it('the derivation commands, run against the LIVE Dockerfile, derive the actual ARG pin', () => {
    const file = readWorkflowFiles().find(f => f.name === 'base-drift.yaml')
    const text = file?.text ?? ''
    const tagCommand = extractDerivationCommand(text, 'BASE_TAG')
    const digestCommand = extractDerivationCommand(text, 'PINNED_DIGEST')

    const liveDockerfile = readFileSync(join(repoRoot, 'Dockerfile'), 'utf8')
    const argPin = liveDockerfile.match(/^ARG NODE_IMAGE=([^@\r\n]+)@(sha256:[0-9a-f]{64})$/m)
    expect(
      argPin,
      'Dockerfile must pin ARG NODE_IMAGE=<name:tag>@sha256:<64 hex> — the derivation source',
    ).not.toBeNull()
    if (!argPin) return

    expect(runDerivation(tagCommand, repoRoot)).toBe(argPin[1])
    expect(runDerivation(digestCommand, repoRoot)).toBe(argPin[2])
  })
})
