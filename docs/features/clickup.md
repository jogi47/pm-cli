# ClickUp Features in `pm`

This guide shows what you can do with ClickUp through `pm`, and how each feature is accessed from the CLI.

## How ClickUp can be accessed in `pm`

You can use ClickUp in four main ways:

1. Connect ClickUp as a provider

```bash
pm connect clickup
```

Or authenticate through an environment variable:

```bash
export CLICKUP_TOKEN=your-token
```

2. Target ClickUp in list and dashboard commands with `--source clickup`

```bash
pm tasks assigned --source clickup
pm tasks search "release" --source clickup
pm today --source clickup
```

3. Target a specific ClickUp task with a `CLICKUP-<task_id>` ID

```bash
pm tasks show CLICKUP-abc123def456
pm comment CLICKUP-abc123def456 "Ready for QA"
pm done CLICKUP-abc123def456
```

4. Open the task in ClickUp from the CLI

```bash
pm open CLICKUP-abc123def456
pm tasks show CLICKUP-abc123def456 --open
```

## Features you get with ClickUp

### 1. Connect and manage your ClickUp account

What you get:
- Connect or disconnect ClickUp
- Confirm whether ClickUp is connected
- See the current ClickUp user
- See the currently selected workspace in provider status output

How to access it:

```bash
pm connect clickup
pm disconnect clickup
pm providers
```

Example:

```bash
pm connect clickup
pm providers
```

### 2. View ClickUp tasks

What you get:
- A task list from the current ClickUp workspace context
- Optional filtering by status or priority
- Sorting
- Table, JSON, plain text, or IDs-only output

How to access it:

```bash
pm tasks assigned --source clickup
```

Examples:

```bash
pm tasks assigned --source clickup
pm tasks assigned --source clickup --status in_progress --sort priority
pm tasks assigned --source clickup --json
pm tasks assigned --source clickup --ids-only
```

### 3. View overdue ClickUp tasks

What you get:
- Tasks with overdue due dates
- Sorting and output options

How to access it:

```bash
pm tasks overdue --source clickup
```

Examples:

```bash
pm tasks overdue --source clickup
pm tasks overdue --source clickup --plain
pm tasks overdue --source clickup --sort due
```

### 4. Search ClickUp tasks

What you get:
- Search across ClickUp tasks in the current workspace context
- Optional post-search filtering and sorting

How to access it:

```bash
pm tasks search "query" --source clickup
```

Examples:

```bash
pm tasks search "release" --source clickup
pm tasks search "bug" --source clickup --status todo --sort due
pm tasks search "deploy" --source clickup --json
```

### 5. See a task in detail

What you get:
- Title
- Description
- Due date
- Assignee
- List name
- Tags
- Priority
- Direct ClickUp URL

How to access it:

```bash
pm tasks show CLICKUP-abc123def456
```

Examples:

```bash
pm tasks show CLICKUP-abc123def456
pm tasks show CLICKUP-abc123def456 --json
pm tasks show CLICKUP-abc123def456 --open
```

### 6. Open a ClickUp task in the browser

What you get:
- A quick jump from the CLI to the task in ClickUp

How to access it:

```bash
pm open CLICKUP-abc123def456
```

Example:

```bash
pm open CLICKUP-abc123def456
```

### 7. Add comments to ClickUp tasks

What you get:
- Post a comment to a task from the CLI

How to access it:

```bash
pm comment CLICKUP-abc123def456 "message"
```

Example:

```bash
pm comment CLICKUP-abc123def456 "Shared the updated acceptance criteria"
```

### 8. Update ClickUp tasks

What you get:
- Update title
- Update description
- Change due date
- Clear due date
- Move task status between `todo`, `in_progress`, and `done`

How to access it:

```bash
pm tasks update CLICKUP-abc123def456 ...
```

Examples:

```bash
pm tasks update CLICKUP-abc123def456 --title "New title"
pm tasks update CLICKUP-abc123def456 --description "Updated notes"
pm tasks update CLICKUP-abc123def456 --due 2026-03-15
pm tasks update CLICKUP-abc123def456 --due none
pm tasks update CLICKUP-abc123def456 --status in_progress
```

### 9. Mark ClickUp tasks done

What you get:
- Complete one or more tasks from the CLI

How to access it:

```bash
pm done CLICKUP-abc123def456
pm tasks update CLICKUP-abc123def456 --status done
```

Examples:

```bash
pm done CLICKUP-abc123def456
pm done CLICKUP-abc123def456 CLICKUP-xyz987654321
pm tasks update CLICKUP-abc123def456 --status done
```

### 10. Delete ClickUp tasks

What you get:
- Delete one or more tasks directly from ClickUp

How to access it:

```bash
pm delete CLICKUP-abc123def456
```

Examples:

```bash
pm delete CLICKUP-abc123def456
pm delete CLICKUP-abc123def456 CLICKUP-xyz987654321
```

### 11. Use ClickUp tasks in dashboard and summary views

What you get:
- `today`: grouped working view
- `summary`: provider connection status plus task counts

How to access it:

```bash
pm today --source clickup
pm summary
```

Examples:

```bash
pm today --source clickup
pm today --source clickup --json
pm summary
```

### 12. Create git branches from ClickUp tasks

What you get:
- Build a branch name from the task title
- Optionally add a prefix like `feat` or `fix`
- Optionally switch to the branch immediately

How to access it:

```bash
pm branch CLICKUP-abc123def456
```

Examples:

```bash
pm branch CLICKUP-abc123def456 --prefix feat
pm branch CLICKUP-abc123def456 --prefix fix --checkout
pm branch CLICKUP-abc123def456 --no-id
```

## ClickUp-specific advantages in this tool

These are the areas where the ClickUp path is strongest:

- ClickUp status values are normalized into the shared `todo`, `in_progress`, and `done` model.
- ClickUp list names, tags, assignee, and priority are mapped into the shared task view.
- Comment, detail view, browser open, done, delete, and branch flows are straightforward.

## Important notes for end users

- Task-specific commands use the format `CLICKUP-<task_id>`.
- On connection, the current implementation picks the first accessible ClickUp workspace/team for task queries.
- The ClickUp path in this repo does not currently implement workspace switching, task threads, or attachment inspection.
- ClickUp task creation exists in the plugin layer, but it requires a ClickUp list ID and this repo does not currently provide the same polished list-resolution flow that Asana has.
- `pm tasks assigned --source clickup` is best understood as the current ClickUp workspace task feed in this implementation, not a strict server-side "assigned to me" filter.
