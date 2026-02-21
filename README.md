# PM-CLI

[![npm](https://img.shields.io/npm/v/@jogi47/pm-cli)](https://www.npmjs.com/package/@jogi47/pm-cli)

A unified command-line interface for managing tasks across multiple project management tools.

Currently supports:
- **Asana** (fully implemented)
- **Notion** (fully implemented)

## Features

- Aggregate tasks from multiple PM tools in one place
- Create, update, complete, and delete tasks from the command line
- Morning dashboard and summary views
- Filter by status/priority and sort results
- Search across all connected providers
- Create git branches from tasks
- Add comments to tasks
- Switch between workspaces
- Cached responses for fast repeat queries
- Built-in cache inspection and cache invalidation commands
- Project-level configuration via `.pmrc.json`
- Multiple output modes: table, JSON, plain, ids-only

## Installation

### Install from npm (recommended)

```bash
pnpm add -g @jogi47/pm-cli
```

The `pm` command is now available globally:

```bash
pm --help
```

You can also use npm or yarn:

```bash
npm install -g @jogi47/pm-cli
# or
yarn global add @jogi47/pm-cli
```

### Install from source

```bash
# Clone the repository
git clone <repo-url>
cd pm-cli

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Link the CLI globally
pnpm link --global --filter @jogi47/pm-cli
```

The `pm` command is now available system-wide:

```bash
pm --help
```

## Uninstall

```bash
# If installed from npm
pnpm remove -g @jogi47/pm-cli

# If installed from source
cd pm-cli
pnpm unlink --global --filter @jogi47/pm-cli
```

## Agent Skill

PM-CLI ships with an agent skill that teaches AI coding agents (Claude Code, Cursor, etc.) how to use the `pm` CLI. Once installed, your agent can run pm-cli commands to manage tasks on your behalf.

### Install the skill

Browse the skill at [skills.sh](https://skills.sh) or install directly:

```bash
npx skills add jogi47/pm-cli -g -y
```

### What the skill provides

- Complete command reference for all `pm` commands
- Task ID format conventions (`PROVIDER-externalId`)
- Flag and argument details for every subcommand
- Common workflows (check overdue, search, force-refresh, switch workspace)
- Caching behavior and output modes (table vs JSON)

### Discover more skills

```bash
# Search for related skills
npx skills find pm-cli

# Check for updates to installed skills
npx skills check

# Update all installed skills
npx skills update
```

Learn more about the agent skills ecosystem at [skills.sh](https://skills.sh).

## Quick Start

```bash
# 1. Connect to Asana
pm connect asana
# Enter your Personal Access Token from https://app.asana.com/0/my-apps

# 2. View your tasks
pm tasks assigned

# 3. Search for tasks
pm tasks search "bug"
```

## Commands

### Connection Management

```bash
# Connect to a provider
pm connect asana
pm connect notion

# Disconnect from a provider
pm disconnect asana

# List all providers and their status
pm providers
pm providers --json
```

### Workspace Management

```bash
# List available workspaces
pm workspace

# Switch to a different workspace
pm workspace switch

# Specify provider (default: asana)
pm workspace -s asana
```

### Dashboard & Summary

```bash
# Morning dashboard — overdue, due today, and in-progress tasks
pm today
pm today --source=asana --json

# Provider status and task count statistics
pm summary
pm summary --json
```

### Cache Commands

```bash
# Show cache file path + entry counts
pm cache stats

# Clear all cache entries
pm cache clear

# Clear cache for one provider
pm cache clear --source=asana
```

### Config Commands

```bash
# Initialize project config file
pm config init
pm config init --force

# Show where config files are loaded from
pm config path

# List merged config (user + project)
pm config list

# Read/write specific config keys
pm config get defaultSource
pm config set defaultLimit 10
pm config set aliases.today "\"tasks assigned --status=in_progress\""
```

### Task Commands

```bash
# List tasks assigned to you
pm tasks assigned
pm tasks assigned --source=asana    # Filter by provider
pm tasks assigned --limit=10        # Limit results
pm tasks assigned --refresh         # Bypass cache
pm tasks assigned --json            # JSON output
pm tasks assigned --status=todo     # Filter by status
pm tasks assigned --sort=priority   # Sort by field
pm tasks assigned --plain           # Tab-separated, no colors
pm tasks assigned --ids-only        # Just task IDs

# List overdue tasks
pm tasks overdue
pm tasks overdue --source=asana

# Search for tasks
pm tasks search "login bug"
pm tasks search "api" --limit=5

# Show task details
pm tasks show ASANA-1234567890
pm tasks show ASANA-123 --json      # JSON output
pm tasks show ASANA-123 --open      # Open in browser

# Create a task
pm tasks create "Fix login bug"
pm tasks create "Update docs" --source=asana --due=2026-03-01
pm tasks create "This is automated ticket" --source=asana --project "Teacher Feature Development" --section "Prioritised"
pm tasks create "Tune lesson plan UX" --source=asana --project "Teacher Feature Development" --section "Prioritised" --difficulty "S"  # legacy shorthand
pm tasks create "Cover flow API integration" --source=asana --project "Teacher Feature Development" --section "Prioritised" --field "Difficulty=XS" --field "Department=Frontend" --field "Other=Bugs,Analytics"
pm tasks create "Clear release marker" --source=asana --project "Teacher Feature Development" --field "Teacher Feature Release="
pm tasks create "Fix login redirect bug" --source=asana --project 1210726476060870 --section 1210726344951110 --json

# Update a task
pm tasks update ASANA-123456 --status in_progress
pm tasks update ASANA-123456 --due 2026-03-15 --title "New title"
pm tasks update ASANA-123456 --field "Importance=High" --field "Teacher Feature Release=PR4" --json
pm tasks update ASANA-123456 --project "Teacher Feature Development" --field "Other="

# Mark tasks as done
pm done ASANA-123456
pm done ASANA-123456 ASANA-789012   # Batch complete

# Delete tasks
pm delete ASANA-123456
pm delete ASANA-123456 ASANA-789012 # Batch delete

# Open a task in browser
pm open ASANA-123456
```

### Help

```bash
# Global help
pm --help

# Task command help
pm tasks --help
pm tasks create --help
pm tasks update --help
```

`--field` syntax:
- Enum: `--field "Difficulty=XS"`
- Multi-enum: `--field "Other=Bugs,Analytics"`
- ID-based: `--field "1207357939780562=1207357939780564"`
- Clear: `--field "Difficulty="` and `--field "Other="`

Rules:
- `pm tasks create`: `--field` and `--difficulty` require `--project`.
- `pm tasks update`: `--field` resolves from task memberships by default, or from `--project` if provided.

### Git & Comments

```bash
# Create a git branch from a task
pm branch ASANA-123456 --prefix feat --checkout
pm branch ASANA-123456 --no-id

# Add a comment to a task
pm comment ASANA-123456 "Fixed in commit abc"
```

## Project Structure

```
pm-cli/
├── packages/
│   ├── core/                 # @jogi47/pm-cli-core
│   │   └── src/
│   │       ├── models/       # Task, Plugin interfaces
│   │       ├── managers/     # Auth, Cache, Plugin managers
│   │       └── utils/        # Date, Error, Output utilities
│   │
│   ├── cli/                  # @jogi47/pm-cli (main CLI)
│   │   └── src/
│   │       └── commands/     # Oclif commands
│   │
│   ├── plugin-asana/         # @jogi47/pm-cli-plugin-asana
│   │   └── src/
│   │       ├── client.ts     # Asana API client
│   │       ├── mapper.ts     # Asana → Task mapping
│   │       └── index.ts      # Plugin implementation
│   │
│   └── plugin-notion/        # @jogi47/pm-cli-plugin-notion
│
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── vitest.config.ts
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Build specific package
pnpm --filter @jogi47/pm-cli-core build

# Run in development mode (watches for changes)
pnpm dev

# Run tests
pnpm test

# Run CLI in dev mode
pnpm pm <command>
```


## Architecture

### Plugin System

PM-CLI uses a plugin architecture where each provider (Asana, Notion, etc.) is a separate package that implements the `PMPlugin` interface:

```typescript
interface PMPlugin {
  name: ProviderType;
  displayName: string;

  // Lifecycle
  initialize(): Promise<void>;
  authenticate(credentials: ProviderCredentials): Promise<void>;
  disconnect(): Promise<void>;
  isAuthenticated(): Promise<boolean>;

  // Read Operations
  getAssignedTasks(options?: TaskQueryOptions): Promise<Task[]>;
  getOverdueTasks(options?: TaskQueryOptions): Promise<Task[]>;
  searchTasks(query: string, options?: TaskQueryOptions): Promise<Task[]>;
  getTask(externalId: string): Promise<Task | null>;

  // Write Operations
  createTask(input: CreateTaskInput): Promise<Task>;
  updateTask(externalId: string, updates: UpdateTaskInput): Promise<Task>;
  completeTask(externalId: string): Promise<Task>;
  addComment?(externalId: string, body: string): Promise<void>;

  // Optional: Workspace Support
  supportsWorkspaces?(): boolean;
  getWorkspaces?(): Workspace[];
  setWorkspace?(workspaceId: string): void;
}
```

### Unified Task Model

All tasks from different providers are normalized to a common format:

```typescript
interface Task {
  id: string;           // e.g., "ASANA-1234567890"
  externalId: string;   // Original provider ID
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  dueDate?: Date;
  assignee?: string;
  assigneeEmail?: string;
  project?: string;
  tags?: string[];
  source: 'asana' | 'notion';
  url: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  createdAt?: Date;
  updatedAt?: Date;
}
```

## Configuration

Credentials are stored encrypted in:
- **macOS**: `~/Library/Preferences/pm-cli/`
- **Linux**: `~/.config/pm-cli/`
- **Windows**: `%APPDATA%/pm-cli/`

Cache is stored in:
- **macOS/Linux**: `~/.cache/pm-cli/`
- **Windows**: `%LOCALAPPDATA%/pm-cli/`

### Environment Variables

You can also set credentials via environment variables:

```bash
export ASANA_TOKEN=your_token_here
# NOTION_TOKEN can provide the token, but Notion still requires a databaseId
# (set during `pm connect notion`)
```

## Adding a New Provider

1. Create a new package: `packages/plugin-<provider>/`
2. Implement the `PMPlugin` interface
3. Register in `packages/cli/src/init.ts`
4. Add to `ProviderType` in `packages/core/src/models/task.ts`

See `packages/plugin-asana/` for a complete example.

## Tech Stack

- **CLI Framework**: [Oclif](https://oclif.io/)
- **Language**: TypeScript
- **Package Manager**: pnpm (workspaces)
- **Auth Storage**: [conf](https://github.com/sindresorhus/conf) (encrypted)
- **Caching**: [lowdb](https://github.com/typicode/lowdb)
- **Output**: [cli-table3](https://github.com/cli-table/cli-table3) + [chalk](https://github.com/chalk/chalk)
- **Testing**: [Vitest](https://vitest.dev/)

## License

MIT
