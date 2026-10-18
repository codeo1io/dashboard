import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {describe, expect, it} from 'vitest'

/**
 * rm-1977 — Dockerfile DASHBOARD_VERSION build-arg documentation pin.
 *
 * The Dockerfile bakes VITE_DASHBOARD_VERSION from the DASHBOARD_VERSION ARG,
 * and web/src/shell/AppShell.tsx renders it in the client footer. Before this
 * guard, no operator doc mentioned the knob at all (it landed silently with the
 * 2026.10.43 adoption residual): an operator rebuilding the image could not
 * discover it and a `dev` footer read as a bug. The guard pins the runbook
 * section (gateway-access.md) plus the Dockerfile pointer comment so the three
 * surfaces cannot drift silently apart again.
 */
const repoRoot = join(import.meta.dirname, '..')
const runbook = readFileSync(join(repoRoot, 'docs/runbooks/gateway-access.md'), 'utf8')
const dockerfile = readFileSync(join(repoRoot, 'Dockerfile'), 'utf8')

describe('rm-1977: DASHBOARD_VERSION runbook coverage', () => {
  it('gateway-access.md documents the DASHBOARD_VERSION section', () => {
    expect(
      runbook.includes('## Dashboard version (`DASHBOARD_VERSION`'),
      'docs/runbooks/gateway-access.md lost its DASHBOARD_VERSION section',
    ).toBe(true)
  })

  it('the runbook explains build-time baking and where the value renders', () => {
    expect(runbook).toContain('--build-arg DASHBOARD_VERSION=')
    expect(runbook).toContain('web/src/shell/AppShell.tsx')
    expect(runbook).toContain('ENV VITE_DASHBOARD_VERSION')
  })

  it('the Dockerfile ARG carries the runbook pointer comment', () => {
    const argLine = dockerfile
      .split('\n')
      .findIndex(line => line.trim() === 'ARG DASHBOARD_VERSION=dev')
    expect(argLine, 'Dockerfile lost its default-valued DASHBOARD_VERSION ARG').toBeGreaterThan(-1)
    const precedingComment = dockerfile.split('\n').slice(Math.max(argLine - 3, 0), argLine).join('\n')
    expect(
      precedingComment.includes('gateway-access.md'),
      'Dockerfile ARG comment no longer points at docs/runbooks/gateway-access.md',
    ).toBe(true)
  })

  it('AppShell still reads the env (cross-surface consistency)', () => {
    const appShell = readFileSync(join(repoRoot, 'web/src/shell/AppShell.tsx'), 'utf8')
    expect(appShell).toContain('VITE_DASHBOARD_VERSION')
  })
})
