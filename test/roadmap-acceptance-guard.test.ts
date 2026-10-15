// rm-1463: acceptance-field hygiene on the managed ROADMAP.
//
// The 2026-10-16 sweep (run 181d6e242f1b cycle:2) rebuilt every empty
// acceptance line in place: landed items were flipped to implemented with
// file/live proof, open items got concrete tree-checkable acceptance. This
// guard keeps the ledger from drifting back: every def must carry an
// '- acceptance:' field, and that field must be non-empty for every def
// whose status is not 'candidate'. Mint convention ships candidates WITH an
// acceptance line too, but the guard holds only the non-candidate half
// (rm-1463's agreed invariant), so a bare candidate mint cannot red CI.
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

const roadmapPath = resolve(__dirname, '..', 'ROADMAP.md')
const roadmap = readFileSync(roadmapPath, 'utf8')

interface RoadmapDef {
  id: string
  status: string
  acceptance: string | null
  acceptanceLine: number
}

function parseDefs(): RoadmapDef[] {
  const defs: RoadmapDef[] = []
  let current: {id: string; status: string} | null = null
  let acceptance: string | null = null
  let acceptanceLine = 0
  const flush = () => {
    if (current) {
      defs.push({id: current.id, status: current.status, acceptance, acceptanceLine})
    }
  }
  const lines = roadmap.split('\n')
  lines.forEach((line, index) => {
    if (line.startsWith('- id: `rm-')) {
      flush()
      const idMatch = line.match(/^- id: `rm-\d+`/)
      const statusMatch = line.match(/\| status: (.+)$/)
      current = {
        id: idMatch ? idMatch[0] : line,
        status: statusMatch ? (statusMatch[1] ?? '').trim() : '',
      }
      acceptance = null
      acceptanceLine = 0
    } else if (current && line.startsWith('- acceptance:') && acceptance === null) {
      acceptance = line.slice('- acceptance:'.length).trim()
      acceptanceLine = index + 1
    }
  })
  flush()
  return defs
}

describe('roadmap acceptance guard (rm-1463)', () => {
  const defs = parseDefs()

  it('parses the ledger def set (sanity: hundreds of defs, not zero)', () => {
    expect(defs.length).toBeGreaterThan(200)
  })

  it('every def carries an acceptance field', () => {
    const missing = defs.filter(d => d.acceptance === null)
    expect(missing.map(d => `${d.id}: no '- acceptance:' field line`)).toEqual([])
  })

  it('every non-candidate def carries a non-empty acceptance', () => {
    const empty = defs.filter(
      d => d.acceptance !== null && d.acceptance.length === 0 && !d.status.startsWith('candidate'),
    )
    expect(
      empty.map(d => `${d.id} (ROADMAP.md:${d.acceptanceLine}): empty acceptance under status '${d.status}'`),
    ).toEqual([])
  })
})
