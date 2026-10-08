#!/usr/bin/env node
// rm-114 single-definition-site half: regenerate the SSE syntax block embedded
// in public/operator-stream.js from the canonical shared source
// src/gateway/operator-sse-syntax.ts. The browser twin is served raw from
// public/ with no build step, so it cannot import the TS canonical directly —
// it carries a generated, type-stripped copy between the SSE-SYNTAX-GENERATED
// markers instead. The gate half lives at
// test/operator-sse-syntax-divergence.test.ts, which imports
// generateOperatorSseSyntaxBlock() from here so `pnpm test` fails on drift.
//
// Usage:
//   node scripts/gen-operator-sse-syntax.ts          rewrite the embedded block
//   node scripts/gen-operator-sse-syntax.ts --check  verify only; exit 1 on drift

import {readFileSync, writeFileSync} from 'node:fs'
import process from 'node:process'
import {pathToFileURL} from 'node:url'
import ts from 'typescript'

const REPO_ROOT = new URL('..', import.meta.url)
const CANONICAL_URL = new URL('src/gateway/operator-sse-syntax.ts', REPO_ROOT)
const TARGET_URL = new URL('public/operator-stream.js', REPO_ROOT)

export const BEGIN_MARKER =
  '// >>> SSE-SYNTAX-GENERATED (from src/gateway/operator-sse-syntax.ts — regenerate: node scripts/gen-operator-sse-syntax.ts)'
export const END_MARKER = '// <<< SSE-SYNTAX-GENERATED'

// Rules the TS emitter's own formatting cannot satisfy; the canonical TS
// source (src/gateway/operator-sse-syntax.ts) IS linted under the full config
// — these disables apply only to the emitter's byte-level style choices, not
// to any correctness rule.
const EMIT_STYLE_DISABLE =
  '/* eslint-disable @stylistic/brace-style, @stylistic/object-curly-spacing -- generated block: TS-emit style artifacts; canonical src/gateway/operator-sse-syntax.ts is the linted source */'
const EMIT_STYLE_ENABLE =
  '/* eslint-enable @stylistic/brace-style, @stylistic/object-curly-spacing */'

/**
 * Deterministic emit-style → twin-style post-process. The canonical's output
 * is plain-JS statements only; two transforms are exact for that shape:
 * - 4-space emitter indent → the twin's 2-space (halve every leading-space run
 *   of 2+ spaces — the emitter only emits 4-space multiples for code; the
 *   1-space JSDoc continuation runs stay put).
 * - statement-terminating ';' → the twin's no-semicolon style (strip every
 *   line-end ';'). Convention kept true by the canonical — no line of the
 *   shared source ends a comment or string with ';' — and behavioral
 *   equivalence of the embedded block to the canonical is pinned by
 *   test/operator-stream-core.test.ts importing both halves.
 */
function toTwinStyle(emit: string): string {
  return emit
    .replaceAll(/^ {2,}/gm, leading => ' '.repeat(leading.length / 2))
    .replaceAll(/;$/gm, '')
}

/**
 * Render the canonical TS source as the plain-JS block embedded in the browser
 * twin. Deterministic by construction: single-pass transpileModule (types
 * stripped, comments preserved) + flattening the canonical's value exports
 * (`export const/function/let/class`) to plain declarations, which the twin
 * re-exports by name. The canonical is dependency-free by contract — any
 // non-flattenable export shape would surface here as visible breakage.
 */
export function generateOperatorSseSyntaxBlock(): string {
  const source = readFileSync(CANONICAL_URL, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText
  const stripped = output.replaceAll(/^export (const|function|let|class) /gm, '$1 ')
  return `${BEGIN_MARKER}\n${EMIT_STYLE_DISABLE}\n${toTwinStyle(stripped).trimEnd()}\n${EMIT_STYLE_ENABLE}\n${END_MARKER}\n`
}

/** Extract the current embedded block from the twin (null when absent/malformed). */
export function extractOperatorSseSyntaxBlock(target: string): string | null {
  const begin = target.indexOf(BEGIN_MARKER)
  const end = target.indexOf(END_MARKER)
  if (begin === -1 || end === -1 || end < begin) return null
  return `${target.slice(begin, end + END_MARKER.length)}\n`
}

function main(): void {
  const target = readFileSync(TARGET_URL, 'utf8')
  const current = extractOperatorSseSyntaxBlock(target)
  if (current === null) {
    process.stderr.write(
      'gen-operator-sse-syntax: SSE-SYNTAX-GENERATED markers not found in public/operator-stream.js\n',
    )
    process.exit(1)
  }
  const expected = generateOperatorSseSyntaxBlock()
  if (current === expected) {
    process.stdout.write('gen-operator-sse-syntax: embedded block up to date\n')
    return
  }
  if (process.argv.includes('--check')) {
    process.stderr.write(
      'gen-operator-sse-syntax: DRIFT — the embedded block does not match src/gateway/operator-sse-syntax.ts\n' +
      'run: node scripts/gen-operator-sse-syntax.ts\n',
    )
    process.exit(1)
  }
  writeFileSync(TARGET_URL, target.replace(current, () => expected))
  process.stdout.write('gen-operator-sse-syntax: embedded block regenerated\n')
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href
if (invokedDirectly) {
  main()
}
