import { describe, expect, it } from 'vitest';

import {
  REGISTRY,
  classifyTemplateOutcome,
} from '../scripts/graphql-canary.js';

function scopeError(): unknown {
  return {
    graphQLErrors: [
      {
        type: 'FORBIDDEN',
        message:
          'Resource not accessible by integration for vulnerabilityAlerts field',
      },
    ],
  };
}

describe('classifyTemplateOutcome', () => {
  it('reports ok when the template produced no GraphQL errors', () => {
    expect(classifyTemplateOutcome([])).toBe('ok');
  });

  it('reports scope-limited when every error classifies as a vulnerabilityAlerts permission error', () => {
    expect(classifyTemplateOutcome([scopeError()])).toBe('scope-limited');
    expect(
      classifyTemplateOutcome([scopeError(), scopeError()]),
    ).toBe('scope-limited');
  });

  it('reports failed when any error does not classify (mixed errors)', () => {
    expect(
      classifyTemplateOutcome([scopeError(), { graphQLErrors: [{ message: 'bad object id' }] }]),
    ).toBe('failed');
  });

  it('reports failed when no error classifies', () => {
    expect(
      classifyTemplateOutcome([
        new Error('network down'),
        { graphQLErrors: [{ message: 'bad object id' }] },
      ]),
    ).toBe('failed');
  });

  it('treats non-array-ish single plain errors conservatively as failed', () => {
    expect(classifyTemplateOutcome([new Error('ECONNRESET')])).toBe('failed');
  });
});

describe('REGISTRY', () => {
  it('is non-empty with unique labels (registry-emptiness failsafe input)', () => {
    expect(REGISTRY.length).toBeGreaterThan(0);
    const labels = REGISTRY.map(([label]) => label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('every template mentions the checkSuite depth selection the canary guards', () => {
    for (const [, query] of REGISTRY) {
      expect(query).toContain('checkSuite');
      expect(query).toContain('updatedAt');
      expect(query).toContain('checkRuns');
    }
  });
});
