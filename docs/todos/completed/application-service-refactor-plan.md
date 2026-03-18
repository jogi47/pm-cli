# application-service refactor plan

date: 2026-03-15
status: completed
last_updated: 2026-03-18
audience: maintainers

## purpose

This document is a practical refactor plan for moving `pm-cli` toward an
application-service layer without rewriting the whole codebase.

The goal is not "pure clean architecture" for its own sake. The goal is to:

- make command behavior easier to reason about
- reduce duplicated orchestration logic in CLI commands
- centralize validation, provider routing, warnings, and error handling
- create a safer foundation for future features
- keep the migration incremental and verifiable

This plan is divided into milestones so the work can be done one step at a
time, with each milestone leaving the repository in a releasable state.

## current problem

Today, many CLI commands do too much:

- parse flags and args
- initialize plugins
- resolve providers
- call `pluginManager`
- apply filtering and sorting
- interpret partial errors
- render warnings
- perform user-visible success/error decisions

This makes commands act as both transport adapters and application workflows.
That creates a few problems:

- orchestration logic is duplicated across commands
- behavior consistency is harder to maintain
- command tests are doing work that should be covered at the service layer
- future changes require touching many command files
- plugin and manager boundaries are less explicit than they could be

There is also a related structural issue:

- provider code imports shared singleton infrastructure directly
  - `authManager`
  - `cacheManager`
  - `pluginManager` is used directly by commands

This is workable, but it is not a clean application boundary.

## target outcome

The target architecture is:

```text
oclif command
  -> application service / use case
    -> plugin manager / auth / cache / config
      -> provider plugin
        -> provider client
          -> remote api

application service
  -> shared result object
    -> cli renderer
```

Important constraint:

- do not rewrite providers first
- do not introduce a DI container
- do not pause feature work for a large architectural branch

This should be done as a thin-service extraction first, then deeper cleanup
later if still justified.

## design principles

Follow these principles during the refactor:

1. commands become thin adapters
   - commands should parse input, call a service, and render output
   - commands should not own business workflow logic

2. services own orchestration
   - provider selection
   - fetch/mutation flow
   - capability checks
   - warning/error aggregation
   - normalization of output contracts

3. providers remain adapters
   - no provider rewrite during early milestones
   - provider interface changes should be minimized at first

4. preserve behavior unless explicitly fixing a bug
   - architecture refactors should avoid changing user-facing behavior
   - behavior fixes should be isolated and documented

5. make every milestone shippable
   - build passes
   - tests pass
   - docs and help text are updated if behavior changes

## recommended folder layout

Add a new application layer under `packages/core/src/services/`.

Recommended initial structure:

```text
packages/core/src/services/
  index.ts
  shared/
    result.ts
    warnings.ts
  task-query-service.ts
  task-read-service.ts
  task-mutation-service.ts
  provider-session-service.ts
```

Possible later structure if the repo grows:

```text
packages/core/src/services/tasks/
  query-service.ts
  read-service.ts
  mutation-service.ts

packages/core/src/services/providers/
  session-service.ts
  workspace-service.ts
```

Do not start with too much nesting. Begin simple.

## service result contracts

Before extracting command logic, define simple result shapes.

Recommended patterns:

### query result

```ts
interface QueryTasksResult {
  tasks: Task[];
  warnings: string[];
}
```

### read result

```ts
interface GetTaskResult {
  task: Task | null;
  warnings: string[];
}
```

### mutation result

```ts
interface MutationResult<T> {
  data: T;
  warnings: string[];
}
```

### bulk mutation result

```ts
interface BulkMutationItem<T> {
  id: string;
  data?: T;
  error?: string;
}

interface BulkMutationResult<T> {
  items: BulkMutationItem<T>[];
  warnings: string[];
}
```

Guideline:

- return warnings as strings already ready for CLI display
- keep service result contracts provider-neutral
- do not return renderer-specific formatting from services

## milestone overview

This plan is divided into seven milestones:

1. milestone 0: prepare the boundary
2. milestone 1: extract task query service
3. milestone 2: extract task read service
4. milestone 3: extract task mutation service
5. milestone 4: extract provider session service
6. milestone 5: reduce singleton leakage
7. milestone 6: cleanup and hardening

Each milestone can be delivered independently.

---

## milestone 0: prepare the boundary

status: completed on 2026-03-18

### goal

Create the minimum scaffolding needed to support service extraction without
changing command behavior.

### scope

- add `packages/core/src/services/`
- add shared service result types
- export services from `packages/core/src/index.ts`
- keep all commands unchanged

### tasks

1. create service folder and base exports
   - add `packages/core/src/services/index.ts`
   - add `packages/core/src/services/shared/result.ts`

2. define standard service result shapes
   - query result
   - mutation result
   - bulk mutation result

3. add helper utilities if needed
   - convert `ProviderError[]` into warning strings
   - normalize warning ordering

4. add tests for shared result helpers

### likely files

- `packages/core/src/index.ts`
- `packages/core/src/services/index.ts`
- `packages/core/src/services/shared/result.ts`
- `packages/core/test/services/...`

### acceptance criteria

- no user-visible behavior changes
- no command files changed yet
- build and tests still pass

### risks

- low

### estimated effort

- small

---

## milestone 1: extract task query service

status: completed on 2026-03-18

### goal

Move list/search orchestration out of commands and into a dedicated query
service.

### commands in scope

- `tasks assigned`
- `tasks overdue`
- `tasks search`
- `today`
- `summary`

### why start here

These commands already share a lot of logic:

- plugin initialization
- provider selection
- partial failure warning handling
- filter/sort application
- result slicing
- output mode branching

This is the highest-value first extraction.

### service to add

- `packages/core/src/services/task-query-service.ts`

### recommended API

```ts
interface TaskQueryInput {
  source?: ProviderType;
  displayLimit?: number;
  refresh?: boolean;
  status?: TaskStatus;
  priority?: string[];
  sort?: 'due' | 'priority' | 'status' | 'source' | 'title';
}

interface SearchTasksInput extends TaskQueryInput {
  query: string;
}

class TaskQueryService {
  getAssignedTasks(input: TaskQueryInput): Promise<QueryTasksResult>;
  getOverdueTasks(input: TaskQueryInput): Promise<QueryTasksResult>;
  searchTasks(input: SearchTasksInput): Promise<QueryTasksResult>;
}
```

### responsibilities of the service

- initialize plugins if needed
- calculate internal `fetchLimit`
- call `pluginManager.aggregateTasks()` or `pluginManager.searchTasks()`
- convert provider errors into warning strings
- apply filter/sort logic
- apply final display limit

### responsibilities that remain in commands

- parse args and flags
- choose renderer (`renderTasks`, `renderTasksPlain`, `renderTaskIds`,
  `renderDashboard`, `renderSummary`)
- map service warnings to `renderWarning`

### specific command refactors

#### `tasks assigned`

Current issues:

- command does its own warning handling
- command does its own filter/sort handling
- command knows about query-shaping details

After refactor:

- command passes parsed input to `taskQueryService.getAssignedTasks()`
- command renders returned `tasks`
- command loops through `warnings` and calls `renderWarning()`

#### `tasks overdue`

Same pattern as `assigned`.

#### `tasks search`

Same pattern as `assigned`, plus the query string.

#### `today`

Use `taskQueryService.getAssignedTasks()` internally, then pass the service
result into `renderDashboard()`.

#### `summary`

Use the query service to fetch assigned tasks, then compute counts either:

- inside `summary` for now
- or in a small dashboard helper added to the service layer

Recommended first pass:

- keep summary count math in the command
- only move fetching and warnings into the query service

### likely files

- `packages/core/src/services/task-query-service.ts`
- `packages/core/src/managers/plugin-manager.ts`
- `packages/cli/src/commands/tasks/assigned.ts`
- `packages/cli/src/commands/tasks/overdue.ts`
- `packages/cli/src/commands/tasks/search.ts`
- `packages/cli/src/commands/today.ts`
- `packages/cli/src/commands/summary.ts`

### tests to add

Service tests:

- returns warnings when one provider fails
- applies filter/sort/limit in correct order
- uses widened internal fetch limit
- preserves no-provider / not-connected errors

Command tests:

- ensure commands delegate to service
- ensure warnings are rendered
- ensure output mode selection still works

### acceptance criteria

- query/list commands become visibly smaller
- duplicated warning/filter logic is removed from commands
- service tests become the primary coverage for list/search behavior

### risks

- medium

### estimated effort

- medium

---

## milestone 2: extract task read service

status: completed on 2026-03-18

### goal

Centralize single-task orchestration logic.

### commands in scope

- `tasks show`
- `open`
- `tasks thread`
- `tasks attachments`
- `branch`

### service to add

- `packages/core/src/services/task-read-service.ts`

### recommended API

```ts
class TaskReadService {
  getTask(taskId: string): Promise<GetTaskResult>;
  getTaskThread(taskId: string, options: ThreadQueryOptions): Promise<{
    task?: Task | null;
    entries: ThreadEntry[];
    warnings: string[];
  }>;
  getTaskAttachments(taskId: string, options: ThreadQueryOptions): Promise<{
    attachments: ThreadAttachment[];
    warnings: string[];
  }>;
  getTaskForBranch(taskId: string): Promise<GetTaskResult>;
}
```

### responsibilities of the service

- parse task ID
- resolve provider from task ID
- check provider registration
- check authentication
- check provider capability support
- fetch task / thread / attachments
- dedupe attachments where needed

### command responsibilities after extraction

- parse CLI flags
- call the read service
- render task, thread, attachment, or branch output
- perform side effects like opening a browser or creating a git branch

### branch-specific note

`branch` should still own git invocation, but not task lookup/provider
resolution. The service should only return the task details needed to derive
the branch name.

### likely files

- `packages/core/src/services/task-read-service.ts`
- `packages/cli/src/commands/tasks/show.ts`
- `packages/cli/src/commands/open.ts`
- `packages/cli/src/commands/tasks/thread.ts`
- `packages/cli/src/commands/tasks/attachments.ts`
- `packages/cli/src/commands/branch.ts`

### tests to add

- invalid task id handling
- provider not connected
- unsupported capability handling
- attachment deduplication
- thread/task combined payload handling

### acceptance criteria

- command files no longer repeat provider/task-ID resolution patterns
- unsupported feature errors are consistent across commands

### risks

- medium

### estimated effort

- medium

---

## milestone 3: extract task mutation service

status: completed on 2026-03-18

### goal

Move create/update/comment/done/delete orchestration into a mutation service.

### commands in scope

- `tasks create`
- `tasks update`
- `comment`
- `done`
- `delete`

### service to add

- `packages/core/src/services/task-mutation-service.ts`

### recommended API

```ts
class TaskMutationService {
  createTasks(input: CreateTasksCommandInput): Promise<MutationResult<Task[]>>;
  updateTask(taskId: string, input: UpdateTaskInput): Promise<MutationResult<Task>>;
  addComment(taskId: string, body: string): Promise<MutationResult<void>>;
  completeTasks(taskIds: string[]): Promise<BulkMutationResult<Task>>;
  deleteTasks(taskIds: string[]): Promise<BulkMutationResult<void>>;
}
```

### responsibilities of the service

- plugin initialization
- provider selection for create
- task-id resolution for task-scoped mutations
- capability checks
- bulk operation normalization
- conversion of `BulkOperationError` into stable result structures

### responsibilities that remain in commands

- interactive prompts like delete confirmation
- CLI-specific flag validation where parsing is tightly coupled to oclif
- rendering success and failure messages

### create/update note

Do not move every parser helper immediately.

Recommended split:

- keep arg/flag parsing helpers in CLI for now
- once parsed input is ready, pass the normalized shape into the mutation
  service

That avoids mixing architectural extraction with parser redesign.

### likely files

- `packages/core/src/services/task-mutation-service.ts`
- `packages/cli/src/commands/tasks/create.ts`
- `packages/cli/src/commands/tasks/update.ts`
- `packages/cli/src/commands/comment.ts`
- `packages/cli/src/commands/done.ts`
- `packages/cli/src/commands/delete.ts`

### tests to add

- provider selection for create with one vs many connected providers
- normalized bulk result handling
- capability errors for unsupported comments
- mutation warning propagation

### acceptance criteria

- `done` and `delete` stop owning bulk result interpretation
- `comment` stops depending directly on `pluginManager.addComment()`
- `create` and `update` keep their parsing behavior but lose direct manager
  orchestration

### risks

- medium to high

### estimated effort

- medium

---

## milestone 4: extract provider session service

status: completed on 2026-03-18

### goal

Centralize connect/disconnect/providers/workspace orchestration.

### commands in scope

- `connect`
- `disconnect`
- `providers`
- `workspace`

### service to add

- `packages/core/src/services/provider-session-service.ts`

### responsibilities

- plugin initialization
- provider lookup
- provider connection status checks
- provider info aggregation
- workspace support checks
- workspace switch flow

### important note

Interactive prompt collection in `connect` can remain in the command for the
first pass. The service should accept credentials after the prompt layer has
collected them.

### likely files

- `packages/core/src/services/provider-session-service.ts`
- `packages/cli/src/commands/connect.ts`
- `packages/cli/src/commands/disconnect.ts`
- `packages/cli/src/commands/providers.ts`
- `packages/cli/src/commands/workspace.ts`

### acceptance criteria

- connection lifecycle behavior is centralized
- provider/workspace support errors are standardized

### risks

- low to medium

### estimated effort

- small to medium

---

## milestone 5: reduce singleton leakage

status: completed on 2026-03-18

### goal

Start reducing direct infrastructure imports from lower layers.

### current issue

Provider and client code imports concrete singleton managers directly:

- `authManager`
- `cacheManager`

This makes the boundaries less explicit and harder to test in isolation.

Completed in this repository:

- narrow runtime dependency interfaces were added in `core`
- provider clients/plugins now depend on those interfaces instead of importing
  concrete manager singletons directly where that boundary mattered most
- default runtime wiring still uses the current singleton-backed implementations

### recommended first step

Do not attempt full dependency inversion immediately.

Instead:

1. define narrow interfaces
   - `CredentialStore`
   - `TaskCache`
   - `ConfigStore`

2. adapt singleton managers to those interfaces

3. inject those dependencies into providers/clients only where it reduces
   immediate coupling

### practical migration path

#### phase 5a

- define interfaces in `core`
- keep singletons as default implementations
- no behavior changes

#### phase 5b

- update one provider first, preferably `plugin-notion` or `plugin-linear`,
  to prove the pattern

#### phase 5c

- roll the pattern out only if the value is clear

### what not to do

- do not force constructor injection into every class in one pass
- do not introduce a container framework
- do not block feature work on finishing this milestone

### likely files

- `packages/core/src/models/...` or `packages/core/src/services/shared/...`
- provider client constructors
- provider index constructors

### acceptance criteria

- one or two services/providers can be tested without relying on global state
- default runtime wiring still uses the current singleton instances

### risks

- high if attempted too broadly

### estimated effort

- medium to large depending on scope

---

## milestone 6: cleanup and hardening

status: completed on 2026-03-18

### goal

Consolidate the new architecture and remove transitional duplication.

### tasks

1. remove dead command helpers that became obsolete
2. simplify command tests that only verify orchestration
3. move most workflow tests to service-level tests
4. update plugin-development docs if provider/service boundaries changed
5. review exports from `core` to avoid accidental overexposure
6. standardize warning and error rendering policy

### optional hardening tasks

- add internal telemetry hooks only if needed
- add service-level performance benchmarks for query-heavy flows
- review whether `pluginManager` should become smaller over time

### acceptance criteria

- commands are thin and consistent
- service APIs are stable and covered by tests
- transitional duplication is removed
- warning rendering is standardized through shared helpers

### risks

- low if done after earlier milestones

### estimated effort

- small to medium

---

## sequencing recommendation

The recommended execution order is:

1. milestone 0
2. milestone 1
3. release / stabilize
4. milestone 2
5. release / stabilize
6. milestone 3
7. release / stabilize
8. milestone 4
9. milestone 5 only if still justified
10. milestone 6

Do not merge milestones 1 through 4 into one branch.

## branch strategy

Use short-lived branches such as:

- `refactor/task-query-service`
- `refactor/task-read-service`
- `refactor/task-mutation-service`
- `refactor/provider-session-service`

Each branch should:

- update tests
- pass build/lint/test
- avoid incidental formatting churn

## testing strategy

Refactor work should shift tests gradually from commands to services.

### current state

Many tests validate command behavior directly. That is still useful, but too
much workflow coverage at the command layer makes refactors noisier than they
need to be.

### desired state

- service tests become the main place for workflow correctness
- command tests verify:
  - parsing
  - delegation
  - rendering mode selection
  - exit behavior where relevant

### by milestone

#### milestone 1 tests

- query service unit tests become primary
- command tests become delegation checks

#### milestone 2 tests

- task read service tests cover provider/task resolution
- thread/attachment dedupe logic moves under service tests

#### milestone 3 tests

- mutation service tests cover bulk and capability behavior
- delete confirmation remains a command test

## migration guardrails

Use these guardrails during implementation:

- never move rendering into services
- never let commands call both a new service and `pluginManager` for the same
  workflow after extraction
- preserve shared output contracts in `packages/core/src/utils/output.ts`
- avoid changing the plugin interface unless the service layer truly requires it
- keep one milestone focused on one workflow family

## known risks and mitigations

### risk: too much abstraction too early

Mitigation:

- keep service APIs concrete and task-focused
- avoid generic "command service" abstractions

### risk: duplicate logic during transition

Mitigation:

- allow short-term duplication within a milestone
- remove duplicate workflow code before closing the milestone

### risk: tests become brittle during migration

Mitigation:

- move workflow assertions to service tests
- keep command tests shallow

### risk: provider behavior changes unintentionally

Mitigation:

- do not rewrite provider implementations in early milestones
- treat providers as stable adapters at first

## definition of done for the overall refactor

This refactor is complete when:

- commands are mostly thin adapters
- workflow orchestration lives in services
- warning and error aggregation is centralized
- task-id/provider resolution is no longer duplicated across commands
- service-layer tests cover most behavior currently tested through commands
- direct singleton imports are reduced where they materially improve boundaries

## minimum viable first slice

If maintainers want the smallest useful next step, do only this:

1. complete milestone 0
2. complete milestone 1 for:
   - `tasks assigned`
   - `tasks overdue`
   - `tasks search`
3. leave `today` and `summary` for a follow-up if needed

This gives a meaningful architectural improvement with low risk and visible
code quality payoff.

## suggested implementation checklist

Use this checklist when the work begins:

- [x] add service folder and exports
- [x] add shared service result types
- [x] create `task-query-service`
- [x] move list/search orchestration into service
- [x] refactor `assigned`, `overdue`, `search`
- [x] add service tests
- [x] reduce command tests to delegation checks
- [x] ship and stabilize
- [x] create `task-read-service`
- [x] refactor read-oriented commands
- [x] ship and stabilize
- [x] create `task-mutation-service`
- [x] refactor mutation commands
- [x] ship and stabilize
- [x] create `provider-session-service`
- [x] refactor provider/session commands
- [x] decide whether singleton leakage reduction is still worth doing
- [x] remove transitional duplication

## final recommendation

Do this refactor only in small, milestone-sized changes.

The best next architectural move is not "make everything clean".
The best next move is:

- extract query workflows first
- centralize the repeated orchestration
- prove the pattern
- continue only if the codebase gets measurably easier to change

That keeps the refactor pragmatic, reversible, and aligned with the needs of
this CLI.
