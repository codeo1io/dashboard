import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
import {
  MatrixSchemaError,
  satisfies,
  validateMatrix,
  type CurrencyMatrix,
} from '../scripts/registry-matrix'

// rm-2204 registry-matrix schema guard (run 42466e744796 cycle:4 implement,
// batch U4). Pins the registry-matrix/v1 output schema against a committed
// fixture (test/fixtures/registry-matrix.fixture.json) and pins the semver
// currency core the npm rows depend on. No network: the emitter's probes are
// deliberately not exercised here — a failed probe is a null CELL in the
// document, and the schema validator is what this guard pins.

const FIXTURE_PATH = 'test/fixtures/registry-matrix.fixture.json'

describe('registry-matrix/v1 schema (rm-2204)', () => {
  it('committed fixture validates against the schema', () => {
    const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as unknown
    const matrix = validateMatrix(fixture)
    expect(matrix.summary.total).toBe(9)
    expect(matrix.summary.probe_failures).toBe(2)
  })

  it('fixture covers every row status and a named null cell', () => {
    const matrix = validateMatrix(JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as unknown)
    for (const status of ['current', 'stale', 'unknown'] as const) {
      expect(matrix.rows.some(r => r.status === status), `fixture lacks a ${status} row`).toBe(true)
    }
    const nullCells = matrix.rows.filter(r => r.latest === null)
    expect(nullCells.length).toBeGreaterThan(0)
    for (const cell of nullCells) {
      expect(cell.status).toBe('unknown')
      expect(cell.detail).toMatch(/probe failed/i)
    }
  })

  it('rejects a document missing a required row field', () => {
    const bad = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as CurrencyMatrix
    delete (bad.rows[0] as unknown as Record<string, unknown>).pinned
    expect(() => validateMatrix(bad)).toThrow(MatrixSchemaError)
  })

  it('rejects a null cell that does not carry status unknown', () => {
    const bad = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as CurrencyMatrix
    const nullCell = bad.rows.find(r => r.latest === null)!
    nullCell.status = 'current'
    expect(() => validateMatrix(bad)).toThrow(/null cell/)
  })

  it('rejects a null cell whose detail does not name the probe failure', () => {
    const bad = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as CurrencyMatrix
    const nullCell = bad.rows.find(r => r.latest === null)!
    nullCell.detail = 'nothing to see here'
    expect(() => validateMatrix(bad)).toThrow(/probe failure/)
  })

  it('rejects summary counts that disagree with the rows', () => {
    const bad = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as CurrencyMatrix
    bad.summary.stale = bad.summary.stale + 1
    expect(() => validateMatrix(bad)).toThrow(/summary/)
  })

  it('rejects an unknown row status enum', () => {
    const bad = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as CurrencyMatrix
    bad.rows[0]!.status = 'fresh' as typeof bad.rows[0]['status']
    expect(() => validateMatrix(bad)).toThrow(/status invalid/)
  })

  it('rejects a wrong schema literal', () => {
    const bad = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as unknown as Record<string, unknown>
    bad.schema = 'registry-matrix/v2'
    expect(() => validateMatrix(bad)).toThrow(/schema literal/)
  })
})

describe('registry-matrix semver currency core (rm-2204)', () => {
  it('caret ranges admit same-major latest', () => {
    expect(satisfies('4.13.13', '^4.13.0')).toBe(true)
  })

  it('caret ranges reject next-major latest', () => {
    expect(satisfies('5.0.0', '^4.13.0')).toBe(false)
  })

  it('exact pins only admit the exact version', () => {
    expect(satisfies('19.2.0', '19.2.0')).toBe(true)
    expect(satisfies('19.3.1', '19.2.0')).toBe(false)
  })

  it('floor comparators admit newer majors (engines-style)', () => {
    expect(satisfies('26.12.0', '>=24')).toBe(true)
    expect(satisfies('23.9.0', '>=24')).toBe(false)
  })

  it('tilde ranges stop at the next minor', () => {
    expect(satisfies('1.4.9', '~1.4.3')).toBe(true)
    expect(satisfies('1.5.0', '~1.4.3')).toBe(false)
  })

  it('exotic ranges are explicitly unresolvable, never guessed', () => {
    expect(satisfies('1.2.3', 'workspace:*')).toBe(null)
    expect(satisfies('1.2.3', 'file:../local')).toBe(null)
  })
})
