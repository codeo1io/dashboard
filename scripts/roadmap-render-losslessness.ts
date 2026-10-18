#!/usr/bin/env node
/**
 * rm-1464: managed ROADMAP.md render LOSSLESSNESS guard.
 *
 * The managed render (commit 5d5f9be, "roadmap: managed ROADMAP.md render
 * refresh") silently destroyed ledger content: six def bodies (rm-842/843/
 * 853/854/855/856) lost their `- signals:` blocks and acceptance bullets,
 * and rich status provenance was flattened to bare `in_progress` — with the
 * id set untouched, so every id-counting guard stayed green. This script is
 * the structural answer: a render must be LOSSLESS over the content of every
 * definition it carries.
 *
 * Union-of-invariants over a consecutive render pair (older → newer):
 *   1. def-dropped        — a def id disappears without a Closed-items entry.
 *   2. acceptance-hollowed / evidence-hollowed / signals-hollowed — a block
 *      that was non-empty becomes empty. The 41 pre-render legacy-hollow
 *      acceptance anchors (empty long BEFORE the render era) are recorded in
 *      LEGACY_HOLLOW_ACCEPTANCE_IDS; pairwise transitions can never fire for
 *      them, the snapshot is the explicit exclusion baseline the guard
 *      recognizes (a NEW-hollow id is a defect, a legacy-hollow id is not).
 *   3. status-vocabulary  — a status first token outside the convention set.
 *   4. status-flattened   — same first token, provenance parenthetical lost.
 *   5. title-emptied      — a def heading that had text loses it.
 *
 * USAGE (this is the losslessness result the rm-680 render-landing channel
 * gate must run on every candidate render PR before landing — a render that
 * hollows content is REJECTED, not accepted by the managed-footer
 * convention):
 *   node scripts/roadmap-render-losslessness.ts                 # whole history
 *   node scripts/roadmap-render-losslessness.ts --from <ref>    # limit walk
 *   node scripts/roadmap-render-losslessness.ts --pair <oldRef> <newRef>
 *   node scripts/roadmap-render-losslessness.ts --files <oldPath> <newPath>
 *
 * --files is the history-free input mode for shallow checkouts (GitHub
 * Actions checkouts run at fetch-depth: 1, so `git show <ref>` cannot resolve
 * historical anchors there): identical diff logic, inputs read from paths.
 *
 * Exit 0 = no violations; exit 1 = violations listed on stdout. The vitest
 * companion (test/roadmap-render-losslessness.test.ts) pins the guard
 * behavior including the real historical 5d5f9be damage pair as a
 * regression anchor.
 */
import {spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import process from 'node:process'

/**
 * Status first-token convention across the ledger's history. The first seven
 * are the CURRENT convention; the last four are HISTORICAL generation tokens
 * (observed in early-October renders and since normalized) — recognized so
 * the guard does not flag legitimate historical normalization.
 */
export const STATUS_VOCABULARY: readonly string[] = [
  'candidate',
  'in_progress',
  'implemented',
  'done',
  'superseded',
  'planned',
  'blocked',
  'completed',
  'landed',
  'partially',
  'in',
]

/**
 * The 41 def ids whose acceptance anchors were already empty at a385ca5
 * (2026-10-14, the last pre-managed-render generation) — recorded so the
 * guard distinguishes PRE-EXISTING hollow anchors from NEW-hollow damage.
 * Provenance: def-block extraction over `git show a385ca5:ROADMAP.md`,
 * census 2026-10-16.
 */
export const LEGACY_HOLLOW_ACCEPTANCE_IDS: readonly string[] = [
  'rm-186', 'rm-187', 'rm-188', 'rm-213', 'rm-214', 'rm-215', 'rm-216',
  'rm-222', 'rm-223', 'rm-224', 'rm-245', 'rm-419', 'rm-420', 'rm-421',
  'rm-497', 'rm-498', 'rm-499', 'rm-500', 'rm-501', 'rm-556', 'rm-557',
  'rm-558', 'rm-612', 'rm-613', 'rm-647', 'rm-648', 'rm-649', 'rm-650',
  'rm-651', 'rm-656', 'rm-659', 'rm-674', 'rm-681', 'rm-689', 'rm-713',
  'rm-759', 'rm-760', 'rm-761', 'rm-778', 'rm-779', 'rm-780',
]

type BlockName = 'acceptance' | 'evidence' | 'signals'
const BLOCK_NAMES: readonly BlockName[] = ['acceptance', 'evidence', 'signals']

export interface LedgerDefBlock {
  readonly id: string
  readonly title: string
  /** Raw status text after `status:` on the id line (token + parenthetical). */
  readonly statusText: string
  /** Bullet bodies per named block, in order. */
  readonly blocks: Readonly<Record<BlockName, readonly string[]>>
}

export interface LedgerShape {
  readonly defs: ReadonlyMap<string, LedgerDefBlock>
  /** Ids mentioned in the Closed-items section (`- \`rm-x\` Title — status`). */
  readonly closedMentions: ReadonlySet<string>
}

export interface LosslessnessViolation {
  readonly id: string
  readonly kind:
    | 'def-dropped'
    | 'acceptance-hollowed'
    | 'evidence-hollowed'
    | 'signals-hollowed'
    | 'status-vocabulary'
    | 'status-flattened'
    | 'title-emptied'
  readonly detail: string
}

/** Parse a ROADMAP.md generation into its def and closed-mention shape. */
export function parseLedger(text: string): LedgerShape {
  const defs = new Map<string, LedgerDefBlock>()
  const closedMentions = new Set<string>()
  const lines = text.split('\n')
  let title = ''
  let current: {id: string; title: string; statusText: string; blocks: Record<BlockName, string[]>} | null = null
  let activeBlock: BlockName | null = null
  let inClosedSection = false

  const commit = (): void => {
    if (current !== null && !defs.has(current.id)) {
      defs.set(current.id, {
        id: current.id,
        title: current.title,
        statusText: current.statusText,
        blocks: current.blocks,
      })
    }
  }

  for (const line of lines) {
    if (line.startsWith('## ')) {
      inClosedSection = line.toLowerCase().includes('closed')
      commit()
      current = null
      activeBlock = null
      continue
    }
    if (line.startsWith('### ')) {
      commit()
      current = null
      title = line.slice(4).trim()
      activeBlock = null
      continue
    }
    const idMatch = /^- id: `(rm-\d+)` \| track: [^|]+\| priority: [^|]+\| status: (.*)$/.exec(line)
    if (idMatch !== null) {
      commit()
      current = {
        id: idMatch[1] ?? '',
        title,
        statusText: (idMatch[2] ?? '').trim(),
        blocks: {acceptance: [], evidence: [], signals: []},
      }
      activeBlock = null
      continue
    }
    if (inClosedSection) {
      for (const closedMatch of line.matchAll(/`(rm-\d+)`/g)) {
        closedMentions.add(closedMatch[1] ?? '')
      }
      continue
    }
    if (current !== null) {
      const blockMatch = /^- (acceptance|evidence|signals):(.*)$/.exec(line)
      if (blockMatch !== null) {
        const inlineValue = (blockMatch[2] ?? '').trim()
        if (inlineValue === '') {
          activeBlock = blockMatch[1] as BlockName
        } else {
          // Single-line value form (`- acceptance: prose…`) — counts as one
          // bullet so hollowing it to the bare `- acceptance:` form is a
          // visible loss, exactly like emptying a bullet block.
          current.blocks[blockMatch[1] as BlockName].push(inlineValue)
          activeBlock = null
        }
        continue
      }
      const bulletMatch = /^\s+- /.exec(line)
      if (bulletMatch !== null && activeBlock !== null) {
        current.blocks[activeBlock].push(line.trim())
        continue
      }
      if (line.startsWith('- ')) {
        // A different top-level key ends the active block.
        activeBlock = null
      }
    }
  }
  commit()
  return {defs, closedMentions}
}

function statusParts(statusText: string): {token: string; parenthetical: string} {
  const token = /^([a-z_]+)/.exec(statusText)?.[1] ?? statusText
  const parenthetical = statusText.slice(token.length).trim()
  return {token, parenthetical}
}

/**
 * Compare two consecutive generations of the ledger. A render (or any
 * landing) must not lose content: violations are returned per def.
 */
export function diffRenderPair(
  oldText: string,
  newText: string,
  options: {legacyHollowIds?: readonly string[]} = {},
): LosslessnessViolation[] {
  const legacy = new Set(options.legacyHollowIds ?? LEGACY_HOLLOW_ACCEPTANCE_IDS)
  const oldLedger = parseLedger(oldText)
  const newLedger = parseLedger(newText)
  const violations: LosslessnessViolation[] = []

  for (const [id, oldDef] of oldLedger.defs) {
    const newDef = newLedger.defs.get(id)
    if (newDef === undefined) {
      if (!newLedger.closedMentions.has(id)) {
        violations.push({
          id,
          kind: 'def-dropped',
          detail: 'def id absent from the newer generation without a Closed-items mention',
        })
      }
      continue
    }
    for (const block of BLOCK_NAMES) {
      const oldBullets = oldDef.blocks[block]
      if (oldBullets.length > 0 && newDef.blocks[block].length === 0 && !legacy.has(id)) {
        violations.push({
          id,
          kind: `${block}-hollowed` as LosslessnessViolation['kind'],
          detail: `-${block}: had ${oldBullets.length} bullet(s), now empty`,
        })
      }
    }
    const oldStatus = statusParts(oldDef.statusText)
    const newStatus = statusParts(newDef.statusText)
    for (const [side, token] of [['older', oldStatus.token], ['newer', newStatus.token]] as const) {
      if (!STATUS_VOCABULARY.includes(token)) {
        violations.push({
          id,
          kind: 'status-vocabulary',
          detail: `${side} generation status token "${token}" is outside the convention vocabulary`,
        })
      }
    }
    if (
      oldStatus.token === newStatus.token &&
      oldStatus.parenthetical !== '' &&
      newStatus.parenthetical === ''
    ) {
      violations.push({
        id,
        kind: 'status-flattened',
        detail: `status provenance "${oldStatus.parenthetical}" lost while token stayed "${oldStatus.token}"`,
      })
    }
    if (oldDef.title !== '' && newDef.title === '') {
      violations.push({
        id,
        kind: 'title-emptied',
        detail: `def heading "${oldDef.title}" lost`,
      })
    }
  }
  return violations
}

function git(args: readonly string[]): {stdout: string; ok: boolean} {
  const result = spawnSync('git', args, {encoding: 'utf8'})
  return {stdout: result.stdout ?? '', ok: result.status === 0}
}

function showRoadmap(ref: string): string {
  const {stdout, ok} = git(['show', `${ref}:ROADMAP.md`])
  if (!ok) {
    throw new Error(`git show ${ref}:ROADMAP.md failed: ${stdout.trim()}`)
  }
  return stdout
}

/** A render-shaped commit: subject starts "roadmap:" and touches only ROADMAP.md. */
function isRenderCommit(sha: string, subject: string): boolean {
  if (!subject.startsWith('roadmap:')) {
    return false
  }
  const {stdout, ok} = git(['diff-tree', '--no-commit-id', '--name-only', '-r', sha])
  return ok && stdout.trim() === 'ROADMAP.md'
}

function reportViolations(pair: string, violations: readonly LosslessnessViolation[]): void {
  if (violations.length === 0) {
    process.stdout.write(`${pair}: lossless\n`)
    return
  }
  process.stdout.write(`${pair}: ${violations.length} violation(s)\n`)
  for (const violation of violations) {
    process.stdout.write(`  ${violation.id} [${violation.kind}] ${violation.detail}\n`)
  }
}

function main(): void {
  const argv = process.argv.slice(2)
  if (argv[0] === '--files') {
    const [oldPath, newPath] = [argv[1], argv[2]]
    if (oldPath === undefined || newPath === undefined) {
      process.stderr.write('usage: --files <oldPath> <newPath>\n')
      process.exitCode = 2
      return
    }
    const violations = diffRenderPair(readFileSync(oldPath, 'utf8'), readFileSync(newPath, 'utf8'))
    reportViolations(`${oldPath} -> ${newPath}`, violations)
    if (violations.length > 0) {
      process.exitCode = 1
    }
    return
  }
  if (argv[0] === '--pair') {
    const [oldRef, newRef] = [argv[1], argv[2]]
    if (oldRef === undefined || newRef === undefined) {
      process.stderr.write('usage: --pair <oldRef> <newRef>\n')
      process.exitCode = 2
      return
    }
    const violations = diffRenderPair(showRoadmap(oldRef), showRoadmap(newRef))
    reportViolations(`${oldRef} -> ${newRef}`, violations)
    if (violations.length > 0) {
      process.exitCode = 1
    }
    return
  }
  const fromIndex = argv.indexOf('--from')
  const maxCount = 400
  const range = fromIndex === -1 ? `--max-count=${maxCount}` : `${argv[fromIndex + 1]}..HEAD`
  const log = git(['log', '--format=%H%x01%s', range, '--', 'ROADMAP.md'])
  if (!log.ok) {
    process.stderr.write(`git log failed: ${log.stdout.trim()}\n`)
    process.exitCode = 2
    return
  }
  const entries = log.stdout.trim().split('\n').filter(line => line !== '')
  let pairs = 0
  let total = 0
  for (const line of entries) {
    const [sha, subject] = line.split('\u0001')
    if (sha === undefined || subject === undefined || !isRenderCommit(sha, subject)) {
      continue
    }
    const parent = `${sha}^`
    let violations: LosslessnessViolation[]
    try {
      violations = diffRenderPair(showRoadmap(parent), showRoadmap(sha))
    } catch (error) {
      process.stderr.write(`skipping ${sha}: ${(error as Error).message}\n`)
      continue
    }
    pairs += 1
    total += violations.length
    reportViolations(`${parent} -> ${sha} (${subject})`, violations)
  }
  process.stdout.write(
    pairs === 0
      ? 'no render-shaped commits in range (a commit whose subject starts "roadmap:" and touches only ROADMAP.md)\n'
      : `${pairs} render pair(s) checked, ${total} violation(s)\n`,
  )
  if (total > 0) {
    process.exitCode = 1
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url.endsWith(process.argv[1].replace(/^.*scripts\//, 'scripts/').replaceAll('\\', '/'))
if (invokedDirectly) {
  main()
}
