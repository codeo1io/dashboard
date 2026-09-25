/**
 * Typed fixture factories for installation-enumeration results (rm-190).
 *
 * NON-TEST shared module (precedent: test/operator-mock-client.ts) — it must
 * type-check under the server tsconfig, NOT the vitest globals config.
 *
 * Why: test/server.test.ts built enumerate fixtures as untyped
 * `vi.fn().mockResolvedValue({...})` literals. `mockResolvedValue` accepts
 * anything, so adding a required field to EnumerateReposResult/RepoRecord
 * compiled clean while every fixture silently lacked the new field — the
 * suites stayed green on stale shapes until an assertion tripped at runtime.
 * Routing fixtures through these factories anchors them to the live types:
 * a new required field breaks the factory DEFAULTS at check-types time.
 */

import type {
  EnumerateReposResult,
  FetchInstallationsError,
  InstallationRecord,
  RepoRecord,
} from '../src/github/installations.ts'
import type {Result} from '../src/result.ts'
import {ok} from '../src/result.ts'

/** One fully-formed repos.yaml-style repo row; override only what the test varies. */
export function makeRepoRecord(overrides: Partial<RepoRecord> = {}): RepoRecord {
  return {
    node_id: 'R_kgDOFake',
    database_id: 999,
    owner: 'fro-bot',
    name: 'fake-repo',
    full_name: 'fro-bot/fake-repo',
    installation_id: 1,
    ...overrides,
  }
}

/** One fully-formed installation row. */
export function makeInstallationRecord(overrides: Partial<InstallationRecord> = {}): InstallationRecord {
  return {
    id: 1,
    account: 'fro-bot',
    ...overrides,
  }
}

/**
 * A successful enumerate result. Defaults to the empty fleet; override
 * `repos`/`installations`/`failedInstallationIds` per scenario.
 */
export function makeEnumerateSuccess(
  overrides: {
    repos?: readonly RepoRecord[]
    installations?: readonly InstallationRecord[]
    failedInstallationIds?: readonly number[]
  } = {},
): Result<EnumerateReposResult, FetchInstallationsError> {
  return ok({
    repos: [...(overrides.repos ?? [])],
    installations: [...(overrides.installations ?? [])],
    failedInstallationIds: [...(overrides.failedInstallationIds ?? [])],
  })
}
