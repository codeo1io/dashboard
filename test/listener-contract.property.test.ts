import {Buffer} from 'node:buffer'
/**
 * Property-based suite for the operator-listener ingest contract (rm-144).
 *
 * parseIngestBody is parse-don't-validate: it must copy only declared fields
 * into a closed DTO, trim title/body/labels, enforce the numeric caps, and
 * return fixed content-free error reasons. These properties pin all of that
 * over the input space instead of spot-checking hand-picked cases.
 */
import fc from 'fast-check'
import {describe, expect, it} from 'vitest'
import {parseIngestBody} from '../src/listener/contract.ts'

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const kindArb = fc
  .stringMatching(/^[a-z0-9-]+$/)
  .filter(s => s.length >= 1 && s.length <= 64)

const titleArb = fc
  .string({minLength: 1, maxLength: 200})
  .filter(s => s.trim().length >= 1 && s.trim().length <= 200)

// Bodies must fit 8192 UTF-8 bytes AFTER trimming.
const bodyArb = fc
  .string({minLength: 1, maxLength: 400})
  .filter(s => Buffer.byteLength(s.trim(), 'utf8') >= 1 && Buffer.byteLength(s.trim(), 'utf8') <= 8192)

const linksArb = fc.array(
  fc.record({
    label: fc.string({minLength: 1, maxLength: 80}).filter(s => s.trim().length >= 1 && s.trim().length <= 80),
    url: fc.webUrl().map(u => `https://${u.replace(/^https?:\/\//, '')}`),
  }),
  {maxLength: 10},
)

const dedupeKeyArb = fc.option(fc.string({minLength: 1, maxLength: 128}), {nil: undefined})

const createdAtArb = fc.date({noInvalidDate: true}).map(d => d.toISOString())

const validBodyArb = fc.record({
  source: fc.constantFrom('infra', 'agent'),
  kind: kindArb,
  severity: fc.constantFrom('info', 'warning', 'critical'),
  title: titleArb,
  body: bodyArb,
  links: linksArb,
  dedupeKey: dedupeKeyArb,
  createdAt: createdAtArb,
})

/** The complete set of fixed error reasons the parser may emit. */
const FIXED_REASONS = new Set([
  'invalid request body',
  'invalid source',
  'invalid kind',
  'invalid severity',
  'invalid title',
  'invalid body',
  'too many links',
  'invalid links',
  'invalid link',
  'invalid link label',
  'invalid link url',
  'invalid dedupeKey',
  'invalid createdAt',
])

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe('listener ingest contract properties (rm-144)', () => {
  it('valid messages parse to a closed DTO with declared fields preserved', () => {
    fc.assert(
      fc.property(validBodyArb, input => {
        const result = parseIngestBody(input)
        expect(result.success).toBe(true)
        if (!result.success) return
        const msg = result.data
        expect(msg.source).toBe(input.source)
        expect(msg.kind).toBe(input.kind)
        expect(msg.severity).toBe(input.severity)
        expect(msg.title).toBe(input.title.trim())
        expect(msg.body).toBe(input.body.trim())
        expect(msg.links).toHaveLength(input.links.length)
        for (let i = 0; i < input.links.length; i++) {
          const want = input.links[i]
          const got = msg.links[i]
          if (!want || !got) throw new Error(`link ${i} missing`)
          expect(got).toEqual({label: want.label.trim(), url: want.url})
        }
        expect(msg.dedupeKey).toBe(input.dedupeKey ?? null)
        expect(msg.createdAt).toBe(input.createdAt)
        // Closed shape: exactly the 8 declared fields.
        expect(Object.keys(msg).sort()).toEqual([
          'body',
          'createdAt',
          'dedupeKey',
          'kind',
          'links',
          'severity',
          'source',
          'title',
        ])
      }),
      {numRuns: 200},
    )
  })

  it('trim invariant: parsed title/body/labels are exactly the trimmed inputs', () => {
    fc.assert(
      fc.property(titleArb, bodyArb, linksArb, (title, body, links) => {
        const wrapped = {
          source: 'infra' as const,
          kind: 'x',
          severity: 'info' as const,
          title: `  ${title}  `,
          body: `\t${body}\n`,
          links: links.map(l => ({label: ` ${l.label} `, url: l.url})),
          createdAt: '2026-01-01T00:00:00Z',
        }
        const result = parseIngestBody(wrapped)
        expect(result.success).toBe(true)
        if (!result.success) return
        expect(result.data.title).toBe(title.trim())
        expect(result.data.body).toBe(body.trim())
        for (const link of result.data.links) {
          expect(link.label).toBe(link.label.trim())
        }
      }),
      {numRuns: 200},
    )
  })

  it('fail-closed no-oracle: every rejection is a fixed reason, never the offending value', () => {
    fc.assert(
      fc.property(validBodyArb, fc.integer({min: 0, max: 7}), (input, field) => {
        const marker = 'ZZNOORACLEZZ'
        const bad = {...input} as Record<string, unknown>
        switch (field) {
          case 0:
            bad.source = 'operator'
            break
          case 1:
            bad.kind = `Bad_Kind ${marker}!`
            break
          case 2:
            bad.severity = 'severe'
            break
          case 3:
            bad.title = '   '
            break
          case 4:
            bad.links = 'not-an-array'
            break
          case 5:
            bad.links = [{label: 'ok', url: `http://${marker}.example.com/`}]
            break
          case 6:
            bad.dedupeKey = `x`.repeat(200)
            break
          default:
            bad.createdAt = `not-a-date-${marker}`
            break
        }
        const result = parseIngestBody(bad)
        expect(result.success).toBe(false)
        if (result.success) return
        expect(FIXED_REASONS.has(result.error.message)).toBe(true)
        expect(result.error.message).not.toContain(marker)
      }),
      {numRuns: 200},
    )
  })

  it('UTF-8 byte cap: bodies over 8192 bytes post-trim are rejected, at-or-under accepted', () => {
    fc.assert(
      fc.property(fc.integer({min: 0, max: 4096}), fc.nat({max: 16}), fc.constantFrom(1, 2, 3, 4), (padding, over, width) => {
        // Multibyte padding so .length and byteLength diverge.
        const filler = '日'.repeat(padding) + 'a'.repeat(over * width)
        const bytes = Buffer.byteLength(filler.trim(), 'utf8')
        const input = {
          source: 'infra' as const,
          kind: 'x',
          severity: 'info' as const,
          title: 't',
          body: filler,
          links: [],
          createdAt: '2026-01-01T00:00:00Z',
        }
        const result = parseIngestBody(input)
        // Accepted iff non-empty after trim AND at most 8192 UTF-8 bytes.
        if (bytes === 0 || bytes > 8192) {
          expect(result.success).toBe(false)
        } else {
          expect(result.success).toBe(true)
        }
      }),
      {numRuns: 300},
    )
  })

  it('kind grammar: [a-z0-9-]{1,64} accepted, any deviation rejected', () => {
    fc.assert(
      fc.property(fc.string({minLength: 0, maxLength: 80}), raw => {
        const input = {
          source: 'infra' as const,
          kind: raw,
          severity: 'info' as const,
          title: 't',
          body: 'b',
          links: [],
          createdAt: '2026-01-01T00:00:00Z',
        }
        const result = parseIngestBody(input)
        const matches = /^[a-z0-9-]{1,64}$/.test(raw)
        expect(result.success).toBe(matches)
      }),
      {numRuns: 300},
    )
  })

  it('link URLs: only https:// scheme prefix accepted', () => {
    fc.assert(
      fc.property(fc.string({minLength: 1, maxLength: 60}).filter(s => !s.startsWith('https://')), url => {
        const input = {
          source: 'infra' as const,
          kind: 'x',
          severity: 'info' as const,
          title: 't',
          body: 'b',
          links: [{label: 'l', url}],
          createdAt: '2026-01-01T00:00:00Z',
        }
        expect(parseIngestBody(input).success).toBe(false)
      }),
      {numRuns: 200},
    )
  })
})
