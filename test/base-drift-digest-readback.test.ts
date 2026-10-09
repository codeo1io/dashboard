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
})

/**
 * rm-708 (2026-10-08): the third readback fence class — an UNGUARDED
 * early-exit-awk digest readback of a docker inspect command under
 * `bash -Eeuo pipefail` (release.yaml runs `shell: bash -Eeuo pipefail {0}`).
 *
 * `| awk '/^Digest:/{print $2; exit}'` makes awk exit the instant it prints,
 * SIGPIPE-ing the producer (docker/buildx) mid-write; pipefail then turns the
 * pipeline into a step failure WITH the correct digest already extracted —
 * exactly how Release went 7/8 red at '🏷️ Promote latest image tag'
 * (runs 37574226127/37567189586, 2026-10-04..07). rm-166/178 fenced the
 * manifest-inspect and buildx-template classes; this fences every workflow's
 * early-exit class. `|| true`-guarded forms (base-drift.yaml:68/:81) stay
 * legal by design: their step cannot fail on the readback, so early exit is
 * harmless there. The cure is the END-block form — `awk '/^Digest:/{d=$2}
 * END{print d}'` — which drains the pipe and prints only at EOF, preserving
 * empty-output ⇒ extraction-error semantics.
 */
const INSPECT_TO_AWK = /(?:docker\s+manifest\s+inspect|docker\s+buildx\s+imagetools\s+inspect)[\s\S]{0,400}?awk\s+'([^']*)'/g

function findUnguardedEarlyExitReadbacks(text: string): string[] {
  const violations: string[] = []
  for (const match of text.matchAll(INSPECT_TO_AWK)) {
    const program = match[1] ?? ''
    const earlyExit = /\bexit\b/.test(program) && !/\bEND\s*\{/.test(program)
    if (!earlyExit) continue
    const after = text.slice(match.index + match[0].length, match.index + match[0].length + 120)
    if (/\|\|\s*true/.test(after)) continue // guarded — deliberately legal
    violations.push(match[0].replaceAll(/\s+/g, ' ').slice(0, 200))
  }
  return violations
}

describe('digest readback — SIGPIPE fence (rm-708)', () => {
  it('no workflow pipes a docker inspect into an UNGUARDED early-exit awk under pipefail', () => {
    for (const {name, text} of readWorkflowFiles()) {
      const violations = findUnguardedEarlyExitReadbacks(text)
      expect(
        violations,
        `${name}: early-exit awk SIGPIPEs the inspect producer under -Eeuo pipefail (convert to the END-block form awk '/^Digest:/{d=$2} END{print d}' or ||-true guard it): ${violations.join(' || ')}`,
      ).toEqual([])
    }
  })

  it('release.yaml reads both digests with the END-block (SIGPIPE-free) awk form', () => {
    const file = readWorkflowFiles().find(f => f.name === 'release.yaml')
    expect(file, '.github/workflows/release.yaml must exist').toBeDefined()
    const text = file?.text ?? ''
    expect(
      (text.match(/awk '\/\^Digest:\/\{d=\$2\} END\{print d\}'/g) ?? []).length,
      'release.yaml must read both digests (:480 verify loop, :518 promote-latest) with the END-block awk',
    ).toBe(2)
    expect(
      text,
      'release.yaml must not read a digest with an early-exit awk (SIGPIPE under -Eeuo pipefail)',
    ).not.toContain("awk '/^Digest:/{print $2; exit}'")
  })

  it('detector semantics: guarded, END-block, and non-inspect early-exit awks are legal; unguarded inspect readbacks are not', () => {
    const unguarded = String.raw`got=$(docker buildx imagetools inspect \n  "ghcr.io/org/repo:latest" \n  | awk '/^Digest:/{print $2; exit}')`
    expect(findUnguardedEarlyExitReadbacks(unguarded)).toHaveLength(1)
    expect(findUnguardedEarlyExitReadbacks(`${unguarded} || true)`)).toHaveLength(0)
    expect(
      findUnguardedEarlyExitReadbacks(
        "got=$(docker buildx imagetools inspect 'ghcr.io/org/repo:latest' | awk '/^Digest:/{d=$2} END{print d}')",
      ),
    ).toHaveLength(0)
    expect(
      findUnguardedEarlyExitReadbacks(String.raw`printf '%s\n' a b | awk '/a/{print; exit}'`),
    ).toHaveLength(0)
  })
})

/**
 * rm-793 (2026-10-09): cross-file pin-KEY fence — the workflow-statics suites
 * (base-drift readback forms above, actionlint, zizmor) fence forms WITHIN a
 * file; this fences IDENTITY ACROSS files. cve-tripwire.yaml resolves its
 * pinned digest by grepping `${NODE_IMAGE}@sha256:<64-hex>` in the Dockerfile
 * (cve-tripwire.yaml 'Resolve pinned digest' step), so the workflow's
 * NODE_IMAGE tag must be exactly the Dockerfile ARG's tag — a one-word drift
 * ('node:24-slim' vs 'node:24-trixie-slim', the state this fence closed) makes
 * that grep unmatchable and the resolve step exits 1 BEFORE trivy ever runs,
 * red-by-construction on every scheduled fire. The same holds if the
 * workflow env ever carries the full tag@digest pin (the grep would then look
 * for a doubled @sha256 suffix), so the bare-tag property is fenced too.
 */
describe('cve-tripwire NODE_IMAGE ↔ Dockerfile ARG pin-key fence (rm-793)', () => {
  it("the tripwire's NODE_IMAGE tag equals the Dockerfile ARG tag, as a bare tag", () => {
    const file = readWorkflowFiles().find(f => f.name === 'cve-tripwire.yaml')
    expect(file, '.github/workflows/cve-tripwire.yaml must exist').toBeDefined()
    const text = file?.text ?? ''
    const envMatch = text.match(/^\s*NODE_IMAGE:\s*'([^']+)'\s*$/m)
    expect(envMatch, 'cve-tripwire.yaml must set NODE_IMAGE as a single-quoted env value').toBeDefined()
    const tag = envMatch?.[1] ?? ''
    expect(
      tag.includes('@'),
      'NODE_IMAGE must be the BARE tag — the resolve step greps <tag>@sha256:<hex> in the Dockerfile, so a full tag@digest value can never match',
    ).toBe(false)

    const dockerfile = readFileSync(join(process.cwd(), 'Dockerfile'), 'utf8')
    const argMatch = dockerfile.match(/^ARG NODE_IMAGE=([^@\s]+)@sha256:([0-9a-f]{64})\s*$/m)
    expect(
      argMatch,
      'Dockerfile must pin ARG NODE_IMAGE=<tag>@sha256:<64-hex digest> (the tripwire resolve step depends on this exact shape)',
    ).toBeDefined()
    expect(
      argMatch?.[1],
      `workflow NODE_IMAGE '${tag}' does not match the Dockerfile ARG tag — the tripwire's digest grep is red by construction (rm-793)`,
    ).toBe(tag)
  })
})
