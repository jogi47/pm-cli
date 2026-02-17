---
name: pm-cli-usage
description: Complete guide for using the pm CLI (`@jogi47/pm-cli`) to manage tasks across Asana, Notion, and other project management providers. Use when Claude needs to run pm commands to list, search, create, update, complete, or open tasks from the command line.
---

# pm-cli Usage Guide

You are operating `pm`, a unified CLI for managing tasks across multiple project management tools (Asana, Notion, etc.). Use this guide to run any pm-cli command correctly.

## Tool Overview

`pm` aggregates tasks from multiple PM providers into a single command-line interface. It supports listing, searching, creating, updating, completing, and viewing tasks with cached responses and JSON output for scripting.

**npm package:** `@jogi47/pm-cli` (install: `npm install -g @jogi47/pm-cli`)
**Supported providers:** `asana` (fully implemented), `notion` (fully implemented)

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
| `--status` | | | Filter by status (`todo`, `in_progress`, `done`) |
| `--priority` | | | Filter by priority (comma-separated: `low,medium,high,urgent`) |
| `--sort` | | | Sort by field (`due`, `priority`, `status`, `source`, `title`) |
| `--plain` | | `false` | Tab-separated output, no colors or borders |
| `--ids-only` | | `false` | Output just task IDs, one per line |

```bash
pm tasks assigned
pm tasks assigned -s asana -l 10
pm tasks assigned --json
pm tasks assigned -r
pm tasks assigned --status=todo --sort=priority
pm tasks assigned --plain
pm tasks assigned --ids-only
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
| `--status` | | | Filter by status (`todo`, `in_progress`, `done`) |
| `--priority` | | | Filter by priority (comma-separated: `low,medium,high,urgent`) |
| `--sort` | | | Sort by field (`due`, `priority`, `status`, `source`, `title`) |
| `--plain` | | `false` | Tab-separated output, no colors or borders |
| `--ids-only` | | `false` | Output just task IDs, one per line |

```bash
pm tasks overdue
pm tasks overdue -s asana --json
pm tasks overdue -r
pm tasks overdue --sort=due --plain
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
| `--status` | | | Filter by status (`todo`, `in_progress`, `done`) |
| `--priority` | | | Filter by priority (comma-separated: `low,medium,high,urgent`) |
| `--sort` | | | Sort by field (`due`, `priority`, `status`, `source`, `title`) |
| `--plain` | | `false` | Tab-separated output, no colors or borders |
| `--ids-only` | | `false` | Output just task IDs, one per line |

```bash
pm tasks search "login bug"
pm tasks search "api" -s asana -l 5
pm tasks search "urgent" --json
pm tasks search "deploy" --sort=due --ids-only
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

---

### `pm tasks create "<title>"`

Create a new task in a provider.

| Argument | Required | Description |
|----------|----------|-------------|
| `title` | Yes | Task title (quote if it contains spaces) |

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--description` | `-d` | | Task description |
| `--source` | `-s` | auto | Target provider (`asana`, `notion`). Required if multiple providers are connected |
| `--project` | `-p` | | Project ID or name to add the task to |
| `--section` | | | Section/column ID or name within the project (Asana) |
| `--workspace` | | | Workspace ID or name for project disambiguation (Asana) |
| `--difficulty` | | | Difficulty option name from the project's Difficulty custom field (Asana) |
| `--field` | | | Custom field assignment `<Field>=<Value[,Value]>` (repeatable, Asana v1) |
| `--refresh` | | `false` | Bypass metadata cache when resolving project/section/custom-field values |
| `--due` | | | Due date (`YYYY-MM-DD`) |
| `--assignee` | `-a` | | Assignee email |
| `--json` | | `false` | Output as JSON |

```bash
pm tasks create "Fix login bug"
pm tasks create "Update docs" --source=asana --due=2026-03-01
pm tasks create "Review PR" -d "Check the auth changes" --json
pm tasks create "Design review" -p PROJECT_ID -a user@example.com
pm tasks create "Automated ticket" --source=asana --project "Teacher Feature Development" --section "Prioritised"
pm tasks create "Tune lesson plan UX" --source=asana --project "Teacher Feature Development" --section "Prioritised" --difficulty "S"
pm tasks create "Cover flow API integration" --source=asana --project "Teacher Feature Development" --section "Prioritised" --field "Difficulty=XS" --field "Department=Frontend" --field "Other=Bugs,Analytics"
```

If only one provider is connected, `--source` is inferred automatically.

Create command rules:
- `--section` requires `--project`.
- `--difficulty` requires `--project`.
- `--field` requires `--project`.
- Name resolution for Asana project/section/workspace is exact and case-insensitive.
- Use `--refresh` if cached project/section/custom-field metadata is stale.

---

### `pm tasks update <id>`

Update an existing task. At least one update flag is required.

| Argument | Required | Description |
|----------|----------|-------------|
| `id` | Yes | Task ID in `PROVIDER-externalId` format |

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--title` | `-t` | | New task title |
| `--description` | `-d` | | New task description |
| `--due` | | | New due date (`YYYY-MM-DD`, or `"none"` to clear) |
| `--status` | | | New status: `todo`, `in_progress`, `done` |
| `--project` | `-p` | | Project ID or name to scope `--field` resolution |
| `--workspace` | | | Workspace ID or name for project resolution with `--field` |
| `--field` | | | Custom field assignment `<Field>=<Value[,Value]>` (repeatable, Asana v1) |
| `--refresh` | | `false` | Bypass metadata cache for project/custom-field resolution |
| `--json` | | `false` | Output as JSON |

```bash
pm tasks update ASANA-123456 --title "New title"
pm tasks update ASANA-123456 --due 2026-03-15 --status in_progress
pm tasks update ASANA-123456 --due none           # Clear due date
pm tasks update ASANA-123456 --field "Importance=High" --field "Teacher Feature Release=PR4"
pm tasks update ASANA-123456 --project "Teacher Feature Development" --field "Other="
pm tasks update ASANA-123456 -d "Updated notes" --json
```

---

### `pm done <id> [id...]`

Mark one or more tasks as done. Accepts multiple task IDs.

| Argument | Required | Description |
|----------|----------|-------------|
| `ids` | Yes | One or more task IDs (`PROVIDER-externalId`) |

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--json` | | `false` | Output as JSON |

```bash
pm done ASANA-123456
pm done ASANA-123456 ASANA-789012    # Complete multiple tasks
pm done ASANA-123456 --json
```

---

### `pm open <id>`

Open a task in the default browser.

| Argument | Required | Description |
|----------|----------|-------------|
| `id` | Yes | Task ID in `PROVIDER-externalId` format |

```bash
pm open ASANA-123456
pm open NOTION-abc123
```

### `pm today`

Morning dashboard — shows overdue, due today, and in-progress tasks in a grouped view.

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--source` | `-s` | all | Filter by provider (`asana`, `notion`) |
| `--json` | | `false` | Output as JSON |

```bash
pm today
pm today --source=asana
pm today --json
```

---

### `pm summary`

Show provider connection status and task count statistics (overdue, due today, in progress, total).

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--json` | | `false` | Output as JSON |

```bash
pm summary
pm summary --json
```

---

### `pm branch <id>`

Create a git branch named after a task. Fetches the task title and slugifies it into a branch name.

| Argument | Required | Description |
|----------|----------|-------------|
| `id` | Yes | Task ID in `PROVIDER-externalId` format |

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--prefix` | `-p` | | Branch prefix: `feat`, `fix`, `chore` |
| `--checkout` | `-c` | `false` | Also switch to the new branch |
| `--no-id` | | `false` | Omit task ID from branch name |

```bash
pm branch ASANA-123456 --prefix feat
pm branch ASANA-123456 --prefix fix --checkout
pm branch NOTION-abc123 --no-id
```

Branch name format: `prefix/PROVIDER-externalId-slugified-title` (or `prefix/slugified-title` with `--no-id`).

---

### `pm comment <id> "<message>"`

Add a comment to a task.

| Argument | Required | Description |
|----------|----------|-------------|
| `id` | Yes | Task ID in `PROVIDER-externalId` format |
| `message` | Yes | Comment text |

```bash
pm comment ASANA-123456 "Fixed in commit abc"
pm comment NOTION-abc123 "Needs review"
```

---

## Help Commands

Use built-in help for command syntax and the latest flags:

```bash
pm --help
pm tasks --help
pm tasks create --help
pm tasks update --help
```

---

## Output Modes

- **Table** (default) — Human-readable table rendered in the terminal.
- **JSON** (`--json`) — Machine-readable output. Use this when piping to `jq`, scripting, or parsing results programmatically.
- **Plain** (`--plain`) — Tab-separated output, no colors or borders. Useful for piping to `awk`, `cut`, etc.
- **IDs only** (`--ids-only`) — One task ID per line. Useful for scripting loops (e.g., `pm tasks overdue --ids-only | xargs -I{} pm done {}`).

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

### Morning standup check

```bash
pm today
pm summary
```

### Check what's overdue

```bash
pm tasks overdue
```

### Find a specific task by keyword

```bash
pm tasks search "deploy pipeline"
```

### Create a task with a due date

```bash
pm tasks create "Fix auth timeout" --due 2026-03-01
```

### Create directly in a board column with difficulty (Asana)

```bash
pm tasks create "Tune lesson plan UX" \
  --source asana \
  --project "Teacher Feature Development" \
  --section "Prioritised" \
  --difficulty "S"
```

### Update a task's status

```bash
pm tasks update ASANA-123456 --status in_progress
```

### Mark tasks as done

```bash
pm done ASANA-123456
pm done ASANA-123456 ASANA-789012    # Batch complete
```

### Get task details and open in browser

```bash
pm tasks show ASANA-1234567890 -o
pm open ASANA-1234567890             # Shorthand
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

### Create a branch from a task and start working

```bash
pm branch ASANA-123456 --prefix feat --checkout
```

### Add a comment to a task

```bash
pm comment ASANA-123456 "Deployed to staging"
```

### Filter high-priority tasks and sort by due date

```bash
pm tasks assigned --priority=high,urgent --sort=due
```

### Pipe task IDs for batch operations

```bash
pm tasks overdue --ids-only | xargs -I{} pm done {}
```

### Switch workspace when working across teams

```bash
pm workspace switch -s asana
```
