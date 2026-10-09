import {readdirSync, readFileSync, statSync} from 'node:fs'
import {join, relative} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

// rm-803 (cycle-3 batch 'log-fidelity + docs-hygiene'): the docs/solutions
// frontmatter convention (AGENTS.md — organized by category with YAML
// frontmatter, module/tags/problem_type) had no machine check, so drift
// recurs silently; workflow-issues/renovate-upstream-sync-regression-2026-09-21.md
// (a lesson that predates the convention) shipped with no frontmatter block
// at all. This guard fails when any docs/solutions markdown file lacks a
// well-formed frontmatter block carrying `module:` and `problem_type:` — the
// two keys every conformant lesson shares (AGENTS.md's `tags:` is desirable
// but not universal across the 144 pre-guard lessons, so it is not required
// here; new lessons should still carry it).

const repoRoot = process.cwd()
const SOLUTIONS_DIR = join(repoRoot, 'docs', 'solutions')

function collectMarkdownFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...collectMarkdownFiles(full))
    } else if (entry.endsWith('.md')) {
      out.push(full)
    }
  }
  return out
}

describe('docs/solutions frontmatter guard (rm-803)', () => {
  const files = collectMarkdownFiles(SOLUTIONS_DIR)

  it('guards a non-empty lesson tree', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it('every docs/solutions lesson starts with a frontmatter block carrying module and problem_type', () => {
    const offenders: string[] = []
    for (const file of files) {
      const problems: string[] = []
      const lines = readFileSync(file, 'utf8').split('\n')
      const close = lines.indexOf('---', 1)
      if (lines[0] === '---' && close !== -1) {
        const block = lines.slice(1, close)
        const missing = (['module', 'problem_type'] as const)
          .filter(
            key => !block.some(
              line => line.startsWith(`${key}:`) && line.slice(key.length + 1).trim() !== '',
            ),
          )
          .map(key => `missing ${key}:`)
        problems.push(...missing)
      } else if (lines[0] === '---') {
        problems.push('frontmatter block never closes')
      } else {
        problems.push('no frontmatter block (file must start with a --- line)')
      }
      if (problems.length > 0) offenders.push(`${relative(repoRoot, file)}: ${problems.join('; ')}`)
    }
    expect(offenders, `docs/solutions frontmatter drift:\n${offenders.join('\n')}`).toEqual([])
  })
})
