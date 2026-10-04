import {existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'

import {
  bareToolName,
  buildHookPayload,
  createDefaultRunner,
  createHook,
  extractFeedbackText,
  extractTouchedPaths,
  HOOK_SCRIPT_RELATIVE_PATH,
  isMutatingTool,
  type DetectorRunner,
  type DetectorRunResult,
} from './hook-bridge.ts'

function makeOutput(initial = 'ok') {
  return { title: 't', output: initial, metadata: {} }
}

function makeInput(overrides: Partial<{ tool: string; sessionID: string; callID: string; args: unknown }> = {}) {
  return {
    tool: 'edit',
    sessionID: 'sess-1',
    callID: 'call-1',
    args: { filePath: '/repo/web/src/App.tsx' },
    ...overrides,
  }
}

describe('isMutatingTool', () => {
  it('is true for bare mutating tool names', () => {
    expect(isMutatingTool('edit')).toBe(true)
    expect(isMutatingTool('write')).toBe(true)
    expect(isMutatingTool('apply_patch')).toBe(true)
  })

  it('is true for MCP-namespaced suffixed tool names', () => {
    expect(isMutatingTool('aft_edit')).toBe(true)
    expect(isMutatingTool('x_write')).toBe(true)
    expect(isMutatingTool('aft_apply_patch')).toBe(true)
  })

  it('is false for non-mutating tools', () => {
    expect(isMutatingTool('read')).toBe(false)
    expect(isMutatingTool('bash')).toBe(false)
    expect(isMutatingTool('grep')).toBe(false)
  })
})

describe('extractTouchedPaths', () => {
  it('pulls filePath from edit/write args', () => {
    expect(extractTouchedPaths('edit', { filePath: '/a/b.ts' })).toEqual(['/a/b.ts'])
    expect(extractTouchedPaths('write', { filePath: '/a/c.ts' })).toEqual(['/a/c.ts'])
  })

  it('parses Add/Update/Delete/Move marker lines from apply_patch patchText', () => {
    const patchText = [
      '*** Begin Patch',
      '*** Add File: a.ts',
      '+content',
      '*** Update File: b.ts',
      '*** Delete File: c.ts',
      '*** Move to: d.ts',
      '*** End Patch',
    ].join('\n')
    expect(extractTouchedPaths('apply_patch', { patchText })).toEqual(['a.ts', 'b.ts', 'c.ts', 'd.ts'])
  })

  it('returns [] for missing/empty args', () => {
    expect(extractTouchedPaths('edit', undefined)).toEqual([])
    expect(extractTouchedPaths('edit', null)).toEqual([])
    expect(extractTouchedPaths('edit', {})).toEqual([])
    expect(extractTouchedPaths('apply_patch', {})).toEqual([])
    expect(extractTouchedPaths('edit', 'not-an-object')).toEqual([])
  })

  it('parses marker lines for an MCP-suffixed apply_patch tool name', () => {
    const patchText = '*** Add File: a.ts\n*** Update File: b.ts\n'
    expect(extractTouchedPaths('aft_apply_patch', { patchText })).toEqual(['a.ts', 'b.ts'])
  })
})

describe('bareToolName', () => {
  it('passes bare mutating and non-mutating names through unchanged', () => {
    expect(bareToolName('edit')).toBe('edit')
    expect(bareToolName('write')).toBe('write')
    expect(bareToolName('apply_patch')).toBe('apply_patch')
    expect(bareToolName('read')).toBe('read')
  })

  it('strips MCP namespace prefixes', () => {
    expect(bareToolName('aft_edit')).toBe('edit')
    expect(bareToolName('x_apply_patch')).toBe('apply_patch')
  })
})

describe('buildHookPayload', () => {
  it('produces the exact field names hook.mjs reads for a representative edit event', () => {
    const payload = buildHookPayload({
      tool: 'edit',
      args: { filePath: '/repo/web/src/App.tsx' },
      cwd: '/repo',
      sessionID: 'sess-1',
    })
    expect(payload).toEqual({
      tool_name: 'edit',
      tool_input: { file_path: '/repo/web/src/App.tsx' },
      cwd: '/repo',
      session_id: 'sess-1',
    })
  })

  it('normalizes an MCP-suffixed edit tool_name to bare and keeps file_path', () => {
    const payload = buildHookPayload({
      tool: 'aft_edit',
      args: { filePath: '/repo/web/src/App.tsx' },
      cwd: '/repo',
      sessionID: 'sess-1',
    })
    expect(payload.tool_name).toBe('edit')
    expect(payload.tool_input).toEqual({ file_path: '/repo/web/src/App.tsx' })
  })

  it('sets tool_input.command to the patch text for apply_patch (no file_path)', () => {
    const patchText = '*** Begin Patch\n*** Add File: a.ts\n+x\n*** End Patch'
    const payload = buildHookPayload({
      tool: 'apply_patch',
      args: { patchText },
      cwd: '/repo',
      sessionID: 'sess-1',
    })
    expect(payload.tool_name).toBe('apply_patch')
    expect(payload.tool_input).toEqual({ command: patchText })
  })

  it('sets tool_input.command to the patch text for an MCP-suffixed apply_patch tool_name', () => {
    const patchText = '*** Begin Patch\n*** Update File: b.ts\n*** End Patch'
    const payload = buildHookPayload({
      tool: 'aft_apply_patch',
      args: { patchText },
      cwd: '/repo',
      sessionID: 'sess-1',
    })
    expect(payload.tool_name).toBe('apply_patch')
    expect(payload.tool_input).toEqual({ command: patchText })
  })

  it('falls back to empty string values when args are empty', () => {
    expect(buildHookPayload({ tool: 'edit', args: {}, cwd: '/r', sessionID: 's' }).tool_input).toEqual({
      file_path: '',
    })
    expect(buildHookPayload({ tool: 'apply_patch', args: {}, cwd: '/r', sessionID: 's' }).tool_input).toEqual({
      command: '',
    })
  })
})

function fakeRunner(result: DetectorRunResult | Error, calls: unknown[][] = []) {
  return async (...args: unknown[]) => {
    calls.push(args)
    if (result instanceof Error) throw result
    return result
  }
}

describe('bridge (createHook)', () => {
  it('invokes the runner once with the file path in the payload for a mutating tool', async () => {
    const calls: unknown[][] = []
    const hook = createHook({
      runDetector: fakeRunner({ stdout: '', stderr: '', exitCode: 0 }, calls),
      worktree: '/repo',
    })
    await hook(makeInput(), makeOutput())
    expect(calls).toHaveLength(1)
    const [payload] = calls[0] as [ReturnType<typeof buildHookPayload>]
    expect(payload.tool_input).toEqual({ file_path: '/repo/web/src/App.tsx' })
  })

  it('invokes the runner zero times for a non-mutating tool', async () => {
    const calls: unknown[][] = []
    const hook = createHook({
      runDetector: fakeRunner({ stdout: '', stderr: '', exitCode: 0 }, calls),
      worktree: '/repo',
    })
    await hook(makeInput({ tool: 'read' }), makeOutput())
    expect(calls).toHaveLength(0)
  })

  it('invokes the runner zero times when no path can be extracted', async () => {
    const calls: unknown[][] = []
    const hook = createHook({
      runDetector: fakeRunner({ stdout: '', stderr: '', exitCode: 0 }, calls),
      worktree: '/repo',
    })
    await hook(makeInput({ args: {} }), makeOutput())
    expect(calls).toHaveLength(0)
  })

  it('degrades to no-op without throwing when the runner exceeds the timeout', async () => {
    const hook = createHook({
      runDetector: () => new Promise<DetectorRunResult>(() => {}), // never resolves
      worktree: '/repo',
      timeoutMs: 10,
    })
    const output = makeOutput()
    await expect(hook(makeInput(), output)).resolves.toBeUndefined()
    expect(output.output).toBe('ok')
  })

  // rm-622: the timeout must not merely abandon the losing runner — it must
  // hand the runner a cancellation signal (the default Bun runner kills its
  // `node hook.mjs` process tree on it), and an abandoned runner settling
  // after the race must never surface as an unhandled rejection or a late
  // output mutation.
  it('aborts the cancellation signal handed to the runner when the timeout wins (rm-622)', async () => {
    const seenSignals: AbortSignal[] = []
    const hook = createHook({
      runDetector: (_payload, opts) => {
        seenSignals.push(opts.signal)
        // Never settles on its own: only the timeout can end this race.
        return new Promise<DetectorRunResult>(() => {})
      },
      worktree: '/repo',
      timeoutMs: 10,
    })
    const output = makeOutput()
    await expect(hook(makeInput(), output)).resolves.toBeUndefined()
    expect(output.output).toBe('ok') // no-op degrade behavior is unchanged
    expect(seenSignals).toHaveLength(1)
    expect(seenSignals[0]?.aborted).toBe(true)
  })

  it('never aborts the signal when the runner settles inside the timeout (rm-622)', async () => {
    let signal: AbortSignal | undefined
    const hook = createHook({
      runDetector: (_payload, opts) => {
        signal = opts.signal
        return Promise.resolve<DetectorRunResult>({stdout: '', stderr: '', exitCode: 0})
      },
      worktree: '/repo',
      timeoutMs: 1_000,
    })
    await expect(hook(makeInput(), makeOutput())).resolves.toBeUndefined()
    expect(signal?.aborted).toBe(false)
  })

  it('drops a late resolve from the abandoned runner without touching output (rm-622)', async () => {
    let resolveLate: (result: DetectorRunResult) => void = () => {}
    const hook = createHook({
      runDetector: () =>
        new Promise<DetectorRunResult>((resolve) => {
          resolveLate = resolve
        }),
      worktree: '/repo',
      timeoutMs: 10,
    })
    const output = makeOutput()
    await expect(hook(makeInput(), output)).resolves.toBeUndefined()
    resolveLate({stdout: 'late', stderr: '', exitCode: 0})
    await new Promise((resolve) => setImmediate(resolve))
    expect(output.output).toBe('ok')
  })

  it('cannot surface a late rejection from the abandoned runner as an unhandled rejection (rm-622)', async () => {
    // The race site attaches handlers to the runner promise, so its late
    // rejection is absorbed instead of reaching process-level unhandled
    // reporting — this test pins that property (the shape a killed subprocess
    // tree produces when the kill rejects the shell promise).
    const unhandled: unknown[] = []
    const onUnhandled = (reason: unknown) => {
      unhandled.push(reason)
    }
    process.on('unhandledRejection', onUnhandled)
    let rejectLate: (err: Error) => void = () => {}
    const hook = createHook({
      runDetector: () =>
        new Promise<DetectorRunResult>((_resolve, reject) => {
          rejectLate = reject
        }),
      worktree: '/repo',
      timeoutMs: 10,
    })
    const output = makeOutput()
    await expect(hook(makeInput(), output)).resolves.toBeUndefined()
    rejectLate(new Error('killed detector subtree rejected after the timeout'))
    // Drain microtasks + the immediate queue: Node reports an unhandled
    // rejection only after a tick passes with no handler anywhere.
    await new Promise((resolve) => setImmediate(resolve))
    await new Promise((resolve) => setImmediate(resolve))
    process.off('unhandledRejection', onUnhandled)
    expect(unhandled).toEqual([])
  })
})

describe('extractFeedbackText', () => {
  it('extracts additionalContext from the claude hookSpecificOutput envelope', () => {
    const stdout = JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: 'hello' },
    })
    expect(extractFeedbackText(stdout)).toBe('hello')
  })

  it('extracts top-level additionalContext', () => {
    expect(extractFeedbackText(JSON.stringify({ additionalContext: 'hi' }))).toBe('hi')
  })

  it('extracts snake_case additional_context', () => {
    expect(extractFeedbackText(JSON.stringify({ additional_context: 'fix me' }))).toBe('fix me')
  })

  it('returns non-JSON plain text verbatim (trimmed)', () => {
    expect(extractFeedbackText('  found: hardcoded hex color  \n')).toBe('found: hardcoded hex color')
  })

  it('returns "" for empty/whitespace input', () => {
    expect(extractFeedbackText('')).toBe('')
    expect(extractFeedbackText('   \n\t')).toBe('')
  })

  it('falls back to raw trimmed stdout for a bare JSON string', () => {
    expect(extractFeedbackText('"x"')).toBe('"x"')
  })

  it('falls back to raw trimmed stdout when JSON has no recognized context field', () => {
    const stdout = JSON.stringify({ foo: 'bar' })
    expect(extractFeedbackText(stdout)).toBe(stdout)
  })
})

describe('surface', () => {
  it('appends only the inner additionalContext text (not raw JSON) when the runner returns findings', async () => {
    const stdout = JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: 'found: gradient-text at L3' },
    })
    const hook = createHook({
      runDetector: fakeRunner({ stdout, stderr: '', exitCode: 0 }),
      worktree: '/repo',
    })
    const output = makeOutput()
    await hook(makeInput(), output)
    expect(output.output).toContain('found: gradient-text at L3')
    expect(output.output).toContain('<impeccable_feedback>')
    expect(output.output).not.toContain('hookSpecificOutput')
  })

  it('leaves output.output byte-unchanged when stdout is empty', async () => {
    const hook = createHook({
      runDetector: fakeRunner({ stdout: '', stderr: '', exitCode: 0 }),
      worktree: '/repo',
    })
    const output = makeOutput()
    await hook(makeInput(), output)
    expect(output.output).toBe('ok')
  })

  it('leaves output.output byte-unchanged when stdout is whitespace-only', async () => {
    const hook = createHook({
      runDetector: fakeRunner({ stdout: '   \n', stderr: '', exitCode: 0 }),
      worktree: '/repo',
    })
    const output = makeOutput()
    await hook(makeInput(), output)
    expect(output.output).toBe('ok')
  })
})

describe('fail-loud', () => {
  it('warns when the detector exits nonzero (hook.mjs is contractually always-exit-0)', async () => {
    const hook = createHook({
      runDetector: fakeRunner({ stdout: '', stderr: 'node: cannot find module', exitCode: 1 }),
      worktree: '/repo',
    })
    const output = makeOutput()
    await hook(makeInput(), output)
    expect(output.output).toContain('[impeccable]')
    expect(output.output).toContain('did not run cleanly')
  })

  it('warns once (does not throw) when the runner throws', async () => {
    const hook = createHook({
      runDetector: fakeRunner(new Error('boom')),
      worktree: '/repo',
    })
    const output = makeOutput()
    await expect(hook(makeInput(), output)).resolves.toBeUndefined()
    expect(output.output).toContain('[impeccable]')
  })

  it('does not re-warn on a second failure in the same session (same hook instance)', async () => {
    const hook = createHook({
      runDetector: fakeRunner(new Error('boom')),
      worktree: '/repo',
    })
    const output1 = makeOutput()
    await hook(makeInput(), output1)
    expect(output1.output).toContain('[impeccable]')

    const output2 = makeOutput()
    await hook(makeInput(), output2)
    expect(output2.output).toBe('ok')
  })
})

describe('createDefaultRunner (rm-622: abort kills the whole hook.mjs tree)', () => {
  it('SIGKILLs hook.mjs AND its spawned child on abort, resolving kill-shaped', async () => {
    const worktree = mkdtempSync(join(tmpdir(), 'rm-622-kill-'))
    const scriptsDir = join(worktree, HOOK_SCRIPT_RELATIVE_PATH, '..')
    mkdirSync(scriptsDir, {recursive: true})
    const pidsFile = join(worktree, 'pids.json')
    writeFileSync(
      join(scriptsDir, 'hook.mjs'),
      `import {spawn} from 'node:child_process'
import {writeFileSync} from 'node:fs'
const child = spawn('sleep', ['30'], {stdio: 'ignore'})
writeFileSync(${JSON.stringify(pidsFile)}, JSON.stringify({hookPid: process.pid, childPid: child.pid}))
setInterval(() => {}, 1 << 30)
`,
    )

    const cancel = new AbortController()
    const runner = createDefaultRunner()
    const resultPromise = runner({} as unknown as Parameters<DetectorRunner>[0], {
      worktree,
      signal: cancel.signal,
    })

    // Wait for the fake hook to have actually spawned its child.
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (existsSync(pidsFile)) break
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    const {hookPid, childPid} = JSON.parse(readFileSync(pidsFile, 'utf8')) as {hookPid: number; childPid: number}

    cancel.abort()
    const result = await resultPromise
    expect(result.exitCode).toBe(-1) // kill-shaped, never a rejection

    await new Promise((resolve) => setTimeout(resolve, 1500))
    expect(alive(hookPid), 'hook.mjs survived the abort').toBe(false)
    expect(alive(childPid), 'hook.mjs child survived the abort — tree kill failed').toBe(false)
  }, 20000)

  it('returns stdout/exitCode and forwards the hook env on the clean path', async () => {
    const worktree = mkdtempSync(join(tmpdir(), 'rm-622-clean-'))
    const scriptsDir = join(worktree, HOOK_SCRIPT_RELATIVE_PATH, '..')
    mkdirSync(scriptsDir, {recursive: true})
    writeFileSync(
      join(scriptsDir, 'hook.mjs'),
      `process.stdout.write('quiet=' + process.env.IMPECCABLE_HOOK_QUIET + ' harness=' + process.env.IMPECCABLE_HOOK_HARNESS + ' depth=' + process.env.IMPECCABLE_HOOK_DEPTH)\nprocess.exit(0)\n`,
    )

    const cancel = new AbortController()
    const result = await createDefaultRunner()({} as unknown as Parameters<DetectorRunner>[0], {
      worktree,
      signal: cancel.signal,
    })
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('quiet=1')
    expect(result.stdout).toContain('harness=claude')
    // IMPECCABLE_HOOK_DEPTH must stay UNSET — hook.mjs treats any depth value
    // as a re-entrancy signal and would no-op every scan.
    expect(result.stdout).toContain('depth=undefined')
    expect(cancel.signal.aborted).toBe(false)
  })
})

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}
