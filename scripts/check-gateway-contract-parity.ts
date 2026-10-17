/**
 * rm-1493 gateway contract-parity + pin-lag tripwire — alert-only.
 *
 * Origin: 2026-10-16, run 74d2adff. The dashboard vendors the operator wire
 * contract twice (src/gateway/operator-contract/version.ts for the server-side
 * parsers, public/operator-stream.js for the browser stream client) while
 * fro-bot.yaml deploys the real gateway from a pinned fro-bot/agent release.
 * Nothing tied those three together: at birth this check went red over the
 * live drift — fork pins 1.9.0 vs agent v0.122.1 shipping 1.11.0 (the rm-252
 * absorb window), with the pin already lagging the latest agent tag.
 *
 * What it resolves and compares (alert-only — it never writes anything):
 * - the two fork contract pins (which must agree with each other);
 * - the contract shipped by the workflow-pinned agent release (read at the
 *   pinned SHA, so a stale `# vX.Y.Z` comment cannot mask what actually
 *   deploys);
 * - the contract shipped by the latest agent release (pin-lag tripwire;
 *   the tip includes prereleases, so a prerelease-only agent release still
 *   counts as lag);
 *
 * Red (exit 1): fork pins disagree, fork pins differ from the contract the
 * pinned agent ships, or the latest agent ships a different contract than the
 * pin (the next pin bump must carry a contract absorb). Warn-only (exit 0): a
 * plain tag lag whose contract is unchanged. Exit 2: resolution failure
 * (missing pin — including a workflow carrying a second agent pin, which is
 * refused instead of silently checking the first, unparseable file,
 * API/transport error).
 *
 * Scheduled weekly by .github/workflows/upstream-drift.yaml (contract-parity
 * job, a sibling of the commit-count watch — never a required check). Offline
 * self-test: pass --agent-contract/--latest-tag/--latest-contract together to
 * skip the API (test/check-gateway-contract-parity.test.ts proves the red
 * birth state and a synthetic matched-pair green without network).
 */
import {Buffer} from 'node:buffer'
import {readFileSync} from 'node:fs'
import {basename, join} from 'node:path'
import process from 'node:process'
import {pathToFileURL} from 'node:url'

const AGENT_REPO = 'fro-bot/agent'
const AGENT_CONTRACT_PATH = 'packages/gateway/src/operator-contract/version.ts'

const FORK_VERSION_FILE = join('src', 'gateway', 'operator-contract', 'version.ts')
const FORK_STREAM_FILE = join('public', 'operator-stream.js')
const AGENT_PIN_FILE = join('.github', 'workflows', 'fro-bot.yaml')

const OPERATOR_CONTRACT_PATTERN = /export const OPERATOR_CONTRACT_VERSION = '([^']+)'/
const PINNED_CONTRACT_PATTERN = /export const PINNED_CONTRACT_VERSION = '([^']+)'/
const AGENT_PIN_PATTERN = /uses:\s*fro-bot\/agent@([0-9a-f]{7,40})(?:\s*#\s*(v\S+))?/

/** A resolution failure (unreadable/malformed source of truth) — exit 2. */
export class ParityResolutionError extends Error {}

export interface ForkPins {
  readonly versionContract: string
  readonly streamContract: string
  readonly agentPinSha: string
  readonly agentPinTag: string
}

export interface ParityInputs {
  readonly versionContract: string
  readonly streamContract: string
  readonly agentPinSha: string
  readonly agentPinTag: string
  readonly agentContractAtPin: string
  readonly latestTag: string
  readonly agentContractAtLatest: string
}

export interface ParityFinding {
  readonly level: 'red' | 'warn' | 'ok'
  readonly message: string
}

function readOrThrow(root: string, relativePath: string): string {
  try {
    return readFileSync(join(root, relativePath), 'utf8')
  } catch {
    throw new ParityResolutionError(`cannot read ${join(root, relativePath)} — run from the repository root (or pass --root)`)
  }
}

/** Extract the two vendored contract pins and the workflow's agent pin. */
export function readForkPins(root: string): ForkPins {
  const versionMatch = OPERATOR_CONTRACT_PATTERN.exec(readOrThrow(root, FORK_VERSION_FILE))
  const versionContract = versionMatch?.[1]
  if (versionMatch === null || versionContract === undefined) {
    throw new ParityResolutionError(`no OPERATOR_CONTRACT_VERSION export found in ${basename(FORK_VERSION_FILE)}`)
  }
  const streamMatch = PINNED_CONTRACT_PATTERN.exec(readOrThrow(root, FORK_STREAM_FILE))
  const streamContract = streamMatch?.[1]
  if (streamMatch === null || streamContract === undefined) {
    throw new ParityResolutionError(`no PINNED_CONTRACT_VERSION export found in ${basename(FORK_STREAM_FILE)}`)
  }
  const pinBody = readOrThrow(root, AGENT_PIN_FILE)
  const pinMatches = Array.from(
    pinBody.matchAll(new RegExp(AGENT_PIN_PATTERN.source, 'g')),
  )
  if (pinMatches.length > 1) {
    throw new ParityResolutionError(
      `${pinMatches.length} 'uses: fro-bot/agent@<sha>' pins found in ${basename(AGENT_PIN_FILE)} — exactly one deployment surface is checked; pin any second surface deliberately (together with the first, or behind its own check) instead of letting the first silently stand in for it`,
    )
  }
  const agentPinSha = pinMatches[0]?.[1]
  const agentPinTag = pinMatches[0]?.[2]
  if (agentPinSha === undefined || agentPinTag === undefined) {
    throw new ParityResolutionError(`no 'fro-bot/agent@<sha> # vX.Y.Z' pin found in ${basename(AGENT_PIN_FILE)} — keep the version comment, it feeds the pin-lag report`)
  }
  return {
    versionContract,
    streamContract,
    agentPinSha,
    agentPinTag,
  }
}

function requireContract(body: unknown, ref: string): string {
  const content = body as {content?: unknown; encoding?: unknown; message?: unknown} | null
  if (typeof content?.message === 'string' && content.content === undefined) {
    throw new ParityResolutionError(`API error for ${AGENT_REPO}@${ref}: ${content.message}`)
  }
  if (content?.encoding !== 'base64' || typeof content.content !== 'string') {
    throw new ParityResolutionError(`unexpected contents-API shape for ${AGENT_CONTRACT_PATH}@${ref}`)
  }
  const decoded = Buffer.from(content.content.replaceAll('\n', ''), 'base64').toString('utf8')
  const match = OPERATOR_CONTRACT_PATTERN.exec(decoded)
  const contract = match?.[1]
  if (match === null || contract === undefined) {
    throw new ParityResolutionError(`no OPERATOR_CONTRACT_VERSION export in ${AGENT_REPO}'s ${AGENT_CONTRACT_PATH}@${ref} — the agent-side path moved`)
  }
  return contract
}

/** The contract version shipped by the agent repo at a ref (release tag or SHA). */
export async function fetchAgentContractAt(ref: string, token: string): Promise<string> {
  const url = `https://api.github.com/repos/${AGENT_REPO}/contents/${AGENT_CONTRACT_PATH}?ref=${encodeURIComponent(ref)}`
  let res: Response
  try {
    res = await fetch(url, {
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': 'dashboard-contract-parity',
        ...(token === '' ? {} : {authorization: `Bearer ${token}`}),
      },
    })
  } catch (error) {
    throw new ParityResolutionError(`transport failure reading ${AGENT_CONTRACT_PATH}@${ref}: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (res.status === 404) {
    throw new ParityResolutionError(`no ${AGENT_CONTRACT_PATH} at ${AGENT_REPO}@${ref} (404) — ref or agent-side path is wrong`)
  }
  if (!res.ok) {
    throw new ParityResolutionError(`HTTP ${res.status} reading ${AGENT_CONTRACT_PATH}@${ref}`)
  }
  return requireContract(await res.json(), ref)
}

/**
 * First usable tag on a `/releases` page: prereleases count as the tip
 * (created-at ordering is server-side); drafts never appear to unauthenticated
 * readers.
 */
export function newestReleaseTag(releases: unknown): string {
  if (!Array.isArray(releases)) {
    throw new ParityResolutionError(`unexpected (non-list) releases payload for ${AGENT_REPO}`)
  }
  for (const release of releases) {
    if (typeof release !== 'object' || release === null) {
      continue
    }
    const tag = (release as {tag_name?: unknown}).tag_name
    if (typeof tag === 'string' && tag !== '') {
      return tag
    }
  }
  throw new ParityResolutionError(`no published release listed for ${AGENT_REPO}`)
}

/** The newest agent release tag (prereleases included — see newestReleaseTag). */
export async function fetchLatestAgentTag(token: string): Promise<string> {
  let res: Response
  try {
    res = await fetch(`https://api.github.com/repos/${AGENT_REPO}/releases?per_page=10`, {
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': 'dashboard-contract-parity',
        ...(token === '' ? {} : {authorization: `Bearer ${token}`}),
      },
    })
  } catch (error) {
    throw new ParityResolutionError(`transport failure reading ${AGENT_REPO} releases: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (!res.ok) {
    throw new ParityResolutionError(`HTTP ${res.status} reading ${AGENT_REPO} releases`)
  }
  return newestReleaseTag(await res.json())
}

/** The decision table. Pure: same inputs, same findings, no IO. */
export function evaluateParity(inputs: ParityInputs): ParityFinding[] {
  const findings: ParityFinding[] = []
  const pinLabel = `${inputs.agentPinTag} (${inputs.agentPinSha.slice(0, 7)})`

  if (inputs.versionContract !== inputs.streamContract) {
    findings.push({
      level: 'red',
      message: `fork's two contract pins disagree: ${basename(FORK_VERSION_FILE)} says ${inputs.versionContract}, ${basename(FORK_STREAM_FILE)} says ${inputs.streamContract} — one is stale`,
    })
  }

  if (inputs.versionContract !== inputs.agentContractAtPin) {
    findings.push({
      level: 'red',
      message: `dashboard pins operator contract ${inputs.versionContract} but the deployed agent ${pinLabel} ships ${inputs.agentContractAtPin} — the vendored contract and the gateway disagree (rm-252 absorb window)`,
    })
  }

  if (inputs.agentContractAtPin !== inputs.agentContractAtLatest) {
    findings.push({
      level: 'red',
      message: `contract moved past the pin: latest agent ${inputs.latestTag} ships ${inputs.agentContractAtLatest} while the pin ${pinLabel} ships ${inputs.agentContractAtPin} — the next pin bump must carry a contract absorb`,
    })
  }

  if (inputs.agentPinTag !== inputs.latestTag && inputs.agentContractAtPin === inputs.agentContractAtLatest) {
    findings.push({
      level: 'warn',
      message: `agent pin lag: workflow pins ${inputs.agentPinTag}, latest is ${inputs.latestTag} (contract unchanged at ${inputs.agentContractAtPin}) — bump when convenient`,
    })
  }

  if (findings.length === 0) {
    findings.push({
      level: 'ok',
      message: `contract parity holds: dashboard ${inputs.versionContract} == agent pin ${inputs.agentPinTag} (${inputs.agentContractAtPin}) == agent latest ${inputs.latestTag} (${inputs.agentContractAtLatest})`,
    })
  }

  return findings
}

export interface CheckOptions {
  readonly root?: string
  readonly token?: string
  /** Offline overrides — all three together, or none. */
  readonly agentContractAtPin?: string
  readonly latestTag?: string
  readonly agentContractAtLatest?: string
  /** Where the markdown summary is appended (test seam; default: $GITHUB_STEP_SUMMARY). */
  readonly stepSummaryFile?: string
  readonly print?: (line: string) => void
}

export interface CheckResult {
  readonly findings: readonly ParityFinding[]
  readonly exitCode: number
  readonly markdownLines: readonly string[]
}

export async function runCheck(options: CheckOptions): Promise<CheckResult> {
  const overridesCount = [options.agentContractAtPin, options.latestTag, options.agentContractAtLatest].filter(value => value !== undefined).length
  if (overridesCount !== 0 && overridesCount !== 3) {
    throw new ParityResolutionError('--agent-contract, --latest-tag and --latest-contract override the API together — pass all three or none')
  }

  const pins = readForkPins(options.root ?? process.cwd())
  const offline = overridesCount === 3
  const token = options.token ?? ''

  const agentContractAtPin = offline ? options.agentContractAtPin as string : await fetchAgentContractAt(pins.agentPinSha, token)
  const latestTag = offline ? options.latestTag as string : await fetchLatestAgentTag(token)
  const agentContractAtLatest = offline ? options.agentContractAtLatest as string : await fetchAgentContractAt(latestTag, token)

  const findings = evaluateParity({...pins, agentContractAtPin, latestTag, agentContractAtLatest})

  const markdownLines = [
    '## Gateway contract parity (rm-1493)',
    '',
    '| surface | contract |',
    '| --- | --- |',
    `| dashboard ${basename(FORK_VERSION_FILE)} | ${pins.versionContract} |`,
    `| dashboard ${basename(FORK_STREAM_FILE)} | ${pins.streamContract} |`,
    `| agent @ pin ${pins.agentPinTag} (${pins.agentPinSha.slice(0, 7)}) | ${agentContractAtPin} |`,
    `| agent @ latest ${latestTag} | ${agentContractAtLatest} |`,
    '',
    ...findings.map(finding => `- ${finding.level === 'red' ? '🔴' : finding.level === 'warn' ? '🟡' : '🟢'} ${finding.message}`),
  ]

  const print = options.print ?? ((line: string) => console.log(line))
  for (const line of markdownLines) print(line)

  const summaryFile = options.stepSummaryFile ?? process.env.GITHUB_STEP_SUMMARY
  if (summaryFile !== undefined && summaryFile !== '') {
    const {appendFileSync} = await import('node:fs')
    appendFileSync(summaryFile, `${markdownLines.join('\n')}\n`)
  }

  const red = findings.some(finding => finding.level === 'red')
  if (red) {
    print('::error title=Gateway contract parity (rm-1493)::dashboard↔agent contract parity is broken — see summary')
  }
  return {findings, exitCode: red ? 1 : 0, markdownLines}
}

interface CliOptions extends CheckOptions {}

function parseArgs(argv: readonly string[]): CliOptions {
  const options: {root?: string; agentContractAtPin?: string; latestTag?: string; agentContractAtLatest?: string} = {}
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = argv[index + 1]
    if (arg === '--root' && next !== undefined) {
      options.root = next
      index += 1
    } else if (arg === '--agent-contract' && next !== undefined) {
      options.agentContractAtPin = next
      index += 1
    } else if (arg === '--latest-tag' && next !== undefined) {
      options.latestTag = next
      index += 1
    } else if (arg === '--latest-contract' && next !== undefined) {
      options.agentContractAtLatest = next
      index += 1
    } else if (arg === '--help' || arg === '-h') {
      return {}
    } else {
      throw new ParityResolutionError(`unknown or incomplete argument: ${arg} (usage: --root <dir> | --agent-contract <v> --latest-tag <t> --latest-contract <v>)`)
    }
  }
  return options
}

async function main(): Promise<void> {
  let options: CliOptions
  try {
    options = parseArgs(process.argv)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(2)
  }

  try {
    const result = await runCheck({...options, token: process.env.GITHUB_TOKEN ?? ''})
    process.exit(result.exitCode)
  } catch (error) {
    console.error(`contract-parity: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(2)
  }
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href
if (invokedDirectly) {
  await main()
}
