# PM CLI — Roadmap & Progress

> Consolidated progress tracker for all milestones (M1-M10) and feature requests.
> Last validated against repository state: 2026-02-23 (workspace packages at `0.2.4`).

---

## Architecture

```
pm-cli (pnpm monorepo)
├── @jogi47/pm-cli-core           — Shared models, managers, utilities
├── @jogi47/pm-cli                — CLI commands (Oclif v4)
├── @jogi47/pm-cli-plugin-asana   — Asana provider (implemented)
├── @jogi47/pm-cli-plugin-notion  — Notion provider (implemented)
├── @jogi47/pm-cli-plugin-trello  — Trello provider (implemented)
├── @jogi47/pm-cli-plugin-linear  — Linear provider (implemented)
└── @jogi47/pm-cli-plugin-clickup — ClickUp provider (implemented)
```

---

## Dependency Graph

```
M1 (Task CRUD) ─────┬──→ M2 (Trello & Linear) ──→ M3 (Daily Driver)
                     │                                    │
                     │                              M4 (DX & Extensibility)
                     │                                    │
                     └──→ M5 (ClickUp & Notion) ──→ M6 (OSS Launch)

M3 ──→ M7 (Standup & Reporting)
M1 + M3 ──→ M8 (Interactive TUI)
M3.5 (pm branch) ──→ M9 (Git Integration)
M1 + M3.4 (piping) ──→ M10 (Bulk Operations)
```

---

## Progress Summary

| Milestone | Status | Progress | Notes |
|-----------|--------|----------|-------|
| M1: Task CRUD & Polish | Done | 7/7 | All write operations implemented (create, update, done, delete, open) |
| M2: Trello & Linear | Done | 4/4 | Trello + Linear plugins shipped with aggregation coverage |
| M3: Daily Driver | Done | 6/6 | Dashboard, summary, filtering, branch, comment |
| M4: DX & Extensibility | Done | 5/5 | Config/cache/dev docs/error handling complete; autocomplete dependency sync fixed and command is now discoverable |
| M5: ClickUp & Notion | Done | 2/2 | Notion + ClickUp plugins shipped |
| M6: OSS Launch | Done | 7/7 | CI/CD, changesets, docs, templates, license, and Homebrew formula scaffolded |
| REQ: Task Thread | Not Started | 0/3 | No ThreadEntry model or commands |
| M7: Standup & Reporting | Not Started | 0/2 | No standup or export commands |
| M8: Interactive TUI | Not Started | 0/1 | No pm ui command |
| M9: Git Integration | Not Started | 0/3 | No link/unlink/status/commit commands |
| M10: Bulk Operations | Not Started | 0/2 | No `pm bulk` command family yet (pre-work landed via multi-title create) |

---

## M1: Task CRUD & Polish — Done

**Goal:** Complete the core task lifecycle — create, update, complete, delete, and open tasks from the terminal.

- [x] Extend PMPlugin interface with write operations (`CreateTaskInput`, `UpdateTaskInput`, optional methods)
- [x] `pm tasks create` — create tasks with title/description, due date, assignee, and provider-specific project/section/custom fields
- [x] `pm tasks update <id>` — update task fields (title, description, due, status, project/workspace scope, custom fields)
- [x] `pm done <ids...>` — quick-complete one or more tasks (top-level command)
- [x] `pm delete <ids...>` — delete one or more tasks (top-level command)
- [x] `pm open <id>` — open task in browser (top-level shortcut)
- [x] Tests for write operations (client, date utils, command tests)

### Commands implemented

**`pm tasks create`**

| Flag/Arg | Short | Type | Required | Description |
|------|-------|------|----------|-------------|
| `title` (arg) | — | string | Conditional | Task title (required if `--title` is not provided) |
| `--title` | `-t` | string[] | Conditional | Task title (repeatable; supports multi-create) |
| `--description` | `-d` | string | No | Task description |
| `--due` | — | string | No | Due date (`YYYY-MM-DD`) |
| `--project` | `-p` | string | No | Project ID or name |
| `--section` | — | string | No | Section/column ID or name (`--project` required) |
| `--workspace` | — | string | No | Workspace ID or name for resolution |
| `--difficulty` | — | string | No | Asana difficulty shorthand (`--project` required) |
| `--field` | — | string[] | No | Custom field assignment, repeatable (`Field=Value[,Value]`) |
| `--refresh` | — | boolean | No | Bypass metadata cache |
| `--assignee` | `-a` | string | No | Assignee email |
| `--source` | `-s` | string | No | Target provider |
| `--json` | — | boolean | No | Output created task(s) as JSON |

**`pm tasks update <id>`**

| Flag | Short | Type | Description |
|------|-------|------|-------------|
| `--title` | `-t` | string | New title |
| `--description` | `-d` | string | New description |
| `--due` | — | string | New due date (`YYYY-MM-DD` or `none`) |
| `--status` | | string | New status (todo, in_progress, done) |
| `--project` | `-p` | string | Project ID or name to scope `--field` resolution |
| `--workspace` | | string | Workspace ID or name to scope project resolution |
| `--field` | | string[] | Custom field assignment, repeatable (`Field=Value[,Value]`) |
| `--refresh` | | boolean | Bypass metadata cache for resolution |
| `--json` | | boolean | Output updated task as JSON |

**`pm done <ids...>`** — Variadic, accepts multiple task IDs. Top-level for speed.

**`pm delete <ids...>`** — Variadic, accepts multiple task IDs. Top-level for deleting tasks.

**`pm open <id>`** — Top-level shortcut for opening task in browser.

### Files modified

- `packages/core/src/models/plugin.ts` — `CreateTaskInput`, `UpdateTaskInput`, optional write methods on `PMPlugin`
- `packages/cli/src/commands/tasks/create.ts` — Create command
- `packages/cli/src/commands/tasks/update.ts` — Update command
- `packages/cli/src/commands/done.ts` — Done command
- `packages/cli/src/commands/delete.ts` — Delete command
- `packages/cli/src/commands/open.ts` — Open command
- `packages/plugin-asana/src/client.ts` — `createTask()`, `updateTask()`, `completeTask()` methods
- `packages/plugin-asana/src/index.ts` — Plugin implementations of write ops
- `packages/core/src/utils/date.ts` — `parseRelativeDate()` for "tomorrow", "+3d", "friday"
- `packages/core/src/managers/cache-manager.ts` — Cache invalidation after mutations

### Recent completed enhancements (post-M1 baseline)

- [x] Asana project/section/workspace resolution on `pm tasks create` (`--project`, `--section`, `--workspace`)
- [x] Asana custom field support on create/update via repeatable `--field` (`--difficulty` retained as shorthand)
- [x] Multi-task creation via repeatable `--title` on `pm tasks create`
- [x] `pm delete` script safety improvement: non-zero exit on JSON delete failures

---

## M2: Trello & Linear Plugins — Done

**Goal:** Add Trello (50M+ users) and Linear (modern engineering teams) integrations.

- [x] Make ProviderType extensible — add `'trello' | 'linear'`, update auth and commands
- [x] `@jogi47/pm-cli-plugin-trello` — client, mapper, plugin (REST API, free plan)
- [x] `@jogi47/pm-cli-plugin-linear` — client, mapper, plugin (GraphQL via `@linear/sdk`)
- [x] Cross-provider aggregation tests

### 2.1 Make ProviderType extensible

- Add `'trello' | 'linear'` to `ProviderType` in `packages/core/src/models/task.ts`, update `parseTaskId` regex
- Add `TRELLO_API_KEY`, `TRELLO_TOKEN`, `LINEAR_API_KEY` to env var mapping in `packages/core/src/managers/auth-manager.ts`
- Add trello/linear to `PROVIDER_CREDENTIALS` in `packages/core/src/models/plugin.ts`
- Add new providers to `--source` flag options on all task commands

### 2.2 Trello plugin

**Auth:** API key + token pair. Env vars: `TRELLO_API_KEY`, `TRELLO_TOKEN`.

**Task mapping:**

| Trello Field | Task Field | Notes |
|-------------|------------|-------|
| `id` | `externalId` | Card ID |
| `name` | `title` | |
| `desc` | `description` | Markdown |
| `list.name` | `status` | Map list names: "To Do"/"Backlog"=todo, "Doing"/"In Progress"=in_progress, "Done"/"Complete"=done |
| `due` | `dueDate` | ISO date string |
| `members[0].fullName` | `assignee` | First member |
| `labels[].name` | `tags` | Trello labels |
| `shortUrl` | `url` | |
| `board.name` | `project` | Board name as project |

**API notes:**
- `GET /1/members/me/cards` — assigned cards (free)
- `GET /1/search` — full-text search (free, 10 req/sec)
- `POST /1/cards` — create (free), `PUT /1/cards/{id}` — update (free)
- `POST /1/cards/{id}/actions/comments` — add comment (free)
- Rate limit: 100 requests per 10-second window per token
- List-to-status mapping configurable via `.pmrc.json` (M4)

**Files to create:**
- `packages/plugin-trello/package.json`, `tsconfig.json`
- `packages/plugin-trello/src/index.ts` — TrelloPlugin implements PMPlugin
- `packages/plugin-trello/src/client.ts` — Trello REST API client
- `packages/plugin-trello/src/mapper.ts` — Maps Trello Card to Task
- `packages/plugin-trello/test/mapper.test.ts`

**Files to modify:**
- `packages/cli/src/init.ts` — Register TrelloPlugin
- `packages/cli/package.json` — Add dependency

### 2.3 Linear plugin

**Auth:** Personal API key from https://linear.app/settings/api. Env var: `LINEAR_API_KEY`.

**Task mapping:**

| Linear Field | Task Field | Notes |
|-------------|------------|-------|
| `identifier` | `externalId` | e.g., "ENG-42" |
| `title` | `title` | |
| `state.type` | `status` | backlog/unstarted=todo, started=in_progress, completed/cancelled=done |
| `dueDate` | `dueDate` | Native ISO date |
| `assignee.name` | `assignee` | |
| `labels[].name` | `tags` | |
| `priority` | `priority` | 1=urgent, 2=high, 3=medium, 4=low |
| `url` | `url` | |
| `project.name` or `team.name` | `project` | |

**API notes:**
- GraphQL only via `@linear/sdk`
- `viewer.assignedIssues` — assigned, `issueCreate`/`issueUpdate` — mutations, `createComment` — comments
- Free tier: 250 issues, unlimited API access. Rate limit: 1500 req/hour

**Files to create:**
- `packages/plugin-linear/package.json` — depends on `@linear/sdk`
- `packages/plugin-linear/tsconfig.json`
- `packages/plugin-linear/src/index.ts`, `client.ts`, `mapper.ts`
- `packages/plugin-linear/test/mapper.test.ts`

**Files to modify:**
- `packages/cli/src/init.ts` — Register LinearPlugin
- `packages/cli/package.json` — Add dependency

### 2.4 Cross-provider aggregation tests

- Ensure `pm tasks assigned` (no `--source`) correctly aggregates and sorts tasks from 3+ providers
- Test deduplication and error handling when one provider fails
- File to create: `packages/core/test/managers/plugin-manager.test.ts`

---

## M3: Daily Driver Features — Done

**Goal:** Features that make engineers reach for `pm` every morning instead of opening browser tabs.

- [x] `pm today` — morning dashboard (overdue, due today, in-progress, summary counts)
- [x] `pm summary` — provider connection status and task statistics
- [x] Filtering & sorting on list commands (`--status`, `--priority`, `--sort`)
- [x] Plain text output for piping (`--plain`, `--ids-only`)
- [x] `pm branch <id>` — create git branch from task title (slugified)
- [x] `pm comment <id> <msg>` — add comment to task

### Commands implemented

**`pm today`** — zero-config dashboard. Groups: overdue (red), due today (yellow), in-progress, summary counts.

**`pm summary`** — provider connection status, workspace info, task statistics (overdue/today/in-progress/total).

**Filtering flags (on `assigned`, `overdue`, `search`):**

| Flag | Type | Description |
|------|------|-------------|
| `--status` | string | Filter: todo, in_progress, done |
| `--priority` | string | Filter: low, medium, high, urgent (comma-separated) |
| `--sort` | string | Sort: due (default), priority, status, source, title |
| `--plain` | boolean | Tab-separated values, no ANSI colors, no table borders |
| `--ids-only` | boolean | Output only task IDs, one per line |

**`pm branch <id>`**

| Flag | Type | Description |
|------|------|-------------|
| `--prefix` | string | Branch prefix (feat, fix, chore) |
| `--checkout` / `-c` | boolean | Also `git checkout` to the new branch |
| `--no-id` | boolean | Don't append task ID to branch name |

**`pm comment <id> <msg>`** — Args: `id` (required), `message` (required).

### Files modified

- `packages/cli/src/commands/today.ts` — Dashboard command
- `packages/cli/src/commands/summary.ts` — Summary command
- `packages/cli/src/commands/branch.ts` — Branch command
- `packages/cli/src/commands/comment.ts` — Comment command
- `packages/cli/src/commands/tasks/assigned.ts` — Filter/sort/plain/ids-only flags
- `packages/cli/src/commands/tasks/overdue.ts` — Filter/sort/plain/ids-only flags
- `packages/cli/src/commands/tasks/search.ts` — Filter/sort/plain/ids-only flags
- `packages/core/src/utils/output.ts` — `renderDashboard()`, `renderSummary()`, `renderTasksPlain()`, `renderTaskIds()`
- `packages/core/src/utils/string.ts` — `slugify()`
- `packages/core/src/managers/plugin-manager.ts` — `filterAndSortTasks()` for client-side filtering
- `packages/plugin-asana/src/client.ts` — `addComment()` method
- `packages/plugin-asana/src/index.ts` — `addComment()` implementation

---

## M4: DX & Extensibility — Done

**Goal:** Make pm-cli easy to customize, extend, and contribute to.

- [x] Shell completions (bash, zsh, fish) via `@oclif/plugin-autocomplete`
- [x] `.pmrc.json` project-level configuration (`pm config get/set/list/init/path`)
- [x] Cache management commands (`pm cache stats`, `pm cache clear`)
- [x] Plugin development guide & template (`docs/plugin-development.md`, `examples/plugin-template/`)
- [x] Improved error messages with recovery suggestions

### 4.1 Shell completions

- Added `@oclif/plugin-autocomplete` to `packages/cli/package.json` (dependencies + `oclif.plugins` array)
- Completed: dependency sync/runtime command discovery resolved so `pm autocomplete` works end-to-end

### 4.2 `.pmrc.json` — project-level configuration

**Config file locations (priority order):**
1. `./.pmrc.json` (project root, checked into git — team-shared)
2. `~/.config/pm-cli/config.json` (user-level — personal)

**Supported keys:** `defaultSource`, `defaultLimit`, `defaultSort`, `aliases` (command shortcuts), `trello.statusMap`, `notion.propertyMap`

**Commands:**
- `pm config get <key>`, `pm config set <key> <value>`, `pm config list`, `pm config init` (create `.pmrc.json`), `pm config path`

**Files created:**
- `packages/core/src/managers/config-manager.ts` — Merges project + user configs with defaults
- `packages/cli/src/commands/config/get.ts`, `set.ts`, `list.ts`, `init.ts`, `path.ts`

### 4.3 Cache management

- `pm cache stats` — show cache size, entry count, path
- `pm cache clear` — clear all; `pm cache clear --source=asana` — clear one provider
- Already backed by `cacheManager.clearAll()` and `cacheManager.invalidateProvider()` — just needs CLI commands

**Files created:** `packages/cli/src/commands/cache/stats.ts`, `clear.ts`

### 4.4 Plugin development guide

**Files created:**
- `docs/plugin-development.md` — Step-by-step: implement PMPlugin, create mapper, create client, add to ProviderType/PROVIDER_CREDENTIALS, register in `init.ts`, testing guidelines
- `examples/plugin-template/` — Minimal plugin skeleton (`package.json`, `src/index.ts`, `client.ts`, `mapper.ts`)

### 4.5 Improved error messages

- Completed: standardized error shape with `reason`, `suggestion`, and `docsUrl` in `packages/core/src/utils/errors.ts`
- Completed: added `packages/cli/src/lib/command-error.ts` and routed command catch blocks through a shared handler
- Completed: provider aggregation errors now include context and non-fatal fallback behavior

---

## M5: ClickUp & Notion Plugins — Done

**Goal:** Expand provider coverage to ClickUp and Notion.

- [x] `@jogi47/pm-cli-plugin-clickup` — client, mapper, plugin (REST API, free plan)
- [x] `@jogi47/pm-cli-plugin-notion` — fully implemented (shipped as part of M2 deliverable)

### M5 completion notes

- [x] Added `clickup` to `ProviderType` and task ID parsing
- [x] Added ClickUp credentials support (`PROVIDER_CREDENTIALS`, `CLICKUP_TOKEN`)
- [x] Registered `ClickUpPlugin` in CLI initialization and package dependencies
- [x] Added `clickup` provider options across CLI flags (`connect`, `disconnect`, task listing/creation/search, cache clear, workspace, today)
- [x] Added mapper and task ID tests for ClickUp

### ClickUp plugin

**Auth:** Personal API token from https://app.clickup.com/settings/apps. Env var: `CLICKUP_TOKEN`.

**Workspace selection:** ClickUp hierarchy is Workspace → Space → Folder → List → Task. On `pm connect clickup`, fetch workspaces and prompt for team selection (same pattern as Asana workspace).

**Task mapping:**

| ClickUp Field | Task Field | Notes |
|--------------|------------|-------|
| `id` | `externalId` | Task ID |
| `name` | `title` | |
| `description` | `description` | Plain text |
| `status.type` | `status` | "open"=todo, "active"/"custom"=in_progress, "closed"/"done"=done |
| `due_date` | `dueDate` | Unix timestamp (ms), convert to Date |
| `assignees[0].username` | `assignee` | First assignee |
| `tags[].name` | `tags` | |
| `priority.id` | `priority` | 1=urgent, 2=high, 3=medium, 4=low |
| `url` | `url` | |
| `list.name` | `project` | List name as project |

**API notes:**
- `GET /api/v2/team` — get workspaces ("teams")
- `GET /api/v2/team/{team_id}/task?assignees[]=me` — assigned tasks
- `GET /api/v2/team/{team_id}/task?search=query` — search
- `POST /api/v2/list/{list_id}/task` — create (requires list ID)
- `PUT /api/v2/task/{task_id}` — update
- `POST /api/v2/task/{task_id}/comment` — add comment
- Free plan: full API access. Rate limit: 100 req/min

**Files to create:**
- `packages/plugin-clickup/package.json`, `tsconfig.json`
- `packages/plugin-clickup/src/index.ts` — ClickUpPlugin implements PMPlugin
- `packages/plugin-clickup/src/client.ts` — ClickUp REST API client
- `packages/plugin-clickup/src/mapper.ts` — Maps ClickUp task to unified Task
- `packages/plugin-clickup/test/mapper.test.ts`

**Files to modify:**
- `packages/core/src/models/task.ts` — Add `'clickup'` to ProviderType
- `packages/core/src/models/plugin.ts` — Add clickup to `PROVIDER_CREDENTIALS`
- `packages/core/src/managers/auth-manager.ts` — Add `CLICKUP_TOKEN` env var mapping
- `packages/cli/src/init.ts` — Register ClickUpPlugin
- `packages/cli/package.json` — Add dependency
- All task commands — Add `clickup` to `--source` flag options

---

## M6: OSS Launch — Done

**Goal:** Everything needed to make pm-cli a credible, contributor-friendly open source project.

- [x] GitHub Actions CI/CD (`ci.yml` for PRs, `release.yml` for tag-triggered publish)
- [x] Changesets for monorepo versioning (`@changesets/cli`)
- [x] README overhaul (demo GIF, quickstart, command reference, provider table)
- [x] CONTRIBUTING.md (dev setup, project structure, PR process)
- [x] GitHub issue & PR templates
- [x] LICENSE (MIT)
- [x] Homebrew formula (stretch goal)

### 6.1 GitHub Actions CI/CD

- **ci.yml** — On PR and push to main: `pnpm install` → `pnpm lint` → `pnpm build` → `pnpm test` (with coverage)
- **release.yml** — Tag-triggered: build, test, publish all packages to npm, create GitHub release with changelog
- Files to create: `.github/workflows/ci.yml`, `.github/workflows/release.yml`

### 6.2 Changesets

- Use `@changesets/cli` for monorepo versioning and changelog generation
- Commands: `pnpm changeset`, `pnpm changeset version`, `pnpm changeset publish`
- Files to create: `.changeset/config.json`. Modify root `package.json` to add changeset scripts.

### 6.3 README overhaul

- Sections: hero with demo GIF (via `vhs`), badges (npm, CI, license, downloads), one-liner install, 30-second quickstart, full command reference (auto-generated from Oclif), supported providers table, architecture overview, "Building Plugins" link, contributing link, license
- File to modify: `README.md`

### 6.4 CONTRIBUTING.md

- Sections: dev setup, project structure, adding CLI commands, adding provider plugins, testing guidelines, PR process, code style, issue labels
- File to create: `CONTRIBUTING.md`

### 6.5 GitHub issue & PR templates

- Files to create: `.github/ISSUE_TEMPLATE/bug_report.md`, `feature_request.md`, `new_provider.md`, `.github/PULL_REQUEST_TEMPLATE.md`

### 6.6 LICENSE

- MIT license file. File to create: `LICENSE`

### 6.7 Homebrew formula (stretch goal)

- `brew tap yourorg/pm-cli && brew install pm-cli`

---

## REQ: Task Thread (Comments & Attachments) — Not Started

**Goal:** Read a task's full conversation thread with image attachments auto-downloaded to a temp directory.

- [ ] `ThreadEntry` and `Attachment` models in core, add optional methods to PMPlugin
- [ ] `pm tasks thread <id>` — display comment/activity thread with image attachments downloaded to temp dir

### Models

**ThreadEntry:** `id` (PROVIDER-entryId), `externalId`, `taskId` (parent), `type` ('comment' | 'system'), `text`, `htmlText?`, `author`, `authorEmail?`, `createdAt`, `attachments?`

**Attachment:** `id` (PROVIDER-attachmentId), `externalId`, `name` (filename), `url` (download URL), `permanentUrl?`, `mimeType?`, `size?` (bytes), `createdAt?`, `localPath?` (temp file path), `isVideo?` (true if video — placeholder shown instead of downloading)

**ThreadQueryOptions:** `commentsOnly?` (boolean), `limit?` (number), `downloadImages?` (boolean), `tempDir?` (string)

### Plugin interface additions

Optional methods on `PMPlugin`:
- `getTaskThread?(externalId, options?: ThreadQueryOptions): Promise<ThreadEntry[]>` — returns thread with attachments metadata
- `downloadAttachment?(attachment, destDir): Promise<string>` — downloads attachment, returns local file path

### `pm tasks thread <id>`

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--json` | | `false` | Output as JSON |
| `--comments-only` | `-c` | `false` | Filter out system/auto-generated activity |
| `--limit` | `-l` | all | Show only the last N entries |
| `--open` | | `false` | Open task in browser instead |
| `--download-images` | | `true` | Auto-download images to temp directory (default: `/tmp/pm-cli-attachments/{taskId}/`) |
| `--temp-dir` | | `/tmp/pm-cli-attachments/{taskId}/` | Custom temp directory for downloads |
| `--cleanup` | | `false` | Delete temp directory after displaying thread |

**Behavior:**
- By default, auto-downloads images to a temp directory so LLM can see the full context
- Returns thread entries with `localPath` field populated for downloaded images
- Videos are NOT downloaded — a placeholder with video name is shown instead
- Documents are NOT downloaded — remote URL is provided for LLM to access
- Use `--download-images=false` to skip downloads and just get remote URLs

### Asana API mapping

- **Comments:** `GET /tasks/{task_gid}/stories` — `resource_subtype: "comment_added"` → comment, everything else → system
- **Attachments:** `GET /tasks/{task_gid}/attachments` (list) + `GET /attachments/{attachment_gid}` (detail for `download_url`)
- Note: `download_url` only available on individual attachment detail endpoint, not the list. Must fetch each attachment individually.

### Files to create

| File | Description |
|------|-------------|
| `packages/core/src/models/thread.ts` | `ThreadEntry`, `Attachment`, `ThreadQueryOptions` interfaces |
| `packages/cli/src/commands/tasks/thread.ts` | `pm tasks thread` command |

### Files to modify

| File | Change |
|------|--------|
| `packages/core/src/models/plugin.ts` | Add optional `getTaskThread`, `downloadAttachment` |
| `packages/core/src/utils/output.ts` | Add `renderThread()` with local paths displayed |
| `packages/core/src/index.ts` | Export new models |
| `packages/plugin-asana/src/client.ts` | Add `getStories()`, `getAttachments()`, `getAttachment()` |
| `packages/plugin-asana/src/index.ts` | Implement thread method |
| `packages/plugin-asana/src/mapper.ts` | Add `mapAsanaStory()` and `mapAsanaAttachment()` |

---

## M7: Standup & Reporting — Not Started

**Goal:** Automate daily standups and task exports.

- [ ] `pm standup` — auto-generate standup (done yesterday, in-progress today, blockers) with `--copy` to clipboard
- [ ] `pm export` — export tasks to CSV, Markdown, or JSON

### `pm standup`

**Logic:** Done = tasks completed since `--since` date (default: yesterday). In Progress = currently `in_progress`. Blockers = overdue tasks, sorted by how overdue.

| Flag | Short | Type | Description |
|------|-------|------|-------------|
| `--since` | | string | Lookback date ("yesterday", "monday", "2024-03-01"). Default: yesterday |
| `--format` | `-f` | string | Output format: plain (default), markdown, json |
| `--copy` | | boolean | Copy output to system clipboard |
| `--source` | `-s` | string | Filter by provider |
| `--no-blockers` | | boolean | Hide blockers section |

**New dependency:** `clipboardy` (cross-platform clipboard for `--copy`)

**Files to create/modify:**
- `packages/cli/src/commands/standup.ts` — New command
- `packages/core/src/utils/output.ts` — Add `renderStandup()` with plain/markdown formatters
- `packages/core/src/managers/plugin-manager.ts` — Add `getCompletedTasksSince(date)` method

### `pm export`

| Flag | Short | Type | Description |
|------|-------|------|-------------|
| `--format` | `-f` | string | csv (default), markdown, json |
| `--status` | | string | Filter: todo, in_progress, done |
| `--since` | | string | Only tasks updated since date |
| `--source` | `-s` | string | Filter by provider |
| `--limit` | `-l` | number | Max tasks |

**CSV columns:** `ID, Title, Status, Due Date, Assignee, Project, Source, URL`

**Files to create/modify:**
- `packages/cli/src/commands/export.ts` — New command
- `packages/core/src/utils/output.ts` — Add `renderTasksCsv()`, `renderTasksMarkdown()`
- Reuses filtering logic from M3 and `parseRelativeDate()` from M1

---

## M8: Interactive TUI — Not Started

**Goal:** Keyboard-driven terminal UI for browsing and acting on tasks (like lazygit for tasks).

- [ ] `pm ui` — interactive TUI using `ink` with vim keybindings, provider tabs, inline actions

### `pm ui`

**Keybindings:**

| Key | Action |
|-----|--------|
| `↑/↓` or `j/k` | Navigate tasks |
| `Enter` | Show task details panel |
| `d` | Mark done (uses `completeTask` from M1) |
| `o` | Open in browser |
| `e` | Edit task (inline prompts) |
| `c` | Add comment (inline prompt) |
| `b` | Create git branch (uses `pm branch` logic from M3) |
| `Tab` | Cycle provider tabs |
| `/` | Filter/search |
| `f` | Toggle status filter (todo → wip → done → all) |
| `r` | Refresh (bypass cache) |
| `q` / `Esc` | Quit |

**Framework:** `ink` (React for CLIs) — composable, TypeScript support, used by Vercel.

**New dependencies:** `ink` (^5.0.0), `ink-text-input`, `react`

**Files to create:**
- `packages/cli/src/commands/ui.ts` — Launch TUI command
- `packages/cli/src/tui/app.ts` — Main Ink root component
- `packages/cli/src/tui/components/task-list.ts` — Task list with keyboard nav
- `packages/cli/src/tui/components/task-detail.ts` — Detail panel
- `packages/cli/src/tui/components/provider-tabs.ts` — Provider tab bar
- `packages/cli/src/tui/components/search-bar.ts` — Filter/search input
- `packages/cli/src/tui/keybindings.ts` — Keyboard handler and action dispatcher

**Note:** All TUI actions call the same PluginManager methods as CLI commands — no duplicate business logic.

---

## M9: Git Integration — Not Started

**Goal:** Bridge task management and git workflow — tasks know about branches and commits.

- [ ] `pm link <id>` / `pm unlink` — link current git branch to a task
- [ ] `pm status` — show linked task for current branch
- [ ] `pm commit <msg>` — git commit with auto-appended task ID reference

### `pm link <id>`

- Stores branch → task ID mappings in `~/.config/pm-cli/links.json`
- Auto-detection: if branch name contains a task ID pattern (e.g., `feat/fix-login-ASANA-123456` from `pm branch`), auto-suggests linking
- `pm link --show` — show linked task for current branch
- `pm unlink` — remove link

### `pm status`

- Reads current git branch, looks up link in `links.json`, fetches and displays task details
- If no link, suggests `pm link` or auto-detection

### `pm commit <msg>`

- Detects linked task from current branch (via LinkManager)
- Falls back to `--task` flag if no link
- Appends task ID: `Fix redirect loop [ASANA-123456]`
- Runs `git commit -m "message [TASK-ID]"`
- Optionally auto-updates task status to `in_progress` on first commit

**Files to create:**
- `packages/cli/src/commands/link.ts`, `unlink.ts`, `status.ts`, `commit.ts`
- `packages/core/src/managers/link-manager.ts` — Singleton for branch↔task mappings, reads current branch via `git rev-parse --abbrev-ref HEAD`

**Note:** Does NOT replace git — wraps `git commit` with task context. Plain git always works.

---

## M10: Bulk Operations — Not Started

**Goal:** Batch task management and scriptable workflows for power users and CI/CD.

- [ ] `pm bulk update/move` — batch update status, due date, assignee, or move to project
- [ ] `pm bulk create --file` — create tasks from CSV or JSON file

**Current pre-work completed:** `pm tasks create` already supports repeatable `--title` for multi-task creation with shared flags.

### `pm bulk update`

| Flag | Type | Description |
|------|------|-------------|
| `--status` | string | Set status for all tasks |
| `--due` | string | Set due date for all tasks |
| `--assignee` | string | Set assignee for all tasks |
| `--priority` | string | Set priority for all tasks |

Args: variadic task IDs. Example: `pm bulk update --status=in_progress ASANA-111 LINEAR-ENG-42`

`pm bulk move --project "Sprint 5" ASANA-111 ASANA-222` — move tasks to a different project.

### `pm bulk create --file`

| Flag | Type | Description |
|------|------|-------------|
| `--file` | string | Path to CSV or JSON file |
| `--source` | string | Provider to create tasks in |
| `--project` | string | Default project (overridden by file data) |

**CSV format:** `title,due,project,priority` (one task per row)

**JSON format:** Array of `{ title, due, project, priority }` objects

**Files to create:**
- `packages/cli/src/commands/bulk/update.ts`, `create.ts`, `move.ts`
- `packages/core/src/utils/csv.ts` — CSV parser (or use `csv-parse` package)

**Note:** Bulk complete already works via piping: `pm tasks assigned --ids-only --status=todo | xargs pm done`

---

## Command Index

| Command | Status | Milestone | Type |
|---------|--------|-----------|------|
| `pm connect <provider>` | Implemented | — | Auth |
| `pm disconnect <provider>` | Implemented | — | Auth |
| `pm providers` | Implemented | — | Read |
| `pm workspace [list\|switch]` | Implemented | — | Config |
| `pm tasks assigned` | Implemented | — | Read |
| `pm tasks overdue` | Implemented | — | Read |
| `pm tasks search <query>` | Implemented | — | Read |
| `pm tasks show <id>` | Implemented | — | Read |
| `pm tasks create` | Implemented | M1 | Write |
| `pm tasks update <id>` | Implemented | M1 | Write |
| `pm done <ids...>` | Implemented | M1 | Write |
| `pm delete <ids...>` | Implemented | M1 | Write |
| `pm open <id>` | Implemented | M1 | Read |
| `pm today` | Implemented | M3 | Read |
| `pm summary` | Implemented | M3 | Read |
| `pm branch <id>` | Implemented | M3 | Git |
| `pm comment <id> <msg>` | Implemented | M3 | Write |
| `pm tasks thread <id>` | Planned | REQ | Read |
| `pm tasks attachments <id>` | Planned | REQ | Read |
| `pm config get\|set\|list\|init\|path` | Implemented | M4 | Config |
| `pm cache stats\|clear` | Implemented | M4 | Config |
| `pm autocomplete` | Implemented | M4 | Config |
| `pm standup` | Planned | M7 | Read |
| `pm export` | Planned | M7 | Read |
| `pm ui` | Planned | M8 | Interactive |
| `pm link <id>` | Planned | M9 | Config |
| `pm unlink` | Planned | M9 | Config |
| `pm status` | Planned | M9 | Read |
| `pm commit <msg>` | Planned | M9 | Git |
| `pm bulk update\|move` | Planned | M10 | Write |
| `pm bulk create --file` | Planned | M10 | Write |
