/**
 * rm-1440 + rm-1441 focused battery — run-output Markdown renderer (pure core)
 * and the structural no-HTML-interpolation guard for the run-output path.
 *
 * The DOM-building half of the renderer is exercised end to end (launch →
 * stream frames → adoption) by web/src/operator/run-card-output-truth.test.ts
 * under jsdom; this file pins the pure tokenizers and the source-level
 * invariants that must hold no matter which DOM executes the builder.
 */
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'

import {formatRelativeTime as launchFormatRelativeTime} from '../public/operator-launch.js'
import {formatRelativeTime as runIndexFormatRelativeTime} from '../public/operator-run-index.js'
import {parseRunOutputBlocks, parseRunOutputInline} from '../public/operator-run-output.js'
import {formatRelativeTime as streamFormatRelativeTime} from '../public/operator-stream.js'

const publicDir = fileURLToPath(new URL('../public/', import.meta.url))

function readPublicSource(name: string): string {
  return readFileSync(`${publicDir}${name}`, 'utf8')
}

// ---------------------------------------------------------------------------
// Block tokenizer (rm-1440)
// ---------------------------------------------------------------------------

describe('parseRunOutputBlocks — allowlist block tokens', () => {
  it('splits paragraphs on blank lines and joins consecutive ordinary lines with newlines', () => {
    const blocks = parseRunOutputBlocks('first line\nsecond line\n\nsecond paragraph')
    expect(blocks).toEqual([
      {kind: 'paragraph', inline: 'first line\nsecond line'},
      {kind: 'paragraph', inline: 'second paragraph'},
    ])
  })

  it('tokenizes headings levels 1-4 and stops at 5+ hashes (unknown → paragraph)', () => {
    const blocks = parseRunOutputBlocks('# Title\n## Sub\n#### Deep\n##### Five')
    expect(blocks[0]).toEqual({kind: 'heading', level: 1, inline: 'Title'})
    expect(blocks[1]).toEqual({kind: 'heading', level: 2, inline: 'Sub'})
    expect(blocks[2]).toEqual({kind: 'heading', level: 4, inline: 'Deep'})
    expect(blocks[3]).toEqual({kind: 'paragraph', inline: '##### Five'})
  })

  it('groups consecutive bullet lines into one list and ordered lines into another', () => {
    const blocks = parseRunOutputBlocks('- one\n- two\n\n1. first\n2. second')
    expect(blocks).toEqual([
      {kind: 'list', ordered: false, items: ['one', 'two']},
      {kind: 'list', ordered: true, items: ['first', 'second']},
    ])
  })

  it('extracts fenced code blocks and flags an unterminated fence closed:false (mid-stream chunk boundary)', () => {
    const terminated = parseRunOutputBlocks('```js\nconst x = 1\n```\nafter')
    expect(terminated[0]).toEqual({kind: 'code', text: 'const x = 1', closed: true})
    expect(terminated[1]).toEqual({kind: 'paragraph', inline: 'after'})

    const unterminated = parseRunOutputBlocks('before\n```\nconst half = "open"')
    expect(unterminated[0]).toEqual({kind: 'paragraph', inline: 'before'})
    expect(unterminated[1]).toEqual({kind: 'code', text: 'const half = "open"', closed: false})
  })

  it('does not emphasis-tokenize inside a fenced code block', () => {
    const blocks = parseRunOutputBlocks('```\n**not bold** *nor italic*\n```')
    expect(blocks[0]).toEqual({kind: 'code', text: '**not bold** *nor italic*', closed: true})
  })

  it('returns [] for empty or non-string input', () => {
    expect(parseRunOutputBlocks('')).toEqual([])
    expect(parseRunOutputBlocks(undefined as unknown as string)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Inline tokenizer (rm-1440)
// ---------------------------------------------------------------------------

describe('parseRunOutputInline — allowlist inline tokens', () => {
  it('bold fixture: **text** → strong, surrounding text preserved', () => {
    expect(parseRunOutputInline('Deployed **v1.2.3** to prod')).toEqual([
      {kind: 'text', text: 'Deployed '},
      {kind: 'strong', text: 'v1.2.3'},
      {kind: 'text', text: ' to prod'},
    ])
  })

  it('code-span fixture: backtick spans win over emphasis and escape their content', () => {
    expect(parseRunOutputInline('run `git *status*` now')).toEqual([
      {kind: 'text', text: 'run '},
      {kind: 'code', text: 'git *status*'},
      {kind: 'text', text: ' now'},
    ])
  })

  it('italic: single-star spans become em when no bold pair matches', () => {
    expect(parseRunOutputInline('a *quiet* emphasis')).toEqual([
      {kind: 'text', text: 'a '},
      {kind: 'em', text: 'quiet'},
      {kind: 'text', text: ' emphasis'},
    ])
  })

  it('unknown-token fixtures degrade to verbatim text: strikethrough, links, raw HTML', () => {
    expect(parseRunOutputInline('~~gone~~')).toEqual([{kind: 'text', text: '~~gone~~'}])
    expect(parseRunOutputInline('see [docs](javascript:alert(1)) here')).toEqual([
      {kind: 'text', text: 'see [docs](javascript:alert(1)) here'},
    ])
    expect(parseRunOutputInline('<script>alert(1)</script>')).toEqual([
      {kind: 'text', text: '<script>alert(1)</script>'},
    ])
    expect(parseRunOutputInline('<img src=x onerror=alert(1)>')).toEqual([
      {kind: 'text', text: '<img src=x onerror=alert(1)>'},
    ])
  })

  it('unterminated markers (chunk boundary) degrade to literal text', () => {
    expect(parseRunOutputInline('bold **still streaming')).toEqual([
      {kind: 'text', text: 'bold **still streaming'},
    ])
    expect(parseRunOutputInline('tick `open')).toEqual([{kind: 'text', text: 'tick `open'}])
    expect(parseRunOutputInline('em *open')).toEqual([{kind: 'text', text: 'em *open'}])
  })

  it('control-char fixture: C0 controls (except tab) and separators are stripped from text runs', () => {
    expect(parseRunOutputInline('a\u0000b\u0007c\u2028d')).toEqual([{kind: 'text', text: 'abcd'}])
    expect(parseRunOutputInline('tab\tkept')).toEqual([{kind: 'text', text: 'tab\tkept'}])
    expect(parseRunOutputInline('**bo\u0003ld**')).toEqual([{kind: 'strong', text: 'bold'}])
  })

  it('bidi fixture: bidi overrides pass through verbatim as inert text', () => {
    // U+202E RIGHT-TO-LEFT OVERRIDE inside a bold span: the override char itself
    // is data, never markup — it cannot escape the span's text node.
    expect(parseRunOutputInline('**\u202Eevian**')).toEqual([{kind: 'strong', text: '\u202Eevian'}])
  })

  it('returns [] for empty input', () => {
    expect(parseRunOutputInline('')).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Structural guard: no HTML interpolation on the run-output path (rm-1440)
// ---------------------------------------------------------------------------

describe('structural guard — run-output path never interpolates HTML', () => {
  const RENDERER_SRC = readPublicSource('operator-run-output.js')
  const STREAM_SRC = readPublicSource('operator-stream.js')

  it('operator-run-output.js contains no innerHTML/outerHTML assignment, no insertAdjacentHTML, no document.write', () => {
    expect(RENDERER_SRC).not.toMatch(/\.innerHTML\s*=/)
    expect(RENDERER_SRC).not.toMatch(/\.outerHTML\s*=/)
    expect(RENDERER_SRC).not.toMatch(/insertAdjacentHTML\s*\(/)
    expect(RENDERER_SRC).not.toMatch(/document\.write\s*\(/)
  })

  it('operator-stream.js output path writes DOM only through the renderer / textContent', () => {
    expect(STREAM_SRC).not.toMatch(/\.innerHTML\s*=/)
    expect(STREAM_SRC).not.toMatch(/\.outerHTML\s*=/)
    expect(STREAM_SRC).not.toMatch(/insertAdjacentHTML\s*\(/)
    expect(STREAM_SRC).not.toMatch(/document\.write\s*\(/)
    // The output render goes through the allowlist builder, not a raw wire-string write.
    expect(STREAM_SRC).toMatch(/renderRunOutput\(outputEl, outputText\)/)
  })
})

// ---------------------------------------------------------------------------
// formatRelativeTime mirror parity (rm-1441)
// ---------------------------------------------------------------------------

describe('formatRelativeTime parity across run-index, launch, and stream modules', () => {
  const NOW = Date.UTC(2026, 9, 15, 12, 0, 0)

  const cases: readonly (readonly [string, string])[] = [
    ['2026-10-15T11:59:30.000Z', 'just now'],
    ['2026-10-15T11:30:00.000Z', '30 minutes ago'],
    ['2026-10-15T11:00:00.000Z', '1 hour ago'],
    ['2026-10-15T03:00:00.000Z', '9 hours ago'],
    ['2026-10-14T12:00:00.000Z', '1 day ago'],
    ['2026-10-11T12:00:00.000Z', '4 days ago'],
  ]

  it.each(cases)('%s renders identically in all three modules', (iso, expected) => {
    expect(runIndexFormatRelativeTime(iso, NOW)).toBe(expected)
    expect(launchFormatRelativeTime(iso, NOW)).toBe(expected)
    expect(streamFormatRelativeTime(iso, NOW)).toBe(expected)
  })

  it('degenerate inputs behave identically (empty, unparseable, future-clamped)', () => {
    for (const iso of ['', 'not-a-date']) {
      expect(runIndexFormatRelativeTime(iso, NOW)).toBe('')
      expect(launchFormatRelativeTime(iso, NOW)).toBe('')
      expect(streamFormatRelativeTime(iso, NOW)).toBe('')
    }
    // A future timestamp clamps to zero, never a negative age.
    expect(streamFormatRelativeTime('2026-10-15T12:05:00.000Z', NOW)).toBe('just now')
  })
})
