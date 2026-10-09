import {spawnSync} from 'node:child_process'
import {existsSync, readdirSync, readFileSync} from 'node:fs'
import {join, resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'
import {parse} from 'yaml'
import {
  CLOSE_COMMENT,
  GUARD_WORKFLOWS,
  ISSUE_TITLE,
  planWatch,
  redSignature,
  type GuardState,
} from '../scripts/scheduled-workflow-watch.ts'

/**
 * rm-289 (cycle 1, run 1930644a996e): the scheduled-workflow red watch.
 *
 * This suite pins BOTH halves of the watch:
 *   1. the pure decision core — strict-green semantics (only 'success' is
 *      green; no-completed-run counts red), the red-set signature dedup on
 *      the single tracked issue, open/update/close routing, the
 *      issues-disabled degrade, and exit codes;
 *   2. the wiring statics — the watch workflow carries the least-privilege
 *      permission set (actions: read + issues: write), stays zero-dependency
 *      (node script, no install step), and its GUARD_WORKFLOWS list covers
 *      EXACTLY the repository's cron-triggered workflows except fro-bot.yaml
 *      (disabled_manually with a documented missing-secret reason, AGENTS.md)
 *      and the watcher itself — a new scheduled workflow must join the list,
 *      and this is the test that forces it.
 *
 * Plus one end-to-end dry-run spawn: the negative (red) case must exit 1 and
 * print the exact issue it WOULD open — the offline negative proof that
 * replaces manufacturing a live red.
 */

const repoRoot = resolve(import.meta.dirname, '..')
const workflowsDir = join(repoRoot, '.github', 'workflows')

function state(file: string, conclusion: string | null): GuardState {
  const guard = GUARD_WORKFLOWS.find(entry => entry.file === file)
  if (guard === undefined) throw new Error(`unknown guard workflow fixture: ${file}`)
  return {
    file,
    name: guard.name,
    conclusion,
    event: conclusion === null ? null : 'schedule',
    runUrl: conclusion === null ? null : `https://github.com/codeo1io/dashboard/actions/runs/${file.length}`,
    completedAt: conclusion === null ? null : '2026-10-07T12:00:00Z',
  }
}

function mixedStates(): GuardState[] {
  return GUARD_WORKFLOWS.map(guard =>
    guard.file === 'canary.yaml' || guard.file === 'audit.yaml' ? state(guard.file, 'failure') : state(guard.file, 'success'),
  )
}

function greenStates(): GuardState[] {
  return GUARD_WORKFLOWS.map(guard => state(guard.file, 'success'))
}

function readWorkflow(name: string): {permissions?: Record<string, string>; on?: {schedule?: {cron: string}[]; workflow_dispatch?: unknown}} {
  return parse(readFileSync(join(workflowsDir, name), 'utf8')) as ReturnType<typeof readWorkflow>
}

function scheduledWorkflowFiles(): string[] {
  if (!existsSync(workflowsDir)) return []
  return readdirSync(workflowsDir)
    .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'))
    .filter(file => {
      const schedule = (parse(readFileSync(join(workflowsDir, file), 'utf8')) as {on?: {schedule?: unknown[]}} | null)?.on
        ?.schedule
      return Array.isArray(schedule) && schedule.length > 0
    })
}

function runDryRun(fixture: Record<string, unknown>): {status: number | null; stdout: string; stderr: string} {
  const result = spawnSync(
    process.execPath,
    ['--experimental-strip-types', join(repoRoot, 'scripts', 'scheduled-workflow-watch.ts'), '--dry-run', '-'],
    {input: JSON.stringify(fixture), encoding: 'utf8'},
  )
  return {status: result.status, stdout: result.stdout, stderr: result.stderr}
}

describe('scheduled-workflow watch — decision core (rm-289)', () => {
  it('green ONLY on success: every other completed conclusion and no-completed-run count red', () => {
    for (const conclusion of [null, 'failure', 'timed_out', 'startup_failure', 'cancelled', 'skipped']) {
      const plan = planWatch([state('codeql.yaml', conclusion)], {hasIssues: false, openIssue: null})
      expect(plan.reds, `conclusion ${String(conclusion)} must count red`).toHaveLength(1)
      expect(plan.exitCode).toBe(1)
    }
    const plan = planWatch([state('codeql.yaml', 'success')], {hasIssues: false, openIssue: null})
    expect(plan.reds).toHaveLength(0)
    expect(plan.exitCode).toBe(0)
  })

  it('red signature is stable, sorted, and empty when green', () => {
    const states = mixedStates()
    const signature = redSignature(states)
    expect(signature).toBe('audit.yaml:failure,canary.yaml:failure')
    expect(redSignature([...states].reverse())).toBe(signature)
    expect(redSignature(greenStates())).toBe('')
  })

  it('red + issues enabled + no open issue → opens ONE tracked issue and exits 1', () => {
    const plan = planWatch(mixedStates(), {hasIssues: true, openIssue: null})
    expect(plan.issueAction.kind).toBe('open')
    if (plan.issueAction.kind !== 'open') return
    expect(plan.issueAction.title).toBe(ISSUE_TITLE)
    expect(plan.issueAction.body).toContain('signature: audit.yaml:failure,canary.yaml:failure')
    expect(plan.issueAction.body).toContain('GraphQL canary (canary.yaml)')
    expect(plan.issueAction.body).toContain('](') // the run URL link
    expect(plan.exitCode).toBe(1)
    expect(plan.issuesRouteAvailable).toBe(true)
  })

  it('red + open issue whose body carries a DIFFERENT signature → comment + rewrite, exits 1', () => {
    const plan = planWatch(mixedStates(), {
      hasIssues: true,
      openIssue: {number: 12, body: 'signature: cve-tripwire.yaml:failure'},
    })
    expect(plan.issueAction.kind).toBe('update')
    if (plan.issueAction.kind !== 'update') return
    expect(plan.issueAction.number).toBe(12)
    expect(plan.issueAction.comment).toContain('signature: audit.yaml:failure,canary.yaml:failure')
    expect(plan.exitCode).toBe(1)
  })

  it('red + open issue already describing exactly this red set → dedup no-op, still exits 1', () => {
    const signature = redSignature(mixedStates())
    const plan = planWatch(mixedStates(), {
      hasIssues: true,
      openIssue: {number: 12, body: `older prose\n\nsignature: ${signature}`},
    })
    expect(plan.issueAction.kind).toBe('none')
    if (plan.issueAction.kind !== 'none') return
    expect(plan.issueAction.reason).toContain('signature match')
    expect(plan.exitCode).toBe(1)
  })

  it('all green + open issue → close with the fixed green comment, exits 0', () => {
    const plan = planWatch(greenStates(), {hasIssues: true, openIssue: {number: 12, body: 'signature: canary.yaml:failure'}})
    expect(plan.issueAction.kind).toBe('close')
    if (plan.issueAction.kind !== 'close') return
    expect(plan.issueAction.number).toBe(12)
    expect(plan.issueAction.comment).toBe(CLOSE_COMMENT)
    expect(plan.exitCode).toBe(0)
  })

  it('all green + no issue → no-op, exits 0', () => {
    const plan = planWatch(greenStates(), {hasIssues: true, openIssue: null})
    expect(plan.issueAction.kind).toBe('none')
    expect(plan.exitCode).toBe(0)
  })

  it('issues disabled (has_issues=false, live probed 2026-10-09) → tracked-issue route skipped loudly, red still exits 1', () => {
    const plan = planWatch(mixedStates(), {hasIssues: false, openIssue: null})
    expect(plan.issueAction.kind).toBe('none')
    if (plan.issueAction.kind !== 'none') return
    expect(plan.issueAction.reason).toContain('has_issues=false')
    expect(plan.exitCode).toBe(1)
    expect(plan.issuesRouteAvailable).toBe(false)
  })
})

describe('scheduled-workflow watch — wiring statics (rm-289)', () => {
  it('GUARD_WORKFLOWS covers EXACTLY the cron-triggered workflows except fro-bot (disabled by design) and the watcher itself', () => {
    const expected = scheduledWorkflowFiles()
      .filter(file => file !== 'fro-bot.yaml' && file !== 'scheduled-watch.yaml')
      .sort()
    const watched = GUARD_WORKFLOWS.map(guard => guard.file).sort()
    expect(
      watched,
      'GUARD_WORKFLOWS must track the scheduled guard layer exactly — a new cron-triggered workflow must join the list (fro-bot.yaml is the only deliberate exclusion: disabled_manually, AGENTS.md).',
    ).toEqual(expected)
  })

  it('the watch holds the least-privilege permission set: contents read, actions read, issues write', () => {
    expect(readWorkflow('scheduled-watch.yaml').permissions).toEqual({contents: 'read', actions: 'read', issues: 'write'})
  })

  it('the watch is scheduled after the guard layer settles and manually dispatchable', () => {
    const doc = readWorkflow('scheduled-watch.yaml')
    const crons = (doc.on?.schedule ?? []).map(entry => entry.cron)
    expect(crons).toEqual(['37 8 * * 1', '37 8 * * 3'])
    expect(doc.on?.workflow_dispatch).toEqual({})
  })

  it('the watch runs the zero-dependency script via plain node (no install step)', () => {
    const text = readFileSync(join(workflowsDir, 'scheduled-watch.yaml'), 'utf8')
    const executable = text
      .split('\n')
      .filter(line => !line.trimStart().startsWith('#'))
      .join('\n')
    expect(executable).toContain('node scripts/scheduled-workflow-watch.ts')
    expect(executable).not.toContain('pnpm install')
    expect(executable).not.toContain('npm ci')
    // Digest-pinned first-party actions only (checkout pin matches the other guard workflows).
    expect(executable).toContain('actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1')
    expect(executable).toContain('persist-credentials: false')
    expect(executable).toContain('runs-on: ubuntu-24.04')
  })
})

describe('scheduled-workflow watch — dry-run harness (rm-289)', () => {
  it('NEGATIVE CASE: red fixture exits 1 and prints the issue it would open (the offline fired-on-red proof)', () => {
    const runs: Record<string, Record<string, string>> = {}
    for (const guard of GUARD_WORKFLOWS) {
      runs[guard.file] =
        guard.file === 'canary.yaml'
          ? {conclusion: 'failure', event: 'schedule', runUrl: 'https://example/1', completedAt: '2026-10-12T05:23:00Z'}
          : {conclusion: 'success', event: 'schedule', runUrl: 'https://example/2', completedAt: '2026-10-12T03:37:00Z'}
    }
    const result = runDryRun({hasIssues: true, openIssue: null, runs})
    expect(result.stderr, result.stderr).toBe('')
    expect(result.status).toBe(1)
    expect(result.stdout).toContain('would-open-issue')
    expect(result.stdout).toContain(ISSUE_TITLE)
    expect(result.stdout).toContain('signature: canary.yaml:failure')
    expect(result.stdout).toContain('DRY-RUN EXIT 1')
  })

  it('degrade case: red + issues disabled → no issue route, red run is the alert, still exits 1', () => {
    const runs: Record<string, Record<string, string>> = {
      'canary.yaml': {conclusion: 'failure', event: 'schedule'},
    }
    const result = runDryRun({hasIssues: false, openIssue: null, runs})
    expect(result.status).toBe(1)
    expect(result.stdout).toContain('issue-route-none')
    expect(result.stdout).toContain('has_issues=false')
  })

  it('green + open tracked issue exits 0 and closes the issue', () => {
    const runs: Record<string, Record<string, string>> = {}
    for (const guard of GUARD_WORKFLOWS) {
      runs[guard.file] = {conclusion: 'success', event: 'schedule'}
    }
    const result = runDryRun({hasIssues: true, openIssue: {number: 7, body: 'signature: canary.yaml:failure'}, runs})
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('would-close-issue #7')
    expect(result.stdout).toContain('DRY-RUN EXIT 0')
  })

  it('a guard with NO completed run is reported as red-family with the distinct label', () => {
    const runs: Record<string, Record<string, string>> = {
      'codeql.yaml': {conclusion: 'success', event: 'schedule'},
    }
    const result = runDryRun({hasIssues: false, openIssue: null, runs})
    expect(result.status).toBe(1)
    expect(result.stdout).toContain('no completed run found')
    expect(result.stdout).toContain('RED no completed run found')
  })
})
