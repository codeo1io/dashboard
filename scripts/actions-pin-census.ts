#!/usr/bin/env node
// scripts/actions-pin-census.ts
//
// Out-of-band Actions pin census (rm-1931, run 65d41c1b9f8e4c63aad7a7588d4cad09).
//
// Companions scripts/actions-darkness-watch.ts (rm-1411): that probe watches
// run-creation darkness; this one watches the OTHER thing that silently rots
// while Actions is dark — the workflow action pins themselves. Dependabot and
// every CI lane are gated on the same dead runner surface, so digest drift and
// stale version comments accumulate invisibly. This script reads the workflow
// tree locally and needs no CI lane.
//
// Verdict semantics (same OK/UNKNOWN/DRIFT ladder as the darkness watch):
//   GREEN  exit 0 — every uses pin is digest-pinned with a full
//          major.minor.patch version comment, one digest per action, and (in
//          --online mode) each digest matches that action's latest release.
//   STALE  exit 1 — pin structure is sound but a comment is missing, not
//          full-semver (bare major like v6), or inconsistent across sites.
//   DRIFT  exit 3 — structural drift: a pin without a digest, a split pin
//          (same action pinned at two digests), or (--online) an in-tree
//          digest that no longer matches the action's latest release.
//   UNKNOWN exit 2 reserved for unreadable inputs (never emitted in offline
//          mode; the tree is always readable or the script crashes).
//
// Usage:
//   node scripts/actions-pin-census.ts            # offline structural census
//   node scripts/actions-pin-census.ts --online   # + latest-release drift
//
// Environment:
//   ACTIONS_PIN_CENSUS_ROOT   Workflows dir override (default
//                             .github/workflows). Test seam.
//   ACTIONS_PIN_CENSUS_TOKEN  Optional GitHub token for --online reads
//                             (falls back to unauthenticated rate limits).
//   GITHUB_TOKEN              Fallback if ACTIONS_PIN_CENSUS_TOKEN is unset.
//
// --online resolves each action's latest release via api.github.com and the
// tag's commit digest (annotated tags are dereferenced). Network failure in
// --online mode degrades to the offline census with a STALE exit and an
// explicit note — it never fails open to GREEN.

import {readdirSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'
import {fileURLToPath} from 'node:url'

const WORKFLOW_FILE_RE = /\.ya?ml$/
const COMPOSITE_NAME = 'action.yaml'
const USES_LINE_RE = /^\s*(?:-\s+)?uses:\s*([^\s#]+)/
const DIGEST_RE = /^[0-9a-f]{40}$/
const VERSION_RE = /^v\d+\.\d+\.\d+$/

export interface PinSighting {
  file: string
  line: number
  action: string
  ref: string
  comment: string
}

export type PinIssueKind =
  | 'unpinned'
  | 'split-pin'
  | 'digest-drift'
  | 'missing-comment'
  | 'bare-comment'
  | 'inconsistent-comment'
  | 'comment-mismatch'
  | 'unresolved'

export interface PinIssue {
  kind: PinIssueKind
  action: string
  detail: string
}

export interface CensusResult {
  verdict: 'GREEN' | 'STALE' | 'DRIFT'
  issues: PinIssue[]
  online?: boolean
}

/** Extract every `uses:` sighting from one workflow file's text. */
export function collectPins(
  text: string,
  file: string,
): PinSighting[] {
  const pins: PinSighting[] = []
  const lines = text.split('\n')
  for (const [i, line] of lines.entries()) {
    const match = USES_LINE_RE.exec(line)
    if (!match) continue
    const pin = match[1]
    if (pin === undefined) continue
    if (pin.startsWith('docker://')) continue
    const [action, ref] = pin.split('@')
    if (action === undefined || ref === undefined || ref === '') continue
    // The comment is everything after the first '#' following the pin token;
    // parsed positionally so the regex itself stays linear (no exchangeable
    // quantifiers — eslint regexp/no-super-linear-backtracking).
    const after = line.slice(match[0].length)
    const hash = after.indexOf('#')
    pins.push({
      file,
      line: i + 1,
      action,
      ref,
      comment: hash === -1 ? '' : after.slice(hash + 1).trim(),
    })
  }
  return pins
}

function isDigest(ref: string): boolean {
  return DIGEST_RE.test(ref)
}

function commentVersion(comment: string): string | null {
  return VERSION_RE.test(comment) ? comment : null
}

/**
 * Offline structural census over all sightings: digest presence, one digest
 * per action, and comment completeness/truth-format per site.
 */
export function evaluateCensus(sightings: PinSighting[]): CensusResult {
  const issues: PinIssue[] = []
  const byAction = new Map<string, PinSighting[]>()
  for (const sighting of sightings) {
    const group = byAction.get(sighting.action) ?? []
    group.push(sighting)
    byAction.set(sighting.action, group)
  }

  for (const [action, group] of byAction) {
    const digests = new Set(group.map(s => s.ref))
    if (group.some(s => !isDigest(s.ref))) {
      const unpinned = group.filter(s => !isDigest(s.ref))
      issues.push({
        kind: 'unpinned',
        action,
        detail: unpinned.map(s => `${s.file}:${s.line} ref ${s.ref}`).join(', '),
      })
    } else if (digests.size > 1) {
      issues.push({
        kind: 'split-pin',
        action,
        detail: [...digests].map(d => `${d} (${group.filter(s => s.ref === d).length} sites)`).join(' | '),
      })
    }

    const comments = new Set(group.map(s => s.comment))
    if (comments.has('')) {
      const bare = group.filter(s => s.comment === '')
      issues.push({
        kind: 'missing-comment',
        action,
        detail: bare.map(s => `${s.file}:${s.line}`).join(', '),
      })
    }
    for (const comment of comments) {
      if (comment !== '' && commentVersion(comment) === null) {
        const sites = group.filter(s => s.comment === comment)
        issues.push({
          kind: 'bare-comment',
          action,
          detail: `comment ${comment || '(empty)'} at ${sites.map(s => `${s.file}:${s.line}`).join(', ')}`,
        })
      }
    }
    if (comments.size > 1) {
      issues.push({
        kind: 'inconsistent-comment',
        action,
        detail: [...comments].join(' | '),
      })
    }
  }

  const drift = issues.some(issue => issue.kind === 'unpinned' || issue.kind === 'split-pin' || issue.kind === 'digest-drift')
  return {verdict: drift ? 'DRIFT' : issues.length > 0 ? 'STALE' : 'GREEN', issues}
}

/**
 * Pick the highest semver tag on the same major line as the pinned comment
 * (repos like github/codeql-action dual-track `v4.39.0` action tags and
 * `codeql-bundle-v*` bundle releases; `releases/latest` flips between the
 * lines and would false-DRIFT a current pin).
 */
export function pickLatestLineTag(tags: string[], major: number): string | null {
  const onLine = tags.filter(tag => new RegExp(String.raw`^v${major}\.\d+\.\d+$`).test(tag))
  if (onLine.length === 0) return null
  return [...onLine].sort((a, b) => {
    const pa = a.slice(1).split('.').map(Number)
    const pb = b.slice(1).split('.').map(Number)
    return (pb[0] ?? 0) - (pa[0] ?? 0) || (pb[1] ?? 0) - (pa[1] ?? 0) || (pb[2] ?? 0) - (pa[2] ?? 0)
  })[0] ?? null
}

export interface LatestRelease {
  action: string
  tag: string
  digest: string
}

/** Compare one action's in-tree state against its latest release. */
export function compareWithLatest(
  action: string,
  digests: string[],
  comments: string[],
  latest: LatestRelease,
): PinIssue[] {
  const issues: PinIssue[] = []
  const digest = digests[0] ?? ''
  if (digest !== latest.digest) {
    issues.push({
      kind: 'digest-drift',
      action,
      detail: `in-tree ${digest.slice(0, 12)} vs latest ${latest.tag} ${latest.digest.slice(0, 12)}`,
    })
  } else if (!comments.includes(latest.tag)) {
    issues.push({
      kind: 'comment-mismatch',
      action,
      detail: `digest is latest but comments ${JSON.stringify(comments)} do not name ${latest.tag}`,
    })
  }
  return issues
}

async function fetchJson(url: string, token?: string): Promise<unknown> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'actions-pin-census',
  }
  if (token !== undefined && token !== '') headers.Authorization = `Bearer ${token}`
  const response = await fetch(url, {headers})
  if (!response.ok) {
    throw new Error(`GET ${url} -> ${response.status}`)
  }
  return response.json()
}

/** Resolve an action's latest release tag and its commit digest. */
export async function resolveLatest(
  action: string,
  token?: string,
  majorHint?: number,
): Promise<LatestRelease> {
  const repo = action.split('/').slice(0, 2).join('/')
  let tag: string | null = null
  if (majorHint !== undefined) {
    const tags = (await fetchJson(
      `https://api.github.com/repos/${repo}/tags?per_page=100`,
      token,
    )) as {name?: string}[]
    tag = pickLatestLineTag(tags.map(entry => entry.name ?? ''), majorHint)
  }
  if (tag === null) {
    const release = (await fetchJson(
      `https://api.github.com/repos/${repo}/releases/latest`,
      token,
    )) as {tag_name?: string}
    const tagName = release.tag_name ?? ''
    if (tagName === '') {
      throw new Error(`${repo}: latest release has no tag_name`)
    }
    tag = tagName
  }
  const ref = (await fetchJson(
    `https://api.github.com/repos/${repo}/git/ref/tags/${tag}`,
    token,
  )) as {object?: {sha?: string; type?: string; url?: string}}
  const object = ref.object
  const sha = object?.sha ?? ''
  if (sha === '') {
    throw new Error(`${repo}: tag ${tag} has no sha`)
  }
  if (object?.type === 'tag' && object?.url !== undefined) {
    const tagObject = (await fetchJson(object.url, token)) as {
      object?: {sha?: string}
    }
    const commitSha = tagObject.object?.sha ?? ''
    if (commitSha === '') {
      throw new Error(`${repo}: annotated tag ${tag} has no commit sha`)
    }
    return {action, tag, digest: commitSha}
  }
  return {action, tag, digest: sha}
}

function walkYamls(root: string): string[] {
  const out: string[] = []
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, {withFileTypes: true})) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.isFile()) {
        const rel = full.slice(root.length + 1)
        const inWorkflows = rel.split(/[\\/]/)[0] === 'workflows' && !rel.slice('workflows/'.length).includes('/')
        const isComposite = entry.name === COMPOSITE_NAME
        if ((inWorkflows && WORKFLOW_FILE_RE.test(entry.name)) || isComposite) {
          out.push(rel)
        }
      }
    }
  }
  walk(root)
  return out.sort()
}

function workflowFiles(root: string): string[] {
  return walkYamls(root)
}

export function exitFor(result: CensusResult): number {
  if (result.verdict === 'DRIFT') return 3
  if (result.verdict === 'STALE') return 1
  return 0
}

function report(result: CensusResult): void {
  const mode = result.online ? 'online' : 'offline'
  process.stdout.write(`actions pin census (${mode}): ${result.verdict}\n`)
  for (const issue of result.issues) {
    process.stdout.write(`  [${issue.kind}] ${issue.action}: ${issue.detail}\n`)
  }
  if (result.issues.length === 0) {
    process.stdout.write('  all uses pins digest-pinned with true full-semver comments\n')
  }
}

async function main(): Promise<number> {
  const online = process.argv.includes('--online')
  const root = process.env.ACTIONS_PIN_CENSUS_ROOT ??
    join(fileURLToPath(new URL('.', import.meta.url)), '..', '.github')
  const files = workflowFiles(root)
  const sightings: PinSighting[] = []
  for (const file of files) {
    sightings.push(...collectPins(readFileSync(join(root, file), 'utf8'), file))
  }

  const census = evaluateCensus(sightings)
  if (!online) {
    report(census)
    return exitFor(census)
  }

  const token = process.env.ACTIONS_PIN_CENSUS_TOKEN ?? process.env.GITHUB_TOKEN
  const digestsByAction = new Map<string, string[]>()
  const commentsByAction = new Map<string, string[]>()
  for (const sighting of sightings) {
    const digests = digestsByAction.get(sighting.action) ?? []
    const comments = commentsByAction.get(sighting.action) ?? []
    digests.push(sighting.ref)
    comments.push(sighting.comment)
    digestsByAction.set(sighting.action, digests)
    commentsByAction.set(sighting.action, comments)
  }

  const issues = [...census.issues]
  let networkFailed = false
  for (const action of digestsByAction.keys()) {
    const comments = commentsByAction.get(action) ?? []
    const majorMatch = comments
      .map(comment => /^v(\d+)\./.exec(comment))
      .find(match => match !== null)
    const majorHint = majorMatch ? Number(majorMatch[1]) : undefined
    try {
      const latest = await resolveLatest(action, token, majorHint)
      issues.push(...compareWithLatest(
        action,
        digestsByAction.get(action) ?? [],
        commentsByAction.get(action) ?? [],
        latest,
      ))
    } catch (error) {
      networkFailed = true
      issues.push({
        kind: 'unresolved',
        action,
        detail: `latest-release resolution failed (${String(error)})`,
      })
    }
  }
  const drift = issues.some(issue =>
    issue.kind === 'unpinned' || issue.kind === 'split-pin' || issue.kind === 'digest-drift')
  const verdict = drift ? 'DRIFT' : issues.length > 0 ? 'STALE' : 'GREEN'
  const result: CensusResult = {verdict, issues, online: true}
  if (networkFailed) {
    process.stdout.write('note: some latest-release resolutions failed; degraded to offline-plus-stale\n')
  }
  report(result)
  return exitFor(result)
}

const invokedDirectly = process.argv[1] !== undefined &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
if (invokedDirectly) {
  main().then(code => process.exit(code), error => {
    process.stderr.write(`${String(error)}\n`)
    process.exit(2)
  })
}
