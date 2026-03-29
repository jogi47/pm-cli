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
- documented the output-mode rule in `README.md`
- added focused regression tests for:
  - output-mode conflict handling
  - JSON-only stdout for `tasks create`
  - JSON-only stdout for `tasks update`
  - JSON-only stdout for `done`
  - JSON-only stdout for `delete`
  - JSON-only stdout for `tasks thread --with-task`

## files changed

- `packages/cli/src/lib/output-mode.ts`
- `packages/cli/src/commands/tasks/assigned.ts`
- `packages/cli/src/commands/tasks/overdue.ts`
- `packages/cli/src/commands/tasks/search.ts`
- `packages/cli/src/commands/tasks/create.ts`
- `packages/cli/src/commands/tasks/update.ts`
- `packages/cli/test/lib/output-mode.test.ts`
- `packages/cli/test/commands/tasks/search.test.ts`
- `packages/cli/test/commands/tasks/create-command.test.ts`
- `packages/cli/test/commands/tasks/update-command.test.ts`
- `packages/cli/test/commands/done.test.ts`
- `packages/cli/test/commands/delete.test.ts`
- `packages/cli/test/commands/tasks/thread.test.ts`
- `README.md`

## verification

- `pnpm --filter pm-cli lint`
- `pnpm exec vitest run packages/cli/test/lib/output-mode.test.ts packages/cli/test/commands/tasks/search.test.ts packages/cli/test/commands/tasks/create-command.test.ts packages/cli/test/commands/tasks/update-command.test.ts packages/cli/test/commands/tasks/assigned.test.ts packages/cli/test/commands/tasks/update.test.ts packages/cli/test/commands/tasks/create.test.ts`
- `pnpm exec vitest run packages/cli/test/commands/done.test.ts packages/cli/test/commands/delete.test.ts packages/cli/test/commands/tasks/thread.test.ts`

## not completed here

- versioned JSON envelopes
- exit code normalization
- non-interactive `connect` and `workspace switch`
