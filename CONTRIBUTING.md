# Contributing to pm-cli

Thanks for helping improve pm-cli 🎉

## Development setup

### Requirements

- Node.js >= 18
- pnpm >= 8

### Bootstrap

```bash
git clone <repo-url>
cd pm-cli
pnpm install
pnpm build
```

## Project structure

```text
packages/core            # shared models, managers, utils
packages/cli             # oclif commands
packages/plugin-asana    # Asana integration
packages/plugin-notion   # Notion integration
packages/plugin-trello   # Trello integration
packages/plugin-linear   # Linear integration
packages/plugin-clickup  # ClickUp integration
```

## Common commands

```bash
pnpm build
pnpm test
pnpm lint
pnpm pm tasks assigned
```

## Adding a CLI command

1. Create command file under `packages/cli/src/commands/...`.
2. Import `../init.js` or `../../init.js` so plugins are registered.
3. Define `args` and `flags`.
4. Implement `run()` and call `pluginManager` from core.
5. Add/extend tests under `packages/cli/test/...`.

## Adding a provider plugin

1. Create `packages/plugin-<provider>/`.
2. Implement `client.ts`, `mapper.ts`, and `index.ts`.
3. Implement `PMPlugin` interface.
4. Register plugin in `packages/cli/src/init.ts`.
5. Update provider types and credentials in core.
6. Add tests for mapper/client behavior.

## Testing guidelines

- Add/modify tests for all behavior changes.
- Prefer focused tests close to modified package.
- Run before opening PR:

```bash
pnpm build
pnpm exec vitest run
pnpm lint
```

## Pull request process

- Use small, focused PRs.
- Use conventional commits (lowercase, concise):
  - `feat: ...`
  - `fix: ...`
  - `docs: ...`
  - `ci: ...`
- Include motivation, summary, and testing output.

## Code style

- TypeScript strict mode.
- ESM modules only.
- Keep provider-specific mapping logic in `mapper.ts`.
- Use core task ID helpers (`createTaskId`/`parseTaskId`) rather than constructing IDs manually.

## Issue labels (recommended)

- `bug`
- `enhancement`
- `provider:<name>`
- `docs`
- `good first issue`
- `help wanted`
