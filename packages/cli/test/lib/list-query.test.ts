import { describe, expect, it } from 'vitest';
import { applyDisplayLimit, getFetchLimit } from '../../src/lib/list-query.js';

describe('list query helpers', () => {
  it('inflates fetch limits to reduce post-filter truncation', () => {
    expect(getFetchLimit(25)).toBe(100);
    expect(getFetchLimit(50)).toBe(150);
  });

  it('applies the final display limit after filtering', () => {
    expect(applyDisplayLimit(['a', 'b', 'c'], 2)).toEqual(['a', 'b']);
    expect(applyDisplayLimit(['a', 'b', 'c'], undefined)).toEqual(['a', 'b', 'c']);
  });
});
