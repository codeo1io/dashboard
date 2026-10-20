#!/usr/bin/env node
/**
 * rm-2046: verify the clonedeps mirror matches the CI agent pin.
 *
 * The fro-bot/agent mirror under .slim/clonedeps/repos/ is the source agents
 * read when reasoning about gateway/operator-contract behavior, while CI runs
 * the tag pinned in .github/workflows/fro-bot.yaml. Those two can drift
 * silently (a re-provision against the wrong tag, a pin bump without a
 * re-clone) and every verification done against a drifted mirror is evidence
 * about code production does not run. This check makes the drift loud.
 *
 * Usage: node scripts/verify-clonedeps.ts
 * Exit 0 = mirror HEAD is exactly the pinned tag; exit 1 = drift or
 * provisioning problem, with the re-provision command in the error output.
 */
import {execFileSync} from 'node:child_process'
import {existsSync, readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import process from 'node:process'
import {fileURLToPath} from 'node:url'

export const WORKFLOW_RELATIVE_PATH = join('.github', 'workflows', 'fro-bot.yaml')
export const MIRROR_RELATIVE_PATH = join('.slim', 'clonedeps', 'repos', 'fro-bot__agent')
export const MIRROR_CLONE_URL = 'https://github.com/fro-bot/agent'

/**
 * Matches every `fro-bot/agent@<ref>` action reference, plus the optional
 * trailing `# vX.Y.Z` tag comment the digest-pinned form carries. Two shapes
 * occur: the direct tag pin (`fro-bot/agent@v0.122.3`) and the digest pin
 * with its tag comment (`fro-bot/agent@<40-hex-sha> # v0.122.3` — the shape
 * this workflow actually uses).
 */
const AGENT_REF_PATTERN = /fro-bot\/agent@([^\s#]+)(?:[ \t]*#[ \t]*(v\d+\.\d+\.\d+))?/g
const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i
const TAG_PATTERN = /^v\d+\.\d+\.\d+$/

/**
 * Extract the pinned agent tag from the workflow text.
 *
 * Returns the single distinct version found, or a descriptive error when the
 * text carries none (pin removed?), several distinct ones (stale leftovers
 * from an upgrade-in-progress would make "the pin" ambiguous — a human must
 * look, not the script), a digest pin stripped of its tag comment (the only
 * machine-readable tag source), or a ref that is neither tag nor SHA.
 */
export function parseAgentPin(workflowText: string): {ok: true; pin: string} | {ok: false; reason: string} {
  const found = new Set<string>()
  for (const match of workflowText.matchAll(AGENT_REF_PATTERN)) {
    const ref = match[1]
    if (ref === undefined) continue
    const commentTag = match[2]
    if (TAG_PATTERN.test(ref)) {
      found.add(ref)
      continue
    }
    if (COMMIT_SHA_PATTERN.test(ref)) {
      if (commentTag === undefined) {
        return {
          ok: false,
          reason: `the agent pin is the commit SHA ${ref} with no '# vX.Y.Z' tag comment — the comment is the only machine-readable tag source for a digest pin, restore it`,
        }
      }
      found.add(commentTag)
      continue
    }
    return {ok: false, reason: `unrecognized agent pin ref '${ref}' — expected fro-bot/agent@vX.Y.Z or a commit SHA with a '# vX.Y.Z' comment`}
  }
  if (found.size === 0) {
    return {ok: false, reason: `no 'fro-bot/agent@…' reference found in the workflow — the pin moved or changed shape`}
  }
  if (found.size > 1) {
    return {ok: false, reason: `multiple distinct agent pins found (${[...found].join(', ')}) — resolve to exactly one before verifying`}
  }
  const pin = [...found][0]
  return pin === undefined
    ? {ok: false, reason: `no 'fro-bot/agent@…' reference found in the workflow — the pin moved or changed shape`}
    : {ok: true, pin}
}

export type VerifyResult =
  | {ok: true; pin: string; mirrorTag: string}
  | {ok: false; reason: string; remedy: string}

export interface VerifyDeps {
  /** Returns the mirror HEAD's exact tag, or undefined when it cannot be determined. */
  describeMirrorHead: (mirrorPath: string) => string | undefined
  /** Returns true when the mirror directory exists. */
  mirrorExists: (mirrorPath: string) => boolean
}

/**
 * Compare the workflow pin against the mirror's checked-out tag. Pure over the
 * injected dependencies so tests can drive every branch without a git fixture.
 */
export function verifyClonedeps(workflowText: string, repoRoot: string, deps: VerifyDeps): VerifyResult {
  const parsed = parseAgentPin(workflowText)
  const mirrorPath = join(repoRoot, MIRROR_RELATIVE_PATH)
  const remedyFor = (pin: string | undefined) =>
    `re-provision the mirror:\n  rm -rf ${MIRROR_RELATIVE_PATH} && git clone --depth 1 --branch ${pin ?? '<pin>'} ${MIRROR_CLONE_URL} ${MIRROR_RELATIVE_PATH}`

  if (!parsed.ok) {
    return {ok: false, reason: `${parsed.reason} (${WORKFLOW_RELATIVE_PATH})`, remedy: `fix the workflow pin, then ${remedyFor(undefined).replace('re-provision the mirror:\n  ', 're-provision: ')}`}
  }
  if (!deps.mirrorExists(mirrorPath)) {
    return {ok: false, reason: `mirror missing at ${MIRROR_RELATIVE_PATH}`, remedy: remedyFor(parsed.pin)}
  }
  const mirrorTag = deps.describeMirrorHead(mirrorPath)
  if (mirrorTag === undefined) {
    return {ok: false, reason: `cannot determine the mirror HEAD tag at ${MIRROR_RELATIVE_PATH} (not a git checkout, or HEAD is not exactly on a tag)`, remedy: remedyFor(parsed.pin)}
  }
  if (mirrorTag !== parsed.pin) {
    return {
      ok: false,
      reason: `clonedeps drift: workflow pins ${parsed.pin} but the mirror is at ${mirrorTag} — verification against this mirror describes code CI does not run`,
      remedy: remedyFor(parsed.pin),
    }
  }
  return {ok: true, pin: parsed.pin, mirrorTag}
}

function main(): number {
  const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))
  let workflowText: string
  try {
    workflowText = readFileSync(join(repoRoot, WORKFLOW_RELATIVE_PATH), 'utf8')
  } catch {
    console.error(`verify-clonedeps: cannot read ${WORKFLOW_RELATIVE_PATH}`)
    return 1
  }
  const result = verifyClonedeps(workflowText, repoRoot, {
    mirrorExists: p => existsSync(p),
    describeMirrorHead: p => {
      try {
        return execFileSync('git', ['-C', p, 'describe', '--tags', '--exact-match', 'HEAD'], {encoding: 'utf8'}).trim() || undefined
      } catch {
        return undefined
      }
    },
  })
  if (result.ok) {
    console.log(`verify-clonedeps: OK — mirror is exactly at the pinned tag ${result.pin}`)
    return 0
  }
  console.error(`verify-clonedeps: ${result.reason}`)
  console.error(result.remedy)
  return 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main()
}
