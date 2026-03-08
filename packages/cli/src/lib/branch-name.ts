const MAX_BRANCH_SEGMENT_LENGTH = 80;
const GIT_FORBIDDEN_CHARS = /[\u0000-\u001F\u007F ~^:?*\[]/;

/**
 * Sanitize user/provider input into a branch-name segment.
 */
export function sanitizeBranchSegment(value: string): string {
  let sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9./_-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/\.{2,}/g, '.')
    .replace(/\/{2,}/g, '/');

  // Prevent segments starting with '.'
  sanitized = sanitized.replace(/\/\./g, '/-');

  // Prevent segments ending with '.lock'
  sanitized = sanitized.replace(/\.lock(?=\/|$)/g, '-lock');

  return sanitized
    .replace(/^[-./]+|[-./]+$/g, '')
    .slice(0, MAX_BRANCH_SEGMENT_LENGTH);
}

/**
 * Git ref compatibility check based on `git check-ref-format --branch` constraints.
 */
export function isValidGitBranchName(branchName: string): boolean {
  if (!branchName) return false;
  if (branchName.startsWith('-') || branchName.startsWith('/')) return false;
  if (branchName.endsWith('/') || branchName.endsWith('.')) return false;
  if (branchName.includes('..') || branchName.includes('@{') || branchName.includes('\\')) return false;
  if (GIT_FORBIDDEN_CHARS.test(branchName)) return false;

  const segments = branchName.split('/');
  return segments.every((segment) => Boolean(segment) && !segment.startsWith('.') && !segment.endsWith('.lock'));
}
