# cli output contract hardening slice

date: 2026-03-29
status: completed
source plans:
- `docs/todos/cli-best-practices-review-and-plan.md`
- `docs/todos/notesmd-cli-review.md`

## purpose

Record the first completed implementation slice from the broader CLI contract
backlog without moving the still-active parent plan into `completed/`.

## completed in this slice

- added `packages/cli/src/lib/output-mode.ts` to centralize list/search output
  mode selection
- enforced mutual exclusivity for `--json`, `--plain`, and `--ids-only` on:
  - `pm tasks assigned`
  - `pm tasks overdue`
  - `pm tasks search`
- made `pm tasks create --json` suppress human success banners so stdout stays
  machine-parseable
- made `pm tasks update --json` suppress human success banners so stdout stays
  machine-parseable
- audited the remaining Milestone 1 JSON command paths:
  - `pm done --json`
  - `pm delete --json`
  - `pm tasks thread --json`
- added a shared versioned JSON envelope with:
  - `schemaVersion`
  - `command`
  - `data`
  - `warnings`
  - `errors`
  - `meta`
- routed JSON serialization through shared helpers for:
  - list and detail renderers
  - provider, dashboard, and summary renderers
  - thread and attachment renderers
  - bulk mutation output
  - `pm config list`
- documented the output-mode rule in `README.md`
- added focused regression tests for:
  - output-mode conflict handling
  - JSON-only stdout for `tasks create`
  - JSON-only stdout for `tasks update`
  - JSON-only stdout for `done`
  - JSON-only stdout for `delete`
  - JSON-only stdout for `tasks thread --with-task`
  - versioned envelope rendering in core output helpers

## files changed

- `packages/cli/src/lib/output-mode.ts`
- `packages/cli/src/commands/tasks/assigned.ts`
- `packages/cli/src/commands/tasks/overdue.ts`
- `packages/cli/src/commands/tasks/search.ts`
- `packages/cli/src/commands/tasks/create.ts`
- `packages/cli/src/commands/tasks/update.ts`
- `packages/cli/src/commands/tasks/thread.ts`
- `packages/cli/src/commands/tasks/attachments.ts`
- `packages/cli/src/commands/tasks/show.ts`
- `packages/cli/src/commands/providers.ts`
- `packages/cli/src/commands/today.ts`
- `packages/cli/src/commands/summary.ts`
- `packages/cli/src/commands/done.ts`
- `packages/cli/src/commands/delete.ts`
- `packages/cli/src/commands/config/list.ts`
- `packages/core/src/utils/output.ts`
- `packages/cli/test/lib/output-mode.test.ts`
- `packages/core/test/utils/output.test.ts`
- `packages/cli/test/commands/tasks/search.test.ts`
- `packages/cli/test/commands/tasks/create-command.test.ts`
- `packages/cli/test/commands/tasks/update-command.test.ts`
- `packages/cli/test/commands/done.test.ts`
- `packages/cli/test/commands/delete.test.ts`
- `packages/cli/test/commands/tasks/thread.test.ts`
- `packages/cli/test/commands/tasks/attachments.test.ts`
- `packages/cli/test/commands/providers.test.ts`
- `packages/cli/test/commands/config/list.test.ts`
- `README.md`

## verification

- `pnpm --filter pm-cli lint`
- `pnpm exec vitest run packages/cli/test/lib/output-mode.test.ts packages/cli/test/commands/tasks/search.test.ts packages/cli/test/commands/tasks/create-command.test.ts packages/cli/test/commands/tasks/update-command.test.ts packages/cli/test/commands/tasks/assigned.test.ts packages/cli/test/commands/tasks/update.test.ts packages/cli/test/commands/tasks/create.test.ts`
- `pnpm exec vitest run packages/cli/test/commands/done.test.ts packages/cli/test/commands/delete.test.ts packages/cli/test/commands/tasks/thread.test.ts`
- `pnpm exec vitest run packages/core/test/utils/output.test.ts packages/cli/test/commands/providers.test.ts packages/cli/test/commands/config/list.test.ts packages/cli/test/commands/tasks/attachments.test.ts packages/cli/test/commands/tasks/search.test.ts packages/cli/test/commands/tasks/create-command.test.ts packages/cli/test/commands/tasks/update-command.test.ts packages/cli/test/commands/done.test.ts packages/cli/test/commands/delete.test.ts packages/cli/test/commands/tasks/thread.test.ts packages/cli/test/commands/tasks/assigned.test.ts packages/cli/test/commands/tasks/create.test.ts packages/cli/test/commands/tasks/update.test.ts`

## not completed here

- exit code normalization
- non-interactive `connect` and `workspace switch`
