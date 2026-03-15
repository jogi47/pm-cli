# PM CLI — Security Audit & Code Review Report

Original report date: 2026-03-08
Status review date: 2026-03-15

This document has been updated to reflect the current repository state as of
2026-03-15. Several findings from the original review are now resolved and were
left stale in the previous version of this file.

## Security Audit Report

### 1. Command Injection

Status: `resolved / low risk`

Current state:
- `pm branch` uses `execFileSync`
- branch names are sanitized and then validated before execution

Relevant code:
- `packages/cli/src/commands/branch.ts`
- `packages/cli/src/lib/branch-name.ts`

### 2. Credential Storage

Status: `accepted / low risk`

Current state:
- provider credentials are still stored through `conf`
- the configured encryption key still provides obfuscation rather than strong
  secret-at-rest guarantees

Assessment:
- this remains a low-risk tradeoff, not a new regression

### 3. File System Vulnerabilities

Status: `resolved`

Current state:
- the metadata cache is written through an encrypted file adapter rather than
  plaintext JSON

Result:
- task metadata is no longer stored in readable plain text on disk

Relevant code:
- `packages/core/src/managers/cache-manager.ts`

## Code Review Report

### 1. Hardcoded Provider List in AuthManager

Status: `resolved`

Current state:
- `getConnectedProviders()` now reads provider names from the active plugin
  registry instead of a hardcoded provider list

Result:
- newly added registered providers can be discovered without maintaining a
  second static list in `AuthManager`

Relevant code:
- `packages/core/src/managers/auth-manager.ts`
- `packages/core/src/managers/plugin-manager.ts`

### 2. Git Branch Sanitization Logic Flaw

Status: `resolved`

Current state:
- the branch command sanitizes individual segments
- after composing the final branch name, it sanitizes the final string again
- it then validates the final value with `isValidGitBranchName()`

Result:
- invalid joined names such as refs containing `..` or malformed separators are
  rejected before git is called

Relevant code:
- `packages/cli/src/commands/branch.ts`
- `packages/cli/src/lib/branch-name.ts`

### 3. Incomplete Tests for Git Branch Name Validation

Status: `resolved`

Current state:
- branch tests now cover multiple reserved git patterns including `.lock`,
  `@{`, backslashes, leading `/`, leading `-`, trailing `.`, trailing `/`, and
  spaces

Relevant code:
- `packages/cli/test/commands/branch.test.ts`

### 4. Error Suppression in PluginManager Aggregation

Status: `resolved`

Current state:
- `pluginManager.aggregateTasks()` returns both `tasks` and collected provider
  `errors`
- CLI commands such as `today`, `tasks assigned`, `tasks overdue`, and
  `summary` surface those provider errors as warnings

Result:
- partial-provider failures are no longer silently dropped at the main command
  layer

Relevant code:
- `packages/core/src/managers/plugin-manager.ts`
- `packages/cli/src/commands/today.ts`
- `packages/cli/src/commands/tasks/assigned.ts`
- `packages/cli/src/commands/tasks/overdue.ts`
- `packages/cli/src/commands/summary.ts`

### 5. Fragile `setByPath` Implementation in ConfigManager

Status: `resolved`

Current state:
- `setByPath()` now throws when an intermediate key exists but is not an object
  instead of silently overwriting it

Relevant code:
- `packages/core/src/managers/config-manager.ts`

### 6. Cache Writes During Read Operations

Status: `resolved`

Current state:
- `cacheManager.getTasks()` no longer writes the database when it encounters an
  expired entry during a read

Relevant code:
- `packages/core/src/managers/cache-manager.ts`

### 7. Inconsistent Error Handling for Bulk Operations

Status: `resolved`

Current state:
- bulk operations still preserve per-item results for partial success handling
- when any item fails, bulk manager methods now throw a typed
  `BulkOperationError` carrying those results
- CLI commands such as `done` and `delete` catch that typed error and render the
  partial results explicitly

Result:
- manager-level failures now use exceptions consistently across single-item and
  bulk-item operations while preserving user-visible partial-success output

Relevant code:
- `packages/core/src/managers/plugin-manager.ts`
- `packages/core/src/utils/errors.ts`
- `packages/cli/src/commands/done.ts`
- `packages/cli/src/commands/delete.ts`

## Current Open Findings

No open findings remain from the original 2026-03-08 report as of 2026-03-15.
