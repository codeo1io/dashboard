#!/usr/bin/env node
// scripts/conductor-ref-gc.ts
//
// Census + dry-run-by-construction deletion planner for refs/heads/conductor/* on
// origin. The tool NEVER pushes: it classifies every conductor ref against
// origin/main (merged = the ref's tip is an ancestor of origin/main) and emits
// the exact push-refspec batches a push gate could run. Adjudication belongs to
// the push gate; this only computes the plan.
//
// Why: months of conductor runs leave refs/heads/conductor/* behind on origin
// (213 at the 2026-10-13 census), which bloats every fetch. The dashboard's
// landing pipeline resolves candidate refs by content, so provably-merged run
// refs are safe to delete; live lanes must never be.
//
// Usage:
//   node scripts/conductor-ref-gc.ts                    # census local tracking refs (fetch first)
//   node scripts/conductor-ref-gc.ts --ls-remote        # census live origin via ls-remote (no fetch)
//   node scripts/conductor-ref-gc.ts --json plan.json   # machine-readable plan
//
// Exit codes: 0 = census ran (deletions may be planned), 2 = tool error.

import {execFileSync} from 'node:child_process'
import {writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {fileURLToPath} from 'node:url'

export class ToolError extends Error {}

export interface RawRef {
  /** refs/heads/conductor/<name> as it exists on origin */
  ref: string
  sha: string
}

export interface ConductorRef extends RawRef {
  /** conductor/<name> */
  name: string
  merged: boolean
}

export interface GcPlan {
  anchor: string
  total: number
  merged: number
  live: number
  mergedRefs: ConductorRef[]
  liveRefs: ConductorRef[]
  /** deletion commands the push gate could run (batched at <= 40 refspecs) */
  commands: string[]
}

function git(args: string[]): string {
  return execFileSync('git', args, {encoding: 'utf8', maxBuffer: 16 * 1024 * 1024})
}

/** Parse `git ls-remote origin refs/heads/conductor/*` lines (`<sha>\t<ref>`). */
export function parseRefLines(lines: string[]): RawRef[] {
  const out: RawRef[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (line === '') continue
    const m = line.match(/^([0-9a-f]{40})\s+(refs\/heads\/conductor\/\S+)$/)
    if (!m) throw new ToolError(`unparseable ls-remote line: ${line}`)
    const sha = m[1]
    const ref = m[2]
    if (sha === undefined || ref === undefined) throw new ToolError(`unindexed match: ${line}`)
    out.push({sha, ref})
  }
  return out
}

/**
 * Parse `git for-each-ref refs/remotes/origin/conductor/ --format='%(refname) %(objectname)'`
 * lines, mapping remote-tracking names back to the origin branch names.
 */
export function parseTrackingRefLines(lines: string[]): RawRef[] {
  const out: RawRef[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (line === '') continue
    const m = line.match(/^refs\/remotes\/origin\/(conductor\/\S+)\s+([0-9a-f]{40})$/)
    if (!m) throw new ToolError(`unparseable for-each-ref line: ${line}`)
    const name = m[1]
    const sha = m[2]
    if (name === undefined || sha === undefined) throw new ToolError(`unindexed match: ${line}`)
    out.push({ref: `refs/heads/${name}`, sha})
  }
  return out
}

/** Split refs into a deletion plan. Pure: never touches the network or git. */
export function buildPlan(anchor: string, refs: (RawRef & {merged: boolean})[]): GcPlan {
  const toConductorRef = (r: RawRef & {merged: boolean}): ConductorRef => ({
    ...r,
    name: r.ref.replace(/^refs\/heads\//, ''),
  })
  const mergedRefs = refs.filter(r => r.merged).map(toConductorRef)
  const liveRefs = refs.filter(r => !r.merged).map(toConductorRef)
  const refspecs = mergedRefs.map(r => `:${r.ref}`)
  const commands: string[] = []
  for (let i = 0; i < refspecs.length; i += 40) {
    commands.push(`git push origin ${refspecs.slice(i, i + 40).join(' ')}`)
  }
  return {
    anchor,
    total: refs.length,
    merged: mergedRefs.length,
    live: liveRefs.length,
    mergedRefs,
    liveRefs,
    commands,
  }
}

export function renderPlan(p: GcPlan): string {
  const lines: string[] = []
  lines.push('conductor ref gc census (dry-run by construction — this tool never pushes)')
  lines.push(`anchor : origin/main ${p.anchor}`)
  lines.push(`total  : ${p.total} conductor refs`)
  lines.push(`merged : ${p.merged} (tip is an ancestor of origin/main — deletable)`)
  lines.push(`live   : ${p.live} (not merged — LIVE LANES, keep)`)
  lines.push('')
  if (p.mergedRefs.length === 0) {
    lines.push('nothing merged to delete')
  } else {
    lines.push('planned deletions (the push gate owns execution + adjudication):')
    for (const r of p.mergedRefs) lines.push(`  - ${r.ref} ${r.sha.slice(0, 12)}`)
    lines.push('')
    lines.push('commands:')
    for (const c of p.commands) lines.push(`  ${c}`)
  }
  lines.push('')
  lines.push('conservative by construction: ancestor-of-main is the only deletion test —')
  lines.push('lanes landed via rebase/squash (tip not an ancestor) classify live and stay.')
  return lines.join('\n')
}

function parseArgs(argv: string[]): {lsRemote: boolean; jsonOut?: string} {
  const lsRemote = argv.includes('--ls-remote')
  let jsonOut: string | undefined
  const jsonIdx = argv.indexOf('--json')
  if (jsonIdx !== -1) {
    jsonOut = argv[jsonIdx + 1]
    if (jsonOut === undefined || jsonOut.startsWith('--')) {
      throw new ToolError('--json requires a path argument')
    }
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--ls-remote') continue
    if (a === '--json') {
      i++
      continue
    }
    throw new ToolError(`unknown flag: ${a}`)
  }
  return {lsRemote, jsonOut}
}

function main(): number {
  try {
    const {lsRemote, jsonOut} = parseArgs(process.argv.slice(2))
    const anchor = git(['rev-parse', 'refs/remotes/origin/main']).trim()
    const raw = lsRemote
      ? git(['ls-remote', 'origin', 'refs/heads/conductor/*'])
      : git(['for-each-ref', 'refs/remotes/origin/conductor/', '--format=%(refname) %(objectname)'])
    const parsed = lsRemote
      ? parseRefLines(raw.split('\n'))
      : parseTrackingRefLines(raw.split('\n'))
    const refs = parsed.map(r => ({...r, merged: false}))
    for (const r of refs) {
      try {
        git(['merge-base', '--is-ancestor', r.sha, anchor])
        r.merged = true
      } catch {
        r.merged = false // not an ancestor (or unknown object): live lane
      }
    }
    const plan = buildPlan(anchor, refs)
    console.log(renderPlan(plan))
    if (jsonOut !== undefined) {
      writeFileSync(jsonOut, `${JSON.stringify(plan, null, 2)}\n`)
      console.log(`json written: ${jsonOut}`)
    }
    return 0
  } catch (error) {
    console.error(
      `conductor-ref-gc tool error (exit 2): ${error instanceof Error ? error.message : String(error)}`,
    )
    return 2
  }
}

const isDirectRun =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isDirectRun) {
  process.exit(main())
}
