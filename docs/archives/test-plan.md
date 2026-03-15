# Test Plan — pm-cli

Status review date: 2026-03-15

This file is a current test-gap backlog, not a speculative greenfield plan.
The previous version was stale and described a repo with only two test files.
The repo now has substantially broader coverage across core managers, CLI
commands, and provider-specific behavior.

## What Is Covered Now

Current coverage includes:
- task ID model helpers
- core managers: auth, cache, plugin manager
- core utilities: output, date, string, errors
- CLI commands: branch, done, delete, task create/update helpers, thread,
  attachments
- Asana: mapper, thread/download flow, create/update resolution paths
- Notion: mapper baseline coverage
- Linear, Trello, and ClickUp mapper coverage

## Highest-Value Remaining Gaps

### 1. Plugin Caching And Invalidation

Priority: `high`

Why it matters:
- provider plugins rely on cache behavior for correctness and performance
- create/update/delete flows should invalidate provider caches consistently

Recommended files:
- `packages/plugin-asana/test/plugin-cache.test.ts`
- `packages/plugin-notion/test/plugin-cache.test.ts`

Suggested cases:
- first task-list fetch reads from the provider and caches the result
- second fetch within TTL uses cache
- `refresh: true` bypasses cache
- create/update/delete invalidates provider cache

### 2. Notion Plugin Query Fallback Behavior

Priority: `high`

Why it matters:
- the Notion plugin has more risk in schema-driven behavior than the mapper
- overdue filtering fallback logic is easy to regress

Recommended file:
- `packages/plugin-notion/test/plugin.test.ts`

Suggested cases:
- date-property schema path uses API filtering
- missing date-property schema path falls back to client-side overdue filtering
- search and assigned flows handle empty result sets safely

### 3. Additional CLI Smoke Coverage

Priority: `medium`

Why it matters:
- command wiring is thin, but a few smoke tests protect user-visible behavior

Recommended files:
- `packages/cli/test/commands/tasks/assigned.test.ts`
- `packages/cli/test/commands/tasks/overdue.test.ts`
- `packages/cli/test/commands/today.test.ts`

Suggested cases:
- command forwards filters and limit options to `pluginManager`
- JSON mode exits correctly on partial provider errors
- warning output appears when aggregate task fetch returns provider errors

### 4. Broader Utility Edge Cases

Priority: `medium`

Why it matters:
- the main helper surfaces now have baseline coverage
- remaining value is in edge-case tightening, not broad new scaffolding

Suggested additions:
- extra date helper edge cases around DST boundaries if those become user-visible
- extra output rendering cases when new fields are added
- more task-model invalid-input cases only if command behavior changes

## Recently Addressed

These were added after the original version of this document and should not be
treated as open gaps anymore:
- `filterAndSortTasks` regression coverage
- core utility tests for date, string, and errors
- cache encryption verification
- auth manager registry-based provider detection
- bulk-operation error handling tests
- Notion mapper baseline tests

## Recommendation

Do not use this file as a line-by-line checklist for exhaustive coverage.
Use it as a short backlog of the next highest-ROI tests:

1. provider cache/invalidation tests
2. Notion plugin fallback tests
3. a small set of aggregate-task CLI smoke tests
