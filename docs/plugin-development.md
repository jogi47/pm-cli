# plugin development guide

This guide explains how to add or extend a provider plugin in `pm-cli`.

Use this as the practical implementation guide.

For broader architectural direction, also read:

- [provider-interface-hardening-plan.md](./todos/completed/provider-interface-hardening-plan.md)
- [application-service-refactor-plan.md](./todos/completed/application-service-refactor-plan.md)

## purpose

A provider plugin should do one job well:

- translate provider-specific auth, API calls, and data shapes into the shared
  `pm-cli` contract

That means a plugin is primarily an adapter layer.

It should not:

- redefine the shared task model
- push provider-specific assumptions into unrelated shared code
- duplicate command-layer behavior

## current architecture

The current flow is:

```text
CLI command
  -> pluginManager
    -> provider plugin
      -> provider client
      -> provider mapper
        -> normalized Task
```

Packages:

```text
packages/core            shared models, managers, utils
packages/plugin-asana    asana adapter
packages/plugin-notion   notion adapter
packages/plugin-trello   trello adapter
packages/plugin-linear   linear adapter
packages/plugin-clickup  clickup adapter
packages/cli             oclif commands
```

## plugin responsibilities

Every provider plugin should:

1. expose provider identity
2. authenticate and persist credentials
3. fetch provider data through a client
4. map provider objects into normalized `Task` objects
5. implement the common provider operations
6. explicitly document unsupported features

## required shared contract

The shared provider contract currently lives in:

- `packages/core/src/models/plugin.ts`
- `packages/core/src/models/task.ts`

At minimum, a provider should fit the common lifecycle and task operations in
`PMPluginBase`.

Important note:

- the base provider contract is now explicit
- optional behaviors should be represented with capability-specific interfaces
  and a capability manifest

Implement the current contract directly, and use
`todos/completed/provider-interface-hardening-plan.md` as the reference for why
the current contract looks the way it does.

## design rules for new plugins

### 1. preserve the normalized task model

All provider objects must be mapped into the shared `Task` shape.

Do not add provider-specific fields directly to `Task` unless there is a strong
cross-provider reason.

Key rule:

- if a value is only meaningful for one provider, prefer handling it inside the
  plugin instead of expanding the global task model

### 2. keep provider-specific logic inside the plugin package

Examples:

- auth token formats
- workspace resolution
- board/list/project lookup
- custom field resolution
- provider-specific comment/thread behavior

These should stay in:

- `client.ts`
- `mapper.ts`
- `index.ts`

Do not move provider-specific API logic into CLI commands.

### 3. treat the plugin as an adapter

Recommended split:

- `client.ts`
  - raw API calls
  - auth and connection validation
  - provider-specific request/response shapes

- `mapper.ts`
  - map provider entities into normalized `Task`
  - map provider status/priority/placement into shared forms

- `index.ts`
  - implement the provider contract
  - orchestrate client + mapper + cache invalidation
  - surface consistent capability behavior

For runtime dependencies, prefer narrow injected interfaces over direct
singleton imports:

- provider clients can accept `ProviderAuthStore` with
  `defaultProviderAuthStore` as the default
- provider plugins can accept `ProviderTaskCache` with
  `defaultProviderTaskCache` as the default

This keeps the provider boundary explicit without forcing large runtime
rewiring.

### 4. be explicit about unsupported features

If the provider does not support a feature such as:

- comments
- thread/activity
- attachment download
- workspaces
- advanced custom fields

make that explicit in behavior and docs.

Do not silently pretend support exists.

### 5. prefer small, testable normalization logic

The plugin should keep mapping and transformation logic deterministic and easy to
unit test.

## recommended package structure

Use this structure for a new provider:

```text
packages/plugin-yourtool/
  package.json
  tsconfig.json
  src/
    client.ts
    mapper.ts
    index.ts
  test/
    mapper.test.ts
    index.test.ts   # if needed
```

Starter reference:

- `examples/plugin-template/` shows the current base contract, capability
  manifest, and normalized create/update helper pattern

## implementation workflow

## step 1: create the plugin package

Create `packages/plugin-yourtool/` with:

- `package.json`
- `tsconfig.json`
- `src/client.ts`
- `src/mapper.ts`
- `src/index.ts`

Match the structure of an existing provider package where possible.

## step 2: add the provider to the shared provider type

Update:

- `ProviderType` in `packages/core/src/models/task.ts`
- `SUPPORTED_PROVIDERS` in `packages/core/src/models/task.ts`

This ensures the new provider is part of the shared model.

## step 3: define auth metadata

Update `PROVIDER_CREDENTIALS` in:

- `packages/core/src/models/plugin.ts`

Add:

- required auth fields
- optional auth fields when needed
- per-field prompt metadata
- env var names for each supported auth input

Current credential metadata shape:

```ts
interface ProviderCredentialFieldSpec {
  label: string;
  envVar?: string;
  secret?: boolean;
}

interface ProviderCredentialSpec {
  requiredFields: string[];
  optionalFields?: string[];
  fields: Record<string, ProviderCredentialFieldSpec>;
}
```

This metadata is used for:

- interactive `pm connect` prompts
- environment-variable auth loading in `authManager`
- shared credential validation before credentials are stored

## step 4: implement the provider client

In `src/client.ts`, implement:

- initialization from stored credentials
- connect/auth flow
- disconnect
- raw fetch/update operations
- current user / workspace info if applicable

Recommended rules:

- keep provider-specific types close to the client
- wrap low-level errors into clearer provider failures in the plugin layer
- do not put normalization logic in the client if it belongs in the mapper
- prefer an injected `ProviderAuthStore` dependency over importing
  `authManager` directly

## step 5: implement the provider mapper

In `src/mapper.ts`, map provider records to the normalized `Task` model.

Always use:

- `createTaskId(provider, externalId)`

Map at least:

- `id`
- `externalId`
- `title`
- `status`
- `source`
- `url`

Add optional fields where they exist:

- `description`
- `dueDate`
- `assignee`
- `assigneeEmail`
- `project`
- `placement`
- `tags`
- `priority`
- `createdAt`
- `updatedAt`

## step 6: implement the plugin class

In `src/index.ts`, implement the provider contract.

Typical responsibilities:

- delegate to the client
- map responses through the mapper
- integrate with cache invalidation
- provide provider info
- expose supported optional behaviors

Recommended pattern:

- keep `index.ts` as the provider adapter boundary
- do not bury plugin contract behavior across multiple files without reason
- implement `PMPluginBase` plus only the capability interfaces the provider
  actually supports
- declare a `capabilities` manifest that matches those implemented interfaces
- prefer an injected `ProviderTaskCache` dependency over importing
  `cacheManager` directly

## step 7: register the plugin in CLI bootstrap

Update:

- `packages/cli/src/init.ts`

Register the plugin in `initializePlugins()`.

Also update `packages/cli/package.json` if the CLI package needs the new
workspace dependency.

## step 8: document capability notes

When a provider does not support part of the CLI surface, document it clearly.

Update:

- provider feature docs if applicable
- README if the feature is user-visible

Examples:

- comments supported / unsupported
- thread supported / unsupported
- workspace switching meaningful / not meaningful
- custom field updates supported / unsupported

## current contract guidance

The current shared contract is split into:

- `PMPluginBase` for required lifecycle and task operations
- capability-specific interfaces such as comments, thread, attachment download,
  and workspaces
- a runtime `capabilities` manifest used by commands and services before they
  call optional behavior

That means:

- keep common behavior in `PMPluginBase`
- implement only the capability interfaces the provider really supports
- keep provider-specific advanced logic inside the plugin
- do not assume optional capabilities are universal
- avoid extending shared inputs unless the need is genuinely cross-provider

## capability guidance

The codebase is moving toward clearer capability modeling.

Use these practical rules:

### comments

- implement `addComment()` only if the provider supports comments well
- otherwise leave it unsupported and make command behavior explicit

### thread/activity

- implement `getTaskThread()` only if the provider can provide a useful
  conversation or activity timeline

### attachment download

- implement `downloadAttachment()` only if attachments can be accessed in a
  stable and useful way

### workspaces

- implement workspace methods only if workspace switching is operationally real
  for that provider

### advanced fields

- do not force support for `customFields` or provider-specific advanced
  placement semantics just because one provider uses them

## normalized task guidance

When mapping provider data into `Task`, follow these rules:

### status

Always map provider status into:

- `todo`
- `in_progress`
- `done`

If the provider has more states, normalize them consistently and document the
mapping.

### project and placement

Use:

- `project`
- `placement.project`
- `placement.section`

only where the provider has a meaningful equivalent.

Do not invent fake placement structures if the provider has no such concept.

### priority

Map priority into:

- `low`
- `medium`
- `high`
- `urgent`

If the provider has no comparable priority concept, omit it.

### due date

Normalize due dates carefully.

If the provider exposes date-only values, avoid accidental timezone distortion
when mapping and reserializing.

### description

If the provider uses HTML or rich text, normalize as consistently as possible
for CLI output, but do not overfit one provider's rich format into the shared
model.

## create and update guidance

Shared create/update inputs are split into:

- universal fields such as `title`, `description`, `dueDate`, `status`, and
  `assigneeEmail`
- `context` for provider-routing inputs such as workspace and placement
- `providerOptions` for provider-specific mutation details such as advanced
  custom fields

Current normalized shapes:

```ts
interface TaskPlacementInput {
  containerId?: string;
  containerName?: string;
  parentId?: string;
  parentName?: string;
}

interface TaskProviderContextInput {
  workspaceId?: string;
  workspaceName?: string;
  placement?: TaskPlacementInput;
  refresh?: boolean;
}

interface CreateTaskProviderOptionsInput {
  difficulty?: string;
  customFields?: CustomFieldInput[];
}

interface UpdateTaskProviderOptionsInput {
  customFields?: CustomFieldInput[];
}
```

The CLI still exposes provider-friendly flags like `--project`, `--section`,
`--workspace`, `--difficulty`, and `--field`, but command code should normalize
them into `context` and `providerOptions` before calling plugins.

When implementing a new provider:

- support the common parts first
- read placement/workspace data from `context`
- read provider-specific advanced mutation data from `providerOptions`
- support richer fields only when the provider has a real equivalent
- reject unsupported advanced fields explicitly when necessary

Do not implement fake or lossy support just to satisfy symmetry.

## auth guidance

Provider auth should be explicit and testable.

Each provider should define:

- required auth fields
- optional auth fields if needed
- clear connection validation behavior

Current implementation uses `PROVIDER_CREDENTIALS` plus plugin/client validation.

Current rules:

- every required auth field should be declared in `requiredFields`
- every declared auth field should have a human-readable `label`
- every environment-backed field should declare `envVar`
- secret values such as tokens should set `secret: true`
- shared validation should reject missing required fields before storing
  credentials

Examples:

- Asana: token only
- Notion: token + database id
- Trello: api key + token

## testing expectations

Every new provider should have at least:

### mapper tests

Test:

- status mapping
- due date mapping
- project/placement mapping
- priority mapping if applicable
- task ID creation

### auth/connection tests

Test:

- valid connection path
- invalid credential path
- credential requirements unique to the provider

### command behavior coverage

At minimum, add coverage that proves the provider works for:

- one happy path
- one unsupported-feature or error path

### advanced capability tests

If the provider supports:

- comments
- threads
- attachments
- workspaces
- custom fields

add focused tests for those behaviors.

## plugin checklist

Use this checklist before considering a new plugin complete:

- [ ] provider added to `ProviderType`
- [ ] auth metadata added to `PROVIDER_CREDENTIALS`
- [ ] plugin package created under `packages/`
- [ ] client implemented
- [ ] mapper implemented
- [ ] plugin class implemented
- [ ] plugin registered in CLI init
- [ ] CLI dependency updated if needed
- [ ] unsupported features documented
- [ ] mapper tests added
- [ ] auth/connection tests added
- [ ] capability behavior tests added where relevant
- [ ] example/template patterns reviewed before introducing new shared shapes

## future-facing guidance

This guide should evolve with the provider contract hardening work.

When that work begins, update this file to include:

- the base provider interface
- capability manifest requirements
- capability-specific implementation expectations
- type guard patterns for optional capabilities

Until then, plugin authors should follow the spirit of that design:

- shared where the domain is shared
- provider-specific where the provider truly differs
- explicit about unsupported features

## related docs

- [provider-interface-hardening-plan.md](./todos/completed/provider-interface-hardening-plan.md)
- [application-service-refactor-plan.md](./todos/completed/application-service-refactor-plan.md)
- [README.md](../README.md)
