import {existsSync, readFileSync, readdirSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'
import {parse} from 'yaml'

import {classifyWorkflows} from '../scripts/actions-darkness-watch.ts'
import {parseManifest} from '../scripts/workflow-fleet-assert.ts'

// rm-2141 workflow-fleet state manifest (2026-10-21, repository-maintenance
// cycle:4 run 18ef6d162e3f439991a7b3c1a729cec0). The chronic silent-failure
// class — a workflow silently disabled, an active ghost running with no file
// in the tree, a scheduled workflow silently going stale — becomes a
// designed-red check: .github/workflow-fleet-manifest.yaml declares the
// expected fleet, scripts/workflow-fleet-assert.ts compares it to the LIVE
// fleet weekly from the audit.yaml fleet-state job, and THIS guard pins the
// in-tree side: manifest ↔ tree files bidirectionally, the ghost row, the
// cron/horizon consistency, and the CI lane that runs the assert. A new
// workflow file lands manifested or this guard fails; the ghost's live-active
// divergence stays recorded until the estate actually retires it.

// Same conductor/ci-* scoping as test/workflow-hardening-guard.test.ts: those
// synthetic validation PRs carry main's workflow files by construction, so
// pinning the manifest there would report the route's substitution.
const ciRef = process.env.GITHUB_HEAD_REF ?? process.env.GITHUB_REF_NAME ?? ''
const describeFleetGuard = describe.skipIf(ciRef.startsWith('conductor/ci-'))

const workflowsDir = join(process.cwd(), '.github', 'workflows')
const manifestPath = join(process.cwd(), '.github', 'workflow-fleet-manifest.yaml')

describeFleetGuard('workflow fleet state guard — manifest ↔ tree (rm-2141)', () => {
  const treeFiles = readdirSync(workflowsDir)
    .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
    .sort()
  const treePaths = new Set(treeFiles.map(f => `.github/workflows/${f}`))
  const entries = parseManifest(readFileSync(manifestPath, 'utf8'))
  const activeEntries = entries.filter(e => e.expected_state === 'active')
  const retiredEntries = entries.filter(e => e.expected_state === 'retired')

  it('manifest exists and parses with the full fleet', () => {
    expect(existsSync(manifestPath)).toBe(true)
    expect(treeFiles.length, 'the 13-workflow fleet of 2026-10-21 plus any additions').toBeGreaterThanOrEqual(13)
    expect(entries.length, 'every tree workflow plus the ghost row').toBeGreaterThanOrEqual(14)
  })

  it('expected-active entries cover the tree files exactly (bidirectional)', () => {
    const activePaths = new Set(activeEntries.map(e => e.path))
    for (const entry of activeEntries) {
      expect(
        treePaths.has(entry.path),
        `${entry.path}: manifested active but the file is absent from the tree`,
      ).toBe(true)
    }
    for (const path of treePaths) {
      expect(activePaths.has(path), `${path}: workflow file present but not manifested active`).toBe(true)
    }
    expect(activePaths.size).toBe(treePaths.size)
  })

  it('retired entries are ghost rows only — no file may back them', () => {
    expect(retiredEntries.length).toBeGreaterThanOrEqual(1)
    for (const entry of retiredEntries) {
      expect(
        treePaths.has(entry.path),
        `${entry.path}: manifested retired but a live file still backs it — delete the file or the row`,
      ).toBe(false)
    }
  })

  it('records the known ghost: lockfile-guard id 375606447, expected retired', () => {
    const ghost = retiredEntries.find(e => e.path === '.github/workflows/lockfile-guard.yaml')
    expect(ghost, 'the ghost row must stay manifested until the estate retires the live workflow').toBeDefined()
    expect(ghost?.id).toBe(375606447)
    expect(ghost?.run_recency_hours).toBeNull()
  })

  it('run_recency_hours is set exactly for scheduled workflows (horizon consistency)', () => {
    const texts: Record<string, string> = {}
    for (const f of treeFiles) texts[f] = readFileSync(join(workflowsDir, f), 'utf8')
    const triggers = classifyWorkflows(texts)
    for (const entry of activeEntries) {
      const name = entry.path.replace(/^\.github\/workflows\//, '')
      const scheduled = (triggers[name] ?? []).includes('schedule')
      if (scheduled) {
        expect(
          entry.run_recency_hours,
          `${entry.path}: scheduled workflows must declare a staleness horizon`,
        ).not.toBeNull()
      } else {
        expect(
          entry.run_recency_hours,
          `${entry.path}: non-scheduled workflows get no horizon (push/PR tracking is actions-darkness-watch.ts's lane)`,
        ).toBeNull()
      }
    }
  })

  it('manifest values are single-quoted-string-safe YAML with correct vocabulary', () => {
    // The eslint yml plugin (yml/quotes) would already catch quoting; this
    // leg pins the structural vocabulary the script relies on.
    const doc = parse(readFileSync(manifestPath, 'utf8')) as {workflows: {expected_state: unknown}[]}
    for (const w of doc.workflows) {
      expect(['active', 'retired']).toContain(w.expected_state)
    }
  })
})

describeFleetGuard('workflow fleet state guard — CI lane (rm-2141)', () => {
  const audit = readFileSync(join(workflowsDir, 'audit.yaml'), 'utf8')

  it('audit.yaml runs the fleet assert weekly with repo + token env', () => {
    expect(audit).toContain('fleet-state')
    expect(audit).toContain('scripts/workflow-fleet-assert.ts')
    expect(audit).toContain('FLEET_ASSERT_REPO: ${{ github.repository }}')
    expect(audit).toContain('GITHUB_TOKEN: ${{ github.token }}')
  })

  it('the fleet-state job is fallback-gated like the audit job and stays manually runnable', () => {
    const jobBlock = audit.slice(audit.indexOf('fleet-state:'))
    expect(jobBlock).toMatch(/if: github\.event_name == 'workflow_dispatch' \|\| needs\.fallback-gate\.outputs\.skip != 'true'/)
  })

  it('the fleet-state job is bounded (timeout-minutes, rm-2144 companion)', () => {
    const jobBlock = audit.slice(audit.indexOf('fleet-state:'), audit.indexOf('fleet-state:') + 1200)
    expect(jobBlock).toMatch(/timeout-minutes: \d+/)
  })
})
