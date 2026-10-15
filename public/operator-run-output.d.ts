/**
 * Types for public/operator-run-output.js — the allowlist-Markdown run-output
 * renderer (rm-1440, upstream #586).
 */

export type RunOutputBlock =
  | {kind: 'code'; text: string; closed: boolean}
  | {kind: 'heading'; level: number; inline: string}
  | {kind: 'list'; ordered: boolean; items: string[]}
  | {kind: 'paragraph'; inline: string}

export type RunOutputInlineToken =
  | {kind: 'text'; text: string}
  | {kind: 'strong'; text: string}
  | {kind: 'em'; text: string}
  | {kind: 'code'; text: string}

export declare function parseRunOutputBlocks(text: string): RunOutputBlock[]
export declare function parseRunOutputInline(text: string): RunOutputInlineToken[]
export declare function renderRunOutput(container: Element, text: string): void
