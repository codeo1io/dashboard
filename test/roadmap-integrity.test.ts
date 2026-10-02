import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

// rm-104 (cycle-1 batch B1, run 6cf825ee implement): roadmap-integrity fence.
// The fleet `hermes-roadmap` render clobbered this ledger three times
// (2026-09-20: wholesale deletion of tracked items, lint-breaking bare-array
// prose, pytest/ast evidence cited against vendored .agents/skills paths;
// recurrences 09-27/09-29/09-30 — see
// docs/solutions/workflow-issues/fleet-roadmap-render-clobber-recovery-2026-09-20.md).
// The generator fix is external to this repo, so this suite is the repo-side
// tripwire in the rm-166/rm-178 fence-the-failure-class pattern: assertions
// derive from the file itself with no path filter, and history that stays
// must SAY it is history via the era-qualified allowlist below.
//
// Contiguity note (2026-10-01, this mint): the id space is NOT contiguous —
// the ledger's numbering era starts at rm-100 (rm-001/rm-002 are the
// pre-reset survivors; rm-3..rm-99 were never minted in this file). The
// wholesale-deletion fence is therefore a floor + anchor set, not a
// rm-1..rm-M range check.

const roadmap = readFileSync(new URL('../ROADMAP.md', import.meta.url), 'utf8')
const lines = roadmap.split('\n')

const idLine = /^- id: `rm-(\d+)` \| track: (\S+) \| priority: (\S+) \| status: (\S.*)$/
const itemLines = lines
  .map((text, index) => ({text, number: index + 1, match: text.match(idLine)}))
  .filter(entry => entry.match !== null)
  .map(({number, match}) => ({
    number,
    id: Number(match?.[1] ?? '-1'),
    track: match?.[2] ?? '',
    priority: match?.[3] ?? '',
    status: match?.[4] ?? '',
  }))

// Dated, era-qualified history that stays. Each allowlisted line mentions the
// vendored-path/foreign-tooling classes only as a record of the 2026-09-20
// render clobber or its superseded-era findings — a current-tense claim on a
// NEW line fails the suite at PR time instead of misdirecting the next reader.
const eraQualifiedAllowlist = new Set([
  '     superseded rm-001/rm-002 with pytest/ast evidence on vendored .agents/skills/impeccable paths,',
  '- signals: the 2026-09-20 fleet render (2f3a884) repeated every defect class rm-104 predicted: bare-array prose broke `pnpm lint` at ROADMAP.md:20:32 (main unlandable; run 35479225529), pytest/ast evidence strings re-cited in a Node 24/pnpm/Vitest repo, all 21 signals again under vendored `.agents/skills/impeccable/**`, and — new this time — the manual-revision directive, superseded section, and all tracked open items rm-100/102/103/104/105/106/107/108/109/110 were silently deleted (88 deletions in `git show 2f3a884 -- ROADMAP.md`)',
  '  - next hermes-roadmap render emits zero signals under `.agents/skills/impeccable/**` (vendored-path exclusion)',
  '  - rendered evidence strings reference repo-native commands only (`pnpm lint`, `pnpm check-types`, `pnpm test`, `gh run ...`), never pytest/ast tooling',
  '- original acceptance: every flagged module has a corresponding test file with at least one passing test; original evidence cited "CI: pytest collects the new test files"',
  '- supersession rationale: all 21 flagged paths are under `.agents/skills/impeccable/scripts/**`, designated vendored by `eslint.config.ts` — work there is discarded on reinstall; the cited pytest evidence cannot exist in this Node 24/pnpm/Vitest repository. First-party coverage is not flagged as gapped by the assess cycles (3017 tests passing at 2f3a884; listener/aggregator paths covered directly or indirectly). Replaced by the vendored-path exclusion in `rm-104`; first-party coverage signals should regenerate from the fixed render.',
  "- supersession rationale: every flagged site is in vendored `.agents/skills/impeccable/scripts/live-browser.js` and siblings (same discard-on-reinstall problem); no ast-based CI check exists in this repository's stack. Replaced by `rm-104`; first-party complexity signals should regenerate from the fixed render.",
])

// The single historical oversized token: born as a placeholder rider id in the
// 2026-09-29 cycle-19 landing (never minted as a roadmap id, referenced-not-
// defined in four dated docs). Left verbatim per never-rewrite-dated-history;
// any NEW oversized mint still fails the suite below.
const oversizedTokenAllowlist = new Set(['13640'])

describe('roadmap-integrity fence (rm-104)', () => {
  it('keeps the Open → Completed → Superseded skeleton, each heading exactly once and in order', () => {
    const headings = ['## Open items', '## Completed items', '## Superseded items']
    const positions = headings.map(heading =>
      lines.findIndex(text => text.trim() === heading),
    )
    for (const position of positions) expect(position, 'heading present').toBeGreaterThanOrEqual(0)
    const [open = -1, completed = -1, superseded = -1] = positions
    expect(open, 'Open precedes Completed').toBeLessThan(completed)
    expect(completed, 'Completed precedes Superseded').toBeLessThan(superseded)
    for (const heading of headings) {
      expect(lines.filter(text => text.trim() === heading), heading).toHaveLength(1)
    }
  })

  it('defines every item id exactly once, well-formed, with track/priority/status on the id line', () => {
    expect(itemLines.length, 'id lines parsed').toBeGreaterThan(0)
    const ids = itemLines.map(entry => entry.id)
    expect(new Set(ids).size, 'no duplicate ids').toBe(ids.length)
    for (const entry of itemLines) {
      expect(entry.track, `track at line ${entry.number}`).toMatch(/^\S+$/)
      expect(entry.priority, `priority at line ${entry.number}`).toMatch(/^\d+(\.\d+)?$/)
      expect(entry.status.length, `status at line ${entry.number}`).toBeGreaterThan(0)
    }
  })

  it('fences wholesale deletion: the ledger still defines at least 150 items', () => {
    // 162 ids at this fence's mint (2026-10-01, max rm-316). The 2026-09-20
    // fleet render deleted tracked items wholesale; a render clobber collapses
    // the ledger far below this floor.
    expect(itemLines.length).toBeGreaterThanOrEqual(150)
  })

  it('keeps the standing anchors: rm-104 (this fence) stays defined and NOT completed; rm-116 stays defined', () => {
    const byId = new Map(itemLines.map(entry => [entry.id, entry]))
    const fence = byId.get(104)
    expect(fence, 'rm-104 stays defined').toBeDefined()
    expect(fence?.status, 'rm-104 must not flip completed').not.toMatch(/^completed/)
    expect(byId.get(116), 'rm-116 (branch-protection fill) stays defined').toBeDefined()
  })

  it('mints no oversized ids anywhere in the ledger (the rm-13640 class)', () => {
    const oversized = [...roadmap.matchAll(/rm-(\d{4,})/g)].filter(
      match => !oversizedTokenAllowlist.has(match[1] ?? ''),
    )
    expect(oversized.map(match => `rm-${match[1]}`)).toEqual([])
  })

  it('keeps evidence repo-native: vendored-path and foreign-tooling mentions only on era-qualified history lines', () => {
    const offenders = lines.filter(text => {
      const mentionsGuardedClass =
        text.includes('.agents/skills/impeccable') ||
        text.includes('.slim/clonedeps/') ||
        /\bpytest\b/.test(text) ||
        text.includes('ast.literal_eval') ||
        /\bpip install\b/.test(text)
      return mentionsGuardedClass && !eraQualifiedAllowlist.has(text)
    })
    expect(offenders).toEqual([])
  })
})
