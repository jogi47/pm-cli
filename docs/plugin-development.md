# pm-cli Plugin Development Guide

This guide shows how to add a new provider plugin to `pm-cli`.

## 1) Implement `PMPlugin`

Create a plugin package (for example `packages/plugin-yourtool`) and implement the `PMPlugin` interface from `@jogi47/pm-cli-core/models`.

Your plugin should:
- expose provider metadata (`name`, `displayName`)
- authenticate and persist credentials
- implement task operations (`getAssignedTasks`, `createTask`, `updateTask`, etc.)

## 2) Create a client

Build a provider client (`src/client.ts`) that wraps API calls and translates low-level failures into actionable errors.

Recommended pattern:
- wrap API failures with `ProviderError`
- include reason + suggestion in all thrown errors

## 3) Create a mapper

Add `src/mapper.ts` to map provider objects into normalized `Task` objects.

Your mapper should set:
- `id` using `createTaskId(provider, externalId)`
- `source`, `status`, `title`, `url`
- optional fields (`placement`, `priority`, `tags`, custom field results)

## 4) Add provider config constants

Update provider unions and credential metadata:
- `ProviderType` in `packages/core/src/models/task.ts`
- `PROVIDER_CREDENTIALS` in plugin model metadata (if new auth fields are needed)

## 5) Register plugin in CLI init

In `packages/cli/src/init.ts`, register your plugin in `initializePlugins()`.

## 6) Testing guidelines

- Unit test mapper conversions.
- Unit test client error mapping for API failures.
- Add CLI-level tests for at least one happy path and one failure path.
- Verify cache behavior for assigned/overdue tasks where applicable.

## 7) Local workflow

1. `pnpm install`
2. `pnpm -r build`
3. `pnpm test`
4. Run the CLI in dev mode: `pnpm --filter @jogi47/pm-cli pm`

See `examples/plugin-template` for a minimal starting point.
