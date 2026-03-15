# PRD: M8 Interactive TUI

## Summary

Add `pm ui`, an Ink-based terminal UI for browsing tasks, switching providers, filtering/searching, and running common task actions without leaving the terminal.

## Problem

The current CLI is efficient for direct commands, but it is not ideal for exploratory workflows:

- users cannot quickly scan tasks and details side by side
- users must remember and retype commands for common actions
- switching provider context and inspecting tasks is command-heavy

## Goal

Provide a fast, keyboard-first terminal experience for reviewing and acting on tasks.

## Users

- individual contributors working from the terminal
- users managing tasks across multiple providers
- users who want a dashboard-like interface without a browser

## User Stories

- As a user, I can open `pm ui` and immediately see tasks I can work on.
- As a user, I can switch providers without leaving the TUI.
- As a user, I can move focus between a task list and task detail view.
- As a user, I can search/filter tasks interactively.
- As a user, I can trigger common actions like open, complete, refresh, and show details.

## Scope

In scope:

- `pm ui` command entry point
- Ink-based app shell
- provider tabs
- task list pane
- task detail pane
- search/filter input
- keyboard navigation with vim-style movement
- inline actions for existing supported operations

Out of scope for v1:

- editing every field inline
- full mouse-driven interaction
- custom theming system
- attachment previews inside the TUI

## UX Requirements

- Launch with a useful default view, ideally assigned tasks.
- Show provider context clearly.
- Keep navigation keyboard-first.
- Work on standard terminal widths without breaking layout.
- Make refresh/loading/error states explicit.

## Functional Requirements

### Command

- Add `pm ui`.
- It should initialize providers using the existing CLI bootstrap path.

### Data

- Reuse existing `pluginManager` APIs instead of building new fetch paths.
- Start from assigned tasks, then allow switching to overdue/search views if practical.

### Navigation

- Support vim-style keys:
  - `j` / `k` to move in task list
  - `h` / `l` to switch focus or provider tab
- Support standard arrow-key fallback where possible.

### Actions

- Open task in browser
- Mark task done
- Refresh data
- View full task detail

### State

- Keep provider, selected task, list mode, search query, and loading/error state in app state.

## Technical Constraints

- Use Ink in `packages/cli`.
- Avoid duplicating business logic already implemented in command handlers and `pluginManager`.
- Keep the initial component tree small and composable.

## Files Expected

- `packages/cli/src/commands/ui.ts`
- `packages/cli/src/tui/app.ts`
- `packages/cli/src/tui/components/task-list.ts`
- `packages/cli/src/tui/components/task-detail.ts`
- `packages/cli/src/tui/components/provider-tabs.ts`
- `packages/cli/src/tui/components/search-bar.ts`
- `packages/cli/src/tui/keybindings.ts`
- `packages/cli/package.json`

## Risks

- Ink introduces a new runtime/UI dependency and test surface.
- Cross-terminal key handling can be inconsistent.
- Layout can become noisy if too much detail is shown in v1.

## Acceptance Criteria

- `pm ui` launches successfully from the CLI.
- Users can browse a task list and inspect a selected task.
- Users can switch provider context in the interface.
- Users can run at least one inline task action successfully.
- The TUI remains usable on common terminal sizes.

## Implementation Plan

### Phase 1: App shell

1. Add Ink dependencies to `packages/cli/package.json`.
2. Add `packages/cli/src/commands/ui.ts`.
3. Create `packages/cli/src/tui/app.ts` with root state and data-loading flow.

### Phase 2: Core components

1. Build provider tabs.
2. Build task list component.
3. Build task detail component.
4. Build search bar component.

### Phase 3: Interaction

1. Add keybinding map in `packages/cli/src/tui/keybindings.ts`.
2. Support focus changes, selection movement, refresh, and quit.
3. Wire task actions to existing command-layer behavior or shared helpers.

### Phase 4: Validation

1. Add smoke tests for state transitions where practical.
2. Run `pnpm lint`.
3. Run targeted tests for any new shared helpers.

## Open Questions

- Should v1 include multiple list modes beyond assigned tasks?
- Should inline actions update state optimistically or refetch after mutation?
- Should search be local-only at first, or provider-backed from day one?
