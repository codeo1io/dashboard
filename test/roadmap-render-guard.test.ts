import {spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'

import {EXPECTED_ROADMAP_DEF_CENSUS} from '../scripts/roadmap-census-expected.ts'
import {census} from '../scripts/roadmap-census.ts'

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
 *
 * rm-864 (2026-10-19, run fcb763d993e9): two further legs live in this
 * file — def-census exact equality against a named expected constant
 * (scripts/roadmap-census-expected.ts; distinct from the rm-877 floor
 * tripwires, which stay in test/roadmap-integrity-guard.test.ts) and the
 * stringified-object prose trip (bare bracketed structured tokens in
 * narrative prose — the renderer's second emission mechanism, after the
 * trailing-whitespace/label-ref round rm-1454 caught).
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
 * rm-864 prose-trip leg: catch structured values the managed render
 * stringifies into narrative prose. Two observed shapes, both 2026-10-15,
 * both parsed by the markdown processor as label references that failed
 * `pnpm lint` on clean main: an entire script array stringified into a
 * link label (rm-022, ROADMAP.md:19:32) and object-Object brackets in
 * rm-802's acceptance (:878/:880). The durable cure is renderer-side
 * (hermes-roadmap must never emit non-string values into prose fields —
 * out-of-repo); this trip is the repo-side defense, and it fires on the
 * EMISSION signature rather than on markdown reference resolution, so a
 * stray bracket token that happens to satisfy the label linter still
 * trips.
 */
const BRACKET_TOKEN = /\[([^[\]]*)\]/g

function isStringifiedStructure(inner: string): boolean {
  // `[object Object]` and cousins (`[object Array]`) — the default
  // toString of a structured value. Lowercase prose such as `[object
  // model]` does not match (a capital letter is required after the space).
  if (/^object [A-Z][a-zA-Z]*$/.test(inner)) return true
  // Stringified arrays of quoted items — `['a', 'b']`, `["x"]`, one or
  // more items. Unquoted numeric brackets (`[1]` citation shape) stay
  // exempt: every observed emission quoted its items.
  return /^\s*['"][^'"]*['"]\s*(?:,\s*['"][^'"]*['"]\s*)*$/.test(inner)
}

/**
 * Prose-only scan of the ledger. Exempt by design: HTML-comment graft
 * blocks (frozen verbatim history — same exemption the dangling-refs
 * census grants), fenced code blocks, inline code spans (backticks quote
 * content deliberately), and backslash-escaped brackets (the documented
 * cure for an emission, not the disease).
 */
function stringifiedObjectProseTrips(lines: readonly string[]): string[] {
  const offenders: string[] = []
  let inFence = false
  let inComment = false
  lines.forEach((raw, index) => {
    let line = raw
    if (inComment) {
      if (line.includes('-->')) inComment = false
      return
    }
    const commentStart = line.indexOf('<!--')
    if (commentStart !== -1) {
      // Scan only the prose preceding the comment opener; if the comment
      // does not close on the same line, everything after it is frozen.
      line = line.slice(0, commentStart)
      if (!raw.slice(commentStart).includes('-->')) inComment = true
    }
    if (/^\s*(?:```|~~~)/.test(line)) {
      inFence = !inFence
      return
    }
    if (inFence) return
    const narrative = line
      .replaceAll(/`[^`]*`/g, '') // inline code spans quote content deliberately
      .replaceAll(/\\[[\]]/g, '  ') // escaped brackets are the cure, not the disease
    for (const match of narrative.matchAll(BRACKET_TOKEN)) {
      const inner = match[1] ?? ''
      if (isStringifiedStructure(inner)) offenders.push(`ROADMAP.md:${index + 1} [${inner}]`)
    }
  })
  return offenders
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

  it('def census equals the named expected constant (rm-864)', () => {
    const live = census()
    expect(
      live.defs,
      `ROADMAP.md carries ${live.defs} def lines but scripts/roadmap-census-expected.ts pins ` +
      `${EXPECTED_ROADMAP_DEF_CENSUS}. A managed render, integrate graft, or parallel-mint ` +
      'landing changed the census — bump the constant in that same change, deliberately. ' +
      'The one-line file is the coordination point: two sibling landings that both bump it ' +
      'produce a merge conflict that must be reconciled by hand, never silently resolved. ' +
      'Do not weaken this leg to a floor — the rm-877 integrity guard already owns floors; ' +
      'this leg exists to make census drift loud. Re-derive the live count with ' +
      '`node scripts/roadmap-census.ts`.',
    ).toBe(EXPECTED_ROADMAP_DEF_CENSUS)
  })

  it('no stringified structured value lands in narrative prose (rm-864)', () => {
    const offenders = stringifiedObjectProseTrips(roadmapLines())
    expect(
      offenders,
      'Stringified structured tokens in ROADMAP.md narrative prose — the managed render ' +
      'dropped a structured detail value into a prose field (observed 2026-10-15: a script ' +
      'array stringified into a link label at ROADMAP.md:19:32 and object-Object brackets ' +
      'at :878/:880; the markdown processor parses both as label references and `pnpm lint` ' +
      'went RED on clean main). Escape the brackets, quote-wrap the token in backticks, or ' +
      'reword to plain prose. The durable cure is renderer-side — hermes-roadmap must never ' +
      'emit non-string values into prose fields; see rm-864 and the managed-render ' +
      'lint-regression solution doc.',
    ).toEqual([])
  })

  it('stringified-object detector fires on both observed emission shapes and spares legitimate prose', () => {
    const emissions = stringifiedObjectProseTrips(
      [
        '- acceptance: the module list renders as [object Object] in narrative prose',
        "- signals: a script array stringified into a label as ['impeccable@3.2.1', 'playwright@1.64.0'] here",
        '- evidence: a single-item array ["only-child"] still trips',
        '- cousin shape [object Array] trips too',
      ].join('\n').split('\n'),
    )
    expect(emissions).toEqual([
      'ROADMAP.md:1 [object Object]',
      "ROADMAP.md:2 ['impeccable@3.2.1', 'playwright@1.64.0']",
      'ROADMAP.md:3 ["only-child"]',
      'ROADMAP.md:4 [object Array]',
    ])

    const legitimate = stringifiedObjectProseTrips(
      [
        'Prose with a backticked literal `[object Object]` stays quiet.',
        String.raw`Escaped brackets \[object Object\] are the documented cure.`,
        'A markdown link [label](https://example.invalid) is not an emission.',
        'A reference-style link [text][ref] and a citation [1] stay quiet.',
        'Lowercase prose such as an [object model] discussion does not match.',
        "<!-- graft block: [object Object] and ['a', 'b'] frozen verbatim -->",
        '```',
        'fenced [object Object] block content',
        '```',
        "Post-fence prose ['a', 'b'] trips again — fence state is per-block.",
      ].join('\n').split('\n'),
    )
    expect(legitimate).toEqual(["ROADMAP.md:10 ['a', 'b']"])
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
