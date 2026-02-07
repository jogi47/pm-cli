# PM-CLI

A unified command-line interface for managing tasks across multiple project management tools.

Currently supports:
- **Asana** (fully implemented)
- **Notion** (planned)

## Features

- Aggregate tasks from multiple PM tools in one place
- Search, filter, and view tasks from the command line
- Switch between workspaces
- Cached responses for fast repeat queries
- JSON output for scripting

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd pm-cli

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run the CLI
pnpm pm --help
```

## Quick Start

```bash
# 1. Connect to Asana
pnpm pm connect asana
# Enter your Personal Access Token from https://app.asana.com/0/my-apps

# 2. View your tasks
pnpm pm tasks assigned

# 3. Search for tasks
pnpm pm tasks search "bug"
```

## Commands

### Connection Management

```bash
# Connect to a provider
pnpm pm connect asana
pnpm pm connect notion

# Disconnect from a provider
pnpm pm disconnect asana

# List all providers and their status
pnpm pm providers
pnpm pm providers --json
```

### Workspace Management

```bash
# List available workspaces
pnpm pm workspace

# Switch to a different workspace
pnpm pm workspace switch

# Specify provider (default: asana)
pnpm pm workspace -s asana
```

### Task Commands

```bash
# List tasks assigned to you
pnpm pm tasks assigned
pnpm pm tasks assigned --source=asana    # Filter by provider
pnpm pm tasks assigned --limit=10        # Limit results
pnpm pm tasks assigned --refresh         # Bypass cache
pnpm pm tasks assigned --json            # JSON output

# List overdue tasks
pnpm pm tasks overdue
pnpm pm tasks overdue --source=asana

# Search for tasks
pnpm pm tasks search "login bug"
pnpm pm tasks search "api" --limit=5

# Show task details
pnpm pm tasks show ASANA-1234567890
pnpm pm tasks show ASANA-123 --json      # JSON output
pnpm pm tasks show ASANA-123 --open      # Open in browser
```

## Project Structure

```
pm-cli/
├── packages/
│   ├── core/                 # @pm-cli/core
│   │   └── src/
│   │       ├── models/       # Task, Plugin interfaces
│   │       ├── managers/     # Auth, Cache, Plugin managers
│   │       └── utils/        # Date, Error, Output utilities
│   │
│   ├── cli/                  # pm-cli (main CLI)
│   │   └── src/
│   │       └── commands/     # Oclif commands
│   │
│   ├── plugin-asana/         # @pm-cli/plugin-asana
│   │   └── src/
│   │       ├── client.ts     # Asana API client
│   │       ├── mapper.ts     # Asana → Task mapping
│   │       └── index.ts      # Plugin implementation
│   │
│   └── plugin-notion/        # @pm-cli/plugin-notion (planned)
│
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── vitest.config.ts
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Build specific package
pnpm --filter @pm-cli/core build

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

  // Task Operations
  getAssignedTasks(options?: TaskQueryOptions): Promise<Task[]>;
  getOverdueTasks(options?: TaskQueryOptions): Promise<Task[]>;
  searchTasks(query: string, options?: TaskQueryOptions): Promise<Task[]>;
  getTask(externalId: string): Promise<Task | null>;

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
  project?: string;
  tags?: string[];
  source: 'asana' | 'notion';
  url: string;
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
export NOTION_TOKEN=your_token_here
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
