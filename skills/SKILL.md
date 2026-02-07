---
name: pm-cli-usage
description: Complete guide for using the pm CLI to manage tasks across Asana, Notion, and other project management providers
---

# pm-cli Usage Guide

You are operating `pm`, a unified CLI for managing tasks across multiple project management tools (Asana, Notion, etc.). Use this guide to run any pm-cli command correctly.

## Tool Overview

`pm` aggregates tasks from multiple PM providers into a single command-line interface. It supports listing, searching, and viewing tasks with cached responses and JSON output for scripting.

**Supported providers:** `asana` (fully implemented), `notion` (planned)

## Setup

### 1. Connect a provider

```bash
pm connect asana    # Prompts for Personal Access Token
pm connect notion   # Prompts for Notion integration token
```

The command interactively prompts for credentials. You cannot pass tokens as arguments.

### 2. Set credentials via environment variables (alternative)

```bash
export ASANA_TOKEN=<token>
export NOTION_TOKEN=<token>
```

Environment variables bypass the interactive `pm connect` flow.

### 3. Select a workspace (if the provider has multiple)

```bash
pm workspace list -s asana
pm workspace switch -s asana    # Interactive workspace picker
```

## Task ID Format

All tasks use the format `PROVIDER-externalId`:

- `ASANA-1234567890` — Asana task with external ID `1234567890`
- `NOTION-abc123def456` — Notion page with external ID `abc123def456`

The provider prefix is **case-insensitive** when parsing (both `ASANA-123` and `asana-123` work).

## Commands Reference

### `pm connect <provider>`

Connect to a project management provider. Prompts for credentials interactively.

| Argument | Required | Values |
|----------|----------|--------|
| `provider` | Yes | `asana`, `notion` |

```bash
pm connect asana
```

If already connected, prints current connection info and suggests `pm disconnect` first.

---

### `pm disconnect <provider>`

Remove stored credentials for a provider.

| Argument | Required | Values |
|----------|----------|--------|
| `provider` | Yes | `asana`, `notion` |

```bash
pm disconnect asana
```

---

### `pm providers`

List all providers and their connection status.

| Flag | Short | Description |
|------|-------|-------------|
| `--json` | | Output as JSON |

```bash
pm providers
pm providers --json
```

---

### `pm workspace [action]`

List or switch the active workspace for a provider.

| Argument | Required | Default | Values |
|----------|----------|---------|--------|
| `action` | No | `list` | `list`, `switch` |

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--source` | `-s` | `asana` | Provider to manage (`asana`, `notion`) |

```bash
pm workspace                    # List workspaces (default: asana)
pm workspace list -s asana      # Explicit list
pm workspace switch -s asana    # Interactive workspace picker
```

---

### `pm tasks assigned`

List tasks assigned to the current user.

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--source` | `-s` | all | Filter by provider (`asana`, `notion`) |
| `--limit` | `-l` | `25` | Maximum number of tasks |
| `--json` | | `false` | Output as JSON |
| `--refresh` | `-r` | `false` | Bypass cache, fetch fresh data |

```bash
pm tasks assigned
pm tasks assigned -s asana -l 10
pm tasks assigned --json
pm tasks assigned -r
```

---

### `pm tasks overdue`

List tasks that are past their due date.

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--source` | `-s` | all | Filter by provider (`asana`, `notion`) |
| `--limit` | `-l` | `25` | Maximum number of tasks |
| `--json` | | `false` | Output as JSON |
| `--refresh` | `-r` | `false` | Bypass cache, fetch fresh data |

```bash
pm tasks overdue
pm tasks overdue -s asana --json
pm tasks overdue -r
```

---

### `pm tasks search "<query>"`

Search for tasks matching a text query.

| Argument | Required | Description |
|----------|----------|-------------|
| `query` | Yes | Search string (quote if it contains spaces) |

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--source` | `-s` | all | Filter by provider (`asana`, `notion`) |
| `--limit` | `-l` | `25` | Maximum number of tasks |
| `--json` | | `false` | Output as JSON |

```bash
pm tasks search "login bug"
pm tasks search "api" -s asana -l 5
pm tasks search "urgent" --json
```

Note: `search` does **not** have a `--refresh` flag — it always fetches live results.

---

### `pm tasks show <id>`

Show detailed information for a single task.

| Argument | Required | Description |
|----------|----------|-------------|
| `id` | Yes | Task ID in `PROVIDER-externalId` format |

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--json` | | `false` | Output as JSON |
| `--open` | `-o` | `false` | Open the task in the default browser |

```bash
pm tasks show ASANA-1234567890
pm tasks show ASANA-1234567890 --json
pm tasks show ASANA-1234567890 -o
```

## Output Modes

- **Table** (default) — Human-readable table rendered in the terminal.
- **JSON** (`--json`) — Machine-readable output. Use this when piping to `jq`, scripting, or parsing results programmatically.

## Caching Behavior

- Responses are cached with a **5-minute TTL**.
- Use `--refresh` / `-r` on `tasks assigned` and `tasks overdue` to bypass the cache and fetch fresh data.
- `tasks search` always fetches live results (no cache bypass flag needed).
- `tasks show` fetches directly from the provider.

## Unified Task Model

Every task returned by pm-cli is normalized to this shape:

```
id            PROVIDER-externalId (e.g. ASANA-1234567890)
externalId    Original provider ID
title         Task title
description   Task description (may contain HTML/markdown)
status        todo | in_progress | done
dueDate       Due date (if set)
assignee      Assignee display name
project       Project or parent container name
tags          Tags/labels array
source        asana | notion
url           Direct link to the task in the provider's UI
priority      low | medium | high | urgent (if available)
createdAt     Creation timestamp
updatedAt     Last modification timestamp
```

## Common Workflows

### Check what's overdue

```bash
pm tasks overdue
```

### Find a specific task by keyword

```bash
pm tasks search "deploy pipeline"
```

### Get task details and open in browser

```bash
pm tasks show ASANA-1234567890 -o
```

### Get JSON output for scripting

```bash
pm tasks assigned --json
pm tasks overdue -s asana --json
```

### Force-refresh stale data

```bash
pm tasks assigned -r
pm tasks overdue --refresh
```

### Switch workspace when working across teams

```bash
pm workspace switch -s asana
```
