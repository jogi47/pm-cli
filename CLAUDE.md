# Repository Agent Guide

This file is the canonical agent guide for this repository. `AGENTS.md` should
symlink to this file so there is only one source of truth.

## Purpose

This repo is a pnpm monorepo for `pm`, a unified CLI for project-management
workflows across multiple providers.

Agent goals:
- preserve the shared normalized task model
- keep provider capability boundaries explicit
- prefer small, verifiable changes
- update tests and user-facing help when command behavior changes

## Build And Development

```bash
pnpm install              # install workspace dependencies
pnpm build                # build all packages
pnpm test                 # run the test suite
pnpm lint                 # typecheck/lint all packages
pnpm pm <command>         # run the CLI from source
pnpm dev                  # watch mode for the workspace
```

Useful focused commands:

```bash
pnpm exec vitest run packages/core/test/models/task.test.ts
pnpm exec vitest run packages/core/test/**/*.test.ts
pnpm --filter pm-cli build
pnpm pm --help
```

## Workspace Layout

This is a pnpm monorepo with 7 packages under `packages/`:

```text
packages/core            -> core models, managers, utilities
packages/plugin-asana    -> Asana provider
packages/plugin-notion   -> Notion provider
packages/plugin-trello   -> Trello provider
packages/plugin-linear   -> Linear provider
packages/plugin-clickup  -> ClickUp provider
packages/cli             -> oclif CLI entry point
```

Package names are neutral and unscoped:
- `pm-cli`
- `pm-cli-core`
- `pm-cli-plugin-asana`
- `pm-cli-plugin-notion`
- `pm-cli-plugin-trello`
- `pm-cli-plugin-linear`
- `pm-cli-plugin-clickup`

## Current Product Surface

Implemented commands:
- provider auth and status: `connect`, `disconnect`, `providers`, `workspace`
- task lists and search: `tasks assigned`, `tasks overdue`, `tasks search`
- task detail and actions: `tasks show`, `open`, `comment`, `done`, `delete`
- task write flows: `tasks create`, `tasks update`
- dashboards: `today`, `summary`
- git helper: `branch`
- cache/config commands
- Asana thread and attachment inspection:
  - `tasks thread`
  - `tasks attachments`

Not implemented yet:
- `pm ui`
- `pm bulk update`
- `pm bulk move`
- `pm bulk create --file`

Current capability notes:
- thread and attachment flows are implemented on the Asana path
- image download support for thread/attachment flows is implemented on the Asana path
- workspace switching is primarily meaningful for Asana today

## Architecture

### Plugin Model

Every provider implements the `PMPlugin` interface in
`packages/core/src/models/plugin.ts`.

A provider package usually contains:
- `client.ts` for auth and raw API calls
- `mapper.ts` for normalization into the shared task model
- `index.ts` for the `PMPlugin` implementation and wiring

Plugins are registered in `packages/cli/src/init.ts` and initialized on import.

### Data Flow

```text
CLI Command -> PluginManager -> Plugin -> CacheManager
                                   -> Client
                                   -> Mapper
                                   -> output utils
```

### Core Managers

Core singletons are exported from `packages/core`:
- `pluginManager` routes operations and aggregates provider results
- `authManager` stores credentials and supports env overrides
- `cacheManager` manages the JSON cache at `~/.cache/pm-cli/cache.json`
- `configManager` manages merged user/project config from `.pmrc.json`

## Important Modeling Rules

### Task IDs

All task IDs use `PROVIDER-externalId`, for example:
- `ASANA-1234567890`
- `NOTION-abc-def`
- `LINEAR-ENG-42`

Never construct IDs manually. Use `createTaskId()` and `parseTaskId()`.

### Shared Output Contracts

When changing command behavior, check the shared renderers in
`packages/core/src/utils/output.ts`.

Important helpers:
- `renderTasks`
- `renderTasksPlain`
- `renderTaskIds`
- `renderTask`
- `renderThreadEntries`
- `renderTaskAttachments`
- `renderDashboard`
- `renderSummary`
- `renderSuccess`
- `renderError`

If a command gains new fields or flags, keep these aligned:
- CLI help text
- README examples
- `skills/SKILL.md`
- tests covering output or behavior changes

## CLI Command Conventions

Commands live under `packages/cli/src/commands/`.

Import rules:
- top-level commands should import `../init.js`
- nested task commands should import `../../init.js`

Typical command structure:
1. define `args` and `flags`
2. parse input
3. validate provider/task identity
4. call `pluginManager` or another shared manager
5. render via shared output helpers

Prefer explicit provider capability errors when a provider does not support a
feature such as comments, threads, attachments, or workspaces.

## Adding Or Extending Providers

1. Create `packages/plugin-xxx/` with `client.ts`, `mapper.ts`, and `index.ts`.
2. Implement `PMPlugin`.
3. Add the provider to `ProviderType` in `packages/core/src/models/task.ts`.
4. Add credential fields to `PROVIDER_CREDENTIALS` in
   `packages/core/src/models/plugin.ts`.
5. Register the plugin in `packages/cli/src/init.ts`.
6. Add the dependency in `packages/cli/package.json`.
7. Document provider-specific capability gaps.
8. Add or update tests for mapping, auth flow, and command behavior.

## Editing And Review Expectations

- Keep changes small and mechanical when possible.
- Prefer updating one command path end-to-end rather than scattering partial fixes.
- When touching help text, verify with `pnpm pm <command> --help`.
- When changing package metadata or imports, run a full build and test pass.
- When adding downloads or file side effects, test cleanup and limit/order logic.
- When doing reviews, prioritize:
  - user-visible regressions
  - provider capability mismatches
  - stale docs/help/examples
  - missing regression tests

## Conventions

- ESM only
- TypeScript strict mode
- Vitest under `packages/*/test/**/*.test.ts`
- Conventional Commits, lowercase, subject max 72 chars
- published package names are defined in each package's `package.json`
- use the root [PUBLISHING.md](./PUBLISHING.md) for release steps
