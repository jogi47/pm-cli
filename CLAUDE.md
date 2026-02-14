# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
pnpm install              # install all workspace dependencies
pnpm build                # build all packages (core → plugins → cli)
pnpm test                 # run all tests with vitest
pnpm lint                 # lint all packages
pnpm pm <command>         # run the CLI from source (e.g. pnpm pm tasks assigned)
pnpm dev                  # watch mode for all packages
```

Run a single test file:
```bash
pnpm test packages/core/test/models/task.test.ts
```

Run tests for a specific package:
```bash
pnpm --filter @jogi47/pm-cli-core test
```

## Architecture

This is a **pnpm monorepo** with 4 packages under `packages/`:

```
@jogi47/pm-cli-core          → Core models, managers, utilities (no CLI dependency)
@jogi47/pm-cli-plugin-asana  → Asana provider (depends on core)
@jogi47/pm-cli-plugin-notion → Notion provider (depends on core)
@jogi47/pm-cli               → CLI entry point using oclif (depends on core + both plugins)
```

### Plugin System

Every provider implements the `PMPlugin` interface from core (`packages/core/src/models/plugin.ts`). A plugin consists of three files:

- **client.ts** — API wrapper (singleton), handles auth and raw API calls
- **mapper.ts** — Transforms provider-specific data into the unified `Task` model
- **index.ts** — Implements `PMPlugin`, wires client + mapper + cache

Plugins are registered in `packages/cli/src/init.ts` and auto-initialized on import. The `PluginManager` in core routes operations to the correct plugin based on provider type.

### Data Flow

```
CLI Command → PluginManager → Plugin → CacheManager (check)
                                     → Client (API call)
                                     → Mapper (normalize to Task)
                                     → CacheManager (store, 5-min TTL)
                                     → output utils → Console
```

### Core Singletons

Three singleton managers exported from `@jogi47/pm-cli-core`:

- **pluginManager** — Routes operations to plugins, aggregates cross-provider results, provides `filterAndSortTasks()` for client-side filtering
- **authManager** — Credential storage via `conf` (checks env vars `ASANA_TOKEN`/`NOTION_TOKEN` first)
- **cacheManager** — JSON file cache at `~/.cache/pm-cli/cache.json`

### Task ID Convention

All task IDs follow the format `PROVIDER-externalId` (e.g., `ASANA-1234567890`, `NOTION-abc-def`). Use `createTaskId()` and `parseTaskId()` from core — never construct IDs manually.

### CLI Commands (oclif)

Commands live in `packages/cli/src/commands/`. Each command extends oclif's `Command` class and must import `'../../init.js'` (or `'../init.js'` for top-level commands) to trigger plugin registration.

Command pattern: static `args`/`flags` definitions → `run()` method → call pluginManager → render output.

Output helpers (`renderTasks`, `renderTasksPlain`, `renderTaskIds`, `renderDashboard`, `renderSummary`, `renderSuccess`, `renderError`) are in `packages/core/src/utils/output.ts`. String utilities (`slugify`) are in `packages/core/src/utils/string.ts`.

### Adding a New Provider

1. Create `packages/plugin-xxx/` with `client.ts`, `mapper.ts`, `index.ts`
2. Implement the `PMPlugin` interface (including optional `addComment` if supported)
3. Add the provider to `ProviderType` union in `packages/core/src/models/task.ts`
4. Add credential fields to `PROVIDER_CREDENTIALS` in `packages/core/src/models/plugin.ts`
5. Register the plugin in `packages/cli/src/init.ts`
6. Add the plugin as a dependency in `packages/cli/package.json`

## Key Conventions

- **ESM only** — All packages use `"type": "module"` with NodeNext module resolution
- **TypeScript strict mode** — Target ES2022, config in `tsconfig.base.json`
- **Tests** — Vitest, files at `packages/*/test/**/*.test.ts`
- **Commit messages** — Conventional Commits format, all lowercase, subject max 72 chars
- **npm packages** — All published under `@jogi47/` scope with public access
