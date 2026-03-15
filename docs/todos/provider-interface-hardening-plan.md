# provider interface hardening plan

date: 2026-03-15
status: proposed
audience: maintainers and future plugin authors

## purpose

This document defines how the shared provider contract in `pm-cli` should be
hardened so that:

- all providers follow a clear architectural path
- common behavior stays common
- provider-specific behavior is explicit rather than implicit
- future plugins can be added without guessing the right structure
- the contract remains stable as the number of providers grows

This is not only a TypeScript cleanup. It is an architectural contract plan.

## why this matters

`pm-cli` supports multiple project-management providers:

- asana
- notion
- trello
- linear
- clickup

That means the shared provider contract is one of the most important pieces in
the codebase. If the provider interface is weak:

- new plugins will copy existing provider quirks instead of following a clear
  design
- provider-specific logic will leak into shared layers
- commands and services will keep learning provider differences ad hoc
- cross-provider consistency will degrade over time

If the interface is strong:

- plugin authors know exactly what is required
- advanced capability differences are declared clearly
- shared application services can be simpler and more stable
- the architecture scales better with each new provider

## current state

The current provider contract lives mainly in:

- `packages/core/src/models/plugin.ts`
- `packages/core/src/models/task.ts`

There is already a useful foundation:

- a normalized `Task` model
- a common `PMPlugin` interface
- a shared task ID format
- consistent lifecycle and basic task operations

This is good. The problem is not that the current design is bad. The problem is
that it is not yet strong enough to be the long-term plugin architecture
contract.

## current strengths

These parts of the shared contract are solid and should largely stay:

### 1. normalized task model

The `Task` shape is a good common model:

- `id`
- `externalId`
- `title`
- `description`
- `status`
- `dueDate`
- `assignee`
- `assigneeEmail`
- `project`
- `placement`
- `tags`
- `source`
- `url`
- `priority`
- timestamps

This is the correct kind of shared boundary for a multi-provider CLI.

### 2. consistent basic lifecycle

The current lifecycle methods are reasonable:

- `initialize`
- `isAuthenticated`
- `authenticate`
- `disconnect`
- `getInfo`
- `validateConnection`

These are strong candidates for the permanent base provider contract.

### 3. consistent basic task operations

These methods are common enough to remain part of the base provider contract:

- `getAssignedTasks`
- `getOverdueTasks`
- `searchTasks`
- `getTask`
- `createTask`
- `updateTask`
- `completeTask`
- `deleteTask`

## current weaknesses

The contract has several structural issues that will become more painful as new
providers are added.

### 1. the interface is too monolithic

`PMPlugin` contains:

- required lifecycle
- required task operations
- optional comments
- optional thread support
- optional attachments
- optional workspace support

This means one large interface is trying to represent:

- universal capabilities
- optional capabilities
- provider-specific advanced behavior

That makes the real contract fuzzy.

### 2. optional methods are being used as hidden capability flags

Examples:

- `addComment?`
- `getTaskThread?`
- `downloadAttachment?`
- `supportsWorkspaces?`
- `getWorkspaces?`
- `getCurrentWorkspace?`
- `setWorkspace?`

Current behavior:

- commands and managers infer support by checking whether a method exists

This is workable, but weak.

Problems:

- provider support is implicit, not declared
- capability discovery is split between types and runtime checks
- future plugin authors are not guided clearly
- it is easy to add a method but forget to standardize how the rest of the
  system should interpret it

### 3. the shared write inputs are partially asana-shaped

`CreateTaskInput` and `UpdateTaskInput` currently include fields such as:

- `projectId`
- `projectName`
- `sectionId`
- `sectionName`
- `workspaceId`
- `workspaceName`
- `difficulty`
- `customFields`

This is a sign that one provider's rich workflow has influenced the global
interface.

Problems:

- new provider authors may think they must support these fields even when the
  provider has different concepts
- shared services may become increasingly biased toward asana-like structures
- the core contract begins to model one provider's UX instead of the domain

### 4. credentials are too loosely typed

`ProviderCredentials` is essentially:

```ts
{
  token: string;
  [key: string]: string | undefined;
}
```

This is too permissive for a key architectural boundary.

Problems:

- provider-specific auth shape is informal
- there is no strong contract for plugin authors
- validation logic becomes distributed and inconsistent

### 5. provider differences are not declared in one place

Today, provider differences are spread across:

- optional methods on `PMPlugin`
- command-level checks
- service/manager checks
- provider-specific runtime errors
- README and docs

That means there is no single source of truth for:

- what the provider supports
- what the provider does not support
- which commands should treat the provider as capable

### 6. plugin implementations import shared singletons directly

This is a related, though slightly separate, issue.

Provider code directly imports:

- `cacheManager`
- `authManager`

That makes the "real plugin contract" broader than the formal plugin interface.

This does not need to be solved immediately, but it should be acknowledged in
the long-term plan.

## target design

The target contract should be built from three layers:

1. a strict base provider interface
2. explicit capability interfaces
3. a capability manifest

This creates a much clearer structure for current and future providers.

## layer 1: base provider interface

This interface should contain only what every provider must support.

Recommended shape:

```ts
interface PMPluginBase {
  readonly name: ProviderType;
  readonly displayName: string;
  readonly capabilities: ProviderCapabilities;

  initialize(): Promise<void>;
  isAuthenticated(): Promise<boolean>;
  authenticate(credentials: ProviderCredentials): Promise<void>;
  disconnect(): Promise<void>;
  getInfo(): Promise<ProviderInfo>;
  validateConnection(): Promise<boolean>;

  getAssignedTasks(options?: TaskQueryOptions): Promise<Task[]>;
  getOverdueTasks(options?: TaskQueryOptions): Promise<Task[]>;
  searchTasks(query: string, options?: TaskQueryOptions): Promise<Task[]>;
  getTask(externalId: string): Promise<Task | null>;
  getTaskUrl(externalId: string): string;

  createTask(input: CreateTaskInput): Promise<Task>;
  updateTask(externalId: string, updates: UpdateTaskInput): Promise<Task>;
  completeTask(externalId: string): Promise<Task>;
  deleteTask(externalId: string): Promise<void>;
}
```

This base interface should define the minimum provider bar for participating in
the CLI.

## layer 2: capability interfaces

Advanced behavior should be modeled as explicit interfaces.

Recommended capability interfaces:

### comments

```ts
interface CommentCapablePlugin {
  addComment(externalId: string, body: string): Promise<void>;
}
```

### thread

```ts
interface ThreadCapablePlugin {
  getTaskThread(
    externalId: string,
    options?: ThreadQueryOptions
  ): Promise<ThreadEntry[]>;
}
```

### attachment download

```ts
interface AttachmentDownloadCapablePlugin {
  downloadAttachment(
    attachment: ThreadAttachment,
    options?: AttachmentDownloadOptions
  ): Promise<string | null>;
}
```

### workspace support

```ts
interface WorkspaceCapablePlugin {
  getWorkspaces(): Workspace[];
  getCurrentWorkspace(): Workspace | null;
  setWorkspace(workspaceId: string): void;
}
```

### advanced field mutation

This interface is not in the current codebase, but should likely exist.

```ts
interface CustomFieldCapablePlugin {
  // the exact shape can evolve later
}
```

The purpose is not to expose raw provider schemas. The purpose is to make
advanced field support explicit instead of silently piggybacking on
`CreateTaskInput` and `UpdateTaskInput`.

## layer 3: capability manifest

Every provider should declare a capability manifest.

Recommended shape:

```ts
interface ProviderCapabilities {
  comments: boolean;
  thread: boolean;
  attachmentDownload: boolean;
  workspaces: boolean;
  customFields: boolean;
  projectPlacement: boolean;
}
```

Example:

```ts
capabilities: {
  comments: true,
  thread: false,
  attachmentDownload: false,
  workspaces: false,
  customFields: false,
  projectPlacement: false,
}
```

This should become the first place commands and services look when deciding what
to allow.

## why both capability interfaces and a capability manifest

It is useful to have both.

### capability manifest is useful for:

- runtime checks
- command/service behavior
- docs generation
- provider status reporting

### capability interfaces are useful for:

- type safety
- implementation clarity
- narrowing in internal code

Recommended pattern:

- manifest answers "should this be available?"
- capability interface answers "what method exists when it is available?"

## recommended type guard pattern

Add simple type guards in `core`:

```ts
function isCommentCapable(plugin: PMPluginBase): plugin is PMPluginBase & CommentCapablePlugin
function isThreadCapable(plugin: PMPluginBase): plugin is PMPluginBase & ThreadCapablePlugin
function isWorkspaceCapable(plugin: PMPluginBase): plugin is PMPluginBase & WorkspaceCapablePlugin
```

Then command/service logic becomes:

1. check the capability manifest
2. use the type guard before method calls

This is better than relying on optional method presence directly.

## what should stay shared and common

These areas should remain standardized across all providers.

### common task domain

- normalized `Task`
- normalized `TaskStatus`
- normalized task ID format
- normalized list/search/detail flows

### common lifecycle

- init
- auth check
- auth connect/disconnect
- provider info
- connection validation

### common base mutations

- create task
- update task
- complete task
- delete task

## what should be explicit variation points

These are valid provider differences and should not be forced into the universal
base contract.

### 1. comments

Some providers support comments naturally. Some do not. This should be a
capability, not a hidden optional method.

### 2. thread/activity timeline

This is not universal. It should be explicit.

### 3. attachment download

This is not universal. It should be explicit.

### 4. workspace switching

Some providers have workspace/organization concepts that are operationally
important; others do not.

### 5. custom field mutation

This is highly provider-specific and should not be treated as a universal
baseline.

### 6. placement semantics

Different providers use:

- project
- board
- list
- section
- parent
- database

This is where the current shared input model needs the most improvement.

## input model hardening

The shared provider contract should stop becoming more provider-specific over
time.

The current `CreateTaskInput` and `UpdateTaskInput` should be reviewed and split
into:

1. core universal fields
2. provider-context fields
3. advanced provider-specific extensions

## recommended target input shape

### core universal fields

These are safe to keep universally shared:

- `title`
- `description`
- `dueDate`
- `status`
- `assigneeEmail`

### provider-context fields

Instead of encoding specific product language like `section` or `workspace`
directly into the global contract, introduce a more neutral context shape.

Possible direction:

```ts
interface TaskPlacementInput {
  containerId?: string;
  containerName?: string;
  parentId?: string;
  parentName?: string;
}
```

Or, if that is still too abstract, keep current names short-term but document
them as transitional.

### advanced provider-specific fields

Fields like:

- `difficulty`
- `customFields`

should eventually move out of the universal base input or be grouped into a
clearly optional advanced section.

Example:

```ts
interface AdvancedFieldMutationInput {
  customFields?: CustomFieldInput[];
}
```

Or:

```ts
providerOptions?: Record<string, unknown>
```

Recommendation:

- do not jump to `Record<string, unknown>` too early
- first separate obvious universal vs advanced fields

## credential contract hardening

The current credential type is too loose for a strong plugin architecture.

## current issue

```ts
interface ProviderCredentials {
  token: string;
  [key: string]: string | undefined;
}
```

This is convenient, but too informal.

## target direction

Keep runtime flexibility, but improve documentation and declaration.

Recommended additions:

### provider auth metadata

```ts
interface ProviderCredentialSpec {
  requiredFields: string[];
  optionalFields?: string[];
  labels: Record<string, string>;
}
```

This already partially exists via `PROVIDER_CREDENTIALS`, but should become part
of the explicit plugin authoring contract rather than just config metadata.

### future improvement

Long term, each provider could expose its own credential validator.

Example:

```ts
validateCredentials(credentials: ProviderCredentials): void
```

This is optional future work, not an immediate requirement.

## provider author experience

The contract should be strong enough that a future provider author can answer
these questions immediately:

1. what methods are required?
2. what methods are optional?
3. how do I declare supported features?
4. where do provider-specific behaviors belong?
5. what belongs in the normalized `Task` model?
6. how should auth fields be declared?
7. how should unsupported features be represented?

Today, these answers are spread across code, conventions, and examples.

The goal of this hardening work is to make those answers explicit.

## recommended plugin author contract

Future plugin development should follow this sequence:

1. implement `PMPluginBase`
2. declare `capabilities`
3. implement only the capability interfaces the provider supports
4. map provider objects into normalized `Task`
5. document unsupported features explicitly
6. register the plugin in CLI bootstrap
7. add:
   - mapper tests
   - auth tests
   - capability behavior tests

## milestone plan

This work should also be done incrementally.

## milestone 0: document the contract

### goal

Make the intended provider structure explicit before changing types.

### tasks

1. add this design document
2. update `docs/plugin-development.md` to reflect:
   - base provider concept
   - capability concept
   - normalized task expectations
3. add a short provider checklist for future plugins

### acceptance criteria

- future maintainers have one document that explains the direction

### effort

- small

---

## milestone 1: add capability manifest

### goal

Introduce explicit runtime-declared capabilities without breaking existing
providers.

### tasks

1. define `ProviderCapabilities`
2. add `capabilities` to `PMPlugin`
3. update all providers to declare capabilities
4. update commands/services to read the manifest

### initial capability set

- `comments`
- `thread`
- `attachmentDownload`
- `workspaces`
- `customFields`
- `projectPlacement`

### acceptance criteria

- all current providers declare capabilities
- no command relies only on method existence for support checks

### likely files

- `packages/core/src/models/plugin.ts`
- all provider `src/index.ts`
- command/service call sites

### effort

- medium

---

## milestone 2: split base and capability interfaces

### goal

Replace the monolithic plugin contract with a clearer type structure.

### tasks

1. add `PMPluginBase`
2. add capability interfaces:
   - comments
   - thread
   - attachment download
   - workspaces
3. add type guards
4. refactor internal call sites

### acceptance criteria

- type system makes optional capabilities explicit
- plugin authors have a clear required vs optional distinction

### effort

- medium

---

## milestone 3: harden shared input types

### goal

Reduce Asana-specific shape leakage from core provider inputs.

### tasks

1. classify every field in `CreateTaskInput` and `UpdateTaskInput` as:
   - universal
   - shared-but-advanced
   - provider-specific
2. move provider-specific pieces into clearer extension structures
3. keep compatibility shims where needed
4. update create/update command docs

### recommended rule

If a field exists mainly because of one provider, it should not live forever in
the universal core contract without explicit justification.

### acceptance criteria

- shared inputs become more provider-neutral
- advanced features remain possible without polluting the base contract

### effort

- medium to high

---

## milestone 4: harden provider auth contract

### goal

Make credential requirements clearer for future plugin authors.

### tasks

1. formalize provider credential specs
2. standardize auth field documentation
3. optionally add credential validation helpers

### acceptance criteria

- provider auth requirements are explicit
- plugin authors do not need to infer auth shape from implementation details

### effort

- small to medium

---

## milestone 5: align docs, examples, and plugin template

### goal

Make the intended architecture visible everywhere plugin authors look.

### tasks

1. update `docs/plugin-development.md`
2. update `examples/plugin-template`
3. add capability declaration to the template
4. document expected test coverage for new plugins

### acceptance criteria

- the docs and plugin template reflect the hardened contract

### effort

- small

---

## milestone 6: optional deeper boundary cleanup

### goal

If still valuable after the contract hardening work, reduce direct singleton
leakage from provider implementations.

### tasks

1. define narrow interfaces for cache/auth interaction
2. inject them into providers or clients gradually
3. avoid large-scale runtime rewiring

### acceptance criteria

- provider implementations become less tightly coupled to concrete global state

### effort

- medium to large

---

## recommended order

Use this order:

1. milestone 0
2. milestone 1
3. milestone 2
4. milestone 5
5. milestone 3
6. milestone 4
7. milestone 6 only if still justified

Why:

- capability manifest and interface split provide the biggest structural gain
  with the least immediate disruption
- input-type redesign should happen after the capability model is clearer

## compatibility strategy

This work should preserve existing providers as much as possible.

Recommended compatibility rules:

1. add capability manifest before removing optional method assumptions
2. add new interfaces before deleting the old monolithic usage style
3. deprecate old patterns in docs first
4. migrate all first-party providers before changing plugin template defaults

## review checklist for future plugins

Use this checklist whenever a new provider is added:

- [ ] implements base provider interface
- [ ] declares capability manifest
- [ ] implements only supported capability interfaces
- [ ] maps provider objects to normalized `Task`
- [ ] uses `createTaskId()`
- [ ] documents unsupported capabilities clearly
- [ ] includes auth tests
- [ ] includes mapper tests
- [ ] includes capability behavior tests where relevant

## definition of done

The provider contract is considered "hardened" when:

- the base provider contract is clearly separated from optional capabilities
- runtime capabilities are declared explicitly in a manifest
- commands and services no longer guess provider support from method presence
- shared input types are more provider-neutral
- plugin docs and examples reflect the architecture
- a future plugin author can follow one clear path without reverse-engineering
  existing providers

## practical recommendation

The best first real implementation step is:

1. add `ProviderCapabilities`
2. update all current providers to declare capabilities
3. update command/service checks to use capabilities

That gives immediate architectural clarity without a large rewrite.

After that, split the monolithic `PMPlugin` into base + capability interfaces.

That is the point where the provider contract becomes meaningfully stronger for
future plugin work.
