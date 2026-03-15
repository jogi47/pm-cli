# Notion Features in `pm`

This guide shows what you can do with Notion through `pm`, and how each feature is accessed from the CLI.

## How Notion can be accessed in `pm`

You can use Notion in four main ways:

1. Connect Notion as a provider

```bash
pm connect notion
```

This prompts for:
- your Notion integration token
- your task database ID

2. Target Notion in list and dashboard commands with `--source notion`

```bash
pm tasks assigned --source notion
pm tasks search "release" --source notion
pm today --source notion
```

3. Target a specific Notion task with a `NOTION-<page_id>` ID

```bash
pm tasks show NOTION-abc123def456
pm comment NOTION-abc123def456 "Ready for review"
pm done NOTION-abc123def456
```

4. Open the task in Notion from the CLI

```bash
pm open NOTION-abc123def456
pm tasks show NOTION-abc123def456 --open
```

## Features you get with Notion

### 1. Connect and manage your Notion database

What you get:
- Connect or disconnect Notion
- Confirm whether Notion is connected
- See the current Notion integration user
- Work against one selected Notion database

How to access it:

```bash
pm connect notion
pm disconnect notion
pm providers
```

Example:

```bash
pm connect notion
pm providers
```

### 2. View tasks from your connected Notion database

What you get:
- A task list from the connected database
- Optional filtering by status or priority
- Sorting
- Table, JSON, plain text, or IDs-only output

How to access it:

```bash
pm tasks assigned --source notion
```

Examples:

```bash
pm tasks assigned --source notion
pm tasks assigned --source notion --status todo --sort due
pm tasks assigned --source notion --json
pm tasks assigned --source notion --ids-only
```

### 3. View overdue Notion tasks

What you get:
- Tasks with due dates before today
- Sorting and output options

How to access it:

```bash
pm tasks overdue --source notion
```

Examples:

```bash
pm tasks overdue --source notion
pm tasks overdue --source notion --plain
pm tasks overdue --source notion --sort due
```

### 4. Search tasks inside the connected Notion database

What you get:
- Text search inside the connected database
- Optional post-search filtering and sorting

How to access it:

```bash
pm tasks search "query" --source notion
```

Examples:

```bash
pm tasks search "release" --source notion
pm tasks search "bug" --source notion --status todo --sort due
pm tasks search "meeting" --source notion --json
```

### 5. See a task in detail

What you get:
- Title
- Description
- Due date
- Assignee
- Tags
- Priority
- Direct Notion URL

How to access it:

```bash
pm tasks show NOTION-abc123def456
```

Examples:

```bash
pm tasks show NOTION-abc123def456
pm tasks show NOTION-abc123def456 --json
pm tasks show NOTION-abc123def456 --open
```

### 6. Open a Notion task in the browser

What you get:
- A quick jump from the CLI to the page in Notion

How to access it:

```bash
pm open NOTION-abc123def456
```

Example:

```bash
pm open NOTION-abc123def456
```

### 7. Add comments to Notion tasks

What you get:
- Append comment text to the page from the CLI

How to access it:

```bash
pm comment NOTION-abc123def456 "message"
```

Example:

```bash
pm comment NOTION-abc123def456 "Ready for stakeholder review"
```

### 8. Create Notion tasks

What you get:
- Create a page in the connected database
- Set title
- Set due date
- Set description when the database has a compatible rich-text field

How to access it:

```bash
pm tasks create "title" --source notion
```

Examples:

```bash
pm tasks create "Prepare release notes" --source notion
pm tasks create "Prepare release notes" --source notion --due 2026-03-20
pm tasks create "Write onboarding checklist" --source notion --description "Initial draft for the customer success team"
```

### 9. Update Notion tasks

What you get:
- Update title
- Update description
- Change due date
- Clear due date
- Update status when a compatible status/select/checkbox property exists

How to access it:

```bash
pm tasks update NOTION-abc123def456 ...
```

Examples:

```bash
pm tasks update NOTION-abc123def456 --title "New title"
pm tasks update NOTION-abc123def456 --description "Updated notes"
pm tasks update NOTION-abc123def456 --due 2026-03-15
pm tasks update NOTION-abc123def456 --due none
pm tasks update NOTION-abc123def456 --status in_progress
```

### 10. Mark Notion tasks done

What you get:
- Mark the task as completed through the mapped Notion status field

How to access it:

```bash
pm done NOTION-abc123def456
pm tasks update NOTION-abc123def456 --status done
```

Examples:

```bash
pm done NOTION-abc123def456
pm tasks update NOTION-abc123def456 --status done
```

### 11. Archive Notion tasks

What you get:
- Archive a page through the CLI

How to access it:

```bash
pm delete NOTION-abc123def456
```

Example:

```bash
pm delete NOTION-abc123def456
```

### 12. Use Notion tasks in dashboard and summary views

What you get:
- `today`: grouped working view
- `summary`: provider connection status plus task counts

How to access it:

```bash
pm today --source notion
pm summary
```

Examples:

```bash
pm today --source notion
pm today --source notion --json
pm summary
```

### 13. Create git branches from Notion tasks

What you get:
- Build a branch name from the task title
- Optionally add a prefix like `feat` or `fix`
- Optionally switch to the branch immediately

How to access it:

```bash
pm branch NOTION-abc123def456
```

Examples:

```bash
pm branch NOTION-abc123def456 --prefix feat
pm branch NOTION-abc123def456 --prefix fix --checkout
pm branch NOTION-abc123def456 --no-id
```

## Notion-specific advantages in this tool

These are the areas where the Notion path is strongest:

- The CLI works against a specific Notion database.
- Status, due date, assignee, priority, and tags are mapped from common property names.
- Create and update flows adapt to the database schema instead of requiring one fixed Notion template.
- Delete uses Notion archive behavior instead of hard deletion.

## Important notes for end users

- Task-specific commands use the format `NOTION-<page_id>`.
- `pm connect notion` is the main supported setup path because Notion also needs a database ID, not just a token.
- The current environment-variable override only covers `NOTION_TOKEN`; it does not provide a database ID by itself.
- The Notion path is database-scoped. `pm tasks assigned --source notion` shows tasks from the connected database, not a strict "assigned to me" server-side view.
- Search is database-scoped and title-oriented.
- Comments are added by appending a paragraph block to the page.
- `pm delete` archives the page instead of permanently deleting it.
- Custom field updates like the Asana `--field` flow are not supported on the Notion path today.
- Task threads, attachment inspection, and workspace switching are not implemented for Notion.
