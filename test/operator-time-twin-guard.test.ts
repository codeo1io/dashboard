import type * as OperatorTimeTwin from '../public/operator-time'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import process from 'node:process'
import {describe, expect, it} from 'vitest'
import * as operatorTime from '../public/operator-time.js'

/**
 * rm-2062: drift-parity guard between public/operator-time.js (the vendored
 * source of truth) and public/operator-time.d.ts (the declaration twin).
 *
 * The twinless class already bit this ledger once — operator-stream.js parity
 * bugs shipped green through check-types because nothing typed the vendored
 * surface. This guard locks BOTH directions so neither side can move alone:
 *
 *   - runtime: the twin's declared value exports (parsed from its text) must
 *     equal the module's shipped exports, name for name, with matching kinds;
 *     deleting one export from the twin — or renaming one inside the .js —
 *     redds this suite.
 *   - compile-time: the module namespace must satisfy the twin's declared
 *     shape and the two key sets must be identical, so signature drift on the
 *     twin is caught by `pnpm check-types` even when names still match.
 *
 * Single-sourcing pattern per test/operator-contract-allowlist-guard.test.ts.
 */
const repoRoot = process.cwd()
const twinSource = readFileSync(resolve(repoRoot, 'public/operator-time.d.ts'), 'utf8')

type TwinKeys = keyof typeof OperatorTimeTwin
type ModuleKeys = keyof typeof operatorTime

/** Compile-time: the twin's export names and the module's are the same set, both directions. */
const twinKeysEqualModuleKeys: TwinKeys extends ModuleKeys
  ? ModuleKeys extends TwinKeys
    ? true
    : never
  : never = true

/** Compile-time: the shipped namespace satisfies the twin's declared shape. */
const moduleSatisfiesTwin: typeof OperatorTimeTwin = operatorTime

interface TwinDeclaration {
  readonly kind: 'const' | 'function'
  readonly name: string
}

function parseTwinDeclarations(source: string): TwinDeclaration[] {
  const declarations: TwinDeclaration[] = []
  for (const match of source.matchAll(/^export declare (const|function) (\w+)/gm)) {
    declarations.push({kind: match[1] as 'const' | 'function', name: match[2] as string})
  }
  return declarations
}

describe('operator-time twin drift parity (rm-2062)', () => {
  const declarations = parseTwinDeclarations(twinSource)

  it('the twin declares every export the module ships — and nothing extra', () => {
    const declared = declarations.map(declaration => declaration.name).toSorted()
    const shipped = Object.keys(operatorTime).toSorted()
    expect(declared).toEqual(shipped)
  })

  it('each twin declaration matches the runtime shape of its export', () => {
    expect(declarations.length).toBeGreaterThan(0)
    for (const {kind, name} of declarations) {
      const runtimeKind = typeof operatorTime[name as keyof typeof operatorTime]
      if (kind === 'function') {
        expect(runtimeKind, `twin declares function ${name}`).toBe('function')
      } else {
        // A declared const is a primitive value export — never a function.
        expect(['number', 'string', 'boolean'], `twin declares const ${name}`).toContain(runtimeKind)
      }
    }
  })

  it('the twin carries a header naming it as the rm-2062 parity twin of the .js source of truth', () => {
    expect(twinSource).toContain('rm-2062')
    expect(twinSource).toContain('operator-time.js')
  })

  it('compile-time parity locks are engaged (key equality + namespace shape)', () => {
    expect(twinKeysEqualModuleKeys).toBe(true)
    expect(moduleSatisfiesTwin).toBe(operatorTime)
  })
})
