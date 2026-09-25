import {existsSync, readdirSync, readFileSync} from 'node:fs'
import {join, resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

// rm-229 (cycle-1 batch B3): docs/solutions grew to 80 docs across 7 category
// directories with no index — discoverability depended on knowing the tree.
// README.md is now the index; this gate keeps it honest in BOTH directions:
// a solution doc added without an index entry fails here, and a stale index
// entry pointing at a moved/deleted doc fails here. Frontmatter completeness
// (title/module/problem_type) is enforced too, because the index's per-entry
// metadata is generated from it — a missing field silently degrades the index
// instead of failing loudly.

const repoRoot = process.cwd()
const solutionsRoot = resolve(repoRoot, 'docs/solutions')
const indexPath = resolve(solutionsRoot, 'README.md')

interface DocEntry {
  /** Path relative to docs/solutions, e.g. `workflow-issues/foo-2026-01-01.md`. */
  relPath: string
  frontmatter: Record<string, string>
}

function parseFrontmatter(text: string): Record<string, string> | null {
  if (!text.startsWith('---\n')) return null
  const end = text.indexOf('\n---\n', 4)
  if (end === -1) return null
  const out: Record<string, string> = {}
  for (const line of text.slice(4, end).split('\n')) {
    // Split on the FIRST colon so `key: value with: colons` keeps its value
    // intact; trim the value and skip empties (list-valued keys are handled
    // by the callers as "present but scalar-less", which is fine here — only
    // scalar fields like title/module/problem_type are read).
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const key = line.slice(0, colon)
    if (!/^[a-z_]+$/.test(key)) continue
    const value = line.slice(colon + 1).trim()
    if (value === '') continue
    out[key] = value
  }
  return out
}

function collectDocs(): DocEntry[] {
  const docs: DocEntry[] = []
  for (const entry of readdirSync(solutionsRoot, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue
    for (const file of readdirSync(join(solutionsRoot, entry.name)).sort()) {
      if (!file.endsWith('.md')) continue
      const relPath = `${entry.name}/${file}`
      const frontmatter = parseFrontmatter(readFileSync(join(solutionsRoot, relPath), 'utf8'))
      docs.push({relPath, frontmatter: frontmatter ?? {}})
    }
  }
  return docs
}

describe('docs/solutions index (rm-229)', () => {
  const docs = collectDocs()
  const indexText = readFileSync(indexPath, 'utf8')
  const indexed = new Set(
    [...indexText.matchAll(/\]\(([^)]+\.md)\)/g)].map(match => match[1] ?? '').filter(rel => rel !== ''),
  )

  it('README.md exists and is a real index (>=1 entry per category directory)', () => {
    expect(existsSync(indexPath)).toBe(true)
    expect(docs.length).toBeGreaterThan(0)
    expect(indexed.size).toBeGreaterThan(0)
  })

  it('every solution doc is indexed in README.md (no orphans)', () => {
    const orphans = docs.filter(doc => !indexed.has(doc.relPath)).map(doc => doc.relPath)
    expect(orphans).toEqual([])
  })

  it('every index entry points at an existing solution doc (no dead links)', () => {
    const known = new Set(docs.map(doc => doc.relPath))
    const dead = [...indexed].filter(rel => !known.has(rel))
    expect(dead).toEqual([])
  })

  it('every doc carries complete frontmatter (title, module, problem_type)', () => {
    const required = ['title', 'module', 'problem_type']
    const incomplete = docs
      .filter(doc => required.some(field => doc.frontmatter[field] === undefined))
      .map(doc => `${doc.relPath}: missing ${required.filter(field => doc.frontmatter[field] === undefined).join(', ')}`)
    expect(incomplete).toEqual([])
  })
})
