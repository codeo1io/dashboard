import {spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

import {
  diffRenderPair,
  LEGACY_HOLLOW_ACCEPTANCE_IDS,
  parseLedger,
  STATUS_VOCABULARY,
} from '../scripts/roadmap-render-losslessness.ts'

/**
 * rm-1464: pins the managed-render LOSSLESSNESS guard. Every doctored fixture
 * starts from the REAL current ROADMAP.md text, so the parser is exercised
 * against the genuine ledger shape; the two real-history legs (guarded on git
 * availability) pin the two actual render crimes as regression anchors:
 *   - 5d5f9be hollowed six def bodies (rm-842/843/853/854/855/856)
 *   - 3d07cf96 hollowed rm-157's 13-bullet signals block
 */

const roadmapText = readFileSync(new URL('../ROADMAP.md', import.meta.url), 'utf8')

function defLineIndex(lines: readonly string[], id: string): number {
  const index = lines.findIndex(line => line.startsWith(`- id: \`${id}\` |`))
  expect(index, `fixture def ${id} must exist in the current ledger`).toBeGreaterThanOrEqual(0)
  return index
}

/** Locate a def's block line, single-line or bare. */
function blockIndex(lines: readonly string[], id: string, block: string): number {
  const start = defLineIndex(lines, id)
  for (let i = start + 1; i < lines.length; i += 1) {
    if ((lines[i] ?? '').startsWith('- id: `rm-')) break
    if ((lines[i] ?? '').startsWith(`- ${block}:`)) return i
  }
  throw new Error(`block ${block} not found for ${id}`)
}

/** Hollow a def's block: truncate a single-line value, or strip its bullets. */
function hollowBlock(text: string, id: string, block: string): string {
  const lines = text.split('\n')
  const at = blockIndex(lines, id, block)
  if (lines[at] !== `- ${block}:`) {
    lines[at] = `- ${block}:`
    return lines.join('\n')
  }
  const kept: string[] = []
  for (const [i, line] of lines.entries()) {
    if (i > at && ((line ?? '').startsWith('  - ') || (line ?? '').startsWith('    '))) continue
    kept.push(line ?? '')
  }
  return kept.join('\n')
}

/** Strip the status provenance, keeping the first token. */
function flattenStatus(text: string, id: string): string {
  const lines = text.split('\n')
  const at = defLineIndex(lines, id)
  const defLine = lines[at] ?? ''
  const match = /^(- id: `rm-\d+` \| track: [^|]+\| priority: [^|]+\| status: [a-z_]+) (.+)$/.exec(defLine)
  if (match === null) throw new Error(`fixture def ${id} must carry a rich status`)
  lines[at] = `${match[1]}`
  return lines.join('\n')
}

/** Drop a def block entirely (heading through last bullet). */
function dropDef(text: string, id: string): string {
  const lines = text.split('\n')
  const at = defLineIndex(lines, id)
  let start = at
  while (start > 0 && (lines[start - 1] ?? '').startsWith('### ')) start -= 1
  let end = at + 1
  while (end < lines.length && !(lines[end] ?? '').startsWith('### ') && !(lines[end] ?? '').startsWith('- id: `rm-')) end += 1
  const kept = [...lines.slice(0, start), ...lines.slice(end)]
  return kept.join('\n')
}

function setStatusToken(text: string, id: string, token: string): string {
  const lines = text.split('\n')
  const at = defLineIndex(lines, id)
  lines[at] = (lines[at] ?? '').replace(/\| status: [a-z_]+/, `| status: ${token}`)
  return lines.join('\n')
}

describe('parseLedger (rm-1464)', () => {
  it('parses the real ledger with unique ids and non-empty titles', () => {
    const ledger = parseLedger(roadmapText)
    expect(ledger.defs.size).toBeGreaterThan(200)
    const hollowTitles = [...ledger.defs.values()].filter(def => def.title === '')
    expect(hollowTitles.length).toBe(0)
  })

  it('records the legacy hollow acceptance snapshot (41 ids, rm-shaped)', () => {
    expect(LEGACY_HOLLOW_ACCEPTANCE_IDS).toHaveLength(41)
    for (const id of LEGACY_HOLLOW_ACCEPTANCE_IDS) expect(id).toMatch(/^rm-\d+$/)
    const ledger = parseLedger(roadmapText)
    // Snapshot ids that still exist in the current ledger stay hollow.
    const stillPresentHollow = LEGACY_HOLLOW_ACCEPTANCE_IDS.filter(
      id => ledger.defs.get(id)?.blocks.acceptance.length === 0,
    )
    expect(stillPresentHollow.length).toBeGreaterThan(30)
  })
})

describe('diffRenderPair losslessness (rm-1464)', () => {
  it('an unchanged generation pair is lossless', () => {
    expect(diffRenderPair(roadmapText, roadmapText)).toEqual([])
  })

  it('additive rider bullets introduce no violations', () => {
    const lines = roadmapText.split('\n')
    const at = defLineIndex(lines, 'rm-251')
    const withRider = [...lines.slice(0, at + 3), '  - rider: appended additive note 2026-10-16', ...lines.slice(at + 3)]
    expect(diffRenderPair(roadmapText, withRider.join('\n'))).toEqual([])
  })

  it('hollowing a single-line acceptance value is a violation naming the def', () => {
    const doctored = hollowBlock(roadmapText, 'rm-251', 'acceptance')
    const violations = diffRenderPair(roadmapText, doctored)
    expect(violations).toHaveLength(1)
    expect(violations[0]).toMatchObject({id: 'rm-251', kind: 'acceptance-hollowed'})
  })

  it('hollowing a single-line signals value is a violation', () => {
    const doctored = hollowBlock(roadmapText, 'rm-1447', 'signals')
    expect(diffRenderPair(roadmapText, doctored).map(v => `${v.id}:${v.kind}`)).toContain(
      'rm-1447:signals-hollowed',
    )
  })

  it('hollowing a bulleted signals block is a violation', () => {
    const doctored = hollowBlock(roadmapText, 'rm-1464', 'acceptance')
    expect(diffRenderPair(roadmapText, doctored).map(v => `${v.id}:${v.kind}`)).toContain(
      'rm-1464:acceptance-hollowed',
    )
  })

  it('legacy-hollow ids staying hollow is NOT a violation', () => {
    // rm-647 is in the legacy snapshot; old and new both hollow → no flag.
    const ledger = parseLedger(roadmapText)
    expect(LEGACY_HOLLOW_ACCEPTANCE_IDS).toContain('rm-647')
    expect(ledger.defs.get('rm-647')?.blocks.acceptance).toEqual([])
    expect(
      diffRenderPair(roadmapText, roadmapText).filter(v => v.id === 'rm-647'),
    ).toEqual([])
  })

  it('dropping a def without a Closed-items mention is a violation', () => {
    const doctored = dropDef(roadmapText, 'rm-251')
    const violations = diffRenderPair(roadmapText, doctored)
    expect(violations.map(v => `${v.id}:${v.kind}`)).toContain('rm-251:def-dropped')
  })

  it('a def dropped with a Closed-items mention is not flagged', () => {
    const doctored = dropDef(roadmapText, 'rm-251')
    const withClosed = `${doctored}\n## Closed items\n- \`rm-251\` landed elsewhere — done\n`
    expect(
      diffRenderPair(roadmapText, withClosed).filter(v => v.id === 'rm-251'),
    ).toEqual([])
  })

  it('flattening a rich status is a violation', () => {
    const doctored = flattenStatus(roadmapText, 'rm-251')
    const violations = diffRenderPair(roadmapText, doctored)
    expect(violations.map(v => `${v.id}:${v.kind}`)).toContain('rm-251:status-flattened')
  })

  it('a status token outside the historical convention vocabulary is a violation', () => {
    const doctored = setStatusToken(roadmapText, 'rm-251', 'accidentally_cleared')
    const violations = diffRenderPair(roadmapText, doctored)
    expect(violations.map(v => `${v.id}:${v.kind}`)).toContain('rm-251:status-vocabulary')
    expect(STATUS_VOCABULARY).not.toContain('accidentally_cleared')
  })
})

describe('real-history regression anchors (rm-1464)', () => {
  const gitOk =
    spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {encoding: 'utf8'}).status === 0
  const show = (ref: string): string => {
    const result = spawnSync('git', ['show', `${ref}:ROADMAP.md`], {encoding: 'utf8'})
    expect(result.status, `git show ${ref}:ROADMAP.md`).toBe(0)
    return result.stdout
  }
  const itWithGit = gitOk ? it : it.skip

  itWithGit('the 5d5f9be render crime is caught (six hollowed def bodies)', () => {
    const violations = diffRenderPair(show('a385ca5'), show('5d5f9be'))
    const ids = violations.filter(v => v.kind === 'acceptance-hollowed').map(v => v.id).sort()
    expect(ids).toEqual(['rm-842', 'rm-843', 'rm-853', 'rm-854', 'rm-855', 'rm-856'])
  })

  itWithGit('the 3d07cf96 render crime is caught (rm-157 signals hollowed)', () => {
    const violations = diffRenderPair(show('3d07cf96^'), show('3d07cf96'))
    expect(violations.map(v => `${v.id}:${v.kind}`)).toContain('rm-157:signals-hollowed')
  })

  itWithGit('a normal landing pair (5d5f9be -> 06095e9) reports no new damage', () => {
    expect(diffRenderPair(show('5d5f9be'), show('06095e9'))).toEqual([])
  })

  itWithGit('the CLI reports the crime pair with exit 1', () => {
    const result = spawnSync(
      'node',
      ['scripts/roadmap-render-losslessness.ts', '--pair', 'a385ca5', '5d5f9be'],
      {encoding: 'utf8'},
    )
    expect(result.status).toBe(1)
    expect(result.stdout).toContain('rm-853')
    expect(result.stdout).toContain('acceptance-hollowed')
  })
})
