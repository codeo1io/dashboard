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
 *  - type-only declaration NAMES (export type/interface) are pinned as sorted
 *    name sets so any .d.ts type edit — add, remove, or rename — requires a
 *    deliberate guard update; a rename or an add+remove swap used to hide
 *    inside an unchanged count (rm-1985 structural unit, run
 *    2ce8fcb7fd75493cbe8e4038b331ce4c).
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

/**
 * Pinned type-only declaration counts (export type + export interface).
 *
 * Re-pinned 2026-10-17 (conflict 697a238c, integrate 6524c836): the guard was
 * born at base 3e3664c0 pinned to operator-stream 31/34 and operator-run-index
 * 3/2, but main had already adopted upstream 2026.10.43 (c51597ad), which grew
 * operator-stream by `StreamConnectionStatus` (type) + `FinishedRunRecord`
 * (interface) and operator-run-index by `RunIndexInitOutcome` (type). The
 * 7a0e2163 landing merged the guard without re-pinning, leaving main red on
 * exactly these two assertions. The adoption is the deliberate .d.ts edit this
 * pin exists to witness; value-export parity was unaffected.
 *
 * Superseded 2026-10-18 (rm-1985 structural unit, run
 * 2ce8fcb7fd75493cbe8e4038b331ce4c) by the sorted NAME SETS below: each set's
 * length equals the re-pinned count (operator-stream 32/35, operator-launch
 * 1/2, operator-run-index 4/2) while also pinning identity, so a rename or an
 * add+remove swap can no longer land without touching this literal. A failure
 * prints the paste-ready measured literal (leading indent included) — a
 * deliberate update is a copy-paste.
 */
const TYPE_ONLY_NAME_SETS: Readonly<Record<string, TypeOnlyNames>> = {
  'operator-stream': {type: ['ApprovalFrameData', 'CancelControlState', 'CancelRunError', 'CancelRunOutcome', 'CancelTerminalPhase', 'CheckoutHead', 'CheckoutLayoutReason', 'CheckoutObstructionKind', 'CheckoutOperation', 'CheckoutPreparation', 'CheckoutPreparationRefused', 'CheckoutProvenance', 'CheckoutRefusalReason', 'CheckoutRemote', 'CheckoutUpdateFailureReason', 'CheckoutWorktree', 'ConnectionStatus', 'FailureKind', 'OperatorWebStatus', 'QuestionDecision', 'QuestionDecisionOutcome', 'QuestionDecisionState', 'QuestionFrameData', 'QuestionInvalidReason', 'QuestionListResult', 'QuestionRequestStatus', 'RunPhase', 'RunSummaryStatus', 'SseParseResult', 'StreamConnectionStatus', 'StreamEvent', 'StreamFrame'], interface: ['ApprovalClient', 'ApprovalFrameDataOpen', 'ApprovalFrameDataSettle', 'ApprovalReconcileEvent', 'CancelActionEvent', 'CancelClient', 'CancelClientLogger', 'CancelControlClient', 'CancelControlHandle', 'CancelRunResult', 'CheckoutBoundedList', 'CheckoutPreparationFailed', 'FinishedRunRecord', 'InitOptions', 'OutputFrameData', 'QuestionClaimedEvent', 'QuestionClient', 'QuestionFrameDataOpen', 'QuestionFrameDataSettle', 'QuestionNote', 'QuestionOption', 'QuestionPageRecord', 'QuestionPrompt', 'QuestionReconcileEvent', 'QuestionReconcileResetEvent', 'QuestionRequest', 'QuestionRequestView', 'QuestionResolvedEvent', 'ReadyFrameData', 'ResetFrameData', 'RunEntry', 'SafeRunView', 'StatusFrameData', 'StreamHandle', 'StreamState']},
  'operator-launch': {type: ['LaunchOutcome'], interface: ['LaunchClient', 'PendingCardHooks']},
  'operator-run-index': {type: ['FailureKind', 'RunIndexInitOutcome', 'RunIndexResult', 'RunSummaryStatus'], interface: ['ParsedRunSummary', 'RunSafeView']},
}

interface TypeOnlyNames {
  readonly type: readonly string[]
  readonly interface: readonly string[]
}

interface DeclaredExports {
  readonly values: string[]
  readonly typeOnly: TypeOnlyNames
}

function parseDeclaredExports(source: string): DeclaredExports {
  const values: string[] = []
  const typeNames: string[] = []
  const interfaceNames: string[] = []
  for (const match of source.matchAll(
    /^export (?:declare )?(function|const|class|let|var|type|interface) ([\w$]+)/gm,
  )) {
    const [, kind, name] = match
    if (kind === undefined || name === undefined) continue
    if (kind === 'type') typeNames.push(name)
    else if (kind === 'interface') interfaceNames.push(name)
    else values.push(name)
  }
  return {
    values,
    typeOnly: {type: typeNames.sort(), interface: interfaceNames.sort()},
  }
}

/**
 * Renders the measured name sets as the exact pinned-literal entry for
 * `base` (leading indent included), so the failure message carries a
 * byte-exact paste-ready replacement line for TYPE_ONLY_NAME_SETS.
 */
function formatTypeOnlyNameSets(base: string, measured: TypeOnlyNames): string {
  return `  '${base}': {type: [${measured.type.map(name => `'${name}'`).join(', ')}], interface: [${measured.interface.map(name => `'${name}'`).join(', ')}]},`
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

      expect(
        declared.typeOnly,
        `${base} type-only declaration name sets changed (deliberate update required; paste-ready measured literal: ${formatTypeOnlyNameSets(base, declared.typeOnly)})`,
      ).toEqual(TYPE_ONLY_NAME_SETS[base])
    })
  }
})
