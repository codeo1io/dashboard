import {spawnSync} from 'node:child_process'
/**
 * rm-182 landing-ledger truth check — fail on provably-stale 'pending landing'
 * statuses in ROADMAP.md.
 *
 * Origin: 2026-09-25, run 9c8505bc (cycle-13 B1, assess 98c24175 F1). The
 * ledger is the input every later cycle prioritizes from, and it provably
 * understated what is live: 17 'pending landing' statuses at origin/main
 * 57a182b while `git merge-base --is-ancestor` showed the referenced landing
 * commits were already on main — the count even grew 15 -> 17 WITH the
 * 57a182b integrate itself. Nothing flipped statuses at landing time.
 *
 * Semantics: an item is flagged ONLY on proven staleness — its status text
 * contains 'pending landing' AND cites a commit ref that resolves in this
 * repository AND is an ancestor of --base (default origin/main). Refs that do
 * not resolve (upstream shas, docker digests, conductor attempt ids, shallow
 * clones) are reported as unknown and never flagged: infrastructure limits
 * must fail open, claims fail closed on proof.
 *
 * Exits 1 with a per-item stale list when any provably-stale claim exists,
 * 0 otherwise. Read-only: reads ROADMAP.md and runs `git rev-parse` /
 * `git merge-base` only.
 */
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'

export interface RoadmapItem {
  readonly id: string
  readonly status: string
  readonly line: number
}

export interface StaleClaim {
  readonly id: string
  readonly line: number
  readonly ref: string
  readonly sha: string
}

export interface LedgerReport {
  readonly stale: readonly StaleClaim[]
  readonly pendingItems: readonly RoadmapItem[]
  readonly checkedRefs: number
  readonly unknownRefs: readonly string[]
}

const ITEM_LINE = /^- id: `(rm-\d+)` \|.*\| status: (.+)$/
// Hex tokens of 7..40 chars. Conductor attempt ids (32 hex) match the shape
// but do not resolve as commits, so they fall out as unknown refs naturally.
const HEX_REF = /\b[0-9a-f]{7,40}\b/g

export function parseRoadmapItems(text: string): readonly RoadmapItem[] {
  const items: RoadmapItem[] = []
  const lines = text.split('\n')
  for (const [index, line] of lines.entries()) {
    const match = ITEM_LINE.exec(line)
    if (match && match[1] !== undefined && match[2] !== undefined) {
      items.push({id: match[1], status: match[2], line: index + 1})
    }
  }
  return items
}

export function extractLandingRefs(status: string): readonly string[] {
  return [...status.matchAll(HEX_REF)].map(match => match[0])
}

export function isPendingLanding(status: string): boolean {
  return status.includes('pending landing')
}

function runGit(args: readonly string[], cwd: string): {ok: boolean; stdout: string} {
  const res = spawnSync('git', args, {cwd, encoding: 'utf8'})
  return {ok: res.status === 0, stdout: (res.stdout ?? '').trim()}
}

export function checkLedger(
  text: string,
  opts: {gitDir?: string; base?: string} = {},
): LedgerReport {
  const gitDir = opts.gitDir ?? process.cwd()
  const base = opts.base ?? 'origin/main'

  const pendingItems = parseRoadmapItems(text).filter(item => isPendingLanding(item.status))
  const stale: StaleClaim[] = []
  const unknownRefs = new Set<string>()
  let checkedRefs = 0

  for (const item of pendingItems) {
    for (const ref of extractLandingRefs(item.status)) {
      const resolved = runGit(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], gitDir)
      if (!resolved.ok) {
        unknownRefs.add(ref)
        continue
      }
      checkedRefs += 1
      const ancestor = runGit(['merge-base', '--is-ancestor', resolved.stdout, base], gitDir)
      if (ancestor.ok) {
        stale.push({id: item.id, line: item.line, ref, sha: resolved.stdout})
      }
    }
  }

  return {stale, pendingItems, checkedRefs, unknownRefs: [...unknownRefs]}
}

function main(): void {
  const args = process.argv.slice(2)
  const flagValue = (name: string): string | undefined => {
    const index = args.indexOf(name)
    return index === -1 ? undefined : args[index + 1]
  }
  const roadmapPath = flagValue('--roadmap') ?? 'ROADMAP.md'
  const base = flagValue('--base') ?? 'origin/main'
  const repo = flagValue('--repo') ?? process.cwd()

  let text: string
  try {
    text = readFileSync(roadmapPath, 'utf8')
  } catch (error) {
    console.error(`ledger: cannot read ${roadmapPath} — ${error instanceof Error ? error.message : String(error)}`)
    process.exit(2)
  }

  const report = checkLedger(text, {gitDir: repo, base})
  console.log(
    `ledger: ${report.pendingItems.length} 'pending landing' item(s), ${report.checkedRefs} resolvable ref(s) checked against ${base}`,
  )
  if (report.unknownRefs.length > 0) {
    console.log(`ledger: ${report.unknownRefs.length} unresolvable ref(s) left unjudged: ${report.unknownRefs.join(', ')}`)
  }

  if (report.stale.length > 0) {
    console.error(`ledger: ${report.stale.length} PROVEN-STALE claim(s) — these landings are ancestors of ${base}:`)
    for (const claim of report.stale) {
      console.error(`  ${claim.id} (ROADMAP.md:${claim.line}) cites ${claim.ref} -> ${claim.sha.slice(0, 12)} already on ${base}`)
    }
    process.exit(1)
  }

  console.log('ledger: OK — no pending-landing claim cites a commit already on the base')
}

// Run only when executed directly, not when imported by tests.
const invokedAs = process.argv[1] === undefined ? '' : resolve(process.argv[1])
if (invokedAs !== '' && invokedAs === resolve(import.meta.filename ?? '')) {
  main()
}
