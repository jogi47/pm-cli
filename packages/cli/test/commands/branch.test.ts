import { describe, expect, it } from 'vitest';
import { sanitizeBranchSegment } from '../../src/lib/branch-name.js';

describe('branch command security helpers', () => {
  it('replaces unsafe shell characters with hyphens', () => {
    expect(sanitizeBranchSegment('feat; rm -rf /')).toBe('feat-rm-rf');
  });

  it('normalizes repeated separators and trims edges', () => {
    expect(sanitizeBranchSegment('///feat//my---task///')).toBe('feat/my-task');
  });

  it('returns empty string when no safe characters remain', () => {
    expect(sanitizeBranchSegment(';;;;')).toBe('');
  });
});
