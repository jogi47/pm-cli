# Attachment Feature Review Findings

Date: 2026-03-15

Scope:
- `pm tasks thread`
- `pm tasks attachments`
- Asana attachment download flow
- attachment rendering in human-readable output

Status:
- these findings are not fixed by this document
- this file captures the current review concerns so they can be addressed explicitly

## Summary

The current attachment implementation is close, but there are three user-visible issues that make the behavior incorrect in common cases:

1. `--limit` is applied after image downloads, which causes extra network and disk work for entries the user never sees.
2. `--cleanup` can be marked as "done" before any real image download attempt happens, which allows stale files to remain in the task download directory.
3. human-readable output can omit a valid attachment link when only `permalinkUrl` is available.

These are discrete regressions. They do not appear to break the entire feature, but they do make the current behavior inaccurate enough that the patch should not be treated as fully correct yet.

## Finding 1: `limit` Is Applied Too Late

Severity: `P2`

Relevant code:
- [packages/plugin-asana/src/index.ts](/Users/jogimac/playgrounds/pm-cli/packages/plugin-asana/src/index.ts#L284)

Current behavior:
- `getTaskThread()` builds the full merged entry list
- if `downloadImages` is enabled, it downloads image attachments for the full entry list
- only after that does it apply `entries.slice(-options.limit)`

Current logic:

```ts
if (options?.downloadImages) {
  await this.downloadThreadImages(entries, {
    taskId: externalId,
    tempDir: options.tempDir,
    cleanup: options.cleanup,
  });
}

if (options?.limit && options.limit > 0) {
  return entries.slice(-options.limit);
}
```

Why this is wrong:
- `pm tasks thread --limit N --download-images` advertises "last N entries"
- the current implementation still downloads images from older entries outside that last `N`
- on large tasks, this creates unnecessary I/O and temp-directory churn
- with `--cleanup`, those older image files can be written into the task download folder even though they are not part of the returned slice

User impact:
- slower command runtime
- unnecessary downloads
- unexpected files in the temp directory
- confusion when the downloaded files do not match the displayed thread slice

Recommended fix:
- build and sort the full entry list first
- apply `limit` before download work
- only pass the final returned slice into `downloadThreadImages()`

Safer structure:

```ts
const entries = [...storyEntries, ...attachmentEntries]
  .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

const finalEntries =
  options?.limit && options.limit > 0 ? entries.slice(-options.limit) : entries;

if (options?.downloadImages) {
  await this.downloadThreadImages(finalEntries, ...);
}

return finalEntries;
```

Suggested regression tests:
- thread with more than `limit` entries and multiple image attachments
- verify only attachments in the returned slice are downloaded
- verify older sliced-out images do not get `localPath`

## Finding 2: Cleanup Is Marked Complete Too Early

Severity: `P2`

Relevant code:
- [packages/plugin-asana/src/index.ts](/Users/jogimac/playgrounds/pm-cli/packages/plugin-asana/src/index.ts#L387)

Current behavior:
- `downloadThreadImages()` tracks a `cleaned` flag
- it sets `cleaned = true` after the call to `downloadAttachment()`
- this happens even when `downloadAttachment()` returns `null`

Current logic:

```ts
for (const attachment of imageAttachments) {
  const localPath = await this.downloadAttachment(attachment, {
    ...options,
    cleanup: options.cleanup && !cleaned,
  });

  if (options.cleanup) {
    cleaned = true;
  }

  if (localPath) {
    attachment.localPath = localPath;
  }
}
```

Why this is wrong:
- `downloadAttachment()` immediately returns `null` when the attachment is not actually downloadable, for example when it is not an image or has no `downloadUrl`
- if the first attachment in iteration order is skipped this way, cleanup is still considered complete
- later real image downloads then happen without first clearing the old task download directory

Concrete failure mode:
- previous run downloaded image files into `task-<id>/`
- next run uses `--cleanup`
- first attachment encountered is a doc/PDF or another non-downloadable attachment representation
- `cleaned` becomes `true`
- first real image is downloaded later, but the old directory was never removed

User impact:
- stale files remain mixed with current downloads
- the download directory no longer reflects the current command run
- troubleshooting becomes harder because old and new files coexist

Recommended fix:
- only mark cleanup as complete after an actual download attempt is going to happen
- in practice, this means either:
  - pre-filter to attachments that can really be downloaded, or
  - set `cleaned = true` only after `localPath` is returned or after the code confirms a real fetch path was entered

Safer options:

Option A:
- filter attachments before the loop to only image attachments with a usable `downloadUrl`

Option B:
- keep the current loop structure but move `cleaned = true` under a condition that confirms download work actually happened

Suggested regression tests:
- task download folder already contains an old file
- first attachment encountered is non-downloadable
- later attachment is a real downloadable image
- verify old files are removed before the new image is written

## Finding 3: Attachment Output Drops Valid `permalinkUrl`

Severity: `P3`

Relevant code:
- [packages/core/src/utils/output.ts](/Users/jogimac/playgrounds/pm-cli/packages/core/src/utils/output.ts#L421)

Current behavior:
- `formatThreadAttachment()` shows:
  - `localPath` first
  - then `downloadUrl`
  - then `viewUrl`
- it never falls back to `permalinkUrl`

Current logic:

```ts
if (attachment.localPath) {
  parts.push(chalk.green(`saved: ${attachment.localPath}`));
} else if (attachment.downloadUrl) {
  parts.push(chalk.underline.blue(attachment.downloadUrl));
} else if (attachment.viewUrl) {
  parts.push(chalk.underline.blue(attachment.viewUrl));
}
```

Why this is wrong:
- the attachment model already carries `permalinkUrl`
- some Asana attachments expose a permanent link without exposing `downloadUrl` or `viewUrl`
- in those cases, the CLI prints the file name and type but no usable link

User impact:
- human output looks incomplete
- users cannot open the attachment from the rendered result even though a valid URL exists on the object
- JSON output is richer than human output for the same object, which is inconsistent

Recommended fix:
- add one more fallback branch:

```ts
} else if (attachment.permalinkUrl) {
  parts.push(chalk.underline.blue(attachment.permalinkUrl));
}
```

Suggested regression tests:
- render attachment with only `permalinkUrl`
- verify human output contains that URL

## Recommended Fix Order

1. Fix `limit` ordering before downloads
2. Fix cleanup semantics for actual download attempts
3. Add `permalinkUrl` fallback in the renderer

Reasoning:
- the first two affect correctness of file system side effects
- the third is smaller and isolated to display behavior

## Acceptance Criteria For Closure

This review note can be considered addressed when all of the following are true:

- `pm tasks thread --limit N --download-images` only downloads images from the returned `N` entries
- `--cleanup` clears old task downloads before the first real image download, even if earlier attachments are skipped
- human-readable thread and attachment output prints a usable link when only `permalinkUrl` is present
- regression tests exist for all three behaviors

