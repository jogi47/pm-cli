import { describe, expect, it } from 'vitest';
import { isValidGitBranchName, sanitizeBranchSegment } from '../../src/lib/branch-name.js';

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

  it('rejects git-reserved patterns', () => {
    expect(isValidGitBranchName('feat/foo..bar')).toBe(false);
    expect(isValidGitBranchName('feat/foo.lock')).toBe(false);
    expect(isValidGitBranchName('feat/@{bad}')).toBe(false);
    expect(isValidGitBranchName('feat/.hidden')).toBe(false);
  });

  it('accepts a normal task branch name', () => {
    expect(isValidGitBranchName('feat/asana-1234-fix-login')).toBe(true);
  });
});
