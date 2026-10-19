import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { markdownIt } from './markdown-output'

// rm-1484 posture guard: freezes the safe-by-construction contract of the
// #646 markdown port. The behavioral suite (markdown-output.test.ts) pins the
// hostile-input outcomes; this guard pins the CONSTRUCTION so a future
// html:true flip or an innerHTML shortcut on the renderer path fails a suite,
// not review.

const here = dirname(fileURLToPath(import.meta.url))
const RENDERER_PATH_FILES = ['markdown-output.ts', 'renderer-source.ts']

describe('markdown output posture guard (rm-1484)', () => {
  it('keeps MarkdownIt html-disabled at construction (raw HTML is plain text, nothing to sanitize)', () => {
    expect(markdownIt.options.html).toBe(false)
    expect(markdownIt.options.linkify).toBe(true)
    expect(markdownIt.options.typographer).toBe(false)
  })

  it('builds no HTML string anywhere on the renderer path (no innerHTML-style sink)', () => {
    for (const name of RENDERER_PATH_FILES) {
      const source = readFileSync(join(here, name), 'utf8')
      expect(source, `${name} must not build HTML strings`).not.toMatch(
        /\binnerHTML\b|\bouterHTML\b|\binsertAdjacentHTML\b|\bdangerouslySetInnerHTML\b|<script\b/,
      )
    }
  })
})
