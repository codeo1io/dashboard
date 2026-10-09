import {readdirSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

// rm-805 (cycle-2 batch 'oauth-pkce-and-runner-pin-guard'): mechanical
// runner-pin guard. rm-188 pinned every runs-on site to ubuntu-24.04 on
// 2026-09-25, but the acceptance clause "no ubuntu-latest remains without a
// recorded reason" had NO enforcement — the cve-tripwire workflow (rm-648,
// 2026-10-07) landed a fresh floating `runs-on: ubuntu-latest` site with no
// adjacent reason at all, exactly the silent drift this guard exists to catch.
//
// Rule (line-based, fork-exclusion-guard family style — no YAML parser so
// comments, the carrier of the dated reasons, stay addressable):
//   - every `.github/workflows/*.{yaml,yml}` file is scanned, no filters;
//   - a `runs-on:` literal is a violation if it floats (`*-latest` / `latest`)
//     UNLESS a directly adjacent comment (same line, contiguous block above,
//     or the comment block above the enclosing job header) carries a
//     YYYY-MM-DD dated re-eval reason;
//   - a matrix/expression `runs-on: ${{ matrix.os }}` must resolve to literal
//     runner values inside the same job's strategy — all pinned → pass, any
//     floating → same dated-reason exemption, unresolvable (fromJSON/env/
//     expression-built) → violation (record the disposition in the batch doc
//     when adding one);
//   - pinned literals (ubuntu-24.04, ubuntu-26.04) and other non-latest runner labels pass.
//
// Negative-verified two ways: the synthetic fixtures below plant un-commented
// floating sites (permanent), and the live planted-workflow red run recorded
// in docs/prioritization/2026-10-09-repository-maintenance-cycle-2-batch-run-8dd690c8.md.

const repoRoot = process.cwd()
const WORKFLOWS_DIR = join(repoRoot, '.github', 'workflows')

interface RunnerPinViolation {
  file: string
  line: number
  runsOn: string
  reason: string
}

/** A dated (YYYY-MM-DD) reason turns a recorded floating site into a pass. */
const DATE_PATTERN = /\b(?:19|20)\d{2}-\d{2}-\d{2}\b/

const RUNS_ON_PATTERN = /^\s*runs-on:[ \t]*(\S.*)$/
const JOB_HEADER_PATTERN = /^ {2}[\w-]+:$/
const BLOCK_ITEM_PATTERN = /^\s+-[ \t]+(\S.*)$/

/** Strip a trailing `# comment` — runner labels never contain '#'. */
function stripTrailingComment(line: string): string {
  const hashIndex = line.indexOf('#')
  return hashIndex === -1 ? line : line.slice(0, hashIndex).trimEnd()
}

/** Text of a trailing or own-line comment, without the '#' marker. */
function commentText(line: string): string {
  const hashIndex = line.indexOf('#')
  return hashIndex === -1 ? '' : (line.slice(hashIndex + 1) ?? '').trim()
}

/** Strip surrounding quotes from a YAML scalar. */
function unquote(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2)
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function isFloatingRunner(value: string): boolean {
  return value === 'latest' || /-latest\b/.test(value)
}

/**
 * Comment text "directly adjacent" to the runs-on line at `idx`: the
 * same-line trailing comment, the contiguous comment block above it, and —
 * because job-level reasons conventionally sit above the job header — the
 * comment block directly above the enclosing job header (the walk passes
 * through exactly one job-header line). Blank lines do not break adjacency;
 * the first code line does.
 */
function adjacentReasonText(lines: string[], idx: number): string {
  const parts: string[] = []
  const trailing = commentText(lines[idx] ?? '')
  if (trailing !== '') parts.push(trailing)
  let passedJobHeader = false
  for (let j = idx - 1; j >= 0; j--) {
    const line = lines[j] ?? ''
    const trimmed = line.trim()
    if (trimmed === '') continue
    if (trimmed.startsWith('#')) {
      const text = commentText(line)
      if (text !== '') parts.push(text)
      continue
    }
    const stripped = stripTrailingComment(line)
    if (!passedJobHeader && JOB_HEADER_PATTERN.test(stripped)) {
      passedJobHeader = true
      const headerTrailing = commentText(line)
      if (headerTrailing !== '') parts.push(headerTrailing)
      continue
    }
    break
  }
  return parts.join('\n')
}

/** Line index of the enclosing job header (or 0 when none found above). */
function jobStartIndex(lines: string[], idx: number): number {
  for (let j = idx; j >= 0; j--) {
    if (JOB_HEADER_PATTERN.test(stripTrailingComment(lines[j] ?? ''))) return j
  }
  return 0
}

/** Line index of the NEXT job header after `from` (or lines.length). */
function nextJobHeaderIndex(lines: string[], from: number): number {
  for (let j = from; j < lines.length; j++) {
    if (JOB_HEADER_PATTERN.test(stripTrailingComment(lines[j] ?? ''))) return j
  }
  return lines.length
}

/**
 * Resolve a `runs-on: ${{ matrix.<dim> }}` value to the literal runner values
 * declared in the same job's strategy matrix (inline `[a, b]` or block
 * `- item` form — strategy: conventionally sits ABOVE runs-on, so the whole
 * job block is searched). Returns undefined when not statically resolvable.
 */
function resolveMatrixValues(value: string, lines: string[], idx: number): string[] | undefined {
  const dims = [...value.matchAll(/matrix\.(\w+)/g)].map(m => m[1])
  if (dims.length === 0) return undefined

  const jobStart = jobStartIndex(lines, idx)
  const jobEnd = nextJobHeaderIndex(lines, jobStart + 1)

  const resolved: string[] = []
  for (const dim of dims) {
    if (dim === undefined) return undefined
    let values: string[] | undefined
    const inlinePattern = new RegExp(String.raw`^\s+${dim}:[ \t]*\[(.*)\]$`)
    const blockHeaderPattern = new RegExp(String.raw`^\s+${dim}:$`)
    for (let j = jobStart; j < jobEnd; j++) {
      const stripped = stripTrailingComment(lines[j] ?? '')
      const inline = inlinePattern.exec(stripped)
      if (inline?.[1] !== undefined) {
        values = inline[1]
          .split(',')
          .map(item => unquote(item))
          .filter(item => item !== '')
        break
      }
      if (blockHeaderPattern.test(stripped)) {
        const blockValues: string[] = []
        for (let k = j + 1; k < jobEnd; k++) {
          const item = BLOCK_ITEM_PATTERN.exec(stripTrailingComment(lines[k] ?? ''))
          if (item?.[1] === undefined) break
          blockValues.push(unquote(item[1]))
        }
        values = blockValues
        break
      }
    }
    if (values === undefined || values.length === 0) return undefined
    if (values.some(item => item.includes('${{'))) return undefined
    resolved.push(...values)
  }
  return resolved
}

function scanWorkflowText(fileName: string, text: string): RunnerPinViolation[] {
  const lines = text.split(/\r?\n/)
  const violations: RunnerPinViolation[] = []

  lines.forEach((line, idx) => {
    const stripped = stripTrailingComment(line)
    const match = RUNS_ON_PATTERN.exec(stripped)
    if (!match) return
    const value = unquote(match[1] ?? '')

    if (value.includes('${{')) {
      const resolved = resolveMatrixValues(value, lines, idx)
      if (resolved === undefined) {
        violations.push({
          file: fileName,
          line: idx + 1,
          runsOn: value,
          reason:
            'matrix/expression runs-on is not statically resolvable to literal runners — expand the matrix to pinned literals or record the disposition in the batch doc',
        })
        return
      }
      const floating = resolved.filter(isFloatingRunner)
      if (floating.length > 0 && !DATE_PATTERN.test(adjacentReasonText(lines, idx))) {
        violations.push({
          file: fileName,
          line: idx + 1,
          runsOn: value,
          reason: `matrix resolves to floating runners (${floating.join(', ')}) with no dated adjacent re-eval reason`,
        })
      }
      return
    }

    if (isFloatingRunner(value) && !DATE_PATTERN.test(adjacentReasonText(lines, idx))) {
      violations.push({
        file: fileName,
        line: idx + 1,
        runsOn: value,
        reason: 'floating runner (latest alias) with no dated adjacent re-eval reason — pin it (rm-188) or record the dated reason beside it',
      })
    }
  })

  return violations
}

describe('workflow runner-pin guard — rm-805', () => {
  describe('classification (synthetic fixtures, permanent negative checks)', () => {
    it('NEGATIVE: a planted un-commented ubuntu-latest job is a violation', () => {
      const planted = [
        'name: probe',
        'on: {push: null}',
        'jobs:',
        '  probe-job:',
        '    runs-on: ubuntu-latest',
        '    steps:',
        '      - run: echo hi',
      ].join('\n')
      const violations = scanWorkflowText('planted.yaml', planted)
      expect(violations).toHaveLength(1)
      expect(violations[0]?.line).toBe(5)
      expect(violations[0]?.runsOn).toBe('ubuntu-latest')
      expect(violations[0]?.reason).toMatch(/floating runner/)
    })

    it('an adjacent dated comment records the reason and passes', () => {
      const dated = [
        'jobs:',
        '  recorded-job:',
        '    # Floating deliberately: scans a pinned digest, re-eval 2027-01-06.',
        '    runs-on: ubuntu-latest',
      ].join('\n')
      expect(scanWorkflowText('dated.yaml', dated)).toEqual([])
    })

    it('NEGATIVE: an adjacent but UNdated comment does not pass', () => {
      const undated = [
        'jobs:',
        '  undated-job:',
        '    # Floating is fine here, trust us.',
        '    runs-on: ubuntu-latest',
      ].join('\n')
      const violations = scanWorkflowText('undated.yaml', undated)
      expect(violations).toHaveLength(1)
      expect(violations[0]?.reason).toMatch(/no dated adjacent re-eval reason/)
    })

    it('a dated reason above the enclosing job header counts (job-level convention)', () => {
      const jobLevel = [
        'jobs:',
        '  # Reason at job level, dated 2026-10-09 — runner image is irrelevant',
        '  # to this job (it scans a pinned digest).',
        '  scan-job:',
        '    runs-on: ubuntu-latest',
      ].join('\n')
      expect(scanWorkflowText('job-level.yaml', jobLevel)).toEqual([])
    })

    it('pinned literals pass (ubuntu-24.04, ubuntu-26.04, labels), quoted floats do not', () => {
      const pinned = [
        'jobs:',
        '  pin-job:',
        '    runs-on: ubuntu-24.04',
        '  next-job:',
        '    runs-on: ubuntu-26.04',
        '  label-job:',
        '    runs-on: ci-large',
      ].join('\n')
      expect(scanWorkflowText('pinned.yaml', pinned)).toEqual([])
      const quoted = ['jobs:', '  quoted-job:', "    runs-on: 'ubuntu-latest'"].join('\n')
      expect(scanWorkflowText('quoted.yaml', quoted)).toHaveLength(1)
      const bare = ['jobs:', '  bare-job:', '    runs-on: latest'].join('\n')
      expect(scanWorkflowText('bare.yaml', bare)).toHaveLength(1)
    })

    it('matrix runs-on: pinned values pass, floating values violate, unresolvable values violate', () => {
      const matrixOs = '$' + '{{ matrix.os }}'
      const matrixPinned = [
        'jobs:',
        '  matrix-job:',
        '    strategy:',
        '      matrix:',
        `        os: [ubuntu-24.04, ubuntu-26.04]`,
        `    runs-on: ${matrixOs}`,
      ].join('\n')
      expect(scanWorkflowText('matrix-pinned.yaml', matrixPinned)).toEqual([])

      const matrixFloating = [
        'jobs:',
        '  matrix-job:',
        '    strategy:',
        '      matrix:',
        '        os: [ubuntu-latest]',
        `    runs-on: ${matrixOs}`,
      ].join('\n')
      expect(scanWorkflowText('matrix-floating.yaml', matrixFloating)).toHaveLength(1)

      const matrixBlockFloating = [
        'jobs:',
        '  matrix-job:',
        '    strategy:',
        '      matrix:',
        '        os:',
        '          - ubuntu-latest',
        `    runs-on: ${matrixOs}`,
      ].join('\n')
      expect(scanWorkflowText('matrix-block.yaml', matrixBlockFloating)).toHaveLength(1)

      const fromJson = '$' + '{{ fromJson(needs.setup.outputs.label) }}'
      const unresolvable = ['jobs:', '  expr-job:', `    runs-on: ${fromJson}`].join('\n')
      const violations = scanWorkflowText('unresolvable.yaml', unresolvable)
      expect(violations).toHaveLength(1)
      expect(violations[0]?.reason).toMatch(/not statically resolvable/)
    })
  })

  it('every live .github/workflows runs-on site is pinned or carries a dated adjacent reason', () => {
    const files = readdirSync(WORKFLOWS_DIR).filter(name => name.endsWith('.yaml') || name.endsWith('.yml'))
    expect(files.length).toBeGreaterThan(10) // the workflow fleet exists where we look for it

    const violations = files.flatMap(fileName =>
      scanWorkflowText(fileName, readFileSync(join(WORKFLOWS_DIR, fileName), 'utf8')),
    )
    // Print the classified census when red so the failure is actionable.
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
  })
})
