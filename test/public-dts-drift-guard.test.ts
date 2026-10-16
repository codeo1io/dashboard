import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {pathToFileURL} from 'node:url'
import {describe, expect, it} from 'vitest'

/**
 * rm-1462: public/*.d.ts ↔ .js drift guard.
 *
 * public/operator-{stream,launch,run-index}.d.ts are hand-maintained type
 * declarations for the vendored operator runtime .js sitting next to them.
 * web/tsconfig.json deliberately excludes public/ from type-checking and no
 * other gate reads the .d.ts, so a silent edit to either half used to drift
 * undetected until operator build breakage. This guard pins the VALUE-export
 * surface of each pair:
 *
 *  - every `export declare function|const|class|let|var NAME` in the .d.ts
 *    must exist as a runtime export key of the sibling .js;
 *  - every runtime export key must either be declared in the .d.ts or appear
 *    in the pinned ALLOWED_UNDECLARED allowlist below (documented pre-existing
 *    drift, recorded by run 7a0e2163 on 2026-10-16 — repairing the vendored
 *    declarations is a separate change unit per the stewardship contract);
 *  - allowlist entries must still exist at runtime, so the allowlist cannot
 *    go stale: shrinking it is always allowed, growing it is always a test
 *    failure away from a deliberate decision;
 *  - type-only declaration counts (export type/interface) are pinned so any
 *    .d.ts type edit requires a deliberate guard update.
 */
const repoRoot = process.cwd()

const PAIRS = [
  'operator-stream',
  'operator-launch',
  'operator-run-index',
] as const

/**
 * Runtime exports known to be missing from their .d.ts at guard birth
 * (2026-10-16, base 3e3664c). Each entry is pre-existing drift carried
 * deliberately — the guard fails on any NEW undeclared export and on any
 * allowlisted name that disappears.
 */
const ALLOWED_UNDECLARED: Readonly<Record<string, readonly string[]>> = {
  'operator-stream': ['APPROVAL_FETCH_TIMEOUT_MS'],
  'operator-launch': [],
  'operator-run-index': ['formatRelativeTime', 'markCardExpandedForLaunch'],
}

/** Pinned type-only declaration counts (export type + export interface). */
const TYPE_ONLY_COUNTS: Readonly<
  Record<string, {readonly type: number; readonly interface: number}>
> = {
  'operator-stream': {type: 31, interface: 34},
  'operator-launch': {type: 1, interface: 2},
  'operator-run-index': {type: 3, interface: 2},
}

interface DeclaredExports {
  readonly values: string[]
  readonly typeOnly: {readonly type: number; readonly interface: number}
}

function parseDeclaredExports(source: string): DeclaredExports {
  const values: string[] = []
  let typeCount = 0
  let interfaceCount = 0
  for (const match of source.matchAll(
    /^export (?:declare )?(function|const|class|let|var|type|interface) ([\w$]+)/gm,
  )) {
    const [, kind, name] = match
    if (kind === undefined || name === undefined) continue
    if (kind === 'type') typeCount += 1
    else if (kind === 'interface') interfaceCount += 1
    else values.push(name)
  }
  return {values, typeOnly: {type: typeCount, interface: interfaceCount}}
}

describe('public/*.d.ts ↔ .js value-export parity (rm-1462)', () => {
  for (const base of PAIRS) {
    it(`${base}: declared value exports match runtime exports`, async () => {
      const dtsPath = resolve(repoRoot, 'public', `${base}.d.ts`)
      const jsPath = resolve(repoRoot, 'public', `${base}.js`)
      const declared = parseDeclaredExports(readFileSync(dtsPath, 'utf8'))

      const runtimeModule = (await import(pathToFileURL(jsPath).href)) as Record<string, unknown>
      const runtimeKeys = Object.keys(runtimeModule)

      const missingAtRuntime = declared.values.filter(
        name => !runtimeKeys.includes(name),
      )
      expect(
        missingAtRuntime,
        `${base}.d.ts declares value exports absent from ${base}.js (stale declaration):`,
      ).toEqual([])

      const allowed = ALLOWED_UNDECLARED[base] ?? []
      const undeclared = runtimeKeys.filter(
        name =>
          !declared.values.includes(name) && !allowed.includes(name),
      )
      expect(
        undeclared,
        `${base}.js exports runtime values missing from ${base}.d.ts (new drift — either declare them or make a deliberate allowlist decision):`,
      ).toEqual([])

      const staleAllowlist = allowed.filter(
        name => !runtimeKeys.includes(name),
      )
      expect(
        staleAllowlist,
        `${base}: allowlist names that no longer exist at runtime (shrink the allowlist):`,
      ).toEqual([])

      expect(declared.typeOnly, `${base} type-only declaration counts changed (deliberate update required):`).toEqual(
        TYPE_ONLY_COUNTS[base],
      )
    })
  }
})
