const MAX_BRANCH_SEGMENT_LENGTH = 80;

export function sanitizeBranchSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9/_-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/\/{2,}/g, '/')
    .replace(/^[-/]+|[-/]+$/g, '')
    .slice(0, MAX_BRANCH_SEGMENT_LENGTH);
}
