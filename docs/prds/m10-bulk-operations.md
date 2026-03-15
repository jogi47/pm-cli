# PRD: M10 Bulk Operations

## Summary

Add a bulk command family for applying the same operation across many tasks:

- `pm bulk update`
- `pm bulk move`
- `pm bulk create --file`

## Problem

The CLI currently supports single-task create/update flows and some multi-ID actions like `done` and `delete`, but it lacks structured batch operations for larger workstreams.

## Goal

Enable reliable, scriptable bulk task changes with clear per-item reporting and no hidden partial failures.

## Users

- users triaging many tasks at once
- users importing tasks from planning sheets or exports
- users performing repeated project/section updates in Asana-like systems

## User Stories

- As a user, I can update the same field across many task IDs in one command.
- As a user, I can move multiple tasks to a new project/section where the provider supports it.
- As a user, I can create many tasks from a CSV or JSON file.
- As a user, I can see which rows/tasks succeeded and which failed.

## Scope

In scope:

- `pm bulk update`
- `pm bulk move`
- `pm bulk create --file`
- per-item result reporting
- JSON output for automation
- CSV and JSON file input for bulk create

Out of scope for v1:

- transactional rollback across providers
- background job system
- spreadsheet export back to source files
- arbitrary cross-provider field mapping beyond supported normalized inputs

## Functional Requirements

### `pm bulk update`

- Accept multiple task IDs.
- Reuse the single-task update validation model where possible.
- Support common shared fields such as:
  - status
  - due date
  - description/title if desired by final command design
  - assignee/project-scoped field updates where already supported
- Return per-task success/failure results.

### `pm bulk move`

- Accept multiple task IDs.
- Support provider-aware placement changes.
- Reuse existing project/section resolution logic where available.
- Fail only the affected task IDs instead of aborting the whole batch.

### `pm bulk create --file`

- Accept CSV or JSON input files.
- Parse rows into normalized create inputs.
- Allow command flags to provide defaults that file rows can override.
- Reuse the existing create-task path for validation and provider behavior.

## Output Requirements

- Default human-readable summary plus per-item results.
- `--json` should return structured batch results.
- Partial failures must remain visible in both human and JSON output.

## Technical Constraints

- Reuse existing create/update helpers instead of duplicating command logic.
- Keep batch execution simple and deterministic.
- Prefer a lightweight CSV utility in core unless a dependency clearly reduces complexity.

## Files Expected

- `packages/cli/src/commands/bulk/update.ts`
- `packages/cli/src/commands/bulk/move.ts`
- `packages/cli/src/commands/bulk/create.ts`
- `packages/core/src/utils/csv.ts` or a parser dependency
- shared CLI helpers under `packages/cli/src/lib/` as needed

## Risks

- Provider capabilities differ, especially for move semantics.
- File import shape can drift without a strict documented schema.
- Large batches may need concurrency limits to avoid provider rate issues.

## Acceptance Criteria

- Multiple tasks can be updated in one invocation.
- Multiple tasks can be moved where the provider supports placement updates.
- Bulk create supports CSV and JSON file input.
- Per-item failures do not hide successful operations.
- JSON output is suitable for automation.

## Implementation Plan

### Phase 1: Shared batch patterns

1. Define a consistent batch result shape.
2. Add shared helpers for per-item execution and reporting.
3. Reuse existing task ID parsing and command error handling.

### Phase 2: `pm bulk update`

1. Add `packages/cli/src/commands/bulk/update.ts`.
2. Reuse single-task update input parsing.
3. Execute updates per task and report mixed results.

### Phase 3: `pm bulk move`

1. Add `packages/cli/src/commands/bulk/move.ts`.
2. Decide supported move fields by provider.
3. Reuse existing project/section resolution logic in plugins where possible.

### Phase 4: `pm bulk create --file`

1. Add file loading and format detection.
2. Implement CSV/JSON parsing.
3. Normalize file rows into existing create-task inputs.
4. Execute creates and report row-level outcomes.

### Phase 5: Validation

1. Add command tests for success, mixed-result, and invalid-input cases.
2. Run `pnpm lint`.
3. Run targeted `vitest` coverage for batch helpers and parsers.

## Suggested Input Shape For `pm bulk create --file`

CSV/JSON rows should align to normalized create inputs such as:

- `title`
- `description`
- `dueDate`
- `source`
- `project`
- `section`
- `assignee`

## Open Questions

- Should batch execution be sequential in v1 for clearer error handling?
- Should `pm bulk move` be a specialized wrapper over `bulk update` or a separate path?
- What exact CSV column names should be considered canonical?
