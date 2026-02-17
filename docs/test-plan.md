# Test Plan — pm-cli

A comprehensive test plan to make the codebase maintainable, catch regressions early, and give confidence when adding new providers or refactoring internals.

---

## What we already have

| File | Covers |
|------|--------|
| `packages/core/test/models/task.test.ts` | `createTaskId`, `parseTaskId` |
| `packages/plugin-asana/test/mapper.test.ts` | `mapAsanaTask` basics |

Two test files. ~36 source files. The sections below lay out every test we should add, grouped by package and priority.

---

## 1. Core — Utilities (Priority: HIGH)

Pure functions, zero dependencies, easiest to test. Start here.

### 1.1 Date utilities (`packages/core/src/utils/date.ts`)

```
File: packages/core/test/utils/date.test.ts
```

| Function | Test case | Expected |
|----------|-----------|----------|
| `getToday()` | Returns a Date with time set to midnight | `hours/min/sec/ms === 0` |
| `getTodayISO()` | Returns `YYYY-MM-DD` string | Matches regex, equals `getToday()` formatted |
| `isOverdue(yesterday)` | Date before today | `true` |
| `isOverdue(today)` | Exactly today | `false` |
| `isOverdue(tomorrow)` | Date after today | `false` |
| `isOverdue(undefined)` | No date | `false` |
| `isToday(today)` | Same calendar day | `true` |
| `isToday(yesterday)` | Different day | `false` |
| `isToday(undefined)` | No date | `false` |
| `getRelativeDateString(undefined)` | No date | `''` |
| `getRelativeDateString(2 days ago)` | Overdue | `'2 days overdue'` |
| `getRelativeDateString(yesterday)` | 1 day overdue | `'yesterday'` |
| `getRelativeDateString(today)` | Due today | `'today'` |
| `getRelativeDateString(tomorrow)` | Due tomorrow | `'tomorrow'` |
| `getRelativeDateString(in 5 days)` | Near future | `'in 5 days'` |
| `getRelativeDateString(in 30 days)` | Far future | Locale date string |

**Tip:** Use `vi.useFakeTimers()` to pin `Date.now()` so tests don't flake across midnight.

### 1.2 String utilities (`packages/core/src/utils/string.ts`)

```
File: packages/core/test/utils/string.test.ts
```

| Function | Input | Expected |
|----------|-------|----------|
| `slugify` | `'Fix login bug'` | `'fix-login-bug'` |
| `slugify` | `'API (REST) endpoint'` | `'api-rest-endpoint'` |
| `slugify` | `'Multiple   spaces'` | `'multiple-spaces'` |
| `slugify` | `'---leading-trailing---'` | `'leading-trailing'` |
| `slugify` | `'x'.repeat(60)` | Length <= 50 |
| `slugify` | `''` | `''` |
| `slugify` | `'!@#$%'` | `''` |
| `slugify` | `'Hello World 123'` | `'hello-world-123'` |

### 1.3 Error classes (`packages/core/src/utils/errors.ts`)

```
File: packages/core/test/utils/errors.test.ts
```

| Class | Test case | Expected |
|-------|-----------|----------|
| `ProviderError` | `new ProviderError('asana', 'rate limit')` | `message === '[asana] rate limit'` |
| `ProviderError` | With `originalError` | `.originalError` is preserved |
| `AuthenticationError` | Default message | `'[asana] Authentication failed'` |
| `AuthenticationError` | Custom message | `'[asana] Token expired'` |
| `NotConnectedError` | Constructor | `'Not connected to asana. Run: pm connect asana'` |
| `formatError` | `new Error('boom')` | `'boom'` |
| `formatError` | `'string error'` | `'string error'` |
| `formatError` | `42` | `'42'` |
| `formatError` | `null` | `'null'` |

---

## 2. Core — Task model (Priority: HIGH)

### 2.1 Expand existing tests (`packages/core/test/models/task.test.ts`)

Add these cases to the existing file:

| Function | Test case | Expected |
|----------|-----------|----------|
| `createTaskId` | Empty external ID `''` | `'ASANA-'` (or decide to throw) |
| `createTaskId` | ID with hyphens `'abc-def-123'` | `'NOTION-abc-def-123'` |
| `parseTaskId` | `'ASANA-'` (no external part) | `null` |
| `parseTaskId` | `'ASANA-NOTION-xyz'` | `{ source: 'asana', externalId: 'NOTION-xyz' }` |
| `parseTaskId` | `''` (empty string) | `null` |
| `parseTaskId` | `'-12345'` (no provider) | `null` |

---

## 3. Core — `filterAndSortTasks` (Priority: HIGH)

This is the most important untested business logic. Every CLI command that shows tasks depends on it.

```
File: packages/core/test/managers/filter-sort.test.ts
```

**Setup:** Create a factory function to build mock `Task` objects:

```ts
function mockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'ASANA-1',
    externalId: '1',
    title: 'Test task',
    status: 'todo',
    source: 'asana',
    url: 'https://example.com',
    ...overrides,
  };
}
```

### 3.1 Filtering

| Filter | Input tasks | Expected |
|--------|-------------|----------|
| `status: 'todo'` | `[todo, in_progress, done]` | Only `todo` tasks |
| `status: 'in_progress'` | `[todo, in_progress, done]` | Only `in_progress` tasks |
| `priority: ['high', 'urgent']` | `[low, medium, high, urgent, undefined]` | Only `high` and `urgent` |
| `status + priority` combined | Mix | Both filters apply (AND) |
| No filters | `[todo, done]` | All tasks returned |
| Filters match nothing | `[todo]` with `status: 'done'` | `[]` |

### 3.2 Sorting

| Sort by | Input | Expected order |
|---------|-------|----------------|
| `'due'` | `[due:Jan 15, due:Jan 10, due:undefined]` | `Jan 10, Jan 15, undefined` |
| `'priority'` | `[low, urgent, high, undefined]` | `urgent, high, low, undefined` |
| `'status'` | `[done, todo, in_progress]` | `in_progress, todo, done` |
| `'title'` | `['Zebra', 'apple', 'Mango']` | Case-insensitive alphabetical |
| `'source'` | `[notion, asana, asana]` | Alphabetical by source |

### 3.3 Edge cases

| Scenario | Expected |
|----------|----------|
| Empty array | `[]` |
| Single task | Same task returned |
| Original array not mutated | Deep equality check before/after |

---

## 4. Core — CacheManager (Priority: HIGH)

```
File: packages/core/test/managers/cache-manager.test.ts
```

**Setup:** Use a temp directory for the cache file. Reset between tests.

| Method | Test case | Expected |
|--------|-----------|----------|
| `setTasks` + `getTasks` | Store and retrieve assigned/asana | Returns stored tasks |
| `getTasks` | Key doesn't exist | `null` |
| `getTasks` | Entry expired (TTL elapsed) | `null` |
| `getTasks` | Different operation = different key | `assigned/asana !== overdue/asana` |
| `getTasks` | Same operation, different `extra` | Different keys |
| `setTaskDetail` + `getTaskDetail` | Store and retrieve by ID | Returns task |
| `getTaskDetail` | Expired | `null` |
| `invalidateProvider('asana')` | Asana entries removed | Asana=`null`, Notion entries remain |
| `clearAll` | Everything removed | All `getTasks` return `null` |
| `getStats` | After storing 3 lists, 2 details | `{ taskLists: 3, taskDetails: 2 }` |
| Custom TTL | `setTasks(..., ttl=100)` then wait 150ms | `null` |

**Tip:** Use `vi.useFakeTimers()` and `vi.advanceTimersByTime()` for TTL expiration tests instead of real delays.

---

## 5. Core — AuthManager (Priority: HIGH)

```
File: packages/core/test/managers/auth-manager.test.ts
```

**Setup:** Mock `conf` to use an in-memory store. Mock `process.env` for env var tests.

| Method | Test case | Expected |
|--------|-----------|----------|
| `getCredentials('asana')` | `ASANA_TOKEN` env var set | `{ token: env_value }` |
| `getCredentials('notion')` | `NOTION_TOKEN` env var set | `{ token: env_value }` |
| `getCredentials` | No env var, stored credentials | Returns stored |
| `getCredentials` | No env var, stored but expired | `null` |
| `getCredentials` | Nothing anywhere | `null` |
| `setCredentials` + `getCredentials` | Round-trip | Values match |
| `setCredentials` | With `expiresIn` | Stored with expiration timestamp |
| `removeCredentials` | After setting | `getCredentials` returns `null` |
| `hasCredentials` | Credentials exist | `true` |
| `hasCredentials` | No credentials | `false` |
| `getConnectedProviders` | Asana connected, Notion not | `['asana']` |
| `clearAll` | After connecting both | Both return `null` |

---

## 6. Core — PluginManager (Priority: HIGH)

```
File: packages/core/test/managers/plugin-manager.test.ts
```

**Setup:** Create mock plugins implementing `PMPlugin`. Use `vi.fn()` for all methods.

```ts
function createMockPlugin(name: ProviderType, connected = true): PMPlugin {
  return {
    name,
    initialize: vi.fn(),
    isAuthenticated: vi.fn().mockReturnValue(connected),
    getAssignedTasks: vi.fn().mockResolvedValue([]),
    getOverdueTasks: vi.fn().mockResolvedValue([]),
    searchTasks: vi.fn().mockResolvedValue([]),
    // ... etc
  };
}
```

### 6.1 Registration and retrieval

| Method | Test case | Expected |
|--------|-----------|----------|
| `registerPlugin` | Register asana | `getPlugin('asana')` returns it |
| `getAllPlugins` | After registering 2 | Array of length 2 |
| `getConnectedPlugins` | 1 connected, 1 not | Array of length 1 |
| `getPlugin` | Unknown provider | `undefined` |

### 6.2 `aggregateTasks`

| Scenario | Expected |
|----------|----------|
| Single source, connected | Calls that plugin's method, returns tasks |
| Single source, not connected | Throws `NotConnectedError` |
| Single source, unknown | Throws error |
| No source, 2 connected | Calls both, merges results |
| No source, none connected | Throws error |
| `limit: 5` with 10 total results | Returns 5 |
| One plugin throws, other succeeds | Returns partial results (no crash) |
| Results sorted by due date ascending | Verify order |

### 6.3 Write operations

| Method | Scenario | Expected |
|--------|----------|----------|
| `createTask` | Valid provider | Delegates to plugin |
| `createTask` | Disconnected provider | Throws |
| `updateTask('ASANA-123', ...)` | Parses ID, routes to asana plugin | Delegates |
| `updateTask('INVALID', ...)` | Bad ID format | Throws |
| `completeTasks(['ASANA-1', 'NOTION-2'])` | Both succeed | `[{id, task}, {id, task}]` |
| `completeTasks(['ASANA-1', 'BAD-2'])` | Mixed | One success, one error in result |
| `addComment` | Provider supports it | Delegates |
| `addComment` | Provider doesn't support it | Throws |

---

## 7. Asana Mapper — expand coverage (Priority: HIGH)

```
File: packages/plugin-asana/test/mapper.test.ts (extend existing)
```

### 7.1 Status mapping via sections

The mapper has logic to infer status from Asana section names. This is completely untested.

| Section name | Expected status |
|--------------|-----------------|
| `'In Progress'` | `'in_progress'` |
| `'Doing'` | `'in_progress'` |
| `'Today'` | `'in_progress'` |
| `'Done'` | `'done'` |
| `'Completed'` | `'done'` |
| `'Backlog'` | `'todo'` |
| No section | Falls back to `completed` field |

**Mock data for section tests:**
```ts
const taskWithSection = {
  ...mockAsanaTask,
  completed: false,
  memberships: [{ section: { gid: 's1', name: 'In Progress' } }],
};
```

### 7.2 Edge cases to add

| Scenario | Expected |
|----------|----------|
| `due_on: 'not-a-date'` | `dueDate === undefined` |
| `due_on: null` | `dueDate === undefined` |
| `projects: []` | `project === undefined` |
| `tags: []` | `tags === undefined` |
| Multiple projects | Takes first project name |
| `notes` is empty string | `description === undefined` |

---

## 8. Notion Mapper (Priority: HIGH)

Currently **zero tests**. This is the biggest gap.

```
File: packages/plugin-notion/test/mapper.test.ts
```

### 8.1 Property detection

The Notion mapper flexibly detects property names by aliases. Test that all aliases resolve correctly.

| Alias | Detected as |
|-------|-------------|
| `'Status'`, `'status'`, `'State'` | Status property |
| `'Due Date'`, `'Due'`, `'Deadline'`, `'Date'` | Due date property |
| `'Assignee'`, `'Assigned To'`, `'Owner'` | Assignee property |
| `'Priority'` | Priority property |
| `'Tags'`, `'Labels'`, `'Categories'` | Tags property |

### 8.2 Status mapping

| Notion status value | Expected `TaskStatus` |
|--------------------|-----------------------|
| `'Done'` | `'done'` |
| `'Complete'` | `'done'` |
| `'Completed'` | `'done'` |
| `'Closed'` | `'done'` |
| `'Resolved'` | `'done'` |
| `'In Progress'` | `'in_progress'` |
| `'In-Progress'` | `'in_progress'` |
| `'Doing'` | `'in_progress'` |
| `'Active'` | `'in_progress'` |
| `'Started'` | `'in_progress'` |
| `'Working'` | `'in_progress'` |
| `'Not Started'` | `'todo'` |
| `'Backlog'` | `'todo'` |
| Any unknown value | `'todo'` |

### 8.3 Priority mapping

| Notion select value | Expected priority |
|--------------------|-------------------|
| `'Urgent'` | `'urgent'` |
| `'Critical'` | `'urgent'` |
| `'High'` | `'high'` |
| `'Medium'` | `'medium'` |
| `'Normal'` | `'medium'` |
| `'Low'` | `'low'` |
| Unknown value | `undefined` |

### 8.4 Title extraction

| Property type | Value | Expected |
|---------------|-------|----------|
| `title` type with rich_text | `[{plain_text: 'My Task'}]` | `'My Task'` |
| `title` type, empty array | `[]` | `'Untitled'` |
| No title property | — | `'Untitled'` |

### 8.5 Full page mapping — `mapNotionPage`

| Scenario | Checks |
|----------|--------|
| Full page (all properties) | `id`, `title`, `status`, `dueDate`, `assignee`, `priority`, `tags`, `source='notion'`, `url` |
| Minimal page (title only) | Optional fields are `undefined`, no crash |
| Page with checkbox status | `true` → `'done'`, `false` → `'todo'` |
| Page with `select` status | Maps via `mapStatusName` |
| Page with `status` type | Maps via `mapStatusName` |
| Description from `Description` property | Extracted correctly |
| Description fallback to `Notes` | When `Description` missing |
| No description properties | `description === undefined` |
| Assignee is a bot user | Handles gracefully |
| Multiple tags via `multi_select` | All names extracted |
| Empty `multi_select` | `tags === undefined` |

### 8.6 `mapNotionPages`

| Input | Expected |
|-------|----------|
| Empty array | `[]` |
| 3 pages | 3 mapped tasks |

---

## 9. Plugin integration tests (Priority: MEDIUM)

These test the plugin classes (`AsanaPlugin`, `NotionPlugin`) with mocked clients.

```
File: packages/plugin-asana/test/plugin.test.ts
File: packages/plugin-notion/test/plugin.test.ts
```

### 9.1 Caching behavior

| Scenario | Expected |
|----------|----------|
| First call to `getAssignedTasks` | Calls client, stores in cache |
| Second call (within TTL) | Returns from cache, no client call |
| Call with `refresh: true` | Bypasses cache, calls client |
| `createTask` | Invalidates provider cache |
| `updateTask` | Invalidates provider cache |

### 9.2 Notion overdue fallback

The Notion plugin has a fallback path when it can't find the due date property in the schema.

| Scenario | Expected |
|----------|----------|
| Schema has `Due Date` property | Queries with API date filter |
| Schema has no date property | Falls back to client-side `isOverdue()` filter |

---

## 10. Output rendering (Priority: MEDIUM)

These are harder to test meaningfully (they write to stdout), but we can snapshot or capture output.

```
File: packages/core/test/utils/output.test.ts
```

### 10.1 What to test

| Function | Approach |
|----------|----------|
| `renderTasks` (JSON mode) | Capture stdout, parse JSON, verify structure |
| `renderTasks` (table mode) | Snapshot test — verify no crash, correct row count |
| `renderTask` (JSON mode) | Verify all fields present |
| `renderDashboard` | Verify grouping: overdue / due today / in progress |
| `renderTasksPlain` | Verify tab-separated format |
| `renderTaskIds` | Verify one ID per line |
| Empty state messages | `renderTasks([])` → `'No tasks found.'` |

### 10.2 How to capture output

```ts
let output = '';
vi.spyOn(console, 'log').mockImplementation((...args) => {
  output += args.join(' ') + '\n';
});
```

---

## 11. CLI commands (Priority: LOW)

CLI commands are thin wrappers around `pluginManager`. If the managers and plugins are well-tested, command tests are less critical. But a few smoke tests help.

```
File: packages/cli/test/commands/*.test.ts
```

### 11.1 Worth testing

| Command | What to verify |
|---------|---------------|
| `tasks assigned --json` | Calls `aggregateTasks('assigned')`, outputs JSON |
| `tasks create "title" --source asana` | Calls `createTask` with correct args |
| `done ASANA-123` | Calls `completeTasks` with parsed ID |
| `branch ASANA-123 --prefix feat` | Generates `feat/ASANA-123-slugified-title` |

### 11.2 Not worth testing

- Flag parsing (oclif handles this)
- Interactive prompts (hard to mock, low ROI)
- `open` command (calls system browser)

---

## 12. Test helpers to build

Before writing tests, create shared test utilities.

```
File: packages/core/test/helpers/mock-task.ts
```

```ts
import type { Task } from '../../src/models/task.js';

let counter = 0;

export function mockTask(overrides: Partial<Task> = {}): Task {
  counter++;
  return {
    id: `ASANA-${counter}`,
    externalId: String(counter),
    title: `Task ${counter}`,
    status: 'todo',
    source: 'asana',
    url: `https://app.asana.com/0/0/${counter}`,
    ...overrides,
  };
}

export function mockTasks(count: number, overrides: Partial<Task> = {}): Task[] {
  return Array.from({ length: count }, () => mockTask(overrides));
}
```

```
File: packages/plugin-asana/test/helpers/mock-asana-task.ts
```

```ts
import type { AsanaTask } from '../../src/client.js';

export function mockAsanaTask(overrides: Partial<AsanaTask> = {}): AsanaTask {
  return {
    gid: '12345',
    name: 'Test Task',
    completed: false,
    permalink_url: 'https://app.asana.com/0/0/12345',
    created_at: '2024-01-01T00:00:00Z',
    modified_at: '2024-01-15T00:00:00Z',
    ...overrides,
  };
}
```

```
File: packages/plugin-notion/test/helpers/mock-notion-page.ts
```

Build a similar factory for Notion pages with configurable properties.

---

## 13. Implementation order

Work through these in order. Each step builds on the last.

| Step | What | New test files | Est. tests |
|------|------|----------------|------------|
| 1 | Date + String + Error utilities | 3 files | ~30 |
| 2 | Task model edge cases | extend 1 file | ~6 |
| 3 | `filterAndSortTasks` | 1 file | ~15 |
| 4 | Notion mapper (from scratch) | 1 file | ~25 |
| 5 | Asana mapper (extend sections + edges) | extend 1 file | ~10 |
| 6 | CacheManager | 1 file | ~12 |
| 7 | AuthManager | 1 file | ~12 |
| 8 | PluginManager | 1 file | ~20 |
| 9 | Plugin integration (Asana + Notion) | 2 files | ~16 |
| 10 | Output rendering | 1 file | ~12 |
| 11 | CLI smoke tests | 2-3 files | ~8 |
| | **Total** | **~14 files** | **~166 tests** |

---

## 14. Running tests

```bash
# All tests
pnpm test

# Single package
pnpm --filter @jogi47/pm-cli-core test

# Single file
pnpm test packages/core/test/utils/date.test.ts

# Watch mode
pnpm test -- --watch

# Coverage report
pnpm test -- --coverage
```

---

## 15. What NOT to test

Keeping scope tight is just as important as coverage.

- **Asana/Notion SDK internals** — trust the SDKs; mock their responses
- **oclif framework behavior** — flag parsing, help generation, etc.
- **System calls** — `open` (browser), `process.exit`
- **Styling/colors** — chalk output varies by terminal
- **Network requests** — always mock; never hit real APIs in tests
- **Config file encryption** — `conf` library's responsibility
