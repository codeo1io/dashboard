#!/usr/bin/env node
/**
 * absorb-verify — dependency-parity gate for absorbed upstream windows (rm-1972).
 *
 * WHY THIS EXISTS. PR #644 bumped `@hono/node-server` to 2.1.5 lockfile-only
 * and was absorbed via union-merge; the landing kept the commit (8d867b9b is
 * an ancestor of main today) while the fork tip still resolves 2.1.3 — a
 * silent dependency drop with no failing check anywhere. The class is not
 * hypothetical: the moment this gate was scoped, upstream merged #647
 * (react 19.3.1), a second dep-bump PR awaiting absorb.
 *
 * WHAT IT CHECKS. Given an absorbed window (a base..upstream range), every
 * dependency that changed in that window — in EITHER the manifest specifier
 * OR the root-importer lockfile resolution — must have survived into our
 * side: the manifest specifier equal when the window moved it, and the
 * lockfile resolution equal when the window moved it. The lockfile leg is
 * not optional polish: PR #644 was a lockfile-only bump (the manifest spec
 * stayed '^2.0.0' throughout), so a manifest-only diff would never have
 * caught the exact drop this gate was minted for. Upstream-ADDED
 * dependencies must exist on our side at all. The comparison never consults
 * the registry — it compares trees, so it is deterministic and offline.
 *
 * OUTPUT. A JSON payload on stdout with one probe line per dependency
 * (rm-1972's integrate-evidence probe line), and exit codes mirroring
 * scripts/absorb-window.ts:
 *   0 — every window dependency survived (an empty window is a true clean
 *       result, not indeterminacy)
 *   3 — indeterminate, fail-closed: unreadable manifest/lockfile (fork
 *       side), missing refs — nothing was concluded
 *   4 — hard failure: at least one RESOLUTION_DROP / SPECIFIER_DRIFT /
 *       MISSING / NOT_INSTALLED verdict
 *   1 — usage error
 *
 * USAGE
 *   node scripts/absorb-verify.ts --upstream <ref> [--base <ref>] [--ours-ref <ref>]
 *
 *   --upstream <ref>   required: the upstream tip the window was absorbed
 *                      from (any committish; refs/remotes/... works)
 *   --base <ref>       optional: window base; defaults to
 *                      `git merge-base HEAD <upstream>`
 *   --ours-ref <ref>   optional: read our manifest AND lockfile from this
 *                      ref (post-landing evidence, e.g. origin/main).
 *                      Default: the working tree — uncommitted cures are
 *                      exactly what a pre-landing run wants to verify.
 *
 * CONVENTION RIDE. rm-252 names this script a required absorb step: run it
 * in the absorb worktree before folding, and again against the landed tip in
 * the integrate evidence. The regression it must keep catching is pinned in
 * test/absorb-verify.test.ts: upstream ^2.1.5 vs ours 2.1.3 (the recorded
 * 8d867b9b drop shape).
 *
 * rm-2060 (SHIPPED HERE). Two extensions:
 *
 * 1. Bun windows. Windows spanning upstream 2d791a52 (#648, pnpm -> Bun)
 *    no longer fail-close: an ABSENT upstream pnpm-lock.yaml at the window
 *    tip is a first-class "Bun window" state. The gate then enforces
 *    manifest parity plus fork-side installability (our lock resolutions)
 *    and skips upstream resolution parity, which is no longer derivable;
 *    lockfile-only-bump detection is skipped with an explicit note. The
 *    fork's own lockfile remains mandatory (its absence still fail-closes).
 *
 * 2. AHEAD/never-absorb allowlist. AHEAD_ALLOWLIST below records deliberate
 *    fork divergences (the kept pnpm-lock.yaml, the packageManager field,
 *    the wiki capability class) so they are cited instead of tripping the
 *    gate. Dependency-class entries exempt a dependency check from
 *    MISSING/SPECIFIER_DRIFT/NOT_INSTALLED with a visible ALLOWLISTED
 *    annotation in the probe line and payload — no silent skips. A
 *    RESOLUTION_DROP is deliberately NEVER exempted: that is the PR #644
 *    silent-drop class this gate was born from, and an allowlist entry
 *    asserts intent at the manifest level, not a license to drop
 *    resolutions silently. path- and manifest-field-class entries are
 *    citation-only (payload notes): the gate's red set stays exactly the
 *    dependency verdicts.
 *
 * The Bun window is detected STRUCTURALLY — a pnpm-lock.yaml deletion event
 * (--diff-filter=D) inside the window, or the lockfile absent on both ends
 * (post-migration steady state) — never by a hardcoded sha, so fixtures and
 * any future package-manager migration verify the same way the live window
 * does. An absent tip lockfile with NO deletion event in the window while
 * the base carries one is an unexplained absence and still fail-closes.
 */

import {spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import process from 'node:process'

import {parseDocument} from 'yaml'

const EXIT_USAGE = 1
const EXIT_EMPTY = 3
const EXIT_ERROR = 4

/** A deliberate fork divergence that must not fail the gate (rm-2060). */
export interface AheadEntry {
  readonly kind: 'path' | 'manifest-field' | 'dependency'
  readonly pattern: string
  readonly since: string
  readonly reason: string
}

/**
 * The AHEAD/never-absorb allowlist vocabulary. Entries are cited by the
 * Bun-window handling (pnpm-lock.yaml) and consulted by the dependency
 * check (dependency-class entries); future deliberate divergences append
 * here instead of scattering one-off exclusions. The exemption path is
 * pinned by test/absorb-verify.test.ts with a spliced variant copy of this
 * script — the CLI's main flow runs at import, so there is no in-process
 * seam to mutate the array from a test.
 */
export const AHEAD_ALLOWLIST: AheadEntry[] = [
  {
    kind: 'path',
    pattern: 'pnpm-lock.yaml',
    since: '2d791a52',
    reason: '#648 standing exclusion: upstream migrated to Bun and deleted its lockfile; the fork keeps pnpm by policy',
  },
  {
    kind: 'manifest-field',
    pattern: 'packageManager',
    since: '2d791a52',
    reason: '#648: upstream pins bun@1.4.3 while the fork pins pnpm by standing policy',
  },
  {
    kind: 'path',
    pattern: 'wiki/**',
    since: 'PR #498',
    reason: 'upstream repository-editing (wiki) capability is never-absorb under the read-only invariant (rm-259 disposition)',
  },
]

/** Dependency-class lookup: does an allowlist entry exempt `name`? */
export function allowlistedDependency(name: string): AheadEntry | undefined {
  return AHEAD_ALLOWLIST.find(entry => entry.kind === 'dependency' && entry.pattern === name)
}

type Section = 'dependencies' | 'devDependencies'

/** Verdicts, one per changed window dependency. */
type Verdict = 'OK' | 'RESOLUTION_DROP' | 'SPECIFIER_DRIFT' | 'MISSING' | 'NOT_INSTALLED'

interface Manifest {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  packageManager?: string
}

interface LockfileEntry {
  specifier?: string
  version?: string
}

interface LockfileImporter {
  dependencies?: Record<string, LockfileEntry>
  devDependencies?: Record<string, LockfileEntry>
}

interface Lockfile {
  importers?: Record<string, LockfileImporter>
}

interface DependencyCheck {
  name: string
  section: Section
  /** Upstream manifest specifier before the window ('' when added/absent). */
  from: string
  /** Upstream specifier after the window — the PR's target as written. */
  target: string
  /** Upstream lockfile resolution after the window ('' when none). */
  target_version: string
  ours_specifier: string
  ours_resolution: string
  verdict: Verdict
  /** rm-2060: true when an AHEAD dependency entry exempted this check. */
  allowlisted?: boolean
  allowlist_reason?: string
  /** Subject of the upstream commit that introduced this change. */
  bump_commit: string
}

interface Payload {
  window: {base: string; upstream: string; ours: string}
  /** rm-2060: true when the window spans the upstream pnpm→Bun lockfile absence. */
  bun_window: boolean
  dep_bump_commits: {sha: string; subject: string}[]
  checks: DependencyCheck[]
  probe_lines: string[]
  /** rm-2060: bun-window mode and AHEAD citations, human-readable. */
  notes: string[]
  ok: boolean
}

// ---------------------------------------------------------------------------
// Argument parsing (absorb-window.ts's grammar: hard exit on bad usage)
// ---------------------------------------------------------------------------

interface Options {
  upstream?: string
  base?: string
  oursRef?: string
}

function failUsage(message: string): never {
  process.stderr.write(`ERROR: ${message}\n`)
  process.stderr.write(
    'usage: node scripts/absorb-verify.ts --upstream <ref> [--base <ref>] [--ours-ref <ref>]\n',
  )
  process.exit(EXIT_USAGE)
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--upstream' || arg === '--base' || arg === '--ours-ref') {
      const value = argv[i + 1]
      if (value === undefined) failUsage(`${arg} expects a value`)
      if (arg === '--upstream') opts.upstream = value
      else if (arg === '--base') opts.base = value
      else opts.oursRef = value
      i++
    } else {
      failUsage(`unknown argument '${arg}'`)
    }
  }
  return opts
}

// ---------------------------------------------------------------------------
// Git plumbing — every failure is fail-closed indeterminacy (exit 3), never
// a silent pass
// ---------------------------------------------------------------------------

function failClosed(message: string): never {
  process.stderr.write(`ERROR: ${message} (fail-closed)\n`)
  process.exit(EXIT_EMPTY)
}

function runGit(args: string[]): string {
  const result = spawnSync('git', args, {encoding: 'utf8'})
  if (result.status !== 0) {
    failClosed(`git ${args.join(' ')} failed: ${(result.stderr ?? '').trim()}`)
  }
  return result.stdout ?? ''
}

function revParse(ref: string): string {
  return runGit(['rev-parse', '--verify', `${ref}^{commit}`]).trim()
}

function showFile(ref: string, path: string): string {
  return runGit(['show', `${ref}:${path}`])
}

/** Does `path` exist in `ref`'s tree? (rm-2060: lockfile absence is a state, not an error.) */
function refHasFile(ref: string, path: string): boolean {
  return spawnSync('git', ['cat-file', '-e', `${ref}:${path}`]).status === 0
}

/** showFile that tolerates absence — undefined when `path` is not in `ref`'s tree. */
function showFileIfExists(ref: string, path: string): string | undefined {
  return refHasFile(ref, path) ? showFile(ref, path) : undefined
}

// ---------------------------------------------------------------------------
// Manifest / lockfile parsing
// ---------------------------------------------------------------------------

function parseManifest(text: string, source: string): Manifest {
  try {
    return JSON.parse(text) as Manifest
  } catch {
    failClosed(`${source} is not valid JSON`)
  }
}

function parseLockfile(text: string, source: string): Lockfile {
  const document = parseDocument(text)
  if (document.errors.length > 0) {
    failClosed(`${source} is not valid YAML`)
  }
  return document.toJS({maxAliasCount: -1}) as Lockfile
}

function manifestEntries(
  manifest: Manifest,
): Map<string, {section: Section; specifier: string}> {
  const map = new Map<string, {section: Section; specifier: string}>()
  const sections: Section[] = ['dependencies', 'devDependencies']
  for (const section of sections) {
    const table = manifest[section]
    if (table === undefined) continue
    for (const [name, specifier] of Object.entries(table)) {
      // A dep listed in both sections is a manifest bug; record it once,
      // under the runtime section.
      if (section === 'devDependencies' && map.has(name)) continue
      map.set(name, {section, specifier})
    }
  }
  return map
}

/**
 * Root-importer lockfile resolutions: name -> resolved version.
 * pnpm peer-suffixes ('16.3.3(react@19.3.1)') are stripped: a dependency
 * whose own version did not move must not be flagged because its PEERS did
 * (the react 19.3.1 window would otherwise red-flag @testing-library/react
 * at the same 16.3.3).
 */
function importerResolutions(lockfile: Lockfile): Map<string, string> {
  const map = new Map<string, string>()
  const importer = lockfile.importers?.['.']
  if (importer === undefined) return map
  for (const table of [importer.dependencies, importer.devDependencies]) {
    if (table === undefined) continue
    for (const [name, entry] of Object.entries(table)) {
      if (entry?.version !== undefined && !map.has(name)) {
        map.set(name, entry.version.replace(/\(.*\)$/, ''))
      }
    }
  }
  return map
}

/** Root-importer lockfile resolution for a dependency ('' when absent). */
function oursResolution(lockfile: Lockfile, name: string, section: Section): string {
  const importer = lockfile.importers?.['.']
  if (importer === undefined) return ''
  const table = section === 'devDependencies' ? importer.devDependencies : importer.dependencies
  return (table?.[name]?.version ?? '').replace(/\(.*\)$/, '')
}

// ---------------------------------------------------------------------------
// Main flow
// ---------------------------------------------------------------------------

const options = parseArgs(process.argv.slice(2))
if (options.upstream === undefined) {
  failUsage('--upstream is required (the absorbed window tip)')
}

const upstreamSha = revParse(options.upstream)
const baseSha = options.base === undefined
  ? runGit(['merge-base', 'HEAD', upstreamSha]).trim()
  : revParse(options.base)
if (baseSha === '') failClosed('window base could not be resolved')

// ---------------------------------------------------------------------------
// Window reads — rm-2060 Bun-window detection happens HERE: an upstream
// lockfile that is ABSENT at the tip is a first-class state whenever the
// window itself explains the absence (a deletion event inside it, or the
// lockfile missing on both ends). The fork's own lockfile stays mandatory.
// ---------------------------------------------------------------------------

const notes: string[] = []
const upstreamLockfileText = showFileIfExists(upstreamSha, 'pnpm-lock.yaml')
const baseLockfileText = showFileIfExists(baseSha, 'pnpm-lock.yaml')

let bunWindow = false
if (upstreamLockfileText === undefined) {
  const deletionLog = runGit([
    'log',
    '--format=%H%x09%s',
    '--diff-filter=D',
    `${baseSha}..${upstreamSha}`,
    '--',
    'pnpm-lock.yaml',
  ]).trim()
  const firstDeletion = deletionLog === '' ? undefined : deletionLog.split('\n')[0]
  if (firstDeletion === undefined && baseLockfileText !== undefined) {
    failClosed(
      `upstream pnpm-lock.yaml absent at ${upstreamSha} with no deletion event in ` +
      `${baseSha}..${upstreamSha} while the base carries one — unexplained absence (bad --base?)`,
    )
  }
  bunWindow = true
  if (firstDeletion === undefined) {
    notes.push(
      'bun window: upstream pnpm-lock.yaml absent across the window (post-migration steady ' +
      'state) — upstream resolution parity not derivable; enforcing manifest parity + ' +
      'fork-side installability; lockfile-only-bump detection skipped',
    )
  } else {
    const [sha = '', subject = ''] = firstDeletion.split('\t')
    notes.push(
      `bun window: upstream pnpm-lock.yaml deleted by ${sha.slice(0, 8)} (${subject}) — ` +
      'upstream resolution parity not derivable; enforcing manifest parity + fork-side ' +
      'installability; lockfile-only-bump detection skipped',
    )
  }
  // Cite the standing lockfile divergence from the AHEAD vocabulary instead
  // of letting it read as an unexplained anomaly.
  const lockfileEntry = AHEAD_ALLOWLIST.find(
    entry => entry.kind === 'path' && entry.pattern === 'pnpm-lock.yaml',
  )
  if (lockfileEntry !== undefined) {
    notes.push(`AHEAD (allowlist, ${lockfileEntry.since}): ${lockfileEntry.pattern} — ${lockfileEntry.reason}`)
  }
} else if (baseLockfileText === undefined) {
  failClosed(
    `base ${baseSha} has no pnpm-lock.yaml while the upstream tip carries one — unshaped window`,
  )
}

const baseManifest = parseManifest(showFile(baseSha, 'package.json'), `${baseSha}:package.json`)
const upstreamManifest = parseManifest(showFile(upstreamSha, 'package.json'), `${upstreamSha}:package.json`)
const baseLockfile = baseLockfileText === undefined ? undefined : parseLockfile(baseLockfileText, `${baseSha}:pnpm-lock.yaml`)
const upstreamLockfile = upstreamLockfileText === undefined ? undefined : parseLockfile(upstreamLockfileText, `${upstreamSha}:pnpm-lock.yaml`)
const baseEntries = manifestEntries(baseManifest)
const upstreamEntries = manifestEntries(upstreamManifest)
const baseResolutions = baseLockfile === undefined ? new Map<string, string>() : importerResolutions(baseLockfile)
const upstreamResolutions = upstreamLockfile === undefined ? new Map<string, string>() : importerResolutions(upstreamLockfile)

// Window dep-bump commits, oldest-first, with per-dependency attribution:
// walking each manifest/lockfile-touching commit keeps the probe line honest
// about WHICH PR a dependency rode in on (the #644 shape: one PR, one dep,
// lockfile-only).
const logLines = runGit([
  'log',
  '--reverse',
  '--format=%H%x09%s',
  `${baseSha}..${upstreamSha}`,
  '--',
  'package.json',
  'pnpm-lock.yaml',
]).trim()
const bumpCommits: {sha: string; subject: string}[] = []
const bumpSubjects = new Map<string, string>()
if (logLines !== '') {
  for (const line of logLines.split('\n')) {
    const [sha = '', subject = ''] = line.split('\t')
    bumpCommits.push({sha, subject})
    const beforePkg = manifestEntries(
      parseManifest(showFile(`${sha}^`, 'package.json'), `${sha}^:package.json`),
    )
    const afterPkg = manifestEntries(parseManifest(showFile(sha, 'package.json'), `${sha}:package.json`))
    // Post-migration commits carry no pnpm-lock.yaml; an absent lockfile in
    // the walk means "no resolutions to attribute", not an error.
    const beforeLockText = showFileIfExists(`${sha}^`, 'pnpm-lock.yaml')
    const afterLockText = showFileIfExists(sha, 'pnpm-lock.yaml')
    const beforeRes = beforeLockText === undefined
      ? new Map<string, string>()
      : importerResolutions(parseLockfile(beforeLockText, `${sha}^:pnpm-lock.yaml`))
    const afterRes = afterLockText === undefined
      ? new Map<string, string>()
      : importerResolutions(parseLockfile(afterLockText, `${sha}:pnpm-lock.yaml`))
    for (const [name, entry] of afterPkg) {
      const prior = beforePkg.get(name)
      if ((prior === undefined || prior.specifier !== entry.specifier) && !bumpSubjects.has(name)) bumpSubjects.set(name, subject)
    }
    for (const [name, resolution] of afterRes) {
      if (beforeRes.get(name) !== resolution && !bumpSubjects.has(name)) bumpSubjects.set(name, subject)
    }
  }
}

// Our side: working tree by default (uncommitted cures verify pre-landing),
// or a committed ref for post-landing evidence.
let oursManifestText: string
let oursLockfileText: string
let oursLabel: string
if (options.oursRef === undefined) {
  oursLabel = 'worktree'
  try {
    oursManifestText = readFileSync('package.json', 'utf8')
    oursLockfileText = readFileSync('pnpm-lock.yaml', 'utf8')
  } catch (error) {
    failClosed(`working-tree manifest/lockfile unreadable: ${String(error)}`)
  }
} else {
  oursLabel = `ref:${revParse(options.oursRef)}`
  oursManifestText = showFile(options.oursRef, 'package.json')
  oursLockfileText = showFile(options.oursRef, 'pnpm-lock.yaml')
}
const oursManifest = parseManifest(oursManifestText, `ours (${oursLabel}) package.json`)
const oursLockfile = parseLockfile(oursLockfileText, `ours (${oursLabel}) pnpm-lock.yaml`)
if (oursLockfile.importers?.['.'] === undefined) {
  failClosed('our lockfile has no root importer (unsupported lockfile shape)')
}

// AHEAD citation for the manifest-field divergence class (rm-2060): a
// standing packageManager divergence (upstream bun@x, fork pnpm@y) is CITED
// from the allowlist, never silently ignored — and never a red on its own.
const upstreamManager = upstreamManifest.packageManager ?? '(unset)'
const oursManager = oursManifest.packageManager ?? '(unset)'
if (upstreamManager !== oursManager) {
  const fieldEntry = AHEAD_ALLOWLIST.find(
    entry => entry.kind === 'manifest-field' && entry.pattern === 'packageManager',
  )
  notes.push(
    fieldEntry === undefined
      ? `manifest-field divergence (UNLISTED in AHEAD_ALLOWLIST): packageManager upstream '${upstreamManager}' vs ours '${oursManager}'`
      : `AHEAD (allowlist, ${fieldEntry.since}): manifest field 'packageManager' upstream '${upstreamManager}' vs ours '${oursManager}' — ${fieldEntry.reason}`,
  )
}

const oursEntries = manifestEntries(oursManifest)
const checks: DependencyCheck[] = []
for (const [name, upstreamEntry] of upstreamEntries) {
  const before = baseEntries.get(name)
  const specChanged = before === undefined || before.specifier !== upstreamEntry.specifier
  const targetResolution = upstreamResolutions.get(name) ?? ''
  const resolutionChanged = targetResolution !== '' && baseResolutions.get(name) !== targetResolution
  // A lockfile-only bump for a still-manifested dependency (PR #644's
  // shape) rides here via resolutionChanged; deps upstream manifests at no
  // point in the window are handled by the second loop after this one.
  if (!specChanged && !resolutionChanged) continue

  const oursEntry = oursEntries.get(name)
  const oursSpecifier = oursEntry?.specifier ?? ''
  const oursResolutionValue = oursEntry === undefined
    ? ''
    : oursResolution(oursLockfile, name, oursEntry.section)
  let verdict: Verdict
  if (oursEntry === undefined) {
    verdict = 'MISSING'
  } else if (targetResolution !== '' && oursResolutionValue !== targetResolution) {
    verdict = 'RESOLUTION_DROP'
  } else if (specChanged && oursSpecifier !== upstreamEntry.specifier) {
    verdict = 'SPECIFIER_DRIFT'
  } else if (targetResolution === '' && oursResolutionValue === '') {
    verdict = 'NOT_INSTALLED'
  } else {
    verdict = 'OK'
  }
  // rm-2060: a dependency-class AHEAD entry exempts the deliberate-divergence
  // verdicts — but never RESOLUTION_DROP (the PR #644 class stays loud).
  const exemption = allowlistedDependency(name)
  const exempt =
    exemption !== undefined &&
    verdict !== 'OK' &&
    verdict !== 'RESOLUTION_DROP'
  checks.push({
    name,
    section: upstreamEntry.section,
    from: before?.specifier ?? '',
    target: upstreamEntry.specifier,
    target_version: targetResolution,
    ours_specifier: oursSpecifier,
    ours_resolution: oursResolutionValue,
    verdict,
    allowlisted: exempt || undefined,
    allowlist_reason: exempt ? exemption.reason : undefined,
    bump_commit: bumpSubjects.get(name) ?? '(window manifest diff)',
  })
}
// Lockfile-only bumps for dependencies upstream no longer manifests: rare,
// but the union discipline says record them rather than drop them silently.
for (const [name, targetResolution] of upstreamResolutions) {
  if (upstreamEntries.has(name)) continue
  if (baseResolutions.get(name) === targetResolution) continue
  const oursResolutionValue = oursResolution(oursLockfile, name, 'dependencies')
  const verdict = oursResolutionValue === targetResolution ? 'OK' : 'RESOLUTION_DROP'
  checks.push({
    name,
    section: 'dependencies',
    from: baseResolutions.get(name) ?? '',
    target: '(lockfile-only)',
    target_version: targetResolution,
    ours_specifier: oursEntries.get(name)?.specifier ?? '',
    ours_resolution: oursResolutionValue,
    verdict,
    bump_commit: bumpSubjects.get(name) ?? '(window lockfile diff)',
  })
}

const probeLines = checks.map(
  check =>
    `absorb-verify ${check.name}: upstream ${check.target} (resolve ${check.target_version}) ` +
    `vs ours ${check.ours_resolution || 'none'} [manifest ${check.ours_specifier || 'none'}] — ` +
    `${check.verdict} (${check.bump_commit})${
      check.allowlisted === true ? ` — ALLOWLISTED (${check.allowlist_reason})` : ''}`,
)

const hardFailures = checks.filter(
  check =>
    check.allowlisted !== true &&
    (check.verdict === 'RESOLUTION_DROP' ||
      check.verdict === 'SPECIFIER_DRIFT' ||
      check.verdict === 'MISSING' ||
      check.verdict === 'NOT_INSTALLED'),
)

for (const check of hardFailures) {
  process.stderr.write(`DROP: ${check.name} upstream ${check.target} vs ours ${check.ours_resolution || 'none'} (${check.bump_commit})\n`)
}

process.stdout.write(
  `${JSON.stringify(
    {
      window: {base: baseSha, upstream: upstreamSha, ours: oursLabel},
      bun_window: bunWindow,
      dep_bump_commits: bumpCommits,
      checks,
      probe_lines: probeLines,
      notes,
      ok: hardFailures.length === 0,
    } satisfies Payload,
    null,
    2,
  )}\n`,
)

if (hardFailures.length > 0) {
  process.exitCode = EXIT_ERROR
}
