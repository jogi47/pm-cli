# Linear Features in `pm`

This guide shows what you can do with Linear through `pm`, and how each feature is accessed from the CLI.

## How Linear can be accessed in `pm`

You can use Linear in four main ways:

1. Connect Linear as a provider

```bash
pm connect linear
```

Or authenticate through an environment variable:

```bash
export LINEAR_API_KEY=your-api-key
```

2. Target Linear in list and dashboard commands with `--source linear`

```bash
pm tasks assigned --source linear
pm tasks search "release" --source linear
pm today --source linear
```

3. Target a specific Linear issue with a `LINEAR-<issue_identifier>` ID

```bash
pm tasks show LINEAR-ENG-42
pm comment LINEAR-ENG-42 "Ready for QA"
pm done LINEAR-ENG-42
```

4. Open the issue in Linear from the CLI

```bash
pm open LINEAR-ENG-42
pm tasks show LINEAR-ENG-42 --open
```

## Features you get with Linear

### 1. Connect and manage your Linear account

What you get:
- Connect or disconnect Linear
- Confirm whether Linear is connected
- See the current Linear user

How to access it:

```bash
pm connect linear
pm disconnect linear
pm providers
```

Example:

```bash
pm connect linear
pm providers
```

### 2. View issues assigned to you

What you get:
- Your assigned Linear issues
- Optional filtering by status or priority
- Sorting
- Table, JSON, plain text, or IDs-only output

How to access it:

```bash
pm tasks assigned --source linear
```

Examples:

```bash
pm tasks assigned --source linear
pm tasks assigned --source linear --status in_progress --sort priority
pm tasks assigned --source linear --json
pm tasks assigned --source linear --ids-only
```

### 3. View overdue issues

What you get:
- Your issues with overdue due dates
- Sorting and output options

How to access it:

```bash
pm tasks overdue --source linear
```

Examples:

```bash
pm tasks overdue --source linear
pm tasks overdue --source linear --plain
pm tasks overdue --source linear --sort due
```

### 4. Search Linear issues

What you get:
- Search across Linear issues
- Optional post-search filtering and sorting

How to access it:

```bash
pm tasks search "query" --source linear
```

Examples:

```bash
pm tasks search "release" --source linear
pm tasks search "bug" --source linear --status todo --sort due
pm tasks search "deploy" --source linear --json
```

### 5. See an issue in detail

What you get:
- Title
- Description
- Due date
- Assignee
- Project or team
- Labels
- Priority
- Direct Linear URL

How to access it:

```bash
pm tasks show LINEAR-ENG-42
```

Examples:

```bash
pm tasks show LINEAR-ENG-42
pm tasks show LINEAR-ENG-42 --json
pm tasks show LINEAR-ENG-42 --open
```

### 6. Open a Linear issue in the browser

What you get:
- A quick jump from the CLI to the issue in Linear

How to access it:

```bash
pm open LINEAR-ENG-42
```

Example:

```bash
pm open LINEAR-ENG-42
```

### 7. Add comments to Linear issues

What you get:
- Post a comment to an issue from the CLI

How to access it:

```bash
pm comment LINEAR-ENG-42 "message"
```

Example:

```bash
pm comment LINEAR-ENG-42 "Shared the repro steps in the latest build"
```

### 8. Create Linear issues

What you get:
- Create a new issue
- Set title
- Set description
- Set due date

How to access it:

```bash
pm tasks create "title" --source linear
```

Examples:

```bash
pm tasks create "Fix login bug" --source linear
pm tasks create "Prepare launch checklist" --source linear --due 2026-03-20
pm tasks create "Triage API error handling" --source linear --description "Capture failing routes and expected retry behavior"
```

### 9. Update Linear issues

What you get:
- Update title
- Update description
- Change due date
- Clear due date
- Move issue state between `todo`, `in_progress`, and `done`

How to access it:

```bash
pm tasks update LINEAR-ENG-42 ...
```

Examples:

```bash
pm tasks update LINEAR-ENG-42 --title "New title"
pm tasks update LINEAR-ENG-42 --description "Updated notes"
pm tasks update LINEAR-ENG-42 --due 2026-03-15
pm tasks update LINEAR-ENG-42 --due none
pm tasks update LINEAR-ENG-42 --status in_progress
```

### 10. Mark Linear issues done

What you get:
- Complete one or more issues from the CLI

How to access it:

```bash
pm done LINEAR-ENG-42
pm tasks update LINEAR-ENG-42 --status done
```

Examples:

```bash
pm done LINEAR-ENG-42
pm done LINEAR-ENG-42 LINEAR-ENG-43
pm tasks update LINEAR-ENG-42 --status done
```

### 11. Delete Linear issues

What you get:
- Delete one or more issues directly from Linear

How to access it:

```bash
pm delete LINEAR-ENG-42
```

Examples:

```bash
pm delete LINEAR-ENG-42
pm delete LINEAR-ENG-42 LINEAR-ENG-43
```

### 12. Use Linear issues in dashboard and summary views

What you get:
- `today`: grouped working view
- `summary`: provider connection status plus task counts

How to access it:

```bash
pm today --source linear
pm summary
```

Examples:

```bash
pm today --source linear
pm today --source linear --json
pm summary
```

### 13. Create git branches from Linear issues

What you get:
- Build a branch name from the issue title
- Optionally add a prefix like `feat` or `fix`
- Optionally switch to the branch immediately

How to access it:

```bash
pm branch LINEAR-ENG-42
```

Examples:

```bash
pm branch LINEAR-ENG-42 --prefix feat
pm branch LINEAR-ENG-42 --prefix fix --checkout
pm branch LINEAR-ENG-42 --no-id
```

## Linear-specific advantages in this tool

These are the areas where the Linear path is strongest:

- Assigned-task listing is truly viewer-assigned Linear issues.
- Linear issue identifiers such as `ENG-42` are preserved.
- Status updates map cleanly to Linear workflow state types.
- Priority, labels, assignee, project, and team metadata are mapped well into the shared task model.

## Important notes for end users

- Task-specific commands use the format `LINEAR-<issue_identifier>`, for example `LINEAR-ENG-42`.
- Create uses your current Linear active team.
- Search is title-oriented.
- The current Linear path does not implement task threads, attachment inspection, custom-field flows, or workspace switching.
- Project/team targeting during create is not exposed the way Asana project/section targeting is.
