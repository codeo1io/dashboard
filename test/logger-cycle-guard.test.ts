import {describe, expect, test} from 'vitest';

import {redactSensitiveFields} from '../src/logger';

// rm-2306: redactSensitiveFields had no cycle guard — a cyclic context object
// reached RangeError maximum-call-stack BEFORE any redaction executed, so the
// logger itself crashed on the very payload it was redacting for. This test is
// the red-first proof: it throws at base (pre-guard) and passes after the
// WeakSet seen-set guard lands.
describe('redactSensitiveFields cycle guard (rm-2306)', () => {
  test('cyclic object redacts instead of throwing RangeError', () => {
    const ctx: Record<string, unknown> = {
      plain: 'visible',
      token: 'gho_1234567890abcdef',
    };
    const child = {token: 'ghs_0987654321fedcba', parent: null as unknown};
    ctx.child = child;
    child.parent = ctx;
    ctx.self = ctx;

    let redacted: Record<string, unknown>;
    expect(() => {
      redacted = redactSensitiveFields(ctx) as Record<string, unknown>;
    }).not.toThrow();

    expect(redacted!.plain).toBe('visible');
    expect(redacted!.token).toBe('[REDACTED]');
    const redactedChild = redacted!.child as Record<string, unknown>;
    expect(redactedChild.token).toBe('[REDACTED]');
    // Cyclic references degrade to the redaction marker — they can never
    // re-enter the structure, so the result must be safely serializable.
    expect(redacted!.self).toBe('[REDACTED]');
    expect(redactedChild.parent).toBe('[REDACTED]');
    expect(() => JSON.stringify(redacted)).not.toThrow();
  });

  test('self-referencing array degrades instead of throwing', () => {
    const arr: unknown[] = [];
    arr.push(arr);
    arr.push('tail');

    let redacted: unknown;
    expect(() => {
      redacted = redactSensitiveFields({items: arr});
    }).not.toThrow();

    const items = (redacted as {items: unknown[]}).items;
    expect(items.length).toBe(2);
    expect(items[1]).toBe('tail');
    expect(() => JSON.stringify(redacted)).not.toThrow();
  });

  test('acyclic masking semantics are unchanged by the guard', () => {
    const nested = {key: {inner: 'walked-not-masked'}};
    const input = {token: 'a-secret-value', nested, plain: 42};
    const redacted = redactSensitiveFields(input);

    expect(redacted.token).toBe('[REDACTED]');
    expect(redacted.plain).toBe(42);
    // Non-string sensitive values pass through and are walked, not masked.
    expect(redacted.nested).toEqual({key: {inner: 'walked-not-masked'}});
    expect(input.nested).toEqual(nested);
  });
});
