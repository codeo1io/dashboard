/**
 * OpenCode plugin registration for the Impeccable design hook bridge.
 *
 * The OpenCode plugin loader iterates this module's exports and treats each
 * as a candidate plugin factory, so this file exports ONLY the plugin
 * function — all pure logic (helpers, `createHook`, the default subprocess
 * runner) lives in `./hook-bridge.ts`, which stays Bun-`$`-free and
 * Node-testable. This file is Bun-only at runtime and is never imported by
 * tests.
 *
 * rm-622 note: the default runner previously lived here and spawned
 * hook.mjs via the injected `$` — but a Bun ShellPromise exposes no
 * cancellation handle (declared or live — probed on Bun 1.4.2,
 * 2026-10-04), so a timed-out scan always stranded the hook.mjs process
 * tree. The runner now lives in hook-bridge.ts as a detached
 * `node:child_process` group the bridge SIGKILLs on abort; this file only
 * wires it in.
 */

import type { Plugin } from '@opencode-ai/plugin'

import { createDefaultRunner, createHook } from './hook-bridge.ts'

export const ImpeccablePlugin: Plugin = async (input) => ({
  'tool.execute.after': createHook({ runDetector: createDefaultRunner(), worktree: input.worktree }),
})
