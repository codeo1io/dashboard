/**
 * rm-743 — Dockerfile HEALTHCHECK semantics guard.
 *
 * The container image shipped with NO HEALTHCHECK until rm-743: an
 * orchestrator had no in-container liveness signal, so "restart because the
 * server died" was indistinguishable from any other restart reason. The cure
 * is a HEALTHCHECK whose probe hits /api/healthz and gates on HTTP r.ok ONLY.
 *
 * What this guard pins (per the def's standing guard):
 * 1. A HEALTHCHECK instruction exists — deleting the probe re-reds this test.
 * 2. All four tuning flags are stated (interval/timeout/start-period/retries)
 *    with values matching the aggregator-cadence rationale recorded at the
 *    code site (60s refresh → 30s interval, 3 retries = one full refresh
 *    cycle of noise tolerance).
 * 3. The probe targets /api/healthz — the constant-200 liveness endpoint —
 *    and gates on r.ok ONLY: the probe expression must NOT reference
 *    staleness/lastFetch/snapshot fields (rm-708's unlanded staleness fields
 *    must NEVER leak into liveness; a stale-but-alive dashboard is a data
 *    problem, not a restart reason).
 * 4. The probe uses node itself (the runtime the CMD uses) — node:24-slim
 *    ships no curl/wget, and the guard pins that the probe does not depend on
 *    a shell/tool the slim image does not carry (exec-form JSON array).
 * 5. The runbook carries the orchestration expectation (external probes may
 *    gate on staleness once rm-708's fields exist; the in-container probe
 *    never does) and the DASHBOARD_PORT override coupling.
 */
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..')

const dockerfile = await readFile(path.join(repoRoot, 'Dockerfile'), 'utf8')
const releaseRunbook = await readFile(path.join(repoRoot, 'docs/runbooks/release.md'), 'utf8')

describe('rm-743: Dockerfile carries a liveness-only HEALTHCHECK', () => {
  it('exactly one HEALTHCHECK instruction exists', () => {
    const lines = dockerfile.split('\n').filter(line => /^\s*HEALTHCHECK\b/.test(line))
    expect(lines.length).toBe(1)
  })

  it('states all four tuning flags with the aggregator-cadence rationale values', () => {
    const instruction = dockerfile.match(/^HEALTHCHECK .*$/m)?.[0] ?? ''
    expect(instruction).toContain('--interval=30s') // half the 60s aggregator refresh cycle
    expect(instruction).toContain('--timeout=5s')
    expect(instruction).toContain('--start-period=20s')
    expect(instruction).toContain('--retries=3') // 90s of consecutive failures > one refresh cycle
  })

  it('probes /api/healthz and gates on r.ok only — never staleness', () => {
    const instruction = dockerfile.match(/^HEALTHCHECK .*$/m)?.[0] ?? ''
    const continuation = dockerfile.split('\n').find(line => line.trim().startsWith('CMD'))
    // The exec-form CMD continuation carries the probe expression.
    const probe = `${instruction}\n${continuation ?? ''}`
    expect(probe).toContain('/api/healthz')
    expect(probe).toMatch(/r\.ok/)
    // rm-708's staleness fields must never gate liveness: the probe may not
    // reference any staleness/snapshot-freshness token.
    for (const forbidden of ['lastFetch', 'stale', 'freshness', 'snapshot']) {
      expect(probe, `probe must not reference ${forbidden} (rm-708 leak)`).not.toContain(forbidden)
    }
  })

  it('uses the node runtime in exec form (no shell/curl dependency in slim)', () => {
    const continuation = dockerfile
      .split('\n')
      .map(line => line.trim())
      .find(line => line.startsWith('CMD ["node"'))
    expect(continuation).toBeDefined()
    expect(continuation).toContain('fetch(')
    // Shell form (CMD without a JSON array) would depend on /bin/sh parsing —
    // the slim image carries it, but the JSON exec form is the deterministic
    // choice; pin it.
    expect(continuation).toMatch(/^CMD \["node", "-e",/)
  })

  it('the healthcheck cites its owning def (rm-743) at the code site', () => {
    // The rationale comment block above the instruction is part of the cure
    // (why r.ok-only, why node, why the tuning) — pin that it stays.
    expect(dockerfile).toMatch(/# rm-743: container-level liveness truth/)
  })
})

describe('rm-743: the release runbook records the orchestration expectation', () => {
  it('documents that the in-container probe is liveness-only and staleness stays external', () => {
    expect(releaseRunbook).toMatch(/HEALTHCHECK/)
    expect(releaseRunbook).toMatch(/rm-743/)
    expect(releaseRunbook).toMatch(/rm-708/)
  })

  it('documents the DASHBOARD_PORT override coupling', () => {
    expect(releaseRunbook).toMatch(/HEALTHCHECK[\s\S]*DASHBOARD_PORT|DASHBOARD_PORT[\s\S]*HEALTHCHECK/)
  })
})
