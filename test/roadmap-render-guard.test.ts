import {spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

/**
 * rm-1454: render-guard census for the managed ROADMAP.md.
 *
 * The managed render (external hermes-autonomy roadmap-sync, hermes-roadmap
 * `render_markdown`) made clean-main ROADMAP.md lint-RED and destroyed ledger
 * truth in one sweep (run 85d97dc8 assess 448c33b8 F1/F3/F4, 2026-10-15):
 * 47 trailing-whitespace lines, a bracketed path list parsed as a markdown
 * label reference (rm-022's acceptance, :19:32), the def-line track taxonomy
 * collapsed to a single value (`track: reliability` 235/235 at 5d5f9be vs 9
 * distinct values at 5bf15e1), and def-lines pruned while their narrative
 * refs survived (258 refs vs 235 defs by naive census). main.yaml runs
 * `pnpm lint` on every push, so clean main was CI-RED — silent only because
 * Actions run-creation was dark.
 *
 * This guard makes the NEXT managed render that regresses any leg break the
 * gate instead of shipping silently. The 2026-10-15 repair landing (this
 * batch) made the tree green under the guard; the durable renderer-side cure
 * is tracked as an out-of-repo cross-repo stewardship request — see
 * docs/solutions/workflow-issues/managed-render-lint-regression-2026-10-15.md
 * and rm-1454's implement rider.
 */
const repoRoot = process.cwd()

function roadmapLines(): string[] {
  return readFileSync(resolve(repoRoot, 'ROADMAP.md'), 'utf8').split('\n')
}

/**
 * Def-line ids — extraction restricted to def lines; a document-wide scan
 * false-positives on prose cross-references (see rm-1454's rider: the naive
 * "23 dangling" census collapsed to 3 live prose refs once Closed-items ids
 * and fog-marked refs resolved).
 */
function defLineIds(lines: readonly string[]): Set<number> {
  const ids = new Set<number>()
  for (const line of lines) {
    const match = /^- id: `rm-(\d+)`/.exec(line)
    if (match) ids.add(Number(match[1]))
  }
  return ids
}

/**
 * Ids listed in the "Closed items" section — these are legitimate
 * resolution targets for narrative references (closed items have no def-line
 * by design: the render emits them as one-liners).
 */
function closedItemIds(lines: readonly string[]): Set<number> {
  const ids = new Set<number>()
  let inClosed = false
  for (const line of lines) {
    if (/^#+ .*[Cc]losed items/.test(line)) {
      inClosed = true
      continue
    }
    if (inClosed && /^#+ /.test(line)) inClosed = false
    if (!inClosed) continue
    for (const match of line.matchAll(/^- `rm-(\d+)`/g)) ids.add(Number(match[1]))
  }
  return ids
}

/**
 * House fog convention: a ref explicitly marked `fog rm-NNN` points at a
 * cross-lineage ledger item that this tree's history cannot see (other runs'
 * bands, dead patches, superseded lineages). Such refs are intentional and
 * exempt from the dangling census. Slash-runs under one fog mark
 * (`fog rm-1440/rm-1441`) are one citation and exempt as a whole.
 */
const FOG_MARKED_RE = /fog[ (]*rm-\d+(?:\s*\/\s*rm-\d+)*/gi

const RM_REF_RE = /rm-(\d+)/g

describe('ROADMAP.md render-guard census (rm-1454)', () => {
  it('no line exceeds the 4000-char ledger line ceiling (rm-1460)', () => {
    const offenders = roadmapLines()
      .map((text, index) => ({line: index + 1, length: text.length}))
      .filter(entry => entry.length > 4000)
      .map(entry => `ROADMAP.md:${entry.line} (${entry.length} chars)`)

    expect(
      offenders,
      'Lines over the 4000-char ledger ceiling (rm-1460) — graft/cycle ' +
      'comments and riders must wrap at sentence boundaries instead of ' +
      'growing unbounded single lines: they break diff review, blame, and ' +
      'every editorless consumer of the ledger. Wrap the content (never ' +
      'rewrite it) and keep the wrap change in the same batch.',
    ).toEqual([])
  })

  it('no line carries trailing whitespace', () => {
    const offenders = roadmapLines()
      .map((text, index) => ({line: index + 1, text}))
      .filter(entry => /[ \t]$/.test(entry.text))
      .map(entry => `ROADMAP.md:${entry.line}`)

    expect(
      offenders,
      'Trailing whitespace in ROADMAP.md — the managed render emits empty ' +
      'def fields (`- acceptance: ` et al.) with a trailing space (47 lines at ' +
      '5d5f9be). Strip them; the render-side emit fix is the durable cure (see ' +
      'docs/solutions/workflow-issues/managed-render-lint-regression-2026-10-15.md).',
    ).toEqual([])
  })

  it('every rm-NNN narrative ref resolves to a def-line or Closed-items id (fog-marked refs exempt)', () => {
    const lines = roadmapLines()
    const resolvable = new Set<number>([...defLineIds(lines), ...closedItemIds(lines)])
    const offenders: string[] = []
    // rm-1460: long graft/cycle notes now wrap as multi-line <!-- --> comments
    // (the 4000-char ceiling), so "line contains '<!'" no longer identifies
    // comment content — track open-comment state across lines instead. A
    // single-line <!-- x --> comment still matches the contains check and
    // leaves the state untouched.
    let inComment = false
    lines.forEach((text, index) => {
      if (text.startsWith('- id: `rm-')) return
      const wasInComment = inComment
      if (text.includes('<!--') && !text.includes('-->')) inComment = true
      else if (inComment && text.includes('-->')) inComment = false
      if (text.includes('<!--') || wasInComment) return
      const unmarked = text.replaceAll(FOG_MARKED_RE, '')
      for (const match of unmarked.matchAll(RM_REF_RE)) {
        if (!resolvable.has(Number(match[1]))) {
          offenders.push(`ROADMAP.md:${index + 1} → rm-${match[1]}`)
        }
      }
    })

    expect(
      offenders,
      'Narrative rm-NNN references with no def-line and no Closed-items entry — ' +
      'the render prunes def-lines while leaving their refs behind. Resolve by ' +
      'restoring the def, rewording the ref to name the outcome, or fog-marking ' +
      'it (`fog rm-NNN`) when it points at a cross-lineage item.',
    ).toEqual([])
  })

  it('def-line track census stays multi-valued (no taxonomy collapse)', () => {
    /**
     * Minimum distinct `track:` values across def-lines. The 5bf15e1 census
     * recorded 9 values (reliability 88, security 22, operator-experience 18,
     * docs 16, architecture 3, performance 3, product 2, capability 1,
     * compliance 1); the managed render collapsed the ledger to a single
     * value (235/235 reliability at 5d5f9be — the Track enum of the external
     * renderer has only two members). The 2026-10-15 rm-1454 repair
     * re-derived tracks for all 238 defs from def content, restoring 9 values
     * (reliability 110, security 58, docs 26, operator-experience 22,
     * architecture 9, performance 8, product 2, compliance 2, capability 1).
     *
     * The floor is pinned at the five-value census head rather than 9 because
     * single-member values legitimately disappear when their lone def closes
     * (closed items render pruned): pinning 9 would false-alarm on natural
     * churn. Collapse to one value — the actual regression — trips this at
     * any floor ≥ 2; five keeps ample margin.
     */
    const MIN_DISTINCT_TRACKS = 5

    const tracks = new Set<string>()
    for (const line of roadmapLines()) {
      const match = /^- id: `rm-\d+` \| track: ([a-z-]+) \|/.exec(line)
      const track = match?.[1]
      if (track !== undefined) tracks.add(track)
    }

    expect(
      tracks.size,
      `Def-line track taxonomy collapsed to ${tracks.size} value(s) ` +
      `(${[...tracks].sort().join(', ')}) — the managed render re-emits def-lines ` +
      'through a two-value Track enum and flattens the taxonomy (235/235 `reliability` ' +
      'at 5d5f9be). Re-derive tracks from def content; the renderer-side fix is the ' +
      'durable cure (rm-1454 rider + managed-render-lint-regression solution doc).',
    ).toBeGreaterThanOrEqual(MIN_DISTINCT_TRACKS)
  })

  // The probe budget below must exceed spawnSync's own 120s timeout: the
  // repo-wide 30s testTimeout would otherwise truncate the probe under
  // concurrent suite load (observed 59s eslint-on-ROADMAP while sibling
  // suites churn; 7.4s isolated) and fail this leg on harness truncation
  // instead of the eslint result — and a guard that cannot run its probe
  // is a broken guard.
  it('eslint ROADMAP.md exits clean', {timeout: 150_000}, () => {
    const eslintBin = resolve(repoRoot, 'node_modules', '.bin', 'eslint')
    const result = spawnSync(eslintBin, ['ROADMAP.md', '-f', 'json'], {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 120_000,
    })

    // Fail visible: a guard that cannot run its probe is a broken guard.
    expect(
      result.error,
      `eslint could not be spawned for the ROADMAP.md leg: ${String(result.error)}`,
    ).toBeUndefined()

    if (result.status === 0) return

    let detail = `exit ${result.status}`
    try {
      const parsed = JSON.parse(result.stdout) as {messages: {line: number; ruleId: string | null; message: string}[]}[]
      detail = parsed
        .flatMap(file => file.messages.map(m => `ROADMAP.md:${m.line} ${m.ruleId ?? ''} ${m.message}`))
        .join('; ')
    } catch {
      // keep the exit-status detail; stderr may hold the real reason
      if (result.stderr) detail += ` — ${result.stderr.slice(0, 500)}`
    }

    expect.fail(
      `eslint ROADMAP.md is RED (${detail}) — the managed render reintroduced ` +
      'lint errors (trailing whitespace on empty fields, bracketed lists parsed ' +
      'as label references). See rm-1454 and the managed-render-lint-regression ' +
      'solution doc.',
    )
  })
})
