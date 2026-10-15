/**
 * Run-output renderer (rm-1440, upstream fro-bot/dashboard#586).
 *
 * Renders untrusted agent run output as Markdown-subset DOM. SECURITY MODEL:
 * the run-output wire text is untrusted agent output — it is never parsed as
 * HTML. This module tokenizes a small Markdown allowlist and builds DOM nodes
 * directly with `document.createElement` + `textContent` only: there is no
 * innerHTML / insertAdjacentHTML / outerHTML / document.write anywhere on this
 * path (a structural guard test pins that). Unknown or disallowed tokens —
 * HTML tags, link syntax, strikethrough, tables, blockquotes — degrade to
 * verbatim textContent, so a payload like `<script>alert(1)</script>` renders
 * as literal text and can never execute.
 *
 * Streaming tolerance: unterminated fenced blocks and unterminated emphasis
 * markers (a chunk boundary can split them mid-stream) degrade gracefully —
 * the fence stays a code block, the stray marker stays literal text — and the
 * next frame re-renders from the (capped) accumulated text.
 *
 * Pure functions are exported for direct testing: `parseRunOutputBlocks` and
 * `parseRunOutputInline` return token specs with no DOM dependency;
 * `renderRunOutput` is the DOM builder.
 */

/** Block token from the block-level tokenizer. */
/**
 * @typedef {|
 *   {kind: 'code', text: string, closed: boolean},
 *   {kind: 'heading', level: number, inline: string},
 *   {kind: 'list', ordered: boolean, items: string[]},
 *   {kind: 'paragraph', inline: string}
 * |} RunOutputBlock
 */

/**
 * Strip characters that must never reach a text node: C0 control characters
 * other than tab (and the newline already consumed by line splitting), plus
 * the Unicode line/paragraph separators that some terminal emitters send.
 * Everything else — including bidi overrides (RLO/LRO/RLO…), which DOM text
 * nodes carry inertly — passes through verbatim; the bidi isolation of the
 * surrounding layout (each run-output region is its own block-scoped element)
 * is what keeps a bidi override from escaping its own text node.
 * @param text - Raw text chunk.
 * @returns The chunk with disallowed control characters removed.
 */
function sanitizeTextChunk(text) {
  // eslint-disable-next-line no-control-regex
  return text.replaceAll(/[\u0000-\u0008\v\f\u000E-\u001F\u007F\u2028\u2029]/g, '')
}

/**
 * Manual marker matching — no regexes with adjacent quantifiers over an
 * overlapping alphabet (the house linter rejects those as super-linear
 * backtracking hazards). Each helper returns null when the line does not
 * carry its marker.
 */

/**
 * @param line - One output line.
 * @returns The heading level + inline text, or null when not a 1-4 hash heading.
 */
function matchHeading(line) {
  let hashes = 0
  while (hashes < line.length && line[hashes] === '#' && hashes < 4) hashes++
  if (hashes === 0 || line[hashes] === '#') return null
  if (hashes === line.length || (line[hashes] !== ' ' && line[hashes] !== '\t')) return null
  let i = hashes
  while (i < line.length && (line[i] === ' ' || line[i] === '\t')) i++
  return {level: hashes, rest: line.slice(i)}
}

/**
 * @param line - One output line.
 * @returns The item text, or null when not a `- `/`* ` bullet item.
 */
function matchBullet(line) {
  if (line.length < 2 || (line[0] !== '-' && line[0] !== '*')) return null
  if (line[1] !== ' ' && line[1] !== '\t') return null
  let i = 1
  while (i < line.length && (line[i] === ' ' || line[i] === '\t')) i++
  return line.slice(i)
}

/**
 * @param line - One output line.
 * @returns The item text, or null when not a `1. `/`1) ` ordered item.
 */
function matchOrdered(line) {
  let i = 0
  while (i < line.length && line[i] >= '0' && line[i] <= '9') i++
  if (i === 0 || i > 9) return null
  if (line[i] !== '.' && line[i] !== ')') return null
  i++
  if (line[i] !== ' ' && line[i] !== '\t') return null
  while (i < line.length && (line[i] === ' ' || line[i] === '\t')) i++
  return line.slice(i)
}

/**
 * @param line - One output line.
 * @returns The fence marker (all its backticks) plus the info string, or null.
 */
function matchFence(line) {
  let ticks = 0
  while (ticks < line.length && line[ticks] === '`') ticks++
  if (ticks < 3) return null
  return {fence: line.slice(0, ticks), info: line.slice(ticks)}
}

/**
 * A closing fence is only backticks and blankspace — at least as many as opened.
 * @param line - One output line.
 * @param fenceLength - Length of the opening fence marker.
 * @returns True when the line closes the fence.
 */
function isClosingFence(line, fenceLength) {
  let ticks = 0
  while (ticks < line.length && line[ticks] === '`') ticks++
  if (ticks < fenceLength) return false
  for (let i = ticks; i < line.length; i++) {
    if (line[i] !== ' ' && line[i] !== '\t') return false
  }
  return true
}

/**
 * Whether a line would start any non-paragraph block (paragraph terminator).
 * @param line - One output line.
 * @returns True when the line starts a fence, heading, or list item.
 */
function startsSpecialBlock(line) {
  return matchFence(line) !== null || matchHeading(line) !== null || matchBullet(line) !== null || matchOrdered(line) !== null
}

/**
 * Tokenize run-output text into block specs. Line-based; fenced code regions
 * are extracted first, then headings, list items, blank lines, and paragraphs.
 * An unterminated fence (mid-stream chunk boundary) yields a `closed: false`
 * code block holding the remainder — degraded, never dropped.
 * @param text - The accumulated run-output text.
 * @returns The allowlist block token specs.
 */
export function parseRunOutputBlocks(text) {
  /** @type {RunOutputBlock[]} */
  const blocks = []
  if (typeof text !== 'string' || text === '') return blocks

  const lines = text.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    const fenceMatch = matchFence(line)
    if (fenceMatch !== null) {
      const body = []
      i++
      let closed = false
      while (i < lines.length) {
        if (isClosingFence(lines[i], fenceMatch.fence.length)) {
          closed = true
          i++
          break
        }
        body.push(lines[i])
        i++
      }
      blocks.push({kind: 'code', text: body.join('\n'), closed})
      continue
    }

    if (line.trim() === '') {
      i++
      continue
    }

    const headingMatch = matchHeading(line)
    if (headingMatch !== null) {
      blocks.push({kind: 'heading', level: headingMatch.level, inline: headingMatch.rest})
      i++
      continue
    }

    const bulletMatch = matchBullet(line)
    if (bulletMatch !== null) {
      const items = [bulletMatch]
      i++
      while (i < lines.length) {
        const next = matchBullet(lines[i])
        if (next === null) break
        items.push(next)
        i++
      }
      blocks.push({kind: 'list', ordered: false, items})
      continue
    }

    const orderedMatch = matchOrdered(line)
    if (orderedMatch !== null) {
      const items = [orderedMatch]
      i++
      while (i < lines.length) {
        const next = matchOrdered(lines[i])
        if (next === null) break
        items.push(next)
        i++
      }
      blocks.push({kind: 'list', ordered: true, items})
      continue
    }

    // Paragraph: consecutive ordinary lines until a blank, fence, heading or
    // list line. Joined with '\n' (preserved verbatim — no reflow).
    const paragraphLines = [line]
    i++
    while (i < lines.length) {
      const next = lines[i]
      if (next.trim() === '') break
      if (startsSpecialBlock(next)) break
      paragraphLines.push(next)
      i++
    }
    blocks.push({kind: 'paragraph', inline: paragraphLines.join('\n')})
  }

  return blocks
}

/**
 * Inline token spec.
 * @typedef {{kind: 'text'|'strong'|'em'|'code', text: string}} RunOutputInlineToken
 */

/**
 * Tokenize one inline region into the allowlist {text, strong, em, code}.
 * Precedence: code spans (backticks) first — their content is literal and
 * never emphasis-parsed — then bold `**…**`, then italic `*…*`. Unterminated
 * markers degrade to literal text. Nesting is not built: emphasis content is
 * plain text (scope decision — see the rm-1440 ledger note). Unknown syntax
 * (`~~x~~`, `[t](url)`, raw HTML) is never interpreted here: it falls into
 * text tokens verbatim.
 * @param text - The inline region text.
 * @returns The allowlist inline token specs.
 */
export function parseRunOutputInline(text) {
  /** @type {RunOutputInlineToken[]} */
  const tokens = []
  if (typeof text !== 'string' || text === '') return tokens

  let textRun = ''
  let i = 0
  const flushText = () => {
    if (textRun !== '') {
      tokens.push({kind: 'text', text: sanitizeTextChunk(textRun)})
      textRun = ''
    }
  }

  while (i < text.length) {
    const char = text[i]

    if (char === '`') {
      const close = text.indexOf('`', i + 1)
      if (close !== -1) {
        flushText()
        tokens.push({kind: 'code', text: sanitizeTextChunk(text.slice(i + 1, close))})
        i = close + 1
        continue
      }
      // Unterminated backtick mid-stream: literal.
      textRun += char
      i++
      continue
    }

    if (char === '*' && text.startsWith('**', i)) {
      const close = text.indexOf('**', i + 2)
      if (close !== -1) {
        flushText()
        tokens.push({kind: 'strong', text: sanitizeTextChunk(text.slice(i + 2, close))})
        i = close + 2
        continue
      }
      // Unterminated bold marker: both stars literal.
      textRun += '**'
      i += 2
      continue
    }

    if (char === '*') {
      const close = text.indexOf('*', i + 1)
      if (close !== -1) {
        flushText()
        tokens.push({kind: 'em', text: sanitizeTextChunk(text.slice(i + 1, close))})
        i = close + 1
        continue
      }
      textRun += char
      i++
      continue
    }

    textRun += char
    i++
  }
  flushText()
  return tokens
}

/**
 * Append inline tokens as DOM children of `parent`. Only createElement +
 * textContent — the injection-safety guarantee. A single plain-text run (the
 * common case) sets textContent directly; mixed runs wrap plain text in <span>
 * so styled siblings keep their own text nodes.
 * @param {Element} parent
 * @param {string} inline
 */
function appendInlineNodes(parent, inline) {
  const tokens = parseRunOutputInline(inline)
  if (tokens.length === 1 && tokens[0].kind === 'text') {
    parent.textContent = tokens[0].text
    return
  }
  for (const token of tokens) {
    if (token.text === '') continue
    if (token.kind === 'text') {
      const span = document.createElement('span')
      span.textContent = token.text
      parent.append(span)
      continue
    }
    const el = token.kind === 'strong'
      ? document.createElement('strong')
      : token.kind === 'em'
        ? document.createElement('em')
        : document.createElement('code')
    el.textContent = token.text
    parent.append(el)
  }
}

/**
 * Render (replacing all prior children) the run-output `text` into `container`
 * as allowlist-Markdown DOM. Safe to call on every stream update; the caller
 * (public/operator-stream.js) guards on text change so re-renders happen at
 * chunk boundaries, not per status frame.
 * @param {Element} container
 * @param {string} text
 */
export function renderRunOutput(container, text) {
  if (container === null || container === undefined) return
  container.textContent = ''

  const blocks = parseRunOutputBlocks(text)
  for (const block of blocks) {
    if (block.kind === 'code') {
      const pre = document.createElement('pre')
      pre.dataset.role = 'run-output-code'
      if (!block.closed) pre.dataset.streamPartial = 'true'
      const code = document.createElement('code')
      code.textContent = block.text
      pre.append(code)
      container.append(pre)
      continue
    }
    if (block.kind === 'heading') {
      const p = document.createElement('p')
      p.dataset.role = 'run-output-heading'
      p.dataset.level = String(block.level)
      appendInlineNodes(p, block.inline)
      container.append(p)
      continue
    }
    if (block.kind === 'list') {
      const list = document.createElement(block.ordered ? 'ol' : 'ul')
      list.dataset.role = 'run-output-list'
      for (const item of block.items) {
        const li = document.createElement('li')
        appendInlineNodes(li, item)
        list.append(li)
      }
      container.append(list)
      continue
    }
    const p = document.createElement('p')
    appendInlineNodes(p, block.inline)
    container.append(p)
  }
}
