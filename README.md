# PM-CLI

[![npm](https://img.shields.io/npm/v/@jogi47/pm-cli)](https://www.npmjs.com/package/@jogi47/pm-cli)
[![CI](https://github.com/jogi47/pm-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/jogi47/pm-cli/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

Unified CLI for task management across multiple project-management providers.

## Demo

> Add a terminal GIF here once captured via `vhs`.

- Suggested output path: `docs/demo.gif`
- Then update this section to:

```md
![pm-cli demo](./docs/demo.gif)
```

## Install

### npm / pnpm

```bash
pnpm add -g @jogi47/pm-cli
# or
npm install -g @jogi47/pm-cli
```

### Homebrew

```bash
brew tap jogi47/pm-cli
brew install pm-cli
```

## 30-second quickstart

```bash
# 1) connect to a provider
pm connect asana

# 2) pull your assigned work
pm tasks assigned

# 3) create + complete a task
pm tasks create --title "Ship pm-cli"
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

## Command reference

### Core task commands

```bash
pm tasks assigned [--source <provider>] [--status <status>] [--sort <field>]
pm tasks overdue [--source <provider>]
pm tasks search <query> [--source <provider>]
pm tasks show <id> [--json] [--open]
pm tasks create --title <text> [--source <provider>] [--due <date>] [--project <name|id>]
pm tasks update <id> [--title <text>] [--status <todo|in_progress|done>] [--due <date>]
```

### Fast top-level actions

```bash
pm today [--source <provider>] [--json]
pm summary [--json]
pm done <id...>
pm delete <id...>
pm open <id>
pm branch <id>
pm comment <id> --text "message"
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

- `@jogi47/pm-cli-core`
- `@jogi47/pm-cli`
- `@jogi47/pm-cli-plugin-asana`
- `@jogi47/pm-cli-plugin-notion`
- `@jogi47/pm-cli-plugin-trello`
- `@jogi47/pm-cli-plugin-linear`
- `@jogi47/pm-cli-plugin-clickup`

## Building plugins

See core plugin contracts in `packages/core/src/models/plugin.ts` and registration in `packages/cli/src/init.ts`.

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
```

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT — see [LICENSE](./LICENSE).
