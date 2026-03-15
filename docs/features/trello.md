# Trello Features in `pm`

This guide shows what you can do with Trello through `pm`, and how each feature is accessed from the CLI.

## How Trello can be accessed in `pm`

You can use Trello in four main ways:

1. Connect Trello as a provider

```bash
pm connect trello
```

Or authenticate through environment variables:

```bash
export TRELLO_API_KEY=your-api-key
export TRELLO_TOKEN=your-token
```

2. Target Trello in list and dashboard commands with `--source trello`

```bash
pm tasks assigned --source trello
pm tasks search "release" --source trello
pm today --source trello
```

3. Target a specific Trello card with a `TRELLO-<card_id>` ID

```bash
pm tasks show TRELLO-abc123def456
pm comment TRELLO-abc123def456 "Shared with QA"
pm done TRELLO-abc123def456
```

4. Open the card in Trello from the CLI

```bash
pm open TRELLO-abc123def456
pm tasks show TRELLO-abc123def456 --open
```

## Features you get with Trello

### 1. Connect and manage your Trello account

What you get:
- Connect or disconnect Trello
- Confirm whether Trello is connected
- See the current Trello user

How to access it:

```bash
pm connect trello
pm disconnect trello
pm providers
```

Example:

```bash
pm connect trello
pm providers
```

### 2. View Trello cards assigned to you

What you get:
- Cards where you are a member
- Optional filtering by status or priority
- Sorting
- Table, JSON, plain text, or IDs-only output

How to access it:

```bash
pm tasks assigned --source trello
```

Examples:

```bash
pm tasks assigned --source trello
pm tasks assigned --source trello --status todo --sort due
pm tasks assigned --source trello --json
pm tasks assigned --source trello --ids-only
```

### 3. View overdue Trello cards

What you get:
- Your cards with overdue due dates
- Sorting and output options

How to access it:

```bash
pm tasks overdue --source trello
```

Examples:

```bash
pm tasks overdue --source trello
pm tasks overdue --source trello --plain
pm tasks overdue --source trello --sort due
```

### 4. Search Trello cards

What you get:
- Search across Trello cards
- Optional post-search filtering and sorting

How to access it:

```bash
pm tasks search "query" --source trello
```

Examples:

```bash
pm tasks search "release" --source trello
pm tasks search "bug" --source trello --status todo --sort due
pm tasks search "deploy" --source trello --json
```

### 5. See a Trello card in detail

What you get:
- Title
- Description
- Due date
- Board name
- Labels
- Direct Trello URL

How to access it:

```bash
pm tasks show TRELLO-abc123def456
```

Examples:

```bash
pm tasks show TRELLO-abc123def456
pm tasks show TRELLO-abc123def456 --json
pm tasks show TRELLO-abc123def456 --open
```

### 6. Open a Trello card in the browser

What you get:
- A quick jump from the CLI to the card in Trello

How to access it:

```bash
pm open TRELLO-abc123def456
```

Example:

```bash
pm open TRELLO-abc123def456
```

### 7. Add comments to Trello cards

What you get:
- Post a comment to a card from the CLI

How to access it:

```bash
pm comment TRELLO-abc123def456 "message"
```

Example:

```bash
pm comment TRELLO-abc123def456 "Moved into QA review"
```

### 8. Update Trello cards

What you get:
- Update title
- Update description
- Change due date
- Clear due date
- Mark a card done by closing it

How to access it:

```bash
pm tasks update TRELLO-abc123def456 ...
```

Examples:

```bash
pm tasks update TRELLO-abc123def456 --title "New title"
pm tasks update TRELLO-abc123def456 --description "Updated notes"
pm tasks update TRELLO-abc123def456 --due 2026-03-15
pm tasks update TRELLO-abc123def456 --due none
pm tasks update TRELLO-abc123def456 --status done
```

### 9. Mark Trello cards done

What you get:
- Complete one or more cards from the CLI

How to access it:

```bash
pm done TRELLO-abc123def456
pm tasks update TRELLO-abc123def456 --status done
```

Examples:

```bash
pm done TRELLO-abc123def456
pm done TRELLO-abc123def456 TRELLO-xyz987654321
pm tasks update TRELLO-abc123def456 --status done
```

### 10. Delete Trello cards

What you get:
- Delete one or more cards directly from Trello

How to access it:

```bash
pm delete TRELLO-abc123def456
```

Examples:

```bash
pm delete TRELLO-abc123def456
pm delete TRELLO-abc123def456 TRELLO-xyz987654321
```

### 11. Use Trello cards in dashboard and summary views

What you get:
- `today`: grouped working view
- `summary`: provider connection status plus task counts

How to access it:

```bash
pm today --source trello
pm summary
```

Examples:

```bash
pm today --source trello
pm today --source trello --json
pm summary
```

### 12. Create git branches from Trello cards

What you get:
- Build a branch name from the card title
- Optionally add a prefix like `feat` or `fix`
- Optionally switch to the branch immediately

How to access it:

```bash
pm branch TRELLO-abc123def456
```

Examples:

```bash
pm branch TRELLO-abc123def456 --prefix feat
pm branch TRELLO-abc123def456 --prefix fix --checkout
pm branch TRELLO-abc123def456 --no-id
```

## Trello-specific advantages in this tool

These are the areas where the Trello path is strongest:

- Assigned-task listing is based on your Trello member cards.
- Trello board names and labels are mapped into the shared task view.
- Comments, detail view, browser open, done, delete, and branch flows are straightforward.

## Important notes for end users

- Task-specific commands use the format `TRELLO-<card_id>`.
- Trello authentication needs both `TRELLO_API_KEY` and `TRELLO_TOKEN`.
- Trello status in this CLI is inferred from list names such as "Doing" or "Done".
- `pm done` and `pm tasks update --status done` close the card.
- The current Trello path does not implement Asana-style board/list resolution, task threads, attachment inspection, or workspace switching.
- Card creation exists in the plugin layer, but this repo does not currently provide the same polished list-placement flow for Trello that it provides for Asana.
