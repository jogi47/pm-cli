# Attachment Feature Review Findings

Date: 2026-03-15

Scope:
- `pm tasks thread`
- `pm tasks attachments`
- Asana attachment download flow
- attachment rendering in human-readable output

Status:
- reviewed issues were reproduced against the prior implementation
- all three findings are addressed in the current working tree
- focused regression tests were added for the fixed behaviors

## Summary

The attachment/thread review identified three user-visible correctness issues:

1. `--limit` was applied after image downloads.
2. `--cleanup` could be consumed before the first real image download.
3. human-readable output could omit a valid attachment URL when only `permalinkUrl` was available.

Those findings are now fixed.

## Resolution Details

### Finding 1: `limit` Is Applied Before Downloads

Status: `resolved`

Current behavior:
- `getTaskThread()` still builds and sorts the full merged thread
- it computes the final returned slice before any image download work
- `downloadThreadImages()` now receives only the returned entries

Result:
- `pm tasks thread --limit N --download-images` only downloads images from the displayed `N` entries
- older sliced-out entries no longer trigger network or disk work

Regression coverage:
- `packages/plugin-asana/test/thread.test.ts`
- test: `limits entries before downloading images`

### Finding 2: Cleanup Only Applies To Real Image Downloads

Status: `resolved`

Current behavior:
- `downloadThreadImages()` pre-filters attachments to downloadable images
- non-image attachments and image records without `downloadUrl` never enter the download loop
- cleanup is only consumed after a successful image download path returns a local file

Result:
- the first real image download still runs with `cleanup: true` even if earlier attachments in the thread are non-downloadable
- stale files are not preserved because a skipped attachment no longer marks cleanup as complete

Regression coverage:
- `packages/plugin-asana/test/thread.test.ts`
- test: `keeps cleanup on the first real image download after skipping non-downloadable attachments`

### Finding 3: Renderer Falls Back To `permalinkUrl`

Status: `resolved`

Current behavior:
- `formatThreadAttachment()` renders attachment locations in this order:
  - `localPath`
  - `downloadUrl`
  - `viewUrl`
  - `permalinkUrl`

Result:
- human-readable thread and attachment output now shows a usable URL when the attachment only exposes `permalinkUrl`
- human output is aligned more closely with JSON output

Regression coverage:
- `packages/core/test/utils/output.test.ts`
- test: `falls back to permalink URLs when no download or view URL is present`

## Verification

Validated with:
- `pnpm exec vitest run packages/plugin-asana/test/thread.test.ts`
- `pnpm exec vitest run packages/core/test/utils/output.test.ts`
- `pnpm exec vitest run packages/cli/test/commands/tasks/thread.test.ts`
- `pnpm exec vitest run packages/cli/test/commands/tasks/attachments.test.ts`

## Remaining Follow-Up

This review note is closed for the three issues above. A broader `pnpm test` pass is still appropriate before merge, but the attachment/thread-specific regressions identified in this document are covered.
