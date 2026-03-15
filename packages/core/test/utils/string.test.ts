import { describe, expect, it } from 'vitest';
import { slugify } from '../../src/utils/string.js';

describe('string utils', () => {
  it('slugifies typical titles and trims repeated separators', () => {
    expect(slugify('Fix login bug')).toBe('fix-login-bug');
    expect(slugify('API (REST) endpoint')).toBe('api-rest-endpoint');
    expect(slugify('Multiple   spaces')).toBe('multiple-spaces');
    expect(slugify('---leading-trailing---')).toBe('leading-trailing');
    expect(slugify('Hello World 123')).toBe('hello-world-123');
  });

  it('returns empty output when no safe characters remain', () => {
    expect(slugify('')).toBe('');
    expect(slugify('!@#$%')).toBe('');
  });

  it('caps slug length at 50 characters', () => {
    expect(slugify('x'.repeat(60))).toHaveLength(50);
  });
});
