import { describe, expect, it } from 'vitest';
import { ProviderError } from '../../../src/utils/errors.js';
import { normalizeWarnings, providerErrorsToWarnings } from '../../../src/services/index.js';

describe('service warning helpers', () => {
  it('maps provider errors into warning strings', () => {
    const warnings = providerErrorsToWarnings([
      new ProviderError('asana', 'failed to fetch assigned tasks'),
      new ProviderError('notion', 'failed to search tasks'),
    ]);

    expect(warnings).toEqual([
      '[asana] failed to fetch assigned tasks',
      '[notion] failed to search tasks',
    ]);
  });

  it('trims, de-duplicates, and preserves warning order', () => {
    expect(normalizeWarnings([
      '  first warning  ',
      '',
      'second warning',
      'first warning',
      '  ',
      'third warning',
    ])).toEqual([
      'first warning',
      'second warning',
      'third warning',
    ]);
  });
});
