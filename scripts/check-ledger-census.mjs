#!/usr/bin/env node
// rm-678 detection half — ledger census guard for ROADMAP.md.
//
// Catches the roadmap-sync render-recurrence class proven live on 2026-10-06
// by commit 3d07cf9 (managed render refresh): 197 defs vs the restored 215,
// 1 provenance comment vs 89, 24 trailing-whitespace lines, Python-style
// ['...'] bracket lists rendered outside backticks, a collapsed
// '## Closed items' section of one-liner closures, and 20 false closures
// with no dated marker. Zero dependencies on purpose: this runs in the
// Lockfile Guard workflow family with NO pnpm install (a vitest guard would
// need the install this family protects — the same chicken-and-egg argument
// as the lockfile gate). The vitest schema half lives at
// test/ledger-schema.test.ts (rm-678 acceptance names both halves).
//
// Usage:
//   node scripts/check-ledger-census.mjs [--baseline <path>] [--roadmap <path>]
// --baseline points at the previous ledger (origin/main or the pre-push tip);
// without it only the shape invariants of the candidate run.

import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import process from 'node:process'
import {fileURLToPath, pathToFileURL} from 'node:url'

const STATUS_TOKENS = new Set([
  'implemented', 'candidate', 'completed', 'superseded', 'in-progress',
  'blocked-external', 'landed', 'open', 'partially',
])
const DEF_LINE = /^- id: `rm-(\d+)`(?: \| track: [^|]+\| priority: [^|]+\| status: (\S+))?/
const CENSUS_LINE = /<!-- census \(.*?\): (\d+) defs \/ (\d+) dups \/ max rm-(\d+)\./
const DATED = /\b\d{4}-\d{2}-\d{2}\b/
const MAX_REPORTED = 25

/**
 * @param {string} text
 * @param {string | null} baselineText
 */
export function ledgerInvariants(text, baselineText = null) {
  const findings = []
  const lines = text.split('\n')
  const sectionOf = new Map() // def id -> section title at its header line
  const defAt = new Map() // def id -> line index
  let section = ''
  const ids = []
  for (const [i, line] of lines.entries()) {
    if (line.startsWith('## ')) section = line
    const m = DEF_LINE.exec(line)
    if (!m) continue
    ids.push(m[1])
    defAt.set(m[1], i)
    sectionOf.set(m[1], section)
    const token = m[2] === undefined ? '' : m[2]
    if (token && !STATUS_TOKENS.has(token)) {
      findings.push({rule: 'status-token', line: i + 1, detail: `rm-${m[1]} status token '${token}' is outside the established vocabulary`})
    }
  }
  const comments = lines.filter(l => l.includes('<!--')).length

  // -- shape invariants (always on) --
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
  if (dupes.length > 0) findings.push({rule: 'duplicate-id', line: defAt.get(dupes[0]) + 1, detail: `duplicate def ids: rm-${[...new Set(dupes)].join(', rm-')}`})

  let ws = 0
  for (const [i, line] of lines.entries()) {
    if (line !== line.trimEnd()) {
      ws++
      if (ws <= MAX_REPORTED) findings.push({rule: 'trailing-ws', line: i + 1, detail: 'line has trailing whitespace'})
    }
    if (/\['.*'\]/.test(line.replaceAll(/`[^`]*`/g, ''))) {
      findings.push({rule: 'bracket-list-line', line: i + 1, detail: "Python-style ['...'] bracket list rendered outside backticks"})
    }
    if (line.startsWith('## Closed items')) {
      findings.push({rule: 'closed-items-section', line: i + 1, detail: "collapsed '## Closed items' section (the 3d07cf9 render shape); closures belong in Completed items with full def blocks"})
    }
  }

  const censusComments = lines.filter(l => /<!-- census \(/.test(l))
  if (censusComments.length > 0) {
    const claim = CENSUS_LINE.exec(censusComments.at(-1))
    if (claim) {
      if (Number(claim[1]) !== ids.length) findings.push({rule: 'census-lie', line: 0, detail: `census comment claims ${claim[1]} defs; ledger carries ${ids.length}`})
      if (Number(claim[2]) !== 0) findings.push({rule: 'census-lie', line: 0, detail: `census comment claims ${claim[2]} dups`})
      if (Number(claim[3]) !== Math.max(0, ...ids.map(Number))) findings.push({rule: 'census-lie', line: 0, detail: `census comment claims max rm-${claim[3]}; ledger max is rm-${Math.max(0, ...ids.map(Number))}`})
    } else {
      findings.push({rule: 'census-format', line: 0, detail: 'newest census comment does not match the "N defs / 0 dups / max rm-X" convention'})
    }
  }

  const result = {
    defs: ids.length,
    comments,
    trailingWs: ws,
    maxId: ids.length > 0 ? `rm-${Math.max(...ids.map(Number))}` : 'none',
    findings,
  }

  // -- non-regression vs baseline --
  if (baselineText !== null) {
    const base = ledgerInvariants(baselineText)
    const baseIds = new Set()
    for (const l of baselineText.split('\n')) {
      const m = /^- id: `rm-(\d+)`/.exec(l)
      if (m) baseIds.add(m[1])
    }
    if (ids.length < base.defs) {
      const dropped = [...baseIds].filter(id => !defAt.has(id))
      findings.push({rule: 'def-count-drop', line: 0, detail: `defs ${ids.length} < baseline ${base.defs} (dropped: ${dropped.length > 0 ? `rm-${dropped.slice(0, 20).join(', rm-')}${dropped.length > 20 ? `, +${dropped.length - 20} more` : ''}` : 're-rendered ids'})`})
    }
    for (const id of baseIds) {
      if (!defAt.has(id)) findings.push({rule: 'dropped-def', line: 0, detail: `baseline def rm-${id} is gone from the candidate ledger`})
    }
    if (comments < base.comments) findings.push({rule: 'comment-count-drop', line: 0, detail: `provenance comments ${comments} < baseline ${base.comments}`})
    if (ws > base.trailingWs) findings.push({rule: 'trailing-ws-regression', line: 0, detail: `trailing-whitespace lines ${ws} > baseline ${base.trailingWs}`})

    // Open -> Completed/Superseded moves must carry a dated marker in the def block
    const baseSection = new Map()
    let sec = ''
    for (const l of baselineText.split('\n')) {
      if (l.startsWith('## ')) sec = l
      const m = /^- id: `rm-(\d+)`/.exec(l)
      if (m) baseSection.set(m[1], sec)
    }
    for (const [id, at] of defAt) {
      const from = baseSection.get(id)
      const to = sectionOf.get(id)
      if (from === '## Open items' && to !== undefined && to !== from) {
        let blockEnd = at + 1
        while (blockEnd < lines.length && !DEF_LINE.test(lines[blockEnd]) && !lines[blockEnd].startsWith('## ')) blockEnd++
        const block = lines.slice(at, blockEnd).join('\n')
        if (!DATED.test(block)) {
          findings.push({rule: 'unmoved-closure', line: at + 1, detail: `rm-${id} left Open items for '${to}' without any dated marker (YYYY-MM-DD) in its def block`})
        }
      }
    }

    // acceptance coverage may not regress
    const accMissing = t => {
      let missing = 0
      let inBlock = false
      let has = false
      for (const l of t.split('\n')) {
        if (l.startsWith('- id: `rm-')) {
          if (inBlock && !has) missing++
          inBlock = true
          has = false
        } else if (inBlock && l.startsWith('- acceptance')) {
          has = true
        }
      }
      if (inBlock && !has) missing++
      return missing
    }
    const mine = accMissing(text)
    const theirs = accMissing(baselineText)
    if (mine > theirs) findings.push({rule: 'no-acceptance-regression', line: 0, detail: `defs lacking an acceptance line: ${mine} > baseline ${theirs}`})
  }

  return result
}

function main() {
  const args = process.argv.slice(2)
  let roadmap = join(dirname(fileURLToPath(import.meta.url)), '..', 'ROADMAP.md')
  let baseline = null
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--roadmap') roadmap = args[++i]
    else if (args[i] === '--baseline') baseline = readFileSync(args[++i], 'utf8')
    else {
      console.error(`unknown argument: ${args[i]}`)
      process.exit(2)
    }
  }
  const result = ledgerInvariants(readFileSync(roadmap, 'utf8'), baseline)
  const out = {roadmap, defs: result.defs, comments: result.comments, trailingWs: result.trailingWs, maxId: result.maxId, findings: result.findings}
  console.log(JSON.stringify(out, null, 2))
  if (result.findings.length > 0) {
    console.error(`ledger census RED: ${result.findings.length} finding(s)`)
    process.exit(1)
  }
  console.error(`ledger census green: ${result.defs} defs / ${result.comments} comments / max ${result.maxId}`)
}

const invokedDirectly = process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
if (invokedDirectly) main()
