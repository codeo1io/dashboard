#!/usr/bin/env node
// registry-matrix.ts — one-shot registry-currency matrix emitter (rm-2204).
//
// Emits a dated JSON + markdown matrix of pinned versions vs live latest for
// every version pin this repository makes:
//   - npm direct dependencies of BOTH manifests (package.json and
//     web/package.json when present) — one dist-tag registry document per
//     package, never per-version calls;
//   - GitHub Actions refs across .github/workflows/*.yaml plus
//     setup/action.yaml (tag or SHA pins, two read-only API documents per
//     action repository: latest release + its tag commit);
//   - Dockerfile base-image digest pins (tag resolves live via one auth
//     handshake + one manifest HEAD per image);
//   - runtime pins: engines.node (vs the nodejs/Release schedule document)
//     and packageManager bun (vs oven-sh/bun latest release).
//
// Currency semantics per row: `current` = the pin admits / equals the live
// latest; `stale` = live latest is outside the pin; `unknown` = the pin form
// cannot be resolved (exotic npm range, unpinned, unresolvable digest) OR the
// probe itself failed — a failed probe ALSO sets `latest: null` (a named null
// cell, never a silent skip).
//
// Exit codes: report mode exits 0 even with stale rows (currency decisions
// are made by a human or a later phase, not by this script). `--strict`
// exits nonzero ONLY when a probe failed (any `latest: null` row) — i.e. the
// matrix is incomplete and must not be trusted as evidence.
//
// Test seams: REGISTRY_MATRIX_NOW (ISO timestamp override for
// `generated_at`), REGISTRY_MATRIX_TIMEOUT_MS (per-probe fetch timeout,
// default 10000). The schema validator is exported and pinned by
// test/registry-matrix-guard.test.ts against a committed fixture.
//
// Read-only by construction: GET/HEAD requests only, no tokens, no writes
// outside the explicit --json/--markdown paths.

import {createWriteStream, existsSync, readdirSync, readFileSync, realpathSync} from 'node:fs'
import {dirname, join} from 'node:path'
import process from 'node:process'
import {fileURLToPath} from 'node:url'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// ---------------------------------------------------------------------------
// Schema (registry-matrix/v1) — pinned by the guard test.
// ---------------------------------------------------------------------------

export type RowKind = 'npm' | 'action' | 'docker' | 'runtime'
export type RowStatus = 'current' | 'stale' | 'unknown'

export interface MatrixRow {
  kind: RowKind
  name: string
  pinned: string
  latest: string | null
  status: RowStatus
  detail: string
}

export interface CurrencyMatrix {
  schema: 'registry-matrix/v1'
  generated_at: string
  strict: boolean
  rows: MatrixRow[]
  summary: {
    total: number
    current: number
    stale: number
    unknown: number
    probe_failures: number
  }
}

export class MatrixSchemaError extends Error {}

const ROW_KINDS: readonly RowKind[] = ['npm', 'action', 'docker', 'runtime']
const ROW_STATUSES: readonly RowStatus[] = ['current', 'stale', 'unknown']

/**
 * Validate a registry-matrix/v1 document. Throws MatrixSchemaError with a
 *  named reason on any violation; returns the matrix for chaining.
 */
export function validateMatrix(value: unknown): CurrencyMatrix {
  const fail = (reason: string): never => {
    throw new MatrixSchemaError(`registry-matrix/v1: ${reason}`)
  }
  if (typeof value !== 'object' || value === null) fail('document is not an object')
  const m = value as Record<string, unknown>
  if (m.schema !== 'registry-matrix/v1') fail('schema literal mismatch')
  if (typeof m.generated_at !== 'string' || Number.isNaN(Date.parse(m.generated_at))) {
    fail('generated_at is not an ISO timestamp')
  }
  if (typeof m.strict !== 'boolean') fail('strict is not a boolean')
  const rawRows = m.rows
  if (!Array.isArray(rawRows)) fail('rows is not an array')
  const rows: MatrixRow[] = []
  let current = 0
  let stale = 0
  let unknown = 0
  let probeFailures = 0
  for (const [index, raw] of rawRows.entries()) {
    if (typeof raw !== 'object' || raw === null) fail(`rows[${index}] is not an object`)
    const r = raw as Record<string, unknown>
    for (const field of ['kind', 'name', 'pinned', 'latest', 'status', 'detail'] as const) {
      if (!(field in r)) fail(`rows[${index}] missing ${field}`)
    }
    if (!ROW_KINDS.includes(r.kind as RowKind)) fail(`rows[${index}].kind invalid`)
    if (typeof r.name !== 'string' || r.name === '') fail(`rows[${index}].name invalid`)
    if (typeof r.pinned !== 'string' || r.pinned === '') fail(`rows[${index}].pinned invalid`)
    if (r.latest !== null && typeof r.latest !== 'string') fail(`rows[${index}].latest invalid`)
    if (!ROW_STATUSES.includes(r.status as RowStatus)) fail(`rows[${index}].status invalid`)
    if (typeof r.detail !== 'string') fail(`rows[${index}].detail invalid`)
    const row = {
      kind: r.kind as RowKind,
      name: r.name as string,
      pinned: r.pinned as string,
      latest: r.latest as string | null,
      status: r.status as RowStatus,
      detail: r.detail as string,
    }
    if (row.latest === null && row.status !== 'unknown') {
      fail(`rows[${index}] null cell (failed probe) must carry status unknown`)
    }
    if (row.status === 'unknown' && row.latest === null) {
      if (!/probe failed/i.test(row.detail)) {
        fail(`rows[${index}] null cell detail must name the probe failure`)
      }
      probeFailures++
    }
    if (row.status === 'current') current++
    else if (row.status === 'stale') stale++
    else unknown++
    rows.push(row)
  }
  if (typeof m.summary !== 'object' || m.summary === null) fail('summary missing')
  const s = m.summary as Record<string, unknown>
  for (const field of ['total', 'current', 'stale', 'unknown', 'probe_failures'] as const) {
    if (typeof s[field] !== 'number') fail(`summary.${field} is not a number`)
  }
  if (s.total !== rows.length) fail('summary.total does not match rows')
  if (s.current !== current || s.stale !== stale || s.unknown !== unknown) {
    fail('summary status counts do not match rows')
  }
  if (s.probe_failures !== probeFailures) {
    fail('summary.probe_failures does not match null cells')
  }
  return {
    schema: 'registry-matrix/v1',
    generated_at: m.generated_at as string,
    strict: m.strict as boolean,
    rows,
    summary: {
      total: rows.length,
      current,
      stale,
      unknown,
      probe_failures: probeFailures,
    },
  }
}

// ---------------------------------------------------------------------------
// Minimal semver: compare two versions and test whether a version satisfies
// the common range forms this repo pins (^, ~, >=, >, <, <=, =, exact,
// space-separated AND, *). Returns null for forms we do not resolve.
// Prerelease comparison is approximate (numeric segments numerically, others
// lexically) — good enough for a currency report, not a resolver.
// ---------------------------------------------------------------------------

function parseVersion(v: string): number[] | null {
  const m = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:[-+].+)?$/.exec(v)
  if (!m) return null
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

function cmpVersion(a: string, b: string): number {
  const va = parseVersion(a)
  const vb = parseVersion(b)
  if (!va || !vb) return a === b ? 0 : NaN
  for (let i = 0; i < 3; i++) {
    if (va[i]! < vb[i]!) return -1
    if (va[i]! > vb[i]!) return 1
  }
  return 0
}

/** true | false | null (unsupported range form) */
export function satisfies(version: string, range: string): boolean | null {
  const v = parseVersion(version)
  if (!v) return null
  for (const clause of range.split(/\s*\|\|\s*/)) {
    const parts = clause.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) continue
    let clauseOk = true
    let supported = true
    for (const part of parts) {
      const m = /^([\^~]|>=|<=|[><=])?\s*([0x*]|[1-9]\d*)(?:\.([0x*]|[1-9]\d*))?(?:\.([0x*]|[1-9]\d*))?(?:[-+].+)?$/i.exec(part)
      if (!m) {
        supported = false
        break
      }
      const op = m[1] ?? '='
      const maj = m[2] === undefined || m[2] === 'x' || m[2] === '*' ? null : Number(m[2])
      const min = m[3] === undefined || m[3] === 'x' || m[3] === '*' ? null : Number(m[3])
      const pat = m[4] === undefined || m[4] === 'x' || m[4] === '*' ? null : Number(m[4])
      if (maj === null) continue // '*' admits anything
      let lower: string
      let upperOp: '<' | null
      let upper: string | null
      if (op === '^') {
        lower = pat === null ? `${maj}.${min ?? 0}.${pat ?? 0}` : `${maj}.${min}.${pat}`
        if (maj === 0) {
          upper = min === null ? null : `0.${min + 1}.0`
          upperOp = '<'
        } else {
          upper = `${maj + 1}.0.0`
          upperOp = '<'
        }
      } else if (op === '~') {
        lower = pat === null ? `${maj}.${min ?? 0}.${pat ?? 0}` : `${maj}.${min}.${pat}`
        upper = min === null ? null : `${maj}.${min + 1}.0`
        upperOp = '<'
      } else {
        lower = `${maj}.${min ?? 0}.${pat ?? 0}`
        upper = null
        upperOp = null
        if (min === null || pat === null) {
          // bare major / major.minor comparators
          if (op === '=') {
            upper = min === null ? `${maj + 1}.0.0` : `${maj}.${min + 1}.0`
            upperOp = '<'
          } else if ((op === '>=' || op === '>') && pat === null && min !== null) {
            lower = `${maj}.${min + (op === '>' ? 1 : 0)}.0`
          }
        }
      }
      const below = cmpVersion(version, lower)
      if (Number.isNaN(below)) {
        supported = false
        break
      }
      if (op === '>=' && below < 0) clauseOk = false
      else if (op === '>' && below <= 0) clauseOk = false
      else if (op === '<' && below >= 0) clauseOk = false
      else if (op === '<=' && below > 0) clauseOk = false
      else if (op === '=' && below !== 0) clauseOk = false
      else if ((op === '^' || op === '~') && below < 0) clauseOk = false
      if (upper && upperOp === '<' && cmpVersion(version, upper) >= 0) clauseOk = false
      if (!clauseOk) break
    }
    if (!supported) return null
    if (clauseOk) return true
  }
  return false
}

// ---------------------------------------------------------------------------
// Static pin readers (file tree).
// ---------------------------------------------------------------------------

interface NpmPin {
  name: string
  range: string
  manifest: string
}

function readNpmPins(): NpmPin[] {
  const manifests = ['package.json', 'web/package.json'].filter(p => existsSync(join(REPO_ROOT, p)))
  const pins = new Map<string, NpmPin>()
  for (const manifest of manifests) {
    const parsed = JSON.parse(readFileSync(join(REPO_ROOT, manifest), 'utf8')) as Record<string, Record<string, string>>
    for (const section of ['dependencies', 'devDependencies', 'optionalDependencies'] as const) {
      for (const [name, range] of Object.entries(parsed[section] ?? {})) {
        if (!pins.has(name)) pins.set(name, {name, range, manifest})
      }
    }
  }
  return [...pins.values()].sort((a, b) => a.name.localeCompare(b.name))
}

interface ActionRef {
  repo: string
  ref: string
}

function readActionRefs(): ActionRef[] {
  const files = [
    ...readdirSync(join(REPO_ROOT, '.github/workflows'))
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
      .map(f => join('.github/workflows', f)),
    ...(existsSync(join(REPO_ROOT, 'setup/action.yaml')) ? ['setup/action.yaml'] : []),
  ]
  const refs = new Map<string, ActionRef>()
  for (const file of files) {
    const text = readFileSync(join(REPO_ROOT, file), 'utf8')
    for (const m of text.matchAll(/uses:\s*([\w.-]+\/[\w./-]+)@([\w.-]+)/g)) {
      const repo = m[1]!
      const ref = m[2]!
      const key = `${repo}@${ref}`
      if (!refs.has(key)) refs.set(key, {repo, ref})
    }
  }
  return [...refs.values()].sort((a, b) => a.repo.localeCompare(b.repo) || a.ref.localeCompare(b.ref))
}

interface DockerPin {
  image: string
  tag: string
  digest: string
}

function readDockerPins(): DockerPin[] {
  const text = readFileSync(join(REPO_ROOT, 'Dockerfile'), 'utf8')
  const pins = new Map<string, DockerPin>()
  for (const m of text.matchAll(/^ARG\s+\w+=(?:[\w./-]+:)?([\w./-]+)@sha256:([0-9a-f]{64})/gm)) {
    const full = m[0].split('=', 2)[1] ?? ''
    const [image = '', tag = ''] = (full.split('@', 1)[0] ?? '').split(':')
    const key = `${image}:${m[1]}`
    if (!pins.has(key)) pins.set(key, {image, tag, digest: m[2] ?? ''})
  }
  for (const m of text.matchAll(/^FROM\s+(?:--platform=\$\{BUILDPLATFORM\}\s+)?([\w./-]+):([\w.-]+)@sha256:([0-9a-f]{64})/gm)) {
    const key = `${m[1]}:${m[2]}`
    if (!pins.has(key)) pins.set(key, {image: m[1]!, tag: m[2]!, digest: m[3]!})
  }
  return [...pins.values()].sort((a, b) => a.image.localeCompare(b.image))
}

// ---------------------------------------------------------------------------
// Read-only probes. Every probe catches its own failure and returns null —
// a null result becomes a named null cell, never a crash and never a skip.
// ---------------------------------------------------------------------------

const TIMEOUT_MS = Number(process.env.REGISTRY_MATRIX_TIMEOUT_MS ?? 10000)

async function getJson(url: string, headers: Record<string, string> = {}): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      headers: {accept: 'application/json', ...headers},
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!response.ok) return null
    return (await response.json())
  } catch {
    return null
  }
}

async function npmDistTag(name: string): Promise<string | null> {
  const doc = (await getJson(`https://registry.npmjs.org/-/package/${encodeURIComponent(name)}/dist-tags`)) as
    | {latest?: string}
    | null
  return doc?.latest ?? null
}

async function ghLatestRelease(repo: string): Promise<string | null> {
  const doc = (await getJson(`https://api.github.com/repos/${repo}/releases/latest`)) as
    | {tag_name?: string}
    | null
  return doc?.tag_name ?? null
}

async function ghTagCommit(repo: string, tag: string): Promise<string | null> {
  const doc = (await getJson(`https://api.github.com/repos/${repo}/commits/${encodeURIComponent(tag)}`)) as
    | {sha?: string}
    | null
  return doc?.sha ?? null
}

interface NodeScheduleEntry {
  start?: string
  lts?: string
  maintenance?: string
  end?: string
}

async function nodeSchedule(major: number): Promise<NodeScheduleEntry | null> {
  const doc = (await getJson('https://raw.githubusercontent.com/nodejs/Release/main/schedule.json')) as
    | Record<string, NodeScheduleEntry>
    | null
  return doc?.[`v${major}`] ?? null
}

async function dockerDigest(image: string, tag: string): Promise<string | null> {
  try {
    const repo = image.includes('/') ? image : `library/${image}`
    const tokenDoc = (await getJson(
      `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${repo}:pull`,
    )) as {token?: string} | null
    const token = tokenDoc?.token
    if (token === undefined || token.length === 0) return null
    const response = await fetch(`https://registry-1.docker.io/v2/${repo}/manifests/${tag}`, {
      method: 'HEAD',
      headers: {
        authorization: `Bearer ${token}`,
        accept:
          'application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const digest = response.headers.get('docker-content-digest')
    if (!response.ok || digest === null || digest.length === 0) return null
    return digest.replace(/^sha256:/, '')
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Row builders.
// ---------------------------------------------------------------------------

function npmRow(pin: NpmPin, latest: string | null, failure: string | null): MatrixRow {
  if (latest === null) {
    return {
      kind: 'npm',
      name: pin.name,
      pinned: pin.range,
      latest: null,
      status: 'unknown',
      detail: `probe failed: ${failure ?? 'registry dist-tag document unavailable'}`,
    }
  }
  const holds = satisfies(latest, pin.range)
  if (holds === null) {
    return {
      kind: 'npm',
      name: pin.name,
      pinned: pin.range,
      latest,
      status: 'unknown',
      detail: `unsupported range form (${pin.manifest})`,
    }
  }
  return {
    kind: 'npm',
    name: pin.name,
    pinned: pin.range,
    latest,
    status: holds ? 'current' : 'stale',
    detail: holds ? `latest satisfies ${pin.range} (${pin.manifest})` : `latest outside ${pin.range} (${pin.manifest})`,
  }
}

function actionRow(
  ref: ActionRef,
  latestTag: string | null,
  latestTagSha: string | null,
): MatrixRow {
  const isSha = /^[0-9a-f]{40}$/.test(ref.ref) || /^[0-9a-f]{64}$/.test(ref.ref)
  const base = {kind: 'action' as const, name: ref.repo, pinned: ref.ref}
  if (latestTag === null) {
    return {
      ...base,
      latest: null,
      status: 'unknown',
      detail: 'probe failed: latest release document unavailable',
    }
  }
  if (isSha) {
    if (latestTagSha === null) {
      return {
        ...base,
        latest: latestTag,
        status: 'unknown',
        detail: `sha-pinned; latest release ${latestTag} (tag commit probe failed)`,
      }
    }
    const same = ref.ref === latestTagSha
    return {
      ...base,
      latest: latestTagSha,
      status: same ? 'current' : 'stale',
      detail: same
        ? `pinned sha is latest release ${latestTag}`
        : `pinned sha predates latest release ${latestTag}`,
    }
  }
  const same = ref.ref === latestTag
  return {
    ...base,
    latest: latestTag,
    status: same ? 'current' : 'stale',
    detail: same ? 'pinned ref is latest release' : `pinned ref predates latest release ${latestTag}`,
  }
}

function dockerRow(pin: DockerPin, liveDigest: string | null): MatrixRow {
  if (liveDigest === null) {
    return {
      kind: 'docker',
      name: `${pin.image}:${pin.tag}`,
      pinned: `sha256:${pin.digest.slice(0, 12)}…`,
      latest: null,
      status: 'unknown',
      detail: 'probe failed: live manifest digest unavailable',
    }
  }
  const same = pin.digest === liveDigest
  return {
    kind: 'docker',
    name: `${pin.image}:${pin.tag}`,
    pinned: `sha256:${pin.digest.slice(0, 12)}…`,
    latest: `sha256:${liveDigest.slice(0, 12)}…`,
    status: same ? 'current' : 'stale',
    detail: same ? 'digest matches live tag' : 'tag moved past pinned digest',
  }
}

function nodeRow(pinned: string, entry: NodeScheduleEntry | null): MatrixRow {
  if (entry === null) {
    return {
      kind: 'runtime',
      name: 'node',
      pinned,
      latest: null,
      status: 'unknown',
      detail: 'probe failed: nodejs/Release schedule document unavailable',
    }
  }
  const now = Date.parse(process.env.REGISTRY_MATRIX_NOW ?? new Date().toISOString())
  const maintenance = entry.maintenance !== undefined ? Date.parse(entry.maintenance) : null
  const end = entry.end !== undefined ? Date.parse(entry.end) : null
  if (end !== null && now >= end) {
    return {
      kind: 'runtime',
      name: 'node',
      pinned,
      latest: `end ${entry.end!}`,
      status: 'stale',
      detail: `v-line ended ${entry.end!} (lts ${entry.lts ?? 'n/a'})`,
    }
  }
  return {
    kind: 'runtime',
    name: 'node',
    pinned,
    latest: maintenance === null ? `lts ${entry.lts ?? 'n/a'}` : `maintenance ${entry.maintenance!}`,
    status: 'current',
    detail: `schedule ${JSON.stringify(entry)}; active until ${entry.end ?? 'unknown'}`,
  }
}

function bunRow(pinned: string, latestTag: string | null): MatrixRow {
  if (latestTag === null) {
    return {
      kind: 'runtime',
      name: 'bun',
      pinned,
      latest: null,
      status: 'unknown',
      detail: 'probe failed: oven-sh/bun latest release unavailable',
    }
  }
  const pinnedVersion = pinned.replace(/^bun@/, '')
  const latestVersion = latestTag.replace(/^bun-v/, '').replace(/^v/, '')
  const same = pinnedVersion === latestVersion
  return {
    kind: 'runtime',
    name: 'bun',
    pinned,
    latest: latestTag,
    status: same ? 'current' : 'stale',
    detail: same ? 'pinned packageManager is latest release' : `latest release is ${latestTag}`,
  }
}

// ---------------------------------------------------------------------------
// Orchestration.
// ---------------------------------------------------------------------------

function summarize(rows: MatrixRow[]): CurrencyMatrix['summary'] {
  return {
    total: rows.length,
    current: rows.filter(r => r.status === 'current').length,
    stale: rows.filter(r => r.status === 'stale').length,
    unknown: rows.filter(r => r.status === 'unknown').length,
    probe_failures: rows.filter(r => r.latest === null).length,
  }
}

async function buildMatrix(strict: boolean): Promise<CurrencyMatrix> {
  const rows: MatrixRow[] = []

  for (const pin of readNpmPins()) {
    const latest = await npmDistTag(pin.name)
    rows.push(npmRow(pin, latest, latest === null ? 'dist-tag GET failed' : null))
  }

  const actionRefs = readActionRefs()
  const repoCache = new Map<string, {latestTag: string | null; latestTagSha: string | null}>()
  for (const ref of actionRefs) {
    let cached = repoCache.get(ref.repo)
    if (!cached) {
      const latestTag = await ghLatestRelease(ref.repo)
      const latestTagSha = latestTag === null ? null : await ghTagCommit(ref.repo, latestTag)
      cached = {latestTag, latestTagSha}
      repoCache.set(ref.repo, cached)
    }
    rows.push(actionRow(ref, cached.latestTag, cached.latestTagSha))
  }

  for (const pin of readDockerPins()) {
    rows.push(dockerRow(pin, await dockerDigest(pin.image, pin.tag)))
  }

  const rootManifest = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as {
    engines?: {node?: string}
    packageManager?: string
  }
  const nodeMajor = Number((/^(\d+)/.exec(rootManifest.engines?.node ?? '24') ?? [])[1] ?? 24)
  rows.push(nodeRow(rootManifest.engines?.node ?? '>=24', await nodeSchedule(nodeMajor)))
  if (rootManifest.packageManager !== undefined) {
    rows.push(bunRow(rootManifest.packageManager, await ghLatestRelease('oven-sh/bun')))
  }

  rows.sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name) || a.pinned.localeCompare(b.pinned))
  return {
    schema: 'registry-matrix/v1',
    generated_at: process.env.REGISTRY_MATRIX_NOW ?? new Date().toISOString(),
    strict,
    rows,
    summary: summarize(rows),
  }
}

function renderMarkdown(matrix: CurrencyMatrix): string {
  const lines: string[] = [
    `# Registry currency matrix — ${matrix.generated_at}`,
    '',
    `Total ${matrix.summary.total} pins · current ${matrix.summary.current} · stale ${matrix.summary.stale} · unknown ${matrix.summary.unknown} · probe failures ${matrix.summary.probe_failures}`,
    '',
    '| kind | name | pinned | latest | status | detail |',
    '| --- | --- | --- | --- | --- | --- |',
  ]
  for (const r of matrix.rows) {
    lines.push(
      `| ${r.kind} | \`${r.name}\` | \`${r.pinned}\` | ${r.latest === null ? '`null`' : `\`${r.latest}\``} | ${r.status} | ${r.detail} |`,
    )
  }
  return `${lines.join('\n')}\n`
}

async function writeStream(path: string, text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const stream = createWriteStream(path)
    stream.on('error', reject)
    stream.on('finish', resolve)
    stream.write(text)
    stream.end()
  })
}

function usage(): never {
  console.error(
    'usage: node scripts/registry-matrix.ts [--strict] [--json <path>] [--markdown <path>]',
  )
  process.exit(2)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  let strict = false
  let jsonPath: string | null = null
  let markdownPath: string | null = null
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg === '--strict') strict = true
    else if (arg === '--json') jsonPath = args[++i] ?? usage()
    else if (arg === '--markdown') markdownPath = args[++i] ?? usage()
    else usage()
  }
  const matrix = await buildMatrix(strict)
  const validated = validateMatrix(matrix)
  const markdown = renderMarkdown(validated)
  if (jsonPath !== undefined) await writeStream(jsonPath, `${JSON.stringify(validated, null, 2)}\n`)
  if (markdownPath !== undefined) await writeStream(markdownPath, markdown)
  if (jsonPath === undefined && markdownPath === undefined) console.log(markdown)
  console.error(
    `registry-matrix: ${validated.summary.total} pins, ${validated.summary.current} current, ${validated.summary.stale} stale, ${validated.summary.unknown} unknown, ${validated.summary.probe_failures} probe failures`,
  )
  if (strict && validated.summary.probe_failures > 0) {
    console.error('registry-matrix: --strict — matrix is incomplete (probe failures above), failing')
    process.exit(1)
  }
}

const invokedDirectly =
  process.argv[1] !== undefined && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
if (invokedDirectly) {
  await main()
}
