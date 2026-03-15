# Asana Features in `pm`

This guide shows what you can do with Asana through `pm`, and how each feature is accessed from the CLI.

## How Asana can be accessed in `pm`

You can use Asana in five main ways:

1. Connect Asana as a provider

```bash
pm connect asana
```

Or authenticate through an environment variable:

```bash
export ASANA_TOKEN=your-token
```

2. Target Asana in list and dashboard commands with `--source asana`

```bash
pm tasks assigned --source asana
pm tasks search "login" --source asana
pm today --source asana
```

3. Target a specific Asana task with an `ASANA-<task_gid>` ID

```bash
pm tasks show ASANA-1234567890
pm comment ASANA-1234567890 "Shared with QA"
pm done ASANA-1234567890
```

4. Target a specific Asana workspace, project, or section during create/update flows

```bash
pm tasks create "Fix login bug" --source asana --workspace "Engineering"
pm tasks create "Fix login bug" --source asana --project "Platform" --section "In Progress"
```

5. Open the task in Asana from the CLI

```bash
pm open ASANA-1234567890
pm tasks show ASANA-1234567890 --open
```

## Features you get with Asana

### 1. Connect and manage your Asana account

What you get:
- Connect or disconnect Asana
- Confirm whether Asana is connected
- See the current Asana user and workspace
- Switch between Asana workspaces

How to access it:

```bash
pm connect asana
pm disconnect asana
pm providers
pm workspace
pm workspace switch --source asana
```

Example:

```bash
pm providers
pm workspace switch --source asana
```

### 2. View your assigned Asana tasks

What you get:
- Your current assigned tasks from Asana
- Filtering by status or priority
- Sorting
- Table, JSON, plain text, or IDs-only output

How to access it:

```bash
pm tasks assigned --source asana
```

Examples:

```bash
pm tasks assigned --source asana
pm tasks assigned --source asana --status todo --sort due
pm tasks assigned --source asana --json
pm tasks assigned --source asana --ids-only
```

### 3. View overdue Asana tasks

What you get:
- Overdue tasks assigned to you in Asana
- The same filtering and output styles as assigned tasks

How to access it:

```bash
pm tasks overdue --source asana
```

Examples:

```bash
pm tasks overdue --source asana
pm tasks overdue --source asana --plain
pm tasks overdue --source asana --sort priority
```

### 4. Search Asana tasks

What you get:
- Text search across Asana tasks
- Optional filtering and sorting after results are fetched

How to access it:

```bash
pm tasks search "query" --source asana
```

Examples:

```bash
pm tasks search "release" --source asana
pm tasks search "bug" --source asana --status todo --sort due
pm tasks search "deploy" --source asana --ids-only
```

### 5. See a task in detail

What you get:
- Title
- Description
- Due date
- Assignee
- Project
- Section placement
- Tags
- Direct Asana URL

How to access it:

```bash
pm tasks show ASANA-1234567890
```

Examples:

```bash
pm tasks show ASANA-1234567890
pm tasks show ASANA-1234567890 --json
pm tasks show ASANA-1234567890 --open
```

### 6. Open an Asana task in the browser

What you get:
- A quick jump from the CLI to the task in Asana

How to access it:

```bash
pm open ASANA-1234567890
```

Example:

```bash
pm open ASANA-1234567890
```

### 7. Read the task thread and activity history

What you get:
- Comments
- System activity
- Attachment events
- Optional task header at the top
- Optional image download for image attachments

How to access it:

```bash
pm tasks thread ASANA-1234567890
```

Examples:

```bash
pm tasks thread ASANA-1234567890
pm tasks thread ASANA-1234567890 --comments-only --with-task
pm tasks thread ASANA-1234567890 --download-images --temp-dir /tmp/pm-cli
pm tasks thread ASANA-1234567890 --json
```

### 8. View task attachments without the full thread

What you get:
- Attachment metadata only
- Optional image download
- Cleaner output when you only care about files

How to access it:

```bash
pm tasks attachments ASANA-1234567890
```

Examples:

```bash
pm tasks attachments ASANA-1234567890
pm tasks attachments ASANA-1234567890 --download-images --temp-dir /tmp/pm-cli
pm tasks attachments ASANA-1234567890 --json
```

### 9. Add comments to Asana tasks

What you get:
- Post a new comment to the task from the CLI

How to access it:

```bash
pm comment ASANA-1234567890 "message"
```

Example:

```bash
pm comment ASANA-1234567890 "Ready for design review"
```

### 10. Create Asana tasks

What you get:
- Create a task in Asana
- Set description, due date, assignee
- Place it in a project
- Place it in a section/board column
- Choose the workspace
- Set supported custom fields
- Create multiple tasks in one command

How to access it:

```bash
pm tasks create "title" --source asana
```

Examples:

```bash
pm tasks create "Fix login bug" --source asana
pm tasks create "Automated ticket" --source asana --project "Teacher Feature Development" --section "Prioritised"
pm tasks create "Tune lesson plan UX" --source asana --project "Teacher Feature Development" --section "Prioritised" --difficulty "S"
pm tasks create "Cover flow API integration" --source asana --project "Teacher Feature Development" --field "Other=Bugs,Analytics"
pm tasks create --source asana --project "Teacher Feature Development" --title "Task A" --title "Task B"
```

### 11. Update Asana tasks

What you get:
- Update title
- Update description
- Change due date
- Clear due date
- Update supported custom fields

How to access it:

```bash
pm tasks update ASANA-1234567890 ...
```

Examples:

```bash
pm tasks update ASANA-1234567890 --title "New title"
pm tasks update ASANA-1234567890 --description "Updated notes"
pm tasks update ASANA-1234567890 --due 2026-03-15
pm tasks update ASANA-1234567890 --due none
pm tasks update ASANA-1234567890 --project "Teacher Feature Development" --field "Difficulty=S"
```

### 12. Mark Asana tasks done

What you get:
- Complete one or more Asana tasks

How to access it:

```bash
pm done ASANA-1234567890
pm tasks update ASANA-1234567890 --status done
```

Examples:

```bash
pm done ASANA-1234567890
pm done ASANA-1234567890 ASANA-9876543210
pm tasks update ASANA-1234567890 --status done
```

### 13. Delete Asana tasks

What you get:
- Delete one or more tasks directly from Asana

How to access it:

```bash
pm delete ASANA-1234567890
```

Examples:

```bash
pm delete ASANA-1234567890
pm delete ASANA-1234567890 ASANA-9876543210
```

### 14. Use Asana tasks in dashboard and summary views

What you get:
- `today`: grouped working view of assigned tasks
- `summary`: provider connection status plus task counts

How to access it:

```bash
pm today --source asana
pm summary
```

Examples:

```bash
pm today --source asana
pm today --source asana --json
pm summary
```

### 15. Create git branches from Asana tasks

What you get:
- Build a branch name from the task title
- Optionally include a prefix like `feat` or `fix`
- Optionally switch to the branch immediately

How to access it:

```bash
pm branch ASANA-1234567890
```

Examples:

```bash
pm branch ASANA-1234567890 --prefix feat
pm branch ASANA-1234567890 --prefix fix --checkout
pm branch ASANA-1234567890 --no-id
```

## Asana-specific advantages in this tool

These are the areas where the Asana path is currently the strongest:

- Task threads are implemented for Asana.
- Task attachments are implemented for Asana.
- Image download support is implemented for Asana thread and attachment commands.
- Workspace switching is implemented for Asana.
- Section-aware task creation is implemented for Asana.
- Custom field resolution by field name or field ID is implemented for Asana.
- Project, section, and workspace can be passed as either numeric Asana IDs or exact case-insensitive names.

## Important notes for end users

- Task-specific commands use the format `ASANA-<task_gid>`, for example `ASANA-1234567890`.
- If Asana is your only connected provider, some commands can work without `--source asana`. If you have multiple providers connected, use `--source asana` when listing or creating tasks.
- `pm tasks thread` and `pm tasks attachments` are the main Asana-only inspection features today.
- `pm done` and `pm tasks update --status done` both mark the task complete in Asana.
- The CLI can display `todo` and `in_progress`, but on the Asana path those states are inferred from task section names. The current plugin does not explicitly move a task between sections to set `todo` or `in_progress`.
- `pm tasks search` and `pm tasks overdue` both rely on Asana workspace search APIs. Depending on the Asana plan, those commands may be more limited than assigned-task listing.
