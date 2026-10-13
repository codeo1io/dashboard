#!/usr/bin/env node
// Gateway drift tripwire (rm-968; folds the rm-204 rider's deployed-health probe).
//
// READ-ONLY by construction: this script never writes to GitHub. It reads the three
// in-repo gateway pins, compares them against live fro-bot/agent release metadata
// (unauthenticated or GH_TOKEN-authenticated reads), optionally probes the deployed
// gateway's public /operator/health, classifies drift by kind, and reports. Opening
// or closing the deduplicated tracking issues is the WORKFLOW's job
// (.github/workflows/gateway-drift-tripwire.yaml, GITHUB_TOKEN issues:write).
//
// Exit codes: 0 = no drift, 1 = drift found (authoritative signal), 2 = tool error
// (network/parse failure — fail loud on the tool, mirroring base-drift.yaml).
//
// Usage:
//   node scripts/gateway-drift-tripwire.ts                       # live check
//   node scripts/gateway-drift-tripwire.ts --dry-run             # + would-open/close preview
//   node scripts/gateway-drift-tripwire.ts --json out.json       # machine-readable state
//   node scripts/gateway-drift-tripwire.ts --simulate scen.json  # offline fixture state
//   node scripts/gateway-drift-tripwire.ts --health-url https://gateway.example
//   GATEWAY_HEALTH_URL=... node scripts/gateway-drift-tripwire.ts

import {Buffer} from 'node:buffer'
import {readFileSync, writeFileSync} from 'node:fs'
import {dirname, join, resolve} from 'node:path'
import process from 'node:process'
import {fileURLToPath} from 'node:url'

export type DriftKind =
  | 'workflow-pin-stale'
  | 'contract-split-pin'
  | 'stream-pin-split'
  | 'deployed-contract-drift'

export interface AgentPin {
  /** commit sha the workflow pins (fro-bot/agent@<sha>) */
  sha: string
  /** version from the pin comment (# vX.Y.Z) */
  version: string
  file: string
}

export interface DeployedHealth {
  url: string
  ok: boolean
  contractVersion?: string
}

export interface ReleaseEntry {
  tag: string
  publishedAt: string
}

export interface GatewayMetadata {
  latestRelease: ReleaseEntry
  /** recent releases, newest first (used for the releases-behind count) */
  releases: ReleaseEntry[]
  contractAtPin: string
  contractAtLatest: string
}

export interface TripwireState {
  pins: AgentPin[]
  repoContract: string
  streamPin: string
  metadata: GatewayMetadata
  deployed?: DeployedHealth
}

export interface DriftFinding {
  kind: DriftKind
  label: string
  title: string
  body: string
}

/**
 * fro-bot/agent auto-releases land Sunday/Wednesday 20:00 UTC (verified 2026-10-12,
 *  pending-release PR #1799 cadence note). Drift staleness is read in cadence units.
 */
export const RELEASE_CADENCE = 'Sunday/Wednesday 20:00 UTC'

const AGENT_REPO = 'fro-bot/agent'
const CONTRACT_PATH = 'packages/gateway/src/operator-contract/version.ts'

export function parseAgentPins(text: string, file = '.github/workflows/fro-bot.yaml'): AgentPin[] {
  const pins: AgentPin[] = []
  const re = /uses:\s*fro-bot\/agent@([0-9a-f]{40})\s*#\s*(v\d+\.\d+\.\d+)/g
  for (const m of text.matchAll(re)) {
    const sha = m[1]
    const version = m[2]
    if (sha === undefined || version === undefined) continue
    pins.push({sha, version, file})
  }
  // dedupe on sha+version while preserving order
  const seen = new Set<string>()
  return pins.filter(p => {
    const key = `${p.sha}@${p.version}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function parseContractDeclaration(text: string): string | undefined {
  const m = text.match(/OPERATOR_CONTRACT_VERSION\s*=\s*['"]([^'"]+)['"]/)
  return m?.[1]
}

export function parseStreamPin(text: string): string | undefined {
  const m = text.match(/PINNED_CONTRACT_VERSION\s*=\s*['"]([^'"]+)['"]/)
  return m?.[1]
}

/** Compare dotted numeric versions ('1.10.0'). Returns negative if a < b. */
export function compareSemver(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(Number)
  const pb = b.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

/** How many of `releases` (newest first) are newer than `version`. */
export function releasesBehind(releases: ReleaseEntry[], version: string): number {
  let n = 0
  for (const r of releases) {
    if (compareSemver(r.tag, version) > 0) n++
    else break
  }
  return n
}

export function classify(state: TripwireState): DriftFinding[] {
  const findings: DriftFinding[] = []
  const {pins, repoContract, streamPin, metadata, deployed} = state
  const latest = metadata.latestRelease.tag

  // K1: workflow agent pin behind the latest gateway release.
  const stale = pins.filter(p => compareSemver(p.version, latest) < 0)
  if (stale.length > 0) {
    const lines = stale.map(
      p =>
        `- \`${p.file}\`: \`${AGENT_REPO}@${p.sha.slice(0, 12)}…\` pins **${p.version}** ` +
        `(${releasesBehind(metadata.releases, p.version)} release(s) behind latest ${latest})`,
    )
    findings.push({
      kind: 'workflow-pin-stale',
      label: 'gateway-drift:workflow-pin-stale',
      title: `Gateway drift: Fro Bot workflow pins a stale agent release (latest ${latest})`,
      body:
        `The Fro Bot workflow runs a gateway older than the latest release:\n\n${
          lines.join('\n')
        }\n\nStaleness is read in cadence units — ${AGENT_REPO} auto-releases land ` +
        `${RELEASE_CADENCE}, so each release behind is roughly one cadence slot of ` +
        `unadopted contract/behavior change. Refresh the pin when the adoption lane ` +
        `(operator-contract mirror parity) lands.\n`,
    })
  }

  // K2: contract the pinned gateway SPEAKS vs the contract the repo mirrors.
  const contractSplit =
    pins.length > 0 && metadata.contractAtPin !== '' && metadata.contractAtPin !== repoContract
  if (contractSplit) {
    findings.push({
      kind: 'contract-split-pin',
      label: 'gateway-drift:contract-split-pin',
      title: `Gateway drift: pinned gateway speaks contract ${metadata.contractAtPin}, repo mirrors ${repoContract}`,
      body:
        `The Fro Bot workflow pins ${AGENT_REPO} at a release whose operator contract is ` +
        `**${metadata.contractAtPin}**, while this repo's mirror pins ` +
        `**${repoContract}** (\`src/gateway/operator-contract/version.ts\`). Every operator ` +
        `surface that trusts the mirror is describing the wrong live contract. The ` +
        `operator-contract adoption lane (rm-966) owns closing this split.\n`,
    })
  }

  // K3: in-repo split residue between the stream reader pin and the mirror.
  if (streamPin !== '' && streamPin !== repoContract) {
    findings.push({
      kind: 'stream-pin-split',
      label: 'gateway-drift:stream-pin-split',
      title: `Gateway drift: operator-stream.js pins ${streamPin}, mirror pins ${repoContract}`,
      body:
        `\`public/operator-stream.js\` pins **${streamPin}** while ` +
        `\`src/gateway/operator-contract/version.ts\` pins **${repoContract}** — the ` +
        `in-repo three-way split residue. Keep both pins moving together when the ` +
        `adoption lane lands.\n`,
    })
  }

  // K4: deployed gateway speaking something other than the repo mirror (rm-204 rider).
  if (deployed !== undefined && deployed.contractVersion !== undefined && deployed.contractVersion !== repoContract) {
    findings.push({
      kind: 'deployed-contract-drift',
      label: 'gateway-drift:deployed-contract-drift',
      title: `Gateway drift: deployed gateway reports contract ${deployed.contractVersion}, repo mirrors ${repoContract}`,
      body:
        `The deployed gateway's public \`/operator/health\` (\`${deployed.url}\`) reports ` +
        `contract **${deployed.contractVersion}** while this repo mirrors ` +
        `**${repoContract}**. Live operator traffic is on the deployed contract — this ` +
        `is the drift release metadata alone cannot see (deploy lag vs pin lag).\n`,
    })
  }

  return findings
}

export function renderReport(state: TripwireState, findings: DriftFinding[]): string {
  const {pins, repoContract, streamPin, metadata, deployed} = state
  const out: string[] = []
  out.push('gateway drift tripwire (rm-968)')
  out.push('=====================')
  for (const p of pins) {
    out.push(`workflow pin : ${AGENT_REPO}@${p.sha.slice(0, 12)}…  ${p.version}  (${p.file})`)
  }
  out.push(`repo mirror  : contract ${repoContract} (src/gateway/operator-contract/version.ts)`)
  out.push(`stream pin   : contract ${streamPin} (public/operator-stream.js)`)
  out.push(`latest agent : ${metadata.latestRelease.tag} published ${metadata.latestRelease.publishedAt}`)
  out.push(`contract@pin : ${metadata.contractAtPin}`)
  out.push(`contract@latest: ${metadata.contractAtLatest}`)
  if (deployed) {
    out.push(`deployed     : ${deployed.url} -> ok=${deployed.ok} contract=${deployed.contractVersion ?? 'unknown'}`)
  } else {
    out.push('deployed     : not probed (no URL configured, or unreachable — skip-graceful)')
  }
  out.push(`cadence      : agent releases land ${RELEASE_CADENCE}`)
  if (findings.length === 0) {
    out.push('verdict      : GREEN — pins coherent, no drift')
  } else {
    out.push(`verdict      : RED — ${findings.length} drift kind(s):`)
    for (const f of findings) out.push(`  - [${f.kind}] ${f.title}`)
  }
  return out.join('\n')
}

/** The workflow's dedup-issue actions this state would trigger (preview only). */
export function dryRunActions(findings: DriftFinding[]): string[] {
  const actions: string[] = []
  if (findings.length === 0) {
    actions.push('would-close : every open issue labelled gateway-drift:* (green verdict)')
  }
  for (const f of findings) {
    actions.push(`would-open  : [${f.kind}] one issue labelled ${f.label} (dedup: only if none open)`)
  }
  return actions
}

// ---------------------------------------------------------------------------
// live metadata fetchers (GitHub REST, read-only)
// ---------------------------------------------------------------------------

class ToolError extends Error {}

function ghHeaders(token: string | undefined): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'dashboard-gateway-drift-tripwire',
  }
  if (token !== undefined) h.Authorization = `Bearer ${token}`
  return h
}

async function ghJson(path: string, token: string | undefined): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: ghHeaders(token),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new ToolError(`GET ${path} -> HTTP ${res.status}`)
  return (await res.json()) as Record<string, unknown>
}

export async function fetchMetadata(token: string | undefined, pins: AgentPin[]): Promise<GatewayMetadata> {
  const latest = (await ghJson(`/repos/${AGENT_REPO}/releases/latest`, token)) as unknown as {
    tag_name: string
    published_at: string
  }
  const list = (await ghJson(`/repos/${AGENT_REPO}/releases?per_page=30`, token)) as unknown as {
    tag_name: string
    published_at: string
  }[]
  // when multiple pins exist, judge the NEWEST pin (the release the workflow runs)
  const newestPin = pins.reduce<AgentPin | undefined>(
    (acc, p) => (acc === undefined || compareSemver(p.version, acc.version) > 0 ? p : acc),
    undefined,
  )
  const pinRef = newestPin?.sha ?? latest.tag_name
  const contractAt = async (ref: string): Promise<string> => {
    const c = (await ghJson(`/repos/${AGENT_REPO}/contents/${CONTRACT_PATH}?ref=${ref}`, token)) as unknown as {
      content: string
    }
    const text = Buffer.from(c.content.replaceAll(/\s/g, ''), 'base64').toString('utf8')
    const v = parseContractDeclaration(text)
    if (v === undefined || v === '') {
      throw new ToolError(`no OPERATOR_CONTRACT_VERSION in ${CONTRACT_PATH}@${ref}`)
    }
    return v
  }
  return {
    latestRelease: {tag: latest.tag_name, publishedAt: latest.published_at},
    releases: list.map(r => ({tag: r.tag_name, publishedAt: r.published_at})),
    contractAtPin: await contractAt(pinRef),
    contractAtLatest: await contractAt(latest.tag_name),
  }
}

// URL derivation: the gateway host lives in the private marcusrbrown/infra checkout
// (apps/gateway/upstream.json; docs/runbooks/gateway-access.md). Pass it via
// --health-url or GATEWAY_HEALTH_URL; unreachable = skip-graceful, not drift.
export async function probeDeployed(url: string): Promise<DeployedHealth | undefined> {
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/operator/health`, {
      signal: AbortSignal.timeout(5_000),
    })
    if (!res.ok) return {url, ok: false}
    const body = (await res.json()) as {ok?: boolean; contractVersion?: string}
    return {url, ok: body.ok === true, contractVersion: body.contractVersion}
  } catch {
    return undefined // skip-graceful (rm-204 rider: unreachable = not probed, not drift)
  }
}

// ---------------------------------------------------------------------------
// entry point
// ---------------------------------------------------------------------------

interface Flags {
  dryRun: boolean
  jsonOut?: string
  simulate?: string
  healthUrl?: string
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = {dryRun: false}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') flags.dryRun = true
    else if (a === '--json') flags.jsonOut = argv[++i]
    else if (a === '--simulate') flags.simulate = argv[++i]
    else if (a === '--health-url') flags.healthUrl = argv[++i]
    else throw new ToolError(`unknown flag: ${a}`)
  }
  return flags
}

function repoFile(...parts: string[]): string {
  const here = dirname(fileURLToPath(import.meta.url))
  return resolve(join(here, '..', ...parts))
}

async function main(): Promise<number> {
  const flags = parseFlags(process.argv.slice(2))
  let state: TripwireState | undefined
  if (flags.simulate !== undefined) {
    const parsed: unknown = JSON.parse(readFileSync(flags.simulate, 'utf8'))
    state = parsed as TripwireState
  }
  if (state === undefined) {
    const pins = parseAgentPins(readFileSync(repoFile('.github', 'workflows', 'fro-bot.yaml'), 'utf8'))
    const repoContract =
      parseContractDeclaration(
        readFileSync(repoFile('src', 'gateway', 'operator-contract', 'version.ts'), 'utf8'),
      ) ?? ''
    const streamPin =
      parseStreamPin(readFileSync(repoFile('public', 'operator-stream.js'), 'utf8')) ?? ''
    const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN
    const metadata = await fetchMetadata(token, pins)
    const healthUrl = flags.healthUrl ?? process.env.GATEWAY_HEALTH_URL
    const deployed =
      healthUrl !== undefined && healthUrl !== '' ? await probeDeployed(healthUrl) : undefined
    if (healthUrl !== undefined && healthUrl !== '' && deployed === undefined) {
      console.error(`deployed probe unreachable (skip-graceful, not drift): ${healthUrl}`)
    }
    state = {pins, repoContract, streamPin, metadata, deployed}
  }

  const findings = classify(state)
  console.log(renderReport(state, findings))
  if (flags.dryRun) {
    for (const a of dryRunActions(findings)) console.log(a)
  }
  if (flags.jsonOut !== undefined) {
    writeFileSync(
      flags.jsonOut,
      `${JSON.stringify({state, findings, drift: findings.length > 0}, null, 2)}\n`,
    )
    console.log(`json written: ${flags.jsonOut}`)
  }
  return findings.length > 0 ? 1 : 0
}

const isDirectRun =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isDirectRun) {
  main().then(
    rc => process.exit(rc),
    (error: unknown) => {
      console.error(`tripwire tool error (exit 2): ${error instanceof Error ? error.message : String(error)}`)
      process.exit(2)
    },
  )
}
