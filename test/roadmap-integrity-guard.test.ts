// rm-678 vitest schema half (repository-maintenance cycle 1, run 9189a4ac):
// schema assertions over the live ROADMAP ledger plus a red-proof fixture —
// the corrupted 3d07cf9 blob that every landed guard passed MUST fail here.
// Mirrors the no-install census half in scripts/roadmap-census.ts.

import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {join, resolve} from 'node:path'
import {describe, expect, it} from 'vitest'
import {census, violations} from '../scripts/roadmap-census.ts'

const repoRoot = resolve(import.meta.dirname, '..')
const roadmap = readFileSync(join(repoRoot, 'ROADMAP.md'), 'utf8')

const STATUS_ENUM = new Set([
  'open',
  'in-progress',
  'candidate',
  'implemented',
  'completed',
  'landed',
  'partially',
  'superseded',
  'declined',
  'blocked-external',
])

const OPEN_STATUSES = new Set(['candidate', 'in-progress', 'blocked-external'])

const defLines = roadmap.split('\n').filter(line => /^- id: `rm-\d+` \| /.test(line))

function blocks(): string[][] {
  const lines = roadmap.split('\n')
  const starts = lines
    .map((line, i) => (/^- id: `rm-\d+` \| /.test(line) ? i : -1))
    .filter(i => i >= 0)
  return starts.map((s, k) => lines.slice(s, k + 1 < starts.length ? starts[k + 1] : s + 80))
}

describe('rm-678 schema half: live ledger', () => {
  it('every def id is unique', () => {
    const live = census(roadmap)
    expect(live.dups, `duplicate ids: ${live.dups.join(', ')}`).toEqual([])
  })

  it('holds the healthy-defs floor (the corrupted blob held 197)', () => {
    const live = census(roadmap)
    expect(live.defs).toBeGreaterThanOrEqual(200)
  })

  it('records the current id ceiling (bump on the next mint)', () => {
    const live = census(roadmap)
    // 744 = this run's upstream-#570 absorb mint (3ff5a80c cycle-1
    // batch B1), renumbered at the 2026-10-08 integrate (conflict case
    // 8abe5d21) from its at-write rm-681 — landed rm-681 is the e836a18d
    // renumber of cc4339fe's census-guard def and landed meanings own
    // ids — minted above the all-lineage sibling ceiling rm-743
    // (def-line scan 2026-10-08), which sits above main's prior
    // b2a3ae9b landed ceiling rm-692 (conflict case 8921afd9).
    // 2026-10-08 integrate of run 02238c80 (conflict case
    // e6d1fba4): that run's parallel absorb of the SAME upstream
    // #570 minted rm-683, deduped into rm-744 — landed meanings
    // own ids — so the ceiling stays 744 and the 683 pin dies with
    // the duplicate def.
    // 2026-10-08 integrate of run 5b333105 (conflict case
    // 76d683f2): that run's fork-native port of the SAME upstream
    // #570 minted rm-700 (the third parallel lineage), deduped
    // into rm-744 the same way — byte-equal port, empty diff over
    // all four #570 paths — so the 700 pin dies with the duplicate
    // def and the ceiling stays 744. Its unique mints rm-701
    // (snapshot byte bound) and rm-702 (ESM entry guard) land
    // as-authored: both ids are collision-free against the landed
    // ledger (690-692 then 744 bracket them) and are stamped into
    // validated executable surfaces, so no renumber and no bump —
    // the max def id is unchanged at 744 (235 defs).
    // 2026-10-08 integrate of run 6277460e (conflict case
    // 1e27af20): both of that run's mints sit below the pin —
    // rm-713 lands as-authored (public robots.txt) and rm-712
    // folds by content into the landed rm-698 trixie re-pin
    // (a94d0659 via ad8f21e), its def dying with the fold, so
    // the max def id is unchanged at 744 (237 defs).
    // 2026-10-09 integrate of run c026a644 (conflict case
    // 46431058): that run's parallel port of the SAME upstream
    // #570 minted rm-694 (the fourth parallel lineage, candidate
    // only — its implement batch delivered rm-708/rm-709), deduped
    // into rm-744 the same way, its def dying with the fold —
    // while its rm-693 (push inactive-reason ladder, candidate),
    // rm-708 (release.yaml END-block readback cure, byte-convergent
    // with landed rm-691: one fix, two lineage ids per the
    // rm-166/178 pattern, release.yaml net-diff-empty at the
    // merge) and rm-709 (detailsUrl https-only boundary) land
    // as-authored below the pin, so the max def id is unchanged
    // at 744 (240 defs).
    // 2026-10-08 extension #30 (run 788aa489c1d5): three mints above the
    // all-lineage sibling ceiling rm-758 (745-750 5bd710d8, 751-754
    // f266ce30, 755-758 double-claimed with divergent meanings by 89ebbf49
    // and 9fd8bcad64a8 — reconcile by content at their integrates) —
    // 235 → 238 defs, max rm-761.
    // 2026-10-08 compound #12 (run 788aa489c1d5): one mint above the
    // live-reprobed sibling ceiling rm-777 (392bad29b3d3 + a653567e at
    // 768, c37a8576 at 771, 5bd710d8ff89 + 405e9004bd5a at 777) —
    // 238 → 239 defs, max rm-778.
    // 2026-10-09 integrate of run 788aa489c1d5 (conflict case
    // 366f6059, integration 79dc3dcaec7b): that run was authored at
    // base 9aceea8 (235 defs) while main moved through the 6277460e
    // and c026a644 integrations — the two mints stacks above are
    // the run's at-write counts against its own base, preserved
    // verbatim. All four of its defs (rm-759 snapshot read-before-
    // bound gate, rm-760 soak-cut dep refresh, rm-761 pnpm/action-
    // setup re-pin, rm-778 conductor/ci-* stale-ref sweep) are
    // collision-free against the landed ledger (main's additions
    // all sit at/below rm-744) and land as-authored, so the union
    // census is 240 + 4 = 244 defs with the ceiling moving to
    // rm-778 — pin 744 → 778 atomically with this landing
    // (the assertion line itself is relocated below so the pin
    // value stays single-sourced; the note's 778 is its at-write
    // value, superseded by this case's 780 below).
    // 2026-10-09 roadmap extension of run 155f9770 (cycle:3):
    // three mints above the sibling frontier rm-805 — rm-806
    // (scanner-workflow concurrency groups), rm-807 (soak-matured
    // dep refresh), rm-808 (dead _onSettle param) — in-file max
    // moves 778 -> 808 with 245 -> 248 defs (at-write counts
    // against its own base 364272b, superseded by the 2026-10-10
    // integrate note below per the 366f6059 precedent; the pin
    // value stays single-sourced at the assertion below).
    // 2026-10-10 integrate of run 8cecf1d7f09f (conflict case
    // 87124eb3a29742ca8be48aeb36025584): the run was authored at
    // base 364272b (245 defs / max rm-778) while main moved
    // through the cbe70604, d823703c, 155f9770 (case 8955e66c),
    // 91f3d37f (case a91875ba) and 122a693028b8 (case ec31fce8)
    // integrations, landing at 253 defs / max rm-835. Its mint
    // rm-807 (web focus re-probe test determinism + the rm-784
    // fetch-bound fold) COLLIDES with the landed rm-807
    // (155f9770's soak-matured dep refresh) — landed meanings
    // own ids — so it renumbers to rm-866, minted above the
    // re-probed all-lineage unlanded dashboard-fleet frontier
    // (rm-850..859 sibling bands 06c667d3 / e5b718478274 /
    // 87fa6ee8, rm-861..863 run cb6061a3, rm-865 run 0979098f;
    // agenttrace-family 88x numerals are a foreign id space,
    // excluded per the ext #29 adjudication); its mint rm-860
    // (Actions account-level disable) is collision-free and
    // lands as-authored. The run's at-write 860 pin above is
    // superseded by this note per the 366f6059 precedent; the
    // pin moves 835 -> 866 atomically with this landing: union
    // census 253 + 2 = 255 defs / 0 dups / max rm-866, next
    // free rm-867.
    // 2026-10-10 review-fix fe7b0f47 (independent_review ea91ccc5 NEEDS_CHANGES):
    // our mint's numeral rm-806 duplicated 155f9770's earlier 06:37:56Z unlanded
    // mint — renumbered in place to rm-864 (hardened frontier re-probe: spool max
    // rm-863, walls rm-860, origin/main rm-780). Historical record of the mint:
    // 2026-10-09 cycle-2 roadmap (run aec9c3e88357, attempt fc84e56a):
    // minted (as rm-806) above the then-re-probed fleet def-line ceiling rm-805
    // (run-8dd690c85b50, unlanded) — pin 778 -> 806 atomically; the 806 numeral is
    // 155f9770's workflow-concurrency item now — see ROADMAP.md repair comment #33.
    // 2026-10-09 integrate of run 9289efaa (conflict case
    // 139848e6): that run's single mint rm-703 (release.yaml
    // digest-readback SIGPIPE -- the THIRD lineage id of the
    // same cure beside landed rm-691 and landed rm-708, one
    // fix per the rm-166/178 pattern, convergence rider on
    // the def) lands as-authored BELOW the pin, so the max
    // def id is unchanged at 778 (244 -> 245 defs) and no
    // bump is owed; the batch's at-write 703 pin (its tree
    // held 233 defs / max rm-703 at base 5aab7c7, the
    // 693..702 bands then unintegrated) is superseded by
    // this note -- those bands have since landed and
    // reconciled by content (rm-693/694 via 46431058,
    // rm-698 via ad8f21e, rm-700..702 via 76d683f2).
    // 2026-10-09 run cbe70604 (roadmap 32cdbb96, ext #36) mints
    // rm-779 (cve-tripwire NODE_IMAGE reconciliation) and rm-780
    // (Monitoring/Listener view stale-surfacing) above the
    // all-lineage in-flight ceiling rm-778 — census 239/0/780,
    // pin bumped atomically with the mints (the run's at-write
    // counts against its own base 559642a, 237 defs / max
    // rm-744 — preserved verbatim per the 366f6059 precedent).
    // 2026-10-09 integrate of run cbe70604 (conflict case
    // e796bbf3, completed at its re-dispatch as case
    // 543f1e72): the run was authored at base 559642a while
    // main moved through the 788aa489c1d5 (case 366f6059) and
    // 9289efaa (case 139848e6) integrations, landing at 245
    // defs / max rm-778. Its two mints rm-779/rm-780 sit ABOVE
    // that landed ceiling and are collision-free first-hand
    // (the 788aa489 wall's 'next free rm-779' pointer minted
    // nothing above rm-778; rm-779/rm-780 appear in no landed
    // def line), so both land as-authored and the pin moves
    // 778 -> 780 atomically with this landing: union census
    // 245 + 2 = 247 defs / 0 dups / max rm-780, next free
    // rm-781.
    // 2026-10-09 run d823703c roadmap 1d8db60c: pin 780 -> 833 — one
    // bare mint rm-833 (vite-plugin-pwa 2.0.0 disposition; this run's
    // pnpm/codeql/absorb-window findings ride its rm-252 and rm-139
    // riders, pairing run-ba5f6d7ddd67 ext #41 by content); census
    // 247 + 1 = 248 defs / 0 dups / max rm-833, next free rm-834.
    // 2026-10-10 integrate of run 155f9770 (conflict case
    // 8955e66c): the run was authored at base 364272b (245 defs /
    // max rm-778) while main moved through the cbe70604 (case
    // 543f1e72) and d823703c integrations, landing at 248 defs /
    // max rm-833. Its three mints rm-806 (scanner-workflow
    // concurrency groups), rm-807 (soak-matured dep refresh) and
    // rm-808 (dead _onSettle param) sit BELOW that landed ceiling
    // and are collision-free first-hand against the merged ledger
    // (rm-806..808 appear in no landed def line), so all three
    // land as-authored and NO bump is owed: the pin stays 833 and
    // the run's at-write 808 pin above is superseded by this note
    // exactly as 366f6059 superseded at-write pins — union census
    // 248 + 3 = 251 defs / 0 dups / max rm-833, next free rm-834.
    // 2026-10-09 run 91f3d37f (roadmap a268ee63, ext #37,
    // repository-maintenance f24ea34af1b1 cycle:1) mints rm-835
    // (Monitoring allClear DTO-level staleBanner gate, research C1)
    // above the re-probed all-lineage def-line ceiling rm-833, with
    // rm-834 left as same-hour collision margin — census 248 defs,
    // 0 dups, max rm-835; pin bumped atomically with the mint
    // (the run's at-write counts against its own base 88e423a —
    // preserved verbatim per the 366f6059 precedent; superseded by
    // the 2026-10-10 integrate note below).
    // 2026-10-10 integrate of run 91f3d37f (conflict case
    // a91875ba6a2741a8ae2a7b38e0c3c845): the run was authored at
    // base 88e423a while main moved through the d823703c and
    // 155f9770 (case 8955e66c) integrations, landing at 251 defs /
    // max rm-833. Its single mint rm-835 (Monitoring all-clear
    // truth under the DTO-level stale banner — the !data.staleBanner
    // gate on allClear plus a distinct no-data empty state, PR #504)
    // sits ABOVE that landed ceiling and is collision-free first-hand
    // against the merged ledger (rm-835 appears in no other landed
    // def line; census dups 0), so it lands as-authored and the pin
    // moves 833 -> 835 atomically with this landing: union census
    // 251 + 1 = 252 defs / 0 dups / max rm-835, next free rm-836.
    // 2026-10-09 roadmap of run 122a693028b8 (attempt
    // c2a9b510): one mint rm-822 above the re-probed
    // all-lineage ceiling (run-5989eb976c8b wall rm-821,
    // run-155f9770aba4 wall rm-808, both live) -- 245 ->
    // 246 defs, pin 778 -> 822 atomically with this
    // extension; the two parallel mints stay in their
    // unlanded lanes, reconcile by content at integrate.
    // 2026-10-10 integrate of run 122a693028b8 (conflict
    // case ec31fce890a6410197ee052d8745fc57, completed at
    // its re-dispatch as case 5babc76ec082496bbd4f2edc571f5cc9
    // -- the re-dispatch adopted the standing union unchanged
    // (no new markered hunk) and cured the environment that
    // killed the first validation pass: the fresh integration
    // worktree carried no node_modules, so the impacted closure
    // died on ERR_MODULE_NOT_FOUND 'vitest'; after a frozen-
    // lockfile install + web/dist pretest build the closure is
    // 8 files / 488 green re-run first-hand, guard battery 8/8):
    // the run was
    // authored at base 364272b (245 defs / max rm-778)
    // while main moved through the cbe70604, d823703c,
    // 155f9770 (case 8955e66c) and 91f3d37f (case
    // a91875ba) integrations, landing at 252 defs / max
    // rm-835. Its single mint rm-822 (operator-client
    // fetchJson response-size cap at MAX_SSE_BUFFER_BYTES
    // parity) sits BELOW that landed ceiling and is
    // collision-free first-hand against the merged ledger
    // (rm-822 appears in no other landed def line; census
    // dups 0), so it lands as-authored and NO bump is
    // owed: the pin stays 835 and the run's at-write 822
    // assertion above is superseded by this note exactly
    // as 366f6059 superseded at-write pins -- union census
    // 252 + 1 = 253 defs / 0 dups / max rm-835, next free
    // rm-836.
    // 2026-10-10 integrate of run 8cecf1d7f09f (conflict
    // case 87124eb3a29742ca8be48aeb36025584): renumber map
    // rm-807 -> rm-866 (collides with the landed dep-refresh
    // rm-807) plus the collision-free rm-860 mint; the pin
    // moves 835 -> 866 atomically — union census 255 defs /
    // 0 dups / max rm-866, next free rm-867.
    // 2026-10-09 cycle:3 roadmap of run 28cd8f6c2568 (attempt
    // 032a73d1, ext at base 88e423a == main): one mint rm-832
    // (Actions GitHub-side disable watch) above the all-lineage
    // dashboard ceiling rm-831 (run-ba5f6d7ddd67 wall; agenttrace
    // walls at 894 excluded as wrong-repo) — 247 -> 248 defs,
    // pin 780 -> 832 atomically with the mint.
    // 2026-10-10 integrate of run 28cd8f6c2568 (conflict case
    // a6b4df10dd6b4e37ae5a87f8dea6b996): the run was authored at
    // base 88e423a == the merge base (no main drift at author
    // time) while main moved through the d823703c, 155f9770 (case
    // 8955e66c), 91f3d37f (case a91875ba), 122a693028b8 (case
    // ec31fce8) and 8cecf1d7f09f (case 87124eb3) integrations,
    // landing at 255 defs / max rm-866. Its single mint rm-832
    // (Actions GitHub-side disable: scheduled-fire + CI-validation
    // freeze watch) is collision-free first-hand against the merged
    // ledger (rm-832 appears in no other landed def line; census
    // dups 0), so it lands as-authored and NO bump is owed: the pin
    // stays 866 single-sourced at the assertion below, and the
    // run's at-write 832 pin above is superseded by this note
    // exactly as 366f6059 superseded at-write pins — union census
    // 255 + 1 = 256 defs / 0 dups / max rm-866, next free rm-867.
    // 2026-10-10 integrate of run aec9c3e88357 (conflict case
    // 3b444f4ac00f4e519d0a442ca38e630a): the run was authored at
    // base 364272b (245 defs / max rm-778) while main moved
    // through the cbe70604, d823703c, 155f9770 (case 8955e66c),
    // 91f3d37f (case a91875ba), 122a693028b8 (case ec31fce8),
    // 8cecf1d7f09f (case 87124eb3) and 28cd8f6c2568 (case
    // a6b4df10) integrations, landing at 256 defs / max rm-866.
    // Its single mint rm-864 (operator failure-label retryability
    // — renumbered from its rm-806 birth numeral by review fix
    // fe7b0f47 per the landed-meaning-owns-ids rule) sits BELOW
    // that landed ceiling and is collision-free first-hand against
    // the merged ledger (rm-864 appears in no other landed def
    // line; census dups 0), so it lands as-authored and NO bump
    // is owed: the pin stays 866 single-sourced at the assertion
    // below, and the run's at-write 864 assertion above is
    // superseded by this note exactly as 366f6059 superseded
    // at-write pins — union census 256 + 1 = 257 defs / 0 dups /
    // max rm-866, next free rm-867.
    // max id as of extension #36 (2026-10-09, run c37a857620e14531abd6be2112004c60 roadmap d5f8451f136c43629a0e87e53fefb54c): minted rm-778 above the all-lineage frontier (sibling walls through 769, PR #444 head 709, foreign-fleet spool 795-855 excluded, 777 ceiling note honored)
    // 2026-10-10 integrate of run c37a857620e1 (conflict case
    // 96a24445c12b4bdfaac34b14ba4e3afb): the run was authored at
    // base 559642a (237 defs / max rm-744 at author time) while
    // main moved through the cbe70604 (case 543f1e72), d823703c,
    // 155f9770 (case 8955e66c), 91f3d37f (case a91875ba),
    // 122a693028b8 (case ec31fce8), 8cecf1d7f09f (case 87124eb3),
    // 28cd8f6c2568 (case a6b4df10) and aec9c3e88357 (case
    // 3b444f4a / 5738c577) integrations, landing at 257 defs /
    // max rm-866. Its single mint rm-778 (operator annotations
    // drill-down, the 3f3abfdd-lane revival) COLLIDES with the
    // landed rm-778 (788aa489c1d5's conductor/ci-* stale-ref
    // sweep, landed via 79dc3dcaec7b) — landed meanings own ids —
    // so it renumbers to rm-900, minted above the re-probed
    // all-lineage unlanded dashboard-fleet frontier (sibling
    // def-lines rm-867/868 run 461586fe, rm-870..872 run
    // 33ede5da, rm-896 run 4474e5ab, rm-898/899 run c07a6b75;
    // landed ceiling rm-866; agenttrace-family spool
    // compositions 880..938 excluded by def-id overlap 2/12 per
    // the ext #29 adjudication; nothing ≥rm-900 in spool
    // def-lines, walls, or landed main). The pin moves
    // 866 -> 900 atomically with this landing: union census
    // 257 + 1 = 258 defs / 0 dups / max rm-900, next free
    // rm-901; the run's at-write 778 pin above is superseded by
    // this note exactly as 366f6059 superseded at-write pins.
    expect(live.max).toBe(900)
  })

  it('status tokens stay inside the ledger vocabulary', () => {
    const unknown = defLines
      .map(line => line.split('| status: ')[1]?.split(' ')[0] ?? 'MISSING')
      .filter(status => !STATUS_ENUM.has(status))
    expect(unknown).toEqual([])
  })

  it('open items carry non-empty acceptance', () => {
    const hollow: string[] = []
    for (const block of blocks()) {
      const head = block[0] ?? ''
      const status = head.split('| status: ')[1]?.split(' ')[0] ?? 'MISSING'
      if (!OPEN_STATUSES.has(status)) continue
      const at = block.indexOf('- acceptance:')
      const inline = block.some(line => /^- acceptance: \S/.test(line))
      const nested =
        at !== -1 && block.slice(at + 1, at + 4).some(line => /^\s+- \S/.test(line))
      if (!inline && !nested) hollow.push(head.slice(0, 60))
    }
    expect(hollow, `open defs with hollow acceptance: ${hollow.join(' ; ')}`).toEqual([])
  })

  it('mirror of the census violations report is empty', () => {
    expect(violations(census(roadmap))).toEqual([])
  })

  it('newest census comment states the true census', () => {
    // "Newest" by DATE, not document position: the restored ledger carries
    // years of extension comments with their own (historically true) census
    // claims at arbitrary positions — 3d07cf9's ancestry has 2026-10-04
    // claims sitting BELOW the 2026-10-06 one. Each census-bearing comment
    // opens with "(YYYY-MM-DD,"; the newest such comment owns the live truth.
    const claiming = [...roadmap.matchAll(/<!--([\s\S]*?)-->/g)]
      .map(m => m[1] ?? '')
      .map(body => ({
        date: /\((\d{4}-\d{2}-\d{2}),/.exec(body)?.[1] ?? '',
        claim: /(\d+) defs \/ (\d+) dups \/ max rm-(\d+)/.exec(body),
      }))
      .filter(c => c.date !== '' && c.claim !== null)
    expect(claiming.length).toBeGreaterThan(0)
    const newest = claiming.reduce((a, b) => (b.date >= a.date ? b : a))
    const live = census(roadmap)
    expect(newest.claim).toBeDefined()
    expect(Number(newest.claim?.[1])).toBe(live.defs)
    expect(Number(newest.claim?.[2])).toBe(live.dups.length)
    expect(Number(newest.claim?.[3])).toBe(live.max)
  })
})

describe('rm-678 schema half: corruption fixture 3d07cf9', () => {
  const fixture = (() => {
    const sha = '3d07cf96a5c0dac4c718da8591ff0913f5383dc9'
    const read = (): string | undefined => {
      try {
        return execFileSync('git', ['show', `${sha}:ROADMAP.md`], {
          cwd: repoRoot,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        })
      } catch {
        return undefined
      }
    }
    const text = read()
    if (text !== undefined) return text
    // Shallow CI checkouts lack the historical blob, which used to silently
    // skip this red-proof half (review 176de71b finding 7 / R6): fetch the
    // commit on demand — GitHub serves arbitrary-SHA fetches — and only skip
    // when even that fails (offline runs keep the old behavior).
    try {
      execFileSync('git', ['fetch', '--depth=1', '--quiet', 'origin', sha], {
        cwd: repoRoot,
        stdio: ['ignore', 'ignore', 'ignore'],
      })
    } catch {
      return undefined
    }
    return read()
  })()

  it.skipIf(fixture === undefined)('flags the corrupted blob the landed guards passed', () => {
    const text = fixture ?? ''
    const bad = census(text)
    const found = violations(bad)
    expect(found.length).toBeGreaterThan(0)
    expect(bad.defs).toBe(197)
    expect(bad.trailingWs).toBeGreaterThan(0)
  })
})
