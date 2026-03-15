# thash/asana Review For PM-CLI

This report compares `pm-cli` with [`thash/asana`](https://github.com/thash/asana) and focuses only on ideas that are still useful for this project.

## Summary

`thash/asana` is much smaller and older than `pm-cli`, so it is not a better architectural reference overall. The transferable value is mostly in operator ergonomics: faster Asana-first workflows, editor-based input, and a few convenience behaviors that reduce friction for day-to-day CLI use.

## Suggested Improvements

### 1. Prompt for workspace selection during `pm connect asana`

One of the nicest parts of `thash/asana` is that configuration is not just token capture. Its `config` flow immediately validates the token, lists workspaces, and saves the selected workspace:

- [`commands/config.go`](https://github.com/thash/asana/blob/master/commands/config.go)
- [`README.md`](https://github.com/thash/asana/blob/master/README.md)

In `pm-cli`, [packages/cli/src/commands/connect.ts](../packages/cli/src/commands/connect.ts) connects successfully and prints the current workspace, but it does not offer an immediate post-auth workspace choice. Since workspace switching is especially relevant on the Asana path, a follow-up prompt after successful auth would be a good fit.

Applicable recommendation for `pm-cli`:

- after `pm connect asana`, if multiple workspaces are available, prompt to choose the default one
- keep `pm workspace switch` for later changes, but make the first-run path smoother

This is a high-value improvement because it removes an extra command from the main Asana onboarding flow.

### 2. Add an editor-backed comment composer

`thash/asana` has a genuinely good comment flow:

- it opens `$EDITOR`
- it pre-fills a template with task title, task notes, and prior story context
- it strips comment lines before posting

See [`commands/comment.go`](https://github.com/thash/asana/blob/master/commands/comment.go).

`pm-cli` currently requires the comment body as a positional argument in [packages/cli/src/commands/comment.ts](../packages/cli/src/commands/comment.ts). That is fine for short comments, but weak for longer status updates, structured notes, or multi-line handoffs.

Applicable recommendation for `pm-cli`:

- add `pm comment <id> --editor`
- if `--editor` is used, open a temp file in `$EDITOR`
- prefill the file with task title and optional recent thread context for providers that support it
- post the edited content only if it is non-empty

This would be especially useful on the Asana path, where thread context already exists in the plugin.

### 3. Expose a first-class attachment download command

`thash/asana` has a dedicated attachment download workflow instead of treating downloads as a side effect:

- [`commands/download.go`](https://github.com/thash/asana/blob/master/commands/download.go)
- task detail output already lists attachment indexes in [`commands/task.go`](https://github.com/thash/asana/blob/master/commands/task.go)

`pm-cli` is close to supporting this already:

- [packages/core/src/models/plugin.ts](../packages/core/src/models/plugin.ts) defines optional `downloadAttachment`
- [packages/plugin-asana/src/index.ts](../packages/plugin-asana/src/index.ts) implements `downloadAttachment`
- [packages/cli/src/commands/tasks/attachments.ts](../packages/cli/src/commands/tasks/attachments.ts) currently only exposes listing plus image-download side effects

Applicable recommendation for `pm-cli`:

- add a dedicated command such as `pm tasks attachments download <task-id> <attachment-id>`
- optionally support `--output <path>`
- use the provider-level `downloadAttachment` hook instead of embedding download logic in the CLI

This is one of the most concrete improvements because most of the plumbing already exists.

### 4. Support human-friendly due-date shorthands

`thash/asana` accepts due-date shorthands like `today` and `tomorrow`:

- [`commands/due.go`](https://github.com/thash/asana/blob/master/commands/due.go)
- documented in [`README.md`](https://github.com/thash/asana/blob/master/README.md)

`pm-cli` currently parses due dates with `new Date(...)` in:

- [packages/cli/src/commands/tasks/create.ts](../packages/cli/src/commands/tasks/create.ts)
- [packages/cli/src/commands/tasks/update.ts](../packages/cli/src/commands/tasks/update.ts)

That works, but it misses a very practical CLI convenience.

Applicable recommendation for `pm-cli`:

- add a shared due-date parser for `today`, `tomorrow`, and possibly `+Nd`
- keep `YYYY-MM-DD` as the canonical format
- continue to support `none` on update for clearing the due date

This would improve the write flows without changing the data model.

### 5. Add a more compact Asana-first task inspection path

`thash/asana` makes the common “show me the task, comments, and attachments” flow very direct:

- [`commands/task.go`](https://github.com/thash/asana/blob/master/commands/task.go)
- [`api/task.go`](https://github.com/thash/asana/blob/master/api/task.go)

In `pm-cli`, the same information is split across multiple commands:

- [packages/cli/src/commands/tasks/show.ts](../packages/cli/src/commands/tasks/show.ts)
- [packages/cli/src/commands/tasks/thread.ts](../packages/cli/src/commands/tasks/thread.ts)
- [packages/cli/src/commands/tasks/attachments.ts](../packages/cli/src/commands/tasks/attachments.ts)

That separation is architecturally cleaner for a multi-provider CLI, but it is slightly heavier for operators working mainly in Asana.

Applicable recommendation for `pm-cli`:

- add `pm tasks show <id> --with-thread` or `--verbose` on the Asana path
- or provide an alias that maps to the existing `tasks thread --with-task`

The goal is not to collapse the model, just to make the main inspection path faster.

### 6. Consider a small layer of ergonomic command aliases

`thash/asana` uses short aliases well:

- `tasks` -> `ts`
- `task` -> `t`
- `comment` -> `cm`
- `browse` -> `b`
- `download` -> `dl`

See [`asana.go`](https://github.com/thash/asana/blob/master/asana.go).

`pm-cli` already has an `aliases` field in [packages/core/src/managers/config-manager.ts](../packages/core/src/managers/config-manager.ts), but there is no execution path using it today.

Applicable recommendation for `pm-cli`:

- either add a small set of built-in aliases for the most common commands, or
- implement the existing config-level alias idea end-to-end

This is a lower-priority suggestion than the others, but it is consistent with a tool meant for frequent terminal use.

## Priority Order

If only a few ideas from `thash/asana` are worth adopting, these are the best candidates:

1. workspace selection during `pm connect asana`
2. editor-backed comment composition
3. a dedicated attachment download command
4. due-date shorthands like `today` and `tomorrow`

## Scope Notes

This review was based on source inspection only. I did not run either repository's test suite.

## Sources

External repo:

- [`thash/asana` README](https://github.com/thash/asana/blob/master/README.md)
- [`thash/asana` app entrypoint](https://github.com/thash/asana/blob/master/asana.go)
- [`thash/asana` config flow](https://github.com/thash/asana/blob/master/commands/config.go)
- [`thash/asana` task detail command](https://github.com/thash/asana/blob/master/commands/task.go)
- [`thash/asana` comment command](https://github.com/thash/asana/blob/master/commands/comment.go)
- [`thash/asana` due command](https://github.com/thash/asana/blob/master/commands/due.go)
- [`thash/asana` download command](https://github.com/thash/asana/blob/master/commands/download.go)
- [`thash/asana` task API helpers](https://github.com/thash/asana/blob/master/api/task.go)

Local repo:

- [packages/cli/src/commands/connect.ts](../packages/cli/src/commands/connect.ts)
- [packages/cli/src/commands/comment.ts](../packages/cli/src/commands/comment.ts)
- [packages/cli/src/commands/tasks/show.ts](../packages/cli/src/commands/tasks/show.ts)
- [packages/cli/src/commands/tasks/thread.ts](../packages/cli/src/commands/tasks/thread.ts)
- [packages/cli/src/commands/tasks/attachments.ts](../packages/cli/src/commands/tasks/attachments.ts)
- [packages/cli/src/commands/tasks/create.ts](../packages/cli/src/commands/tasks/create.ts)
- [packages/cli/src/commands/tasks/update.ts](../packages/cli/src/commands/tasks/update.ts)
- [packages/core/src/models/plugin.ts](../packages/core/src/models/plugin.ts)
- [packages/core/src/managers/config-manager.ts](../packages/core/src/managers/config-manager.ts)
- [packages/plugin-asana/src/index.ts](../packages/plugin-asana/src/index.ts)
