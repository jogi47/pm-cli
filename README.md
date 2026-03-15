# PM-CLI

[![license: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

Unified CLI for task management across multiple project-management providers.

## Install

### npm / pnpm

```bash
pnpm add -g pm-cli
# or
npm install -g pm-cli
```

### Homebrew

```bash
brew tap <your-org>/pm-cli
brew install pm-cli
```

Replace `<your-org>` with the tap owner used by your release process.

## 30-second quickstart

```bash
# 1) connect to a provider
pm connect asana

# 2) pull your assigned work
pm tasks assigned

# 3) create + complete a task
pm tasks create "Ship pm-cli"
pm done ASANA-1234567890
```

## Supported providers

| Provider | Status | Auth |
|---|---|---|
| Asana | ✅ Implemented | `ASANA_TOKEN` |
| Notion | ✅ Implemented | `NOTION_TOKEN` |
| Trello | ✅ Implemented | `TRELLO_API_KEY` + `TRELLO_TOKEN` |
| Linear | ✅ Implemented | `LINEAR_API_KEY` |
| ClickUp | ✅ Implemented | `CLICKUP_TOKEN` |

Current feature notes:
- task thread and attachment commands are implemented on the Asana path
- workspace switching is currently useful for Asana

## Connection and auth

Connect interactively:

```bash
pm connect asana
pm connect notion
pm connect trello
pm connect linear
pm connect clickup
```

Or use environment variables:

```bash
export ASANA_TOKEN=...
export NOTION_TOKEN=...
export NOTION_DATABASE_ID=...
export TRELLO_API_KEY=...
export TRELLO_TOKEN=...
export LINEAR_API_KEY=...
export CLICKUP_TOKEN=...
```

Provider notes:
- Notion also needs a database ID during `pm connect notion`
- Asana workspace switching is available through `pm workspace`
- `pm providers` shows connection state and current workspace/user details

## Command reference

### Core task commands

```bash
pm tasks assigned [--source <provider>] [--status <status>] [--sort <field>]
pm tasks overdue [--source <provider>]
pm tasks search <query> [--source <provider>]
pm tasks show <id> [--json] [--open]
pm tasks thread <id> [--comments-only] [--with-task] [--limit <n>] [--download-images]
pm tasks attachments <id> [--json] [--download-images] [--temp-dir <dir>]
pm tasks create <title> [--title <text>] [--source <provider>] [--due <date>] [--project <name|id>]
pm tasks update <id> [--title <text>] [--status <todo|in_progress|done>] [--due <date>]
```

List/search flags that work on the current fetch commands:

```bash
--source
--limit
--json
--status
--priority
--sort
--plain
--ids-only
```

Refresh is also supported on:

```bash
pm tasks assigned --refresh
pm tasks overdue --refresh
```

### Fast top-level actions

```bash
pm today [--source <provider>] [--json]
pm summary [--json]
pm done <id...>
pm delete <id...> [--force]
pm open <id>
pm branch <id>
pm comment <id> "message"
```

### Provider / auth / workspace

```bash
pm providers [--json]
pm connect <provider>
pm disconnect <provider>
pm workspace
pm workspace switch
```

### Config + cache

```bash
pm config init [--force]
pm config path
pm config list
pm config get <key>
pm config set <key> <value>

pm cache stats
pm cache clear [--source <provider>]
```

For full flag details, use:

```bash
pm --help
pm tasks --help
pm tasks create --help
pm tasks update --help
pm tasks thread --help
pm tasks attachments --help
```

### Thread and attachment inspection

```bash
pm tasks thread ASANA-1234567890 --comments-only --with-task
pm tasks thread ASANA-1234567890 --download-images --temp-dir /tmp/pm-cli --cleanup
pm tasks attachments ASANA-1234567890
pm tasks attachments ASANA-1234567890 --json
```

Image downloads are saved into a task-scoped directory under the chosen temp dir.

Current thread/attachment behavior:
- `pm tasks thread` can include title/description, comments, activity, and attachment entries
- `--comments-only` removes system activity but keeps comment-related attachment entries
- `pm tasks attachments` returns attachment metadata without the rest of the thread
- image download support is implemented on the Asana path

### Create and update tasks

Single create:

```bash
pm tasks create "Fix login bug"
```

Board/section-aware create for Asana:

```bash
pm tasks create "Automated ticket" \
  --source asana \
  --project "Platform Roadmap" \
  --section "Ready"
```

Create with advanced Asana field resolution:

```bash
pm tasks create "Tune lesson plan UX" \
  --source asana \
  --project "Platform Roadmap" \
  --section "Ready" \
  --difficulty "S" \
  --field "Other=Bugs,Analytics" \
  --workspace "Engineering" \
  --refresh
```

Create multiple tasks in one command:

```bash
pm tasks create \
  --source asana \
  --project "Platform Roadmap" \
  --title "Task A" \
  --title "Task B"
```

Update task fields:

```bash
pm tasks update ASANA-123456 --title "New title"
pm tasks update ASANA-123456 --due 2026-03-15 --status in_progress
pm tasks update ASANA-123456 --due none
pm tasks update ASANA-123456 --project "Platform Roadmap" --field "Difficulty=S"
```

Create/update notes:
- `--section` requires `--project`
- `--difficulty` requires `--project`
- `--field` is repeatable and currently most useful on the Asana path
- project/section/workspace can be passed by ID or exact case-insensitive name
- `--refresh` bypasses metadata cache during project/section/custom-field resolution

## Output modes

The CLI supports several output styles:

- default table/human output
- `--json` for machine-readable output
- `--plain` for tab-separated list output
- `--ids-only` for one task ID per line

Examples:

```bash
pm tasks assigned --json
pm tasks overdue --plain
pm tasks search "deploy" --ids-only
```

## Config and cache

Project/user config:

```bash
pm config init
pm config path
pm config list
pm config get defaultSource
pm config set defaultLimit 10
pm config set aliases.today "tasks assigned --status=in_progress"
```

Config behavior:
- user config lives under `~/.config/pm-cli/config.json`
- project config lives in `.pmrc.json`
- values are merged, with project config taking precedence

Cache commands:

```bash
pm cache stats
pm cache clear
pm cache clear --source asana
```

The cache stores task lists and task details with a short TTL.

## Current command surface

Implemented commands in this repo today:

```text
pm connect
pm disconnect
pm providers
pm workspace
pm today
pm summary
pm open
pm branch
pm comment
pm done
pm delete
pm cache stats
pm cache clear
pm config init
pm config path
pm config list
pm config get
pm config set
pm tasks assigned
pm tasks overdue
pm tasks search
pm tasks show
pm tasks thread
pm tasks attachments
pm tasks create
pm tasks update
```

Planned but not implemented yet:

```text
pm ui
pm bulk update
pm bulk move
pm bulk create --file
```

## Architecture overview

```text
CLI command
  -> pluginManager (core)
     -> provider plugin (asana/notion/trello/linear/clickup)
        -> API client + mapper
        -> cacheManager (5 min TTL)
```

Monorepo packages:

- `packages/core`
- `packages/cli`
- `packages/plugin-asana`
- `packages/plugin-notion`
- `packages/plugin-trello`
- `packages/plugin-linear`
- `packages/plugin-clickup`

## Building plugins

See core plugin contracts in `packages/core/src/models/plugin.ts` and registration in `packages/cli/src/init.ts`.

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm pm tasks assigned
```

## Publishing

For maintainers and automation agents, follow the publish playbook:

- [PUBLISHING.md](./PUBLISHING.md)

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT — see [LICENSE](./LICENSE).
