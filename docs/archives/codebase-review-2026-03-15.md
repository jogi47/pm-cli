# Codebase Review

Date: March 15, 2026
Repository: `pm-cli`

Status update:
- The Notion env-var auth mismatch has been fixed.
- The Notion title-property search bug has been fixed.
- Search connection handling has been tightened.
- CLI errors now go to stderr.
- `delete` now requires confirmation unless `--force` is passed.
- Root `pnpm test` now uses `vitest run`.

## Summary

This repository has a solid modular plugin-oriented structure with a shared normalized task model, a clear provider interface, and good test coverage. It is pragmatic and maintainable in many places.

It is not a strict Clean Architecture implementation. It is closer to a practical layered architecture with plugin adapters, shared singleton managers, and CLI commands orchestrating use cases directly.

The CLI follows many standard practices, but not all. The biggest gaps are around stderr/stdout separation, a destructive command without confirmation, and a few behavior inconsistencies between docs and actual implementation.

## What Is Good

- The shared task model is centralized and consistent.
  - See [packages/core/src/models/task.ts](/Users/jogimac/playgrounds/pm-cli/packages/core/src/models/task.ts)
- Provider boundaries are explicit through the `PMPlugin` contract.
  - See [packages/core/src/models/plugin.ts](/Users/jogimac/playgrounds/pm-cli/packages/core/src/models/plugin.ts)
- The monorepo structure is clear and aligns with provider isolation.
- Output/rendering logic is centralized instead of being duplicated in every command.
  - See [packages/core/src/utils/output.ts](/Users/jogimac/playgrounds/pm-cli/packages/core/src/utils/output.ts)
- The codebase has broad automated coverage across core logic, CLI commands, and provider mappers.
- Build, lint, and tests pass locally.

## What Is Bad

### 1. Notion env-var auth path is inconsistent with the docs

The README implies that using environment variables is enough for Notion, but the implementation requires `databaseId` as well.

- Docs show only `NOTION_TOKEN`.
  - See [README.md](/Users/jogimac/playgrounds/pm-cli/README.md#L66)
- Auth manager returns only `{ token }` for Notion env vars.
  - See [packages/core/src/managers/auth-manager.ts](/Users/jogimac/playgrounds/pm-cli/packages/core/src/managers/auth-manager.ts#L126)
- Notion client initialization refuses to start without `databaseId`.
  - See [packages/plugin-notion/src/client.ts](/Users/jogimac/playgrounds/pm-cli/packages/plugin-notion/src/client.ts#L23)

Impact:
- A documented setup path does not actually work.

### 2. Notion search is likely broken for many real databases

The Notion search path hardcodes a property named `title`, while the rest of the code correctly treats the title property as schema-dependent.

- Search hardcodes `property: 'title'`.
  - See [packages/plugin-notion/src/client.ts](/Users/jogimac/playgrounds/pm-cli/packages/plugin-notion/src/client.ts#L220)
- Create/update logic correctly resolves the real title property dynamically.
  - See [packages/plugin-notion/src/index.ts](/Users/jogimac/playgrounds/pm-cli/packages/plugin-notion/src/index.ts#L199)

Impact:
- `pm tasks search` may fail or silently miss results when the title column is named `Name`, which is common in Notion.

### 3. Search command has weaker connection/error handling than list commands

`aggregateTasks()` handles missing connections more clearly than `searchTasks()`.

- Stronger connection handling:
  - See [packages/core/src/managers/plugin-manager.ts](/Users/jogimac/playgrounds/pm-cli/packages/core/src/managers/plugin-manager.ts#L156)
- Weaker search handling:
  - See [packages/core/src/managers/plugin-manager.ts](/Users/jogimac/playgrounds/pm-cli/packages/core/src/managers/plugin-manager.ts#L220)

Impact:
- Search can behave like “no results” when the real issue is “no connected provider”.

### 4. `--limit` is applied too early for filtered/sorted list commands

The manager forwards `limit` to providers first, and only after that the CLI applies `--status`, `--priority`, and `--sort`.

- Provider fetch limit applied early:
  - See [packages/core/src/managers/plugin-manager.ts](/Users/jogimac/playgrounds/pm-cli/packages/core/src/managers/plugin-manager.ts#L176)
- CLI-side filtering/sorting applied later:
  - See [packages/cli/src/commands/tasks/assigned.ts](/Users/jogimac/playgrounds/pm-cli/packages/cli/src/commands/tasks/assigned.ts#L85)

Impact:
- Users can get incomplete or misleading results.
- Example: asking for 25 `todo` tasks may return fewer than 25 even when more exist upstream.

### 5. Errors are printed to stdout instead of stderr

Human-readable errors and warnings are rendered with `console.log`.

- See [packages/core/src/utils/output.ts](/Users/jogimac/playgrounds/pm-cli/packages/core/src/utils/output.ts#L219)

Impact:
- This breaks common CLI expectations for piping, scripting, and shell composition.

### 6. Credential/cache encryption is weakly represented

The repository stores a hardcoded encryption key in source for both auth and cache storage.

- Auth manager key:
  - See [packages/core/src/managers/auth-manager.ts](/Users/jogimac/playgrounds/pm-cli/packages/core/src/managers/auth-manager.ts#L20)
- Cache manager key derivation:
  - See [packages/core/src/managers/cache-manager.ts](/Users/jogimac/playgrounds/pm-cli/packages/core/src/managers/cache-manager.ts#L25)

Impact:
- This is obfuscation more than secure secret storage.
- It may create a false sense of security.

### 7. The repo-level test command is not CI-friendly by default

The root `test` script uses plain `vitest`, which stays in watch mode.

- See [package.json](/Users/jogimac/playgrounds/pm-cli/package.json#L10)

Impact:
- It is inconvenient for CI and automation unless wrapped differently.

## Are We Following Clean Architecture?

Short answer: not strictly.

## What aligns with Clean Architecture

- Domain-ish shared models are centralized in `core`.
- Provider adapters conform to a common interface.
- The CLI package is separated from provider implementations.
- There is some separation between models, managers, providers, and renderers.

## What does not align with Clean Architecture

### Shared singleton infrastructure leaks across layers

Provider code depends directly on concrete shared managers like `authManager` and `cacheManager`.

- See [packages/plugin-notion/src/client.ts](/Users/jogimac/playgrounds/pm-cli/packages/plugin-notion/src/client.ts#L4)

In stricter Clean Architecture, providers would depend on injected interfaces or ports rather than importing shared global services.

### CLI commands orchestrate use cases directly

Commands often call `pluginManager` or plugin capabilities directly.

- Example:
  - See [packages/cli/src/commands/tasks/show.ts](/Users/jogimac/playgrounds/pm-cli/packages/cli/src/commands/tasks/show.ts#L50)

In a stricter clean design, commands would call dedicated application services or use-case handlers.

### Plugin registration is side-effect based

The bootstrap relies on importing `init.ts` for plugin registration.

- See [packages/cli/src/init.ts](/Users/jogimac/playgrounds/pm-cli/packages/cli/src/init.ts#L13)

This is workable, but it is not especially clean or explicit.

## Architecture verdict

This is a pragmatic layered plugin architecture, not strict Clean Architecture.

That is not necessarily bad. For a CLI tool, this tradeoff is often acceptable. The current structure is understandable and reasonably maintainable. It just should not be described as a pure clean architecture implementation.

## Is This Following Standard CLI Practices?

Short answer: partially yes.

## Good CLI practices already present

- Commands generally have descriptions and examples.
- There is support for human-readable and machine-readable output.
- Exit codes are mostly handled correctly.
- Capability mismatches are often surfaced explicitly.
- Help output is readable and oclif is used appropriately for command discovery.

## CLI practice gaps

### Errors should go to stderr

- Current error rendering writes to stdout.
  - See [packages/core/src/utils/output.ts](/Users/jogimac/playgrounds/pm-cli/packages/core/src/utils/output.ts#L219)

### Destructive delete command has no confirmation or force gate

- See [packages/cli/src/commands/delete.ts](/Users/jogimac/playgrounds/pm-cli/packages/cli/src/commands/delete.ts)

For a standard CLI, `delete` should usually have one of:
- interactive confirmation
- `--yes`
- `--force`

### Some help/example polish issues exist

- Example temp-dir path typo:
  - See [packages/cli/src/commands/tasks/thread.ts](/Users/jogimac/playgrounds/pm-cli/packages/cli/src/commands/tasks/thread.ts#L21)
- Similar typo:
  - See [packages/cli/src/commands/tasks/attachments.ts](/Users/jogimac/playgrounds/pm-cli/packages/cli/src/commands/tasks/attachments.ts#L18)

### Some command behavior is inconsistent across similar commands

- Search does not handle connection failures as cleanly as assigned/overdue.
- Some commands use direct validation and `this.exit(1)`, while others delegate to shared error handling.

This does not make the CLI unusable, but it shows the UX is not yet fully standardized.

## Overall Verdict

## Codebase quality

Good foundation, sensible monorepo split, strong shared model, broad tests, and practical provider isolation.

## Architecture quality

Good modular layering, but not strict Clean Architecture. It is more accurate to call it a pragmatic layered plugin architecture.

## CLI quality

Good baseline and already usable, but not fully aligned with standard CLI best practices yet.

## Validation Performed

The following commands were run locally during this review:

```bash
pnpm pm --help
pnpm pm tasks create --help
pnpm test
pnpm build
pnpm lint
```

Observed result:
- help output worked
- tests passed
- build passed
- lint passed

## Recommended Next Fixes

1. Fix Notion env-var auth so docs and implementation match.
2. Fix Notion search to resolve the title property dynamically.
3. Standardize provider connection/error handling for all list/search commands.
4. Move error and warning output to stderr.
5. Rework list-command limit semantics so filtering/sorting happen before final truncation.
6. Add confirmation or `--yes`/`--force` behavior to `delete`.
7. Tighten CLI consistency around validation, examples, and help text.
