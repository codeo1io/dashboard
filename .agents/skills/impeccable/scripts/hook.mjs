#!/usr/bin/env node
/**
 * Impeccable design hook — PostToolUse entry point.
 *
 * Reads the Claude Code / Codex / Cursor hook event from stdin, runs the design
 * detector against the touched file, and emits a system reminder via
 * `hookSpecificOutput.additionalContext` when findings exist.
 *
 * Contract: never break a turn. Always exit 0 — sole exception: exit 124
 * when the wall-clock budget fires (a hung hook is strictly worse than a
 * cancelled one, and 124 is non-blocking in Claude Code hook semantics).
 * Clean files emit a small ack unless quiet mode is enabled.
 *
 * Most logic lives in `hook-lib.mjs` so it is unit-testable without a
 * subprocess. This file is the thin stdin/stdout adapter.
 */

import { runHook, writeAuditLog } from './hook-lib.mjs';

// Upstream fro-bot/agent issue #193: the harness spawns this hook with no
// timeout of its own, so a wedged run hangs the parent. Self-bound instead.
const DEFAULT_WALL_CLOCK_BUDGET_MS = 10_000;

function parseWallClockBudgetMs(raw) {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_WALL_CLOCK_BUDGET_MS;
}

async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf-8');
}

async function main() {
  // Snapshot the inherited env FIRST so the re-entrancy guard checks the
  // parent's value, not the value we are about to export for any child
  // processes the hook might ever spawn.
  const inheritedEnv = { ...process.env };
  process.env.IMPECCABLE_HOOK_DEPTH = process.env.IMPECCABLE_HOOK_DEPTH || '1';

  const budgetMs = parseWallClockBudgetMs(process.env.IMPECCABLE_HOOK_TIMEOUT_MS);
  const wallClock = setTimeout(() => {
    process.stderr.write(
      `[impeccable-hook] wall-clock budget of ${budgetMs}ms exceeded; abandoning the design check rather than hanging the parent hook\n`,
    );
    try {
      writeAuditLog(process.env, {
        ts: new Date().toISOString(),
        event: 'PostToolUse',
        error: `wall-clock budget of ${budgetMs}ms exceeded; hook aborted`,
      });
    } catch { /* swallow */ }
    process.exit(124);
  }, budgetMs);

  try {
    let stdinJson = '';
    try { stdinJson = await readStdin(); } catch { /* fall through */ }

    const result = await runHook({
      stdinJson,
      env: inheritedEnv,
      cwd: process.cwd(),
    });

    writeAuditLog(process.env, result.audit, process.cwd());

    if (result.stdout) process.stdout.write(result.stdout);
    process.exit(result.exitCode || 0);
  } finally {
    clearTimeout(wallClock);
  }
}

main().catch((err) => {
  // Last-ditch: never break the agent's turn even if something we did not
  // anticipate goes wrong. Audit-log the failure if logging is enabled.
  try {
    writeAuditLog(process.env, {
      ts: new Date().toISOString(),
      event: 'PostToolUse',
      error: String(err && err.message ? err.message : err),
    });
  } catch { /* swallow */ }
  if (process.env.IMPECCABLE_HOOK_DEBUG) {
    process.stderr.write(`[impeccable-hook] ${err}\n`);
  }
  process.exit(0);
});
