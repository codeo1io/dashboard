import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

/**
 * rm-284: ROADMAP.md paragraphs must stay short enough for inline-parsed
 * markdown linting to remain linear.
 *
 * Evidence: eslint's markdown processor goes quadratic somewhere between ~5.3K
 * and ~7.4K chars of a single paragraph node — CI Lint timed out at its 35m
 * budget for five days on two `signals:` lines (7 317 / 7 967 chars) until they
 * were split into blank-line-separated sub-paragraphs inside the same list item
 * (docs/prioritization/2026-09-30-repository-maintenance-cycle-1-batch-run-7ce48fe5.md,
 * B1; root cause in rm-284's ROADMAP entry). A physical line longer than
 * MAX_LINE_CHARS becomes one remark paragraph node — remark rejoins
 * lazy-continuation lines, so soft-wrapping does NOT help; only blank-line
 * paragraph separation does. This guard keeps any future append from silently
 * rebuilding a cliff line.
 */
const repoRoot = process.cwd()
const MAX_LINE_CHARS = 4_000

/**
 * HTML comment blocks (`<!-- … -->`) are not paragraph nodes — remark treats
 * them as raw HTML — so they are exempt. Everything else, including indented
 * list-item continuation paragraphs, is a paragraph-class node and counts.
 */
function isHtmlComment(line: string): boolean {
  return line.startsWith('<!--')
}

describe('ROADMAP.md paragraph-length guard (rm-284)', () => {
  it(`no non-comment line exceeds ${MAX_LINE_CHARS} chars`, () => {
    const lines = readFileSync(resolve(repoRoot, 'ROADMAP.md'), 'utf8').split('\n')
    const offenders = lines
      .map((text, index) => ({line: index + 1, len: text.length, text}))
      .filter(entry => entry.len > MAX_LINE_CHARS && !isHtmlComment(entry.text))
      .map(entry => `ROADMAP.md:${entry.line} (${entry.len} chars)`)

    expect(
      offenders,
      'Overlong ROADMAP.md line(s) — eslint inline-markdown parsing goes quadratic ' +
      'past ~5K chars per paragraph (CI Lint 35m timeout, 2026-09-25..30). Split ' +
      'the line into blank-line-separated sub-paragraphs inside the same list item ' +
      '(2-space indent) so the content stays byte-exact on rejoin — see rm-284.',
    ).toEqual([])
  })
})

describe('ROADMAP.md id-citation guard (rm-511)', () => {
  const DEF_LINE = /^- id: `rm-(\d+)`/

  /**
   * Pure citation extractor — unit-tested below on synthetic text so the
   * negative case (an undefined bare citation) is exercised in CI on every
   * run, not just at the guard's authoring.
   *
   * Definitions are `- id: `rm-N`` list lines. Citations are `rm-N` tokens
   * found OUTSIDE two sanctioned quote contexts: inline code spans
   * (the ledger's intentional-quote convention for pre-rename ids) and HTML
   * comment blocks (frozen integrate/extension history). Comments may span
   * lines; the extractor tracks open/close state, and only text after a
   * comment closes on the same line is citable.
   */
  function extractRoadmapCitations(text: string): {defs: number[]; citations: number[]} {
    const defs: number[] = []
    const citations: number[] = []
    const lines = text.split('\n')
    let inHtmlComment = false
    for (const line of lines) {
      const trimmed = line.trim()
      if (!inHtmlComment && trimmed.startsWith('<!--')) inHtmlComment = true
      const commentCloser = inHtmlComment ? trimmed.indexOf('-->') : -1
      if (inHtmlComment && commentCloser !== -1) {
        const after = trimmed.slice(commentCloser + 3)
        for (const token of after.matchAll(/rm-(\d+)/g)) citations.push(Number(token[1]))
        inHtmlComment = false
        continue
      }
      if (inHtmlComment) continue
      const def = line.match(DEF_LINE)
      if (def) {
        defs.push(Number(def[1]))
        continue
      }
      const withoutCode = line.replaceAll(/`[^`]*`/g, '')
      for (const token of withoutCode.matchAll(/rm-(\d+)/g)) citations.push(Number(token[1]))
    }
    return {defs, citations}
  }

  /**
   * Undefined citations allowed ONLY for documented pre-rename provenance ids
   * — origin ids that the 2026-10-03 renumbering integrates left cited inside
   * LANDED status lines of the items that replaced them (verified 2026-10-03,
   * run d0305cd7b819 implement: each maps to a live def that records the
   * rename). When a sanctioned id later gains its own definition the map is
   * stale and the guard fails until the entry is removed.
   */
  const SANCTIONED_UNDEFINED_CITATIONS: Readonly<Record<number, string>> = {
    160: 'pre-rename lineage id cited in rm-168 signals (release hardening batch lineage)',
    173: 'pre-rename lineage id cited alongside rm-160 in rm-168 signals',
    174: 'pre-rename origin id of rm-205 (636b69c7 integrate, recorded in its status)',
    176: 'pre-rename lineage id cited in rm-147/rm-201 signals (license + CI-residue lineage)',
    189: 'pre-rename origin id of rm-227 (828a1e6 integrate) and cited in rm-190 status',
    231: 'pre-rename lineage id cited in rm-242 status (7cf68fea lineage)',
    241: 'pre-rename lineage id cited alongside rm-231 in rm-242 status',
    476: 'pre-rename lineage id of the dbe8fb1696ea batch (status lines of rm-481 and rm-477..rm-480)',
    496: 'pre-rename lineage id of the f3fbd7d9 batch (status lines of rm-497..rm-501)',
  }

  const roadmap = readFileSync(resolve(repoRoot, 'ROADMAP.md'), 'utf8')

  it('extractor: a bare phantom citation is flagged, backticked and comment-hidden ones are not', () => {
    const synthetic = [
      '- id: `rm-900` | track: docs | status: candidate',
      '- signals: cites rm-901 bare (flagged), `rm-902` quoted (ignored), rm-900 self (defined)',
      '### heading mentions rm-903 bare (flagged)',
      '<!-- frozen history: rm-904 never existed, ignored -->',
      '- evidence: after a comment closes rm-905 is citable',
      'no tokens on this line',
    ].join('\n')
    const {defs, citations} = extractRoadmapCitations(synthetic)
    expect(defs).toEqual([900])
    expect([...new Set(citations)].sort((a, b) => a - b)).toEqual([900, 901, 903, 905])
  })

  it('every definition id is unique', () => {
    const {defs} = extractRoadmapCitations(roadmap)
    const dups = defs.filter((id, i) => defs.indexOf(id) !== i)
    expect(dups, 'duplicate ROADMAP.md definition ids').toEqual([])
  })

  it('every cited id outside quote contexts has a definition or a sanctioned provenance entry', () => {
    const {defs, citations} = extractRoadmapCitations(roadmap)
    const defined = new Set(defs)
    const undefinedCited = [...new Set(citations)].filter(id => !defined.has(id)).sort((a, b) => a - b)
    const unsanctioned = undefinedCited.filter(id => !(id in SANCTIONED_UNDEFINED_CITATIONS))
    expect(
      unsanctioned,
      'ROADMAP.md cites rm- ids with no definition and no sanctioned provenance entry — ' +
      're-point the citation to the real referent (a `- id: rm-N` definition line) or backtick-quote ' +
      'the intentional historical reference (the rm-511 convention); pre-rename provenance ids ' +
      'belong in SANCTIONED_UNDEFINED_CITATIONS with a mapping note',
    ).toEqual([])
  })

  it('no sanctioned provenance id has gained a definition (stale allowance)', () => {
    const {defs} = extractRoadmapCitations(roadmap)
    const defined = new Set(defs)
    const stale = Object.keys(SANCTIONED_UNDEFINED_CITATIONS).map(Number).filter(id => defined.has(id))
    expect(stale, 'sanctioned ids that now exist as definitions — remove them from the map').toEqual([])
  })
})
