import {spawn} from 'node:child_process'
import process from 'node:process'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'

// rm-1974 (cycle-2 batch, 2026-10-17): the impeccable PostToolUse hook is
// spawned by the harness with no timeout of its own (upstream fro-bot/agent
// issue #193), so a wedged run would hang the parent turn forever. The hook
// now self-bounds with a wall-clock budget (IMPECCABLE_HOOK_TIMEOUT_MS,
// default 10s; invalid or negative values fall back to the default) and, when
// the budget fires, exits 124 with a loud stderr line plus an audit entry —
// a cancelled check is strictly better than a hung one, and 124 is
// non-blocking in Claude Code hook semantics. This guard proves both the
// bound firing and the fallback paths by driving the real script as a child.

const hookPath = fileURLToPath(new URL('../.agents/skills/impeccable/scripts/hook.mjs', import.meta.url))

interface HookRunResult {
  code: number | null
  stdout: string
  stderr: string
}

async function runHook(args: {stdin: string; timeoutMs?: string; watchdogMs?: number}): Promise<HookRunResult> {
  return new Promise<HookRunResult>((resolveTest, rejectTest) => {
    const child = spawn(process.execPath, [hookPath], {
      env: {
        ...process.env,
        IMPECCABLE_HOOK_LOG: '',
        ...(args.timeoutMs === undefined ? {} : {IMPECCABLE_HOOK_TIMEOUT_MS: args.timeoutMs}),
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let settled = false
    let watchdog: ReturnType<typeof setTimeout>
    const finish = (code: number | null) => {
      if (settled) return
      settled = true
      clearTimeout(watchdog)
      resolveTest({code, stdout, stderr})
    }
    watchdog = setTimeout(() => {
      child.kill('SIGKILL')
      rejectTest(new Error('hook child ignored the test watchdog — the bound failed to protect the parent'))
    }, args.watchdogMs ?? 15_000)
    child.stdout.on('data', chunk => {
      stdout += chunk
    })
    child.stderr.on('data', chunk => {
      stderr += chunk
    })
    child.on('error', rejectTest)
    child.on('close', code => {
      finish(code)
    })
    child.stdin.on('error', () => {
      // EPIPE if the child exits before reading all stdin — fine here.
    })
    child.stdin.end(args.stdin)
  })
}

describe('impeccable hook wall-clock bound (rm-1974)', () => {
  it('fires loudly with exit 124 when the budget is exceeded', async () => {
    // A 512 KiB payload guarantees the read + parse + regex passes outlast a
    // 1 ms budget deterministically, so the deadline fires mid-work.
    const bigPayload = JSON.stringify({
      tool_name: 'Edit',
      tool_input: {file_path: `/tmp/x-${'a'.repeat(512 * 1024)}.ts`},
    })
    const {code, stderr} = await runHook({stdin: bigPayload, timeoutMs: '1'})
    expect(code).toBe(124)
    expect(stderr).toContain('wall-clock budget of 1ms exceeded')
    expect(stderr).toContain('abandoning the design check')
  })

  it('exits 0 on the default budget for a trivial event', async () => {
    const {code} = await runHook({stdin: ''})
    expect(code).toBe(0)
  })

  it('falls back to the default budget when the override is invalid', async () => {
    // 'banana' must fall back to the 10s default rather than parse to 0/NaN
    // and insta-fire — an empty event completes long before 10s, so exit 0.
    const {code} = await runHook({stdin: '', timeoutMs: 'banana'})
    expect(code).toBe(0)
  })

  it('falls back to the default budget when the override is negative', async () => {
    const {code} = await runHook({stdin: '', timeoutMs: '-5'})
    expect(code).toBe(0)
  })
})
