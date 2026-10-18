import {spawnSync} from 'node:child_process'
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

/**
 * rm-856 (the rm-779 class cured at its second site): the tag base-drift
 * inspects must be DERIVED from the Dockerfile's ARG NODE_IMAGE line, never a
 * workflow-local literal.
 *
 * base-drift.yaml was born inspecting a hardcoded literal the Dockerfile did
 * not pin at that moment — the ad8f21e trixie move had already taken the ARG
 * to node:24-trixie-slim while the workflow queried a plain tag — so the
 * weekly drift check compared the real pins against the WRONG tag family's
 * digest: a silent no-guard that only re-reddens on a coincidence. rm-779
 * already cured the same class for cve-tripwire.yaml's resolve step; this
 * suite pins the mirrored cure and the cross-workflow agreement the rm-856
 * acceptance requires.
 *
 * Red-first provenance: against the pre-fix base-drift.yaml (literal inspect
 * target, no ARG derivation) the base-drift legs of this suite FAIL — the
 * derivation-extraction expectation is the red. The fixture legs run the
 * workflow's OWN sed program, extracted from the checked-in workflow text
 * (never re-typed here), against fixture Dockerfiles — a workflow that
 * merely looks derived while hardcoding a tag elsewhere still fails the
 * literal scan below.
 */

const repoRoot = process.cwd()
const workflowsDir = join(repoRoot, '.github', 'workflows')

/**
 * Strip full-line comments so guard assertions target EXECUTABLE workflow
 * text, not trap-documenting prose (same helper contract as
 * test/base-drift-digest-readback.test.ts).
 */
function stripCommentLines(text: string): string {
  return text
    .split('\n')
    .filter(line => !line.trimStart().startsWith('#'))
    .join('\n')
}

function executableWorkflowText(name: string): string {
  return stripCommentLines(readFileSync(join(workflowsDir, name), 'utf8'))
}

/**
 * Extract the ARG NODE_IMAGE derivation sed program a workflow carries. The
 * trailing ' Dockerfile' anchor is part of the match: the derivation must
 * read the pin from the Dockerfile, not from a workflow-local variable.
 */
function extractDerivationProgram(name: string): string | null {
  const match = /sed -nE '(s\/\^ARG NODE_IMAGE=[^']+)' Dockerfile/.exec(executableWorkflowText(name))
  return match?.[1] ?? null
}

function requireDerivationProgram(name: string): string {
  const program = extractDerivationProgram(name)
  if (program === null) {
    throw new Error(
      `${name} carries no 'sed -nE …' ARG NODE_IMAGE derivation reading Dockerfile — the rm-779/rm-856 cure is absent, so the workflow inspects a tag literal that can silently desync from the Dockerfile base`,
    )
  }
  return program
}

/** Run a workflow's own sed program against a Dockerfile-shaped fixture. */
function runSed(program: string, dockerfileText: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'rm-856-derivation-'))
  const file = join(dir, 'Dockerfile')
  try {
    writeFileSync(file, dockerfileText, 'utf8')
    const result = spawnSync('sed', ['-nE', program, file], {encoding: 'utf8'})
    if (result.error) throw result.error
    if (result.status !== 0) {
      throw new Error(`sed exited ${result.status}: ${result.stderr}`)
    }
    return result.stdout.trim()
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
}

// A moved-tag fixture in the ad8f21e trixie-move SHAPE but a different family
// (node 26, noble) — proving the derivation follows the ARG wherever it moves,
// not just the value the repo happens to pin today.
const MOVED_HEX = 'c0ffee00cafe1234abcd5678ef901234aabbccdd0123456789abcdef01234567'
const MOVED_DOCKERFILE = [
  '# syntax=docker/dockerfile:1',
  `ARG NODE_IMAGE=node:26-noble-slim@sha256:${MOVED_HEX}`,
  'ARG DASHBOARD_VERSION=dev',
  'FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS builder',
  'RUN corepack enable',
  '',
].join('\n')
const MOVED_REF = `node:26-noble-slim@sha256:${MOVED_HEX}`

describe('base-drift tag derivation (rm-856, rm-779 class second site)', () => {
  it('base-drift.yaml derives the inspected tag from the Dockerfile ARG, not a literal', () => {
    expect(
      extractDerivationProgram('base-drift.yaml'),
      'base-drift.yaml must carry the ARG NODE_IMAGE sed derivation against Dockerfile (rm-856) — a literal inspect target silently stops guarding the real base on the next tag-family move',
    ).not.toBeNull()
  })

  it('cve-tripwire.yaml still carries its landed rm-779 derivation (verify-only leg)', () => {
    expect(
      extractDerivationProgram('cve-tripwire.yaml'),
      'cve-tripwire.yaml lost the rm-779 ARG derivation — restore it before cross-workflow agreement can hold',
    ).not.toBeNull()
  })

  it('red-first moved-tag fixture: both workflows\' own sed programs follow a moved Dockerfile tag', () => {
    // The trixie-move shape: family AND version differ from today's pin.
    expect(runSed(requireDerivationProgram('base-drift.yaml'), MOVED_DOCKERFILE)).toBe(MOVED_REF)
    expect(runSed(requireDerivationProgram('cve-tripwire.yaml'), MOVED_DOCKERFILE)).toBe(MOVED_REF)
  })

  it('the derivation rejects an unpinned ARG and a non-node family (error path, not a silent zero)', () => {
    const program = requireDerivationProgram('base-drift.yaml')
    // Unpinned moving tag — exactly the shape the sentinel must refuse to
    // guard (the ::error + exit 1 branch fires on the empty result).
    expect(runSed(program, 'ARG NODE_IMAGE=node:24-slim\n')).toBe('')
    // A digest-pinned but non-node base — outside the derivation contract.
    expect(runSed(program, `ARG NODE_IMAGE=ubuntu:24.04@sha256:${MOVED_HEX}\n`)).toBe('')
  })

  it('the repo Dockerfile resolves through both programs to the same ARG pin', () => {
    const dockerfile = readFileSync(join(repoRoot, 'Dockerfile'), 'utf8')
    const expected = /^ARG NODE_IMAGE=(node:[^@\s]+@sha256:[0-9a-f]{64})$/m.exec(dockerfile)?.[1]
    expect(expected, 'repo Dockerfile must carry a digest-pinned ARG NODE_IMAGE — the sentinel\u2019s subject').toBeDefined()
    expect(runSed(requireDerivationProgram('base-drift.yaml'), dockerfile)).toBe(expected)
    expect(runSed(requireDerivationProgram('cve-tripwire.yaml'), dockerfile)).toBe(expected)
  })

  it('cross-workflow agreement: base-drift and cve-tripwire carry the byte-identical derivation program', () => {
    expect(extractDerivationProgram('base-drift.yaml')).toBe(extractDerivationProgram('cve-tripwire.yaml'))
  })

  it('no node tag literal survives in either workflow\u2019s executable text (the desync guard)', () => {
    for (const name of ['base-drift.yaml', 'cve-tripwire.yaml']) {
      const literal = /node:\d+(?:-[A-Za-z0-9.]+)+/.exec(executableWorkflowText(name))
      expect(
        literal === null ? null : `${name}: ${literal[0]}`,
        `${name} hardcodes a node tag literal in executable text — derive it from the Dockerfile ARG instead (rm-856; the derivation pattern 'node:[^@…]' does not match this literal shape, so this scan only fires on real literals)`,
      ).toBeNull()
    }
  })

  it('base-drift.yaml inspects, falls back, and reports through the DERIVED tag', () => {
    const text = executableWorkflowText('base-drift.yaml')
    expect(
      text.includes('docker buildx imagetools inspect "$TAG"'),
      'the buildx inspect target must be the ARG-derived $TAG, not a literal',
    ).toBe(true)
    expect(
      text.includes('manifests/${TAG#node:}'),
      'the registry HEAD fallback must target the derived tag too — a literal fallback URL guards the wrong tag family',
    ).toBe(true)
  })
})
