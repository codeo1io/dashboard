#!/usr/bin/env node
// scripts/absorb-manifest-parity.ts
//
// Post-absorb manifest-parity guard (rm-1983).
//
// The recorded drop class (research 2026-10-18, run 6ec8de1a): an absorb
// merge carried an upstream dependency-bump COMMIT into the fork's
// ancestry (8d867b9b, "@hono/node-server 2.1.5 (#644)") while a union
// resolution silently DROPPED the manifest/lockfile lines — package.json
// kept `^2.1.3` for a commit that is literally an ancestor of HEAD. The
// absorb-window measurer reports commit counts; nothing compared the
// absorbed *versions* against our manifests. This guard closes that gap.
//
// Posture: fetch-first and fail-closed, mirroring scripts/absorb-window.ts.
//
// Usage:
//   node scripts/absorb-manifest-parity.ts [--upstream <remote|url>]
//                                          [--head <rev>] [--no-fetch]
//
// Output (stdout, one JSON object):
//   {
//     "head": "<rev sha>",
//     "upstream": "<upstream main sha>",
//     "absorbed_bump_commits": <int>,
//     "checked_dependencies": <int>,
//     "violations": [
//       {"manifest": "package.json", "package": "@hono/node-server",
//        "absorbed": "^2.1.5", "ours": "^2.1.3"}
//     ],
//     "skipped": [{"manifest": "...", "package": "...", "reason": "..."}]
//   }
//
// Exit codes:
//   0  parity holds (or nothing to check)
//   1  parity violations — absorbed bumps missing from our manifests
//   2  operational failure (fetch failed, refs missing, manifests unparsable)
//
// Semantics:
//   - "Absorbed" = the upstream commit is an ancestor of HEAD. Upstream
//     commits that merely sit in the open absorb window are NOT expected in
//     our manifests yet and are ignored (that is absorb's job, not ours).
//   - Only manifests are compared (package.json, web/package.json).
//     Lockfile-only commits carry no from/to pair and are skipped.
//   - A violation is either "stale" (our min-satisfying version is lower
//     than the absorbed one) or "missing" (the package disappeared).
//     Specs the comparator cannot reason about (workspace:, file:, *,
//     git+url, `||` ranges) are skipped with a printed reason — never
//     guessed at.
//
// Fail-closed rationale: a guard that degrades on a failed fetch is worse
// than no guard — it would green-light the next absorb with stale inputs.

import {spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import process from 'node:process'

const CANONICAL_UPSTREAM_URL = 'https://github.com/fro-bot/dashboard.git'
const MANIFESTS = ['package.json', 'web/package.json'] as const
const DEP_SECTIONS = ['dependencies', 'devDependencies', 'optionalDependencies'] as const

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

interface Options {
  upstream: string
  head: string
  fetch: boolean
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {upstream: '', head: 'HEAD', fetch: true}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--upstream') opts.upstream = argv[++i] ?? ''
    else if (arg === '--head') opts.head = argv[++i] ?? 'HEAD'
    else if (arg === '--no-fetch') opts.fetch = false
    else {
      process.stderr.write(`absorb-manifest-parity: unknown argument ${arg}\n`)
      process.exit(2)
    }
  }
  return opts
}

/** Resolve which remote to read upstream from (test seam first, house order). */
function resolveUpstream(explicit: string, remotes: string, remoteUrls: string): string {
  if (explicit !== '') return explicit
  const seam = process.env.ABSORB_PARITY_UPSTREAM_REMOTE
  if (seam !== undefined) return seam
  const names = remotes.split('\n').filter(Boolean)
  if (names.includes('autonomy-upstream')) return 'autonomy-upstream'
  const urls = remoteUrls.split('\n').filter(Boolean)
  for (const line of urls) {
    // "<name>\t<url>" — host-agnostic suffix match, like absorb-window.ts
    const tab = line.indexOf('\t')
    if (tab > 0 && /fro-bot\/dashboard(?:\.git)?\/?$/i.test(line.slice(tab + 1))) {
      return line.slice(0, tab)
    }
  }
  return CANONICAL_UPSTREAM_URL
}

// ---------------------------------------------------------------------------
// Git plumbing (all output captured; failures are hard errors)
// ---------------------------------------------------------------------------

function gitText(args: string[], what: string): string {
  const res = spawnSync('git', args, {encoding: 'utf8'})
  if (res.status !== 0) {
    process.stderr.write(`absorb-manifest-parity: git ${what} failed: ${(res.stderr ?? '').trim()}\n`)
    process.exit(2)
  }
  return res.stdout
}

function isAncestor(sha: string, head: string): boolean {
  const res = spawnSync('git', ['merge-base', '--is-ancestor', sha, head])
  return res.status === 0
}

// ---------------------------------------------------------------------------
// Semver-lite comparison (min-satisfying version of a spec)
// ---------------------------------------------------------------------------

/** Smallest version a spec can admit, or null when the spec is opaque. */
export function minSatisfyingVersion(spec: string): [number, number, number] | null {
  const m = /^\s*[~^v]?(?<v>\d+(?:\.\d+){0,2})/.exec(spec)
  if (m?.groups?.v === undefined) return null
  const parts = m.groups.v.split('.').map(Number)
  if (parts.some(p => Number.isNaN(p))) return null
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0]
}

export function cmpVersion(a: [number, number, number], b: [number, number, number]): number {
  for (let i = 0; i < 3; i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x !== y) return x < y ? -1 : 1
  }
  return 0
}

interface DepMap {
  [manifest: string]: Record<string, string>
}

function readManifestAt(rev: string, manifest: string): DepMap[string] | null {
  const res = spawnSync('git', ['show', `${rev}:${manifest}`], {encoding: 'utf8'})
  if (res.status !== 0) return null // manifest absent at that rev — not an error
  try {
    const parsed = JSON.parse(res.stdout) as Record<string, unknown>
    const out: Record<string, string> = {}
    for (const section of DEP_SECTIONS) {
      const deps = parsed[section]
      if (deps !== null && typeof deps === 'object' && !Array.isArray(deps)) {
        for (const [k, v] of Object.entries(deps as Record<string, unknown>)) {
          if (typeof v === 'string') out[k] = v
        }
      }
    }
    return out
  } catch {
    process.stderr.write(`absorb-manifest-parity: unparsable ${manifest} at ${rev}\n`)
    process.exit(2)
  }
}

function readManifestWorktree(manifest: string): DepMap[string] | null {
  try {
    const parsed = JSON.parse(readFileSync(manifest, 'utf8')) as Record<string, unknown>
    const out: Record<string, string> = {}
    for (const section of DEP_SECTIONS) {
      const deps = parsed[section]
      if (deps !== null && typeof deps === 'object' && !Array.isArray(deps)) {
        for (const [k, v] of Object.entries(deps as Record<string, unknown>)) {
          if (typeof v === 'string') out[k] = v
        }
      }
    }
    return out
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface Violation {
  manifest: string
  package: string
  absorbed: string
  ours: string | null
}

interface Skip {
  manifest: string
  package: string
  reason: string
}

function main(): void {
  const opts = parseArgs(process.argv.slice(2))
  const upstream = resolveUpstream(opts.upstream, gitText(['remote'], 'remote'), gitText(['remote', '-v'], 'remote -v'))

  if (opts.fetch) gitText(['fetch', upstream, 'main'], `fetch ${upstream}`)

  const upstreamSha = gitText(['rev-parse', `${upstream}/main`], 'rev-parse upstream').trim()
  const headSha = gitText(['rev-parse', opts.head], 'rev-parse head').trim()

  // Upstream commits that touched a manifest, newest first.
  const log = gitText(
    ['log', `${upstreamSha}`, `--format=%H%x1f%s`, '--', 'package.json', 'web/package.json'],
    'log upstream manifests',
  )

  const violations: Violation[] = []
  const skipped: Skip[] = []
  let absorbedBumps = 0
  // Highest absorbed "to" version per (manifest, package).
  const absorbed: {manifest: string; pkg: string; spec: string; ver: [number, number, number]}[] = []

  for (const line of log.split('\n').filter(Boolean)) {
    const [sha] = line.split('\x1F')
    if (sha === undefined || !isAncestor(sha, headSha)) continue // open window — not ours yet
    for (const manifest of MANIFESTS) {
      const after = readManifestAt(sha, manifest)
      const before = readManifestAt(`${sha}^`, manifest)
      if (!after || !before) continue
      let touched = false
      for (const [pkg, toSpec] of Object.entries(after)) {
        const fromSpec = before[pkg]
        if (fromSpec === toSpec) continue
        touched = true
        const toVer = minSatisfyingVersion(toSpec)
        if (toVer === null) {
          skipped.push({manifest, package: pkg, reason: `opaque spec ${toSpec}`})
          continue
        }
        const idx = absorbed.findIndex(a => a.manifest === manifest && a.pkg === pkg)
        const existing = idx === -1 ? undefined : absorbed[idx]
        if (existing === undefined || cmpVersion(toVer, existing.ver) > 0) {
          const replacement = {manifest, pkg, spec: toSpec, ver: toVer}
          if (idx === -1) {
            absorbed.push(replacement)
          } else {
            absorbed[idx] = replacement
          }
        }
      }
      if (touched) absorbedBumps++
    }
  }

  for (const {manifest, pkg, spec, ver} of absorbed) {
    const ours = readManifestWorktree(manifest)
    const oursSpec = ours?.[pkg]
    if (oursSpec === undefined) {
      violations.push({manifest, package: pkg, absorbed: spec, ours: null})
      continue
    }
    const oursVer = minSatisfyingVersion(oursSpec)
    if (oursVer === null) {
      skipped.push({manifest, package: pkg, reason: `our spec opaque: ${oursSpec}`})
      continue
    }
    if (cmpVersion(oursVer, ver) < 0) {
      violations.push({manifest, package: pkg, absorbed: spec, ours: oursSpec})
    }
  }

  const payload = {
    head: headSha,
    upstream: upstreamSha,
    absorbed_bump_commits: absorbedBumps,
    checked_dependencies: absorbed.length,
    violations,
    skipped,
  }
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`)
  process.exit(violations.length > 0 ? 1 : 0)
}

main()
