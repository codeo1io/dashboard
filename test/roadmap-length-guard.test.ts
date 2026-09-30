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
