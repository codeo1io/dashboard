import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

/**
 * rm-284 rider (2026-10-01, cycle-3 B1 lint-cliff unblock): no non-comment
 * ROADMAP.md line may exceed 4000 chars.
 *
 * Whole-file `eslint ROADMAP.md` dies at its own timeout once any single
 * non-comment line grows into the multi-thousand-char regime (the markdown
 * tokeniser goes quadratic on long paragraphs) — that cliff cancelled the
 * main-branch Lint job at exactly 35m19s (push run #353 at 31995a2) while
 * split trees lint green in seconds-to-minutes. The cure — proven in the
 * fleet and applied here — is to wrap such paragraphs as blank-line +
 * 2-space-indented fragments inside the same list item (byte-exact on
 * rejoin). This guard pins the cured shape so no future rider or item edit
 * can silently regrow a monolith.
 *
 * HTML-comment lines are exempt on purpose: the `<!-- INTEGRATE-MERGE -->`
 * blocks (L108-L122 at the 31995a2 base) are machine-merged artifacts whose
 * monolith form is their contract, and the markdown linter does not
 * tokenise comment interiors.
 */
const repoRoot = process.cwd()
const MAX_LINE = 4000

/**
 * Walk one line with the incoming comment state, counting how many of its
 * characters sit inside HTML comment spans (the `<!--` / `-->` delimiter
 * tokens themselves count as comment markup — a line that opens a comment
 * and never closes it is entirely comment).
 */
function commentCoverage(line: string, startsInComment: boolean): {
  fullyComment: boolean
  endsInComment: boolean
} {
  let inComment = startsInComment
  let covered = 0
  let i = 0
  while (i < line.length) {
    if (inComment) {
      const close = line.indexOf('-->', i)
      if (close === -1) {
        covered += line.length - i
        break
      }
      covered += close + 3 - i
      i = close + 3
      inComment = false
    } else {
      const opener = line.indexOf('<!--', i)
      if (opener === -1) {
        break
      }
      covered += opener + 4 - i
      i = opener + 4
      inComment = true
    }
  }
  return {fullyComment: covered === line.length, endsInComment: inComment}
}

describe('ROADMAP line-length guard (lint-cliff discipline)', () => {
  it('no non-comment ROADMAP.md line exceeds 4000 chars', () => {
    const lines = readFileSync(resolve(repoRoot, 'ROADMAP.md'), 'utf8').split('\n')
    let inComment = false
    const offenders: string[] = []
    for (const [index, line] of lines.entries()) {
      const {fullyComment, endsInComment} = commentCoverage(line, inComment)
      inComment = endsInComment
      if (!fullyComment && line.length > MAX_LINE) {
        offenders.push(`L${index + 1}: ${line.length} chars`)
      }
    }
    expect(
      offenders,
      'ROADMAP.md grew a >4000-char non-comment line — wrap it as blank-line + ' +
      '2-space-indented fragments inside the same list item (byte-exact on rejoin); ' +
      'HTML-comment monoliths are exempt',
    ).toEqual([])
  })
})
