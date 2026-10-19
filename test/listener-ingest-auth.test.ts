import {createHmac} from 'node:crypto'
import {describe, expect, it} from 'vitest'
import {
  createIngestReplayGuard,
  seenDeliveryKey,
  verifyIngestSignature,
  type IngestReplayGuardInput,
} from '../src/listener/ingest-auth.ts'

const KEY = 'test-shared-ingest-key'
const BODY = '{"source":"infra","kind":"deploy-health"}'

function sign(key: string, timestamp: string, rawBody: string): string {
  const hex = createHmac('sha256', key).update(`${timestamp}.${rawBody}`).digest('hex')
  return `sha256=${hex}`
}

describe('verifyIngestSignature', () => {
  it('valid signature+timestamp → ok', () => {
    const now = 1_700_000_000
    const timestampHeader = String(now)
    const signatureHeader = sign(KEY, timestampHeader, BODY)

    const result = verifyIngestSignature({
      key: KEY,
      rawBody: BODY,
      timestampHeader,
      signatureHeader,
      nowSeconds: now,
    })

    expect(result.success).toBe(true)
  })

  it('wrong key → err', () => {
    const now = 1_700_000_000
    const timestampHeader = String(now)
    const signatureHeader = sign('a-different-key', timestampHeader, BODY)

    const result = verifyIngestSignature({
      key: KEY,
      rawBody: BODY,
      timestampHeader,
      signatureHeader,
      nowSeconds: now,
    })

    expect(result.success).toBe(false)
  })

  it('tampered body → err', () => {
    const now = 1_700_000_000
    const timestampHeader = String(now)
    const signatureHeader = sign(KEY, timestampHeader, BODY)

    const result = verifyIngestSignature({
      key: KEY,
      rawBody: `${BODY}tampered`,
      timestampHeader,
      signatureHeader,
      nowSeconds: now,
    })

    expect(result.success).toBe(false)
  })

  it('bad signature format → err', () => {
    const now = 1_700_000_000
    const timestampHeader = String(now)

    const result = verifyIngestSignature({
      key: KEY,
      rawBody: BODY,
      timestampHeader,
      signatureHeader: 'not-a-valid-signature',
      nowSeconds: now,
    })

    expect(result.success).toBe(false)
  })

  it('missing headers → err', () => {
    const now = 1_700_000_000

    expect(
      verifyIngestSignature({
        key: KEY,
        rawBody: BODY,
        timestampHeader: null,
        signatureHeader: sign(KEY, String(now), BODY),
        nowSeconds: now,
      }).success,
    ).toBe(false)

    expect(
      verifyIngestSignature({
        key: KEY,
        rawBody: BODY,
        timestampHeader: String(now),
        signatureHeader: null,
        nowSeconds: now,
      }).success,
    ).toBe(false)
  })

  it('timestamp outside window → err; inside window → ok', () => {
    const now = 1_700_000_000

    const outsideTimestamp = String(now - 301)
    const outsideSig = sign(KEY, outsideTimestamp, BODY)
    expect(
      verifyIngestSignature({
        key: KEY,
        rawBody: BODY,
        timestampHeader: outsideTimestamp,
        signatureHeader: outsideSig,
        nowSeconds: now,
      }).success,
    ).toBe(false)

    const insideTimestamp = String(now - 299)
    const insideSig = sign(KEY, insideTimestamp, BODY)
    expect(
      verifyIngestSignature({
        key: KEY,
        rawBody: BODY,
        timestampHeader: insideTimestamp,
        signatureHeader: insideSig,
        nowSeconds: now,
      }).success,
    ).toBe(true)
  })

  it('constant-time path does not throw on signature length mismatch', () => {
    const now = 1_700_000_000
    const timestampHeader = String(now)

    expect(() =>
      verifyIngestSignature({
        key: KEY,
        rawBody: BODY,
        timestampHeader,
        signatureHeader: 'sha256=abcd',
        nowSeconds: now,
      }),
    ).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// rm-2008: bounded seen-delivery cache (createIngestReplayGuard).
// ---------------------------------------------------------------------------

const GUARD_INPUT_BASE: Omit<IngestReplayGuardInput, 'deliveryGuid'> = {
  timestampHeader: '1700000000',
  rawBody: BODY,
  key: KEY,
  nowSeconds: 1_700_000_000,
}

function guardInput(
  overrides: Partial<IngestReplayGuardInput> = {},
): IngestReplayGuardInput {
  const {deliveryGuid, ...rest} = overrides
  return {...GUARD_INPUT_BASE, ...rest, deliveryGuid: deliveryGuid ?? null}
}

describe('seenDeliveryKey (rm-2008 cache key)', () => {
  it('delivery GUID is the preferred key: normalized (trim + lowercase) and g-prefixed', () => {
    const normalized = seenDeliveryKey(guardInput({deliveryGuid: '  ABC-DEF-123  '}))
    expect(normalized).toBe(`g:abc-def-123`)
    expect(seenDeliveryKey(guardInput({deliveryGuid: 'abc-def-123'}))).toBe(normalized)
  })

  it('absent or empty GUID falls back to digest+timestamp-bucket, h-prefixed', () => {
    const digest = createHmac('sha256', KEY).update(`1700000000.${BODY}`).digest('hex')
    expect(seenDeliveryKey(guardInput({deliveryGuid: null}))).toBe(`h:${digest}:1700000000`)
    expect(seenDeliveryKey(guardInput({deliveryGuid: ''}))).toBe(`h:${digest}:1700000000`)
    expect(seenDeliveryKey(guardInput({deliveryGuid: '   '}))).toBe(`h:${digest}:1700000000`)
  })

  it('fallback keys separate byte-identical replays from re-signed deliveries', () => {
    const atTs = (ts: string) => seenDeliveryKey(guardInput({deliveryGuid: null, timestampHeader: ts}))
    expect(atTs('1700000000')).not.toBe(atTs('1700000001'))
    const otherBody = seenDeliveryKey(
      guardInput({deliveryGuid: null, rawBody: `${BODY} `}),
    )
    expect(atTs('1700000000')).not.toBe(otherBody)
  })

  it('a GUID-shaped string can never collide with a digest-bucket key (distinct prefixes)', () => {
    const guidKey = seenDeliveryKey(guardInput({deliveryGuid: 'h:whatever'}))
    const digestKey = seenDeliveryKey(guardInput({deliveryGuid: null}))
    expect(guidKey.startsWith('g:')).toBe(true)
    expect(digestKey.startsWith('h:')).toBe(true)
  })

  it('an overlong GUID is truncated to the defensive cap', () => {
    const key = seenDeliveryKey(guardInput({deliveryGuid: 'a'.repeat(500)}))
    expect(key).toBe(`g:${'a'.repeat(128)}`)
  })
})

describe('createIngestReplayGuard (rm-2008)', () => {
  it('replay-reject: a byte-identical redelivery inside the window is a replay', () => {
    const guard = createIngestReplayGuard({windowSeconds: 60})
    const input = guardInput({deliveryGuid: 'guid-1'})

    expect(guard.isReplay(input)).toBe(false) // first sight — admitted
    expect(guard.isReplay({...input, nowSeconds: input.nowSeconds + 59})).toBe(true) // replay
  })

  it('distinct delivery GUIDs for the same body coexist — both admitted', () => {
    const guard = createIngestReplayGuard()
    expect(guard.isReplay(guardInput({deliveryGuid: 'guid-a'}))).toBe(false)
    expect(guard.isReplay(guardInput({deliveryGuid: 'guid-b'}))).toBe(false)
    expect(guard.isReplay(guardInput({deliveryGuid: 'guid-a'}))).toBe(true)
    expect(guard.isReplay(guardInput({deliveryGuid: 'guid-b'}))).toBe(true)
  })

  it('expiry re-admit: after window expiry the same delivery admits again', () => {
    const guard = createIngestReplayGuard({windowSeconds: 60})
    const input = guardInput({deliveryGuid: 'guid-1'})

    expect(guard.isReplay(input)).toBe(false)
    expect(guard.isReplay({...input, nowSeconds: input.nowSeconds + 60})).toBe(false) // expired → re-admitted
    expect(guard.isReplay({...input, nowSeconds: input.nowSeconds + 61})).toBe(true) // now inside the NEW window
  })

  it('cap eviction: at cap the oldest-inserted key is evicted (FIFO), newest stays live', () => {
    const guard = createIngestReplayGuard({cap: 2, windowSeconds: 60})
    const now = 1_700_000_000

    expect(guard.isReplay(guardInput({deliveryGuid: 'aaa', nowSeconds: now}))).toBe(false)
    expect(guard.isReplay(guardInput({deliveryGuid: 'bbb', nowSeconds: now}))).toBe(false)
    // Inserting 'ccc' exceeds the cap → oldest ('aaa') evicted.
    expect(guard.isReplay(guardInput({deliveryGuid: 'ccc', nowSeconds: now}))).toBe(false)
    // 'aaa' was evicted, so it re-admits (evicting 'bbb' this time).
    expect(guard.isReplay(guardInput({deliveryGuid: 'aaa', nowSeconds: now}))).toBe(false)
    // 'ccc' never left the cache → still a replay.
    expect(guard.isReplay(guardInput({deliveryGuid: 'ccc', nowSeconds: now}))).toBe(true)
  })

  it('cap eviction sweeps EXPIRED entries first — a live entry is never evicted for an expired one', () => {
    const guard = createIngestReplayGuard({cap: 2, windowSeconds: 10})
    const t0 = 1_700_000_000

    expect(guard.isReplay(guardInput({deliveryGuid: 'old-1', nowSeconds: t0}))).toBe(false)
    expect(guard.isReplay(guardInput({deliveryGuid: 'old-2', nowSeconds: t0}))).toBe(false)
    // At t0+20 both originals are expired; inserting a third key sweeps them
    // instead of evicting anything live.
    expect(guard.isReplay(guardInput({deliveryGuid: 'new', nowSeconds: t0 + 20}))).toBe(false)
    expect(guard.isReplay(guardInput({deliveryGuid: 'new', nowSeconds: t0 + 25}))).toBe(true)
    // The swept originals re-admit rather than replay.
    expect(guard.isReplay(guardInput({deliveryGuid: 'old-1', nowSeconds: t0 + 26}))).toBe(false)
  })

  it('a live entry survives the sweep triggered by an unrelated insert', () => {
    const guard = createIngestReplayGuard({cap: 2, windowSeconds: 10})
    const t0 = 1_700_000_000

    expect(guard.isReplay(guardInput({deliveryGuid: 'live', nowSeconds: t0}))).toBe(false)
    expect(guard.isReplay(guardInput({deliveryGuid: 'live-2', nowSeconds: t0 + 5}))).toBe(false)
    // t0+8: 'live' (exp t0+10) still live; inserting a third key must evict the
    // OLDEST live entry ('live'), never the newer 'live-2'.
    expect(guard.isReplay(guardInput({deliveryGuid: 'third', nowSeconds: t0 + 8}))).toBe(false)
    expect(guard.isReplay(guardInput({deliveryGuid: 'live-2', nowSeconds: t0 + 9}))).toBe(true)
    expect(guard.isReplay(guardInput({deliveryGuid: 'live', nowSeconds: t0 + 9}))).toBe(false)
  })
})
