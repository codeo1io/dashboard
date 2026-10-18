// rm-2063 operator-contract estate tripwire (ROADMAP cycle:3, minted at extension #45 from
// research 2fcfeaa613784cb583470b17dc17d6e7).
//
// Background: fro-bot/agent v0.124.0 (2026-10-18T22:04Z) ships gateway operator contract
// 1.12.0 while this fork pins 1.11.0 in two declarations — src/gateway/operator-contract/version.ts
// (OPERATOR_CONTRACT_VERSION) and public/operator-stream.js (PINNED_CONTRACT_VERSION, with the
// exact-match ready-frame reject). A deployed-gateway upgrade ahead of the fork twin darkens
// /operator BY DESIGN, and no standing signal compared the two sides: the DRIFTED_VERSION unit
// tests prove the close, not the warning, and the releases/latest proxy conflates upstream-latest
// with the deployed estate (the documented 2026-10-15 estate-conflation incident class).
//
// This script compares the OPERATOR_CONTRACT_VERSION at fro-bot/agent's LATEST RELEASE TAG
// against BOTH fork pin declarations read from the checked-out tree (never hardcoded — the
// rm-779 hardcode-desync lesson cve-tripwire encodes for its Dockerfile pin).
//
// Gate semantics (RED-BY-DESIGN while upstream contract > fork pins: that red is the demand for
// the rm-252 port-vs-hold decision, not a regression — see the rm-2063 def and its riders):
//   exit 0  verdict ok          both fork pins equal the upstream latest-release contract
//   exit 1  verdict drift-ahead upstream contract is newer than the pins (port demand)
//           verdict drift-behind pins are newer than the latest upstream release (estate lag — verify)
//           verdict split-pins  the fork's two declarations disagree with each other
//   exit 2  verdict unknown     any fetch/parse failure — NEVER silent-green (fail-visible)
//
// Usage: node scripts/operator-contract-estate.ts [--base-dir <repo root>]
// Optional env: GITHUB_TOKEN (rate-limit-friendly public read; the workflow passes the job token
// with permissions contents:read — no new secrets). Manual confirmation arm for a red verdict:
// the infra-checkout estate read per docs/runbooks/gateway-access.md.

import {appendFileSync, readFileSync, writeFileSync} from 'node:fs'
import {isAbsolute, join} from 'node:path'
import process from 'node:process'

const UPSTREAM_REPO = 'fro-bot/agent'
const UPSTREAM_RELEASES_LATEST_URL = `https://api.github.com/repos/${UPSTREAM_REPO}/releases/latest`
const UPSTREAM_CONTRACT_FILE = 'packages/gateway/src/operator-contract/version.ts'
const FORK_PIN_SERVER = 'src/gateway/operator-contract/version.ts'
const FORK_PIN_CLIENT = 'public/operator-stream.js'

/** Marker so the report names its owning roadmap def like scripts/cve-gate.ts does. */
const OWNING_DEF = 'rm-2063'

const SERVER_PIN_PATTERN = /OPERATOR_CONTRACT_VERSION[^=]*=\s*'([^']+)'/
const CLIENT_PIN_PATTERN = /PINNED_CONTRACT_VERSION\s*=\s*'([^']+)'/
const CONTRACT_VERSION_PATTERN = /^\d+\.\d+\.\d+$/

export type FetchJson = (url: string) => Promise<unknown>
export type FetchText = (url: string) => Promise<string>
export type ReadFileText = (path: string) => string

export class EstateExtractionError extends Error {}

export interface UpstreamGatewaySnapshot {
  readonly releaseTag: string
  readonly contractVersion: string
  readonly fetchedAtIso: string
}

export interface ForkPins {
  readonly serverPin: string
  readonly clientPin: string
}

export type EstateVerdict = 'ok' | 'drift-ahead' | 'drift-behind' | 'split-pins'

export interface EstateResult {
  readonly verdict: EstateVerdict
  readonly releaseTag: string
  readonly upstreamContractVersion: string
  readonly serverPin: string
  readonly clientPin: string
}

export interface EstateOutcome {
  readonly exitCode: number
  readonly verdict: string
  readonly lines: readonly string[]
}

function requireContractVersion(raw: string, source: string): string {
  const match = raw.match(SERVER_PIN_PATTERN)
  const version = match?.[1] ?? ''
  if (!CONTRACT_VERSION_PATTERN.test(version)) {
    throw new EstateExtractionError(`cannot extract OPERATOR_CONTRACT_VERSION from ${source}`)
  }
  return version
}

/** Numeric a.b.c comparison; missing segments count as 0. Returns <0, 0, >0 like strcmp. */
export function compareContractVersions(a: string, b: string): number {
  const pa = a.split('.').map(x => Number.parseInt(x, 10))
  const pb = b.split('.').map(x => Number.parseInt(x, 10))
  for (let i = 0; i < 3; i += 1) {
    const da = pa[i] ?? 0
    const db = pb[i] ?? 0
    if (da !== db) return da - db
  }
  return 0
}

export function readForkPins(readText: ReadFileText, baseDir: string): ForkPins {
  const serverRaw = readText(join(baseDir, FORK_PIN_SERVER))
  const clientRaw = readText(join(baseDir, FORK_PIN_CLIENT))
  const serverMatch = serverRaw.match(SERVER_PIN_PATTERN)?.[1]
  const clientMatch = clientRaw.match(CLIENT_PIN_PATTERN)?.[1]
  if (serverMatch === undefined || !CONTRACT_VERSION_PATTERN.test(serverMatch)) {
    throw new EstateExtractionError(`cannot extract OPERATOR_CONTRACT_VERSION from ${FORK_PIN_SERVER}`)
  }
  if (clientMatch === undefined || !CONTRACT_VERSION_PATTERN.test(clientMatch)) {
    throw new EstateExtractionError(`cannot extract PINNED_CONTRACT_VERSION from ${FORK_PIN_CLIENT}`)
  }
  return {serverPin: serverMatch, clientPin: clientMatch}
}

export async function fetchUpstreamSnapshot(
  fetchJson: FetchJson,
  fetchText: FetchText,
  now: () => Date,
): Promise<UpstreamGatewaySnapshot> {
  const release = await fetchJson(UPSTREAM_RELEASES_LATEST_URL)
  const tag = (release as {tag_name?: unknown}).tag_name
  if (typeof tag !== 'string' || tag.length === 0) {
    throw new EstateExtractionError(`no tag_name at ${UPSTREAM_RELEASES_LATEST_URL}`)
  }
  const rawUrl = `https://raw.githubusercontent.com/${UPSTREAM_REPO}/${tag}/${UPSTREAM_CONTRACT_FILE}`
  const raw = await fetchText(rawUrl)
  return {
    releaseTag: tag,
    contractVersion: requireContractVersion(raw, rawUrl),
    fetchedAtIso: now().toISOString(),
  }
}

export function evaluateEstate(upstream: UpstreamGatewaySnapshot, pins: ForkPins): EstateResult {
  const base = {
    releaseTag: upstream.releaseTag,
    upstreamContractVersion: upstream.contractVersion,
    serverPin: pins.serverPin,
    clientPin: pins.clientPin,
  }
  if (pins.serverPin !== pins.clientPin) return {verdict: 'split-pins', ...base}
  const cmp = compareContractVersions(upstream.contractVersion, pins.serverPin)
  if (cmp === 0) return {verdict: 'ok', ...base}
  return cmp > 0 ? {verdict: 'drift-ahead', ...base} : {verdict: 'drift-behind', ...base}
}

export function buildSummaryLines(result: EstateResult): string[] {
  const arrow =
    result.verdict === 'drift-ahead'
      ? `upstream AHEAD: ${result.upstreamContractVersion} at ${result.releaseTag} > pins ${result.serverPin}`
      : result.verdict === 'drift-behind'
        ? `upstream BEHIND pins: ${result.upstreamContractVersion} at ${result.releaseTag} < pins ${result.serverPin} — verify the estate`
        : result.verdict === 'split-pins'
          ? `fork pins DISAGREE: server ${result.serverPin} vs client ${result.clientPin}`
          : `upstream ${result.upstreamContractVersion} at ${result.releaseTag} == both pins ${result.serverPin}`
  return [
    `## Operator-contract estate (${OWNING_DEF})`,
    '',
    `verdict: ${result.verdict} — ${arrow}`,
    `pins read from tree: ${FORK_PIN_SERVER} + ${FORK_PIN_CLIENT}`,
    'on red, the demand is the rm-252 port-vs-hold decision; manual confirmation arm: infra-checkout estate read per docs/runbooks/gateway-access.md',
    '',
  ]
}

export interface EstateRunOptions {
  readonly baseDir: string
  readonly fetchJson: FetchJson
  readonly fetchText: FetchText
  readonly readText?: ReadFileText
  readonly now?: () => Date
  readonly stepSummaryPath?: string
}

export async function run(options: EstateRunOptions): Promise<EstateOutcome> {
  const readText: ReadFileText = options.readText ?? (path => readFileSync(path, 'utf8'))
  const pins = readForkPins(readText, options.baseDir)
  const upstream = await fetchUpstreamSnapshot(
    options.fetchJson,
    options.fetchText,
    options.now ?? (() => new Date()),
  )
  const result = evaluateEstate(upstream, pins)
  const lines = buildSummaryLines(result)
  const exitCode = result.verdict === 'ok' ? 0 : 1
  if (options.stepSummaryPath !== undefined) {
    try {
      appendFileSync(options.stepSummaryPath, `${lines.join('\n')}\n`)
    } catch {
      writeFileSync(options.stepSummaryPath, `${lines.join('\n')}\n`)
    }
  }
  return {exitCode, verdict: result.verdict, lines}
}

function makeRealFetchers(token: string | undefined): {fetchJson: FetchJson; fetchText: FetchText} {
  const headers: Record<string, string> = {Accept: 'application/vnd.github+json'}
  if (token !== undefined && token.length > 0) headers.Authorization = `Bearer ${token}`
  const fetchText: FetchText = async url => {
    const res = await fetch(url, {headers})
    if (!res.ok) throw new EstateExtractionError(`GET ${url} -> HTTP ${res.status}`)
    return res.text()
  }
  const fetchJson: FetchJson = async url => {
    const text = await fetchText(url)
    try {
      return JSON.parse(text) as unknown
    } catch (error) {
      throw new EstateExtractionError(`GET ${url} -> non-JSON payload (${String(error)})`)
    }
  }
  return {fetchJson, fetchText}
}

async function main(argv: readonly string[]): Promise<number> {
  let baseDir = process.cwd()
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--base-dir') {
      const value = argv[i + 1]
      if (value === undefined) throw new EstateExtractionError('--base-dir requires a path')
      baseDir = isAbsolute(value) ? value : join(process.cwd(), value)
      i += 1
    } else {
      throw new EstateExtractionError(`unknown argument: ${arg}`)
    }
  }
  const outcome = await run({
    baseDir,
    ...makeRealFetchers(process.env.GITHUB_TOKEN),
    stepSummaryPath: process.env.GITHUB_STEP_SUMMARY,
  })
  const block = outcome.lines.join('\n')
  console.log(block)
  if (outcome.exitCode !== 0) {
    const verdictLine = outcome.lines.find(l => l.startsWith('verdict: ')) ?? `verdict: ${outcome.verdict}`
    console.error(`::error::${OWNING_DEF} contract estate ${verdictLine}`)
  }
  return outcome.exitCode
}

function isMainEntryPoint(): boolean {
  const argv1 = process.argv[1]
  if (argv1 === undefined) return false
  return (
    argv1.endsWith('operator-contract-estate.ts') || argv1.endsWith('operator-contract-estate.js')
  ) // rm-702-style argv[1] comparator
}

if (isMainEntryPoint()) {
  main(process.argv.slice(2)).then(
    code => {
      process.exitCode = code
    },
    (error: unknown) => {
      console.error(`::error::${OWNING_DEF} contract estate verdict unknown — ${String(error)}`)
      console.error(`extraction failure; never silent-green (see ${OWNING_DEF} gate semantics)`)
      process.exitCode = 2
    },
  )
}
