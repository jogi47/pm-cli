# pm-cli provider api compliance checklist

last reviewed: 2026-03-15
status: active review gate

## purpose

This document defines the minimum API integration standard for every provider
plugin in this repository.

It exists to make provider behavior consistent where possible, while still
allowing provider-specific differences where they are real and unavoidable.

Use this document when:

- adding a new provider plugin
- reviewing an existing provider plugin
- changing authentication, search, create, update, or delete flows
- deciding whether a provider integration follows the provider's documented best
  practices

This file is a practical review gate, not a design brainstorm.

Related docs:

- [api risk report](/Users/jogimac/playgrounds/pm-cli/docs/API-risk-report.md)
- [plugin development](/Users/jogimac/playgrounds/pm-cli/docs/plugin-development.md)
- [provider interface hardening plan](/Users/jogimac/playgrounds/pm-cli/docs/todos/completed/provider-interface-hardening-plan.md)

## required review inputs

Before reviewing or building a provider plugin, gather these inputs:

1. official provider API reference
2. official auth documentation
3. official rate-limit documentation
4. official pagination/filtering/search documentation
5. the current plugin's `client.ts`, `mapper.ts`, and `index.ts`
6. the shared contract in `packages/core/src/models/plugin.ts`
7. the normalized task model in `packages/core/src/models/task.ts`

Do not treat blog posts, AI-generated snippets, or stale examples as the source
of truth.

## compliance levels

Use these ratings during review:

- `pass`
  - behavior matches the expected standard
- `partial`
  - behavior is directionally correct but missing an important safeguard
- `fail`
  - behavior conflicts with the required standard or is undocumented
- `not-applicable`
  - the provider does not support the capability at all

## checklist

### 1. official api usage

- `pass` if the plugin uses the provider's official public API surface
- `pass` if the plugin documents whether it uses an official SDK or direct HTTP
- `fail` if the plugin depends on unofficial endpoints, undocumented fields, or
  scraping
- `fail` if the code path cannot be traced back to official docs

Review notes:

- if an SDK is used, document why the SDK is preferred
- if direct HTTP is used, document why there is no SDK or why bypassing the SDK
  is intentional

### 2. authentication model

- `pass` if the plugin uses the provider's recommended auth model for this CLI
- `pass` if credentials required by the provider are explicit in docs and code
- `pass` if auth failures produce a provider-specific error with a useful
  suggestion
- `partial` if auth works but the credential contract is under-documented
- `fail` if the plugin relies on an auth pattern the provider is deprecating
- `fail` if required auth inputs are implicit or guessed

Review questions:

- do env vars and interactive connect flow require the same inputs
- are workspace, database, board, team, or list identifiers handled explicitly
- does the provider need token plus another required identifier

### 3. api versioning and sdk discipline

- `pass` if API version requirements are explicit where the provider requires
  them
- `pass` if SDK-based integrations pin versions deliberately
- `partial` if version ranges are used with documented monitoring
- `fail` if API or SDK drift can change behavior silently without ownership

Review notes:

- SDK ranges like `^x.y.z` increase drift risk
- providers with strict version headers or changelogs should be monitored

### 4. request construction

- `pass` if requests use documented endpoints, headers, query params, and body
  shapes
- `pass` if search, filtering, and pagination use provider-supported patterns
- `partial` if the plugin works but overfetches because provider-side filters
  are not used well
- `fail` if requests depend on undocumented response behavior

Review questions:

- are we using provider-side pagination correctly
- are we using provider-side filters before falling back to local filtering
- are we constructing ids, team ids, workspace ids, or board ids safely

### 5. rate limits, retries, and backoff

- `pass` if documented rate-limit behavior is handled intentionally
- `pass` if `429` or equivalent quota responses are mapped to actionable errors
- `pass` if retry/backoff behavior respects provider guidance
- `partial` if limits are known but only documented, not handled
- `fail` if the plugin ignores documented rate-limit headers or retry guidance

Minimum expectation:

- detect rate-limited responses
- avoid tight retry loops
- use `retry-after` or equivalent reset metadata when available
- avoid hiding rate-limit failures behind generic errors

### 6. timeout and network-failure handling

- `pass` if request failures are mapped into provider-specific errors
- `pass` if the plugin avoids hanging indefinitely on network calls
- `partial` if failures are surfaced but timeout strategy is missing
- `fail` if transient network failures surface as unclear generic exceptions

Review questions:

- are fetch-based clients using a timeout or abort strategy
- are provider outages surfaced clearly
- do user-facing errors tell the user what to do next

### 7. pagination, limit, and result semantics

- `pass` if provider pagination semantics are understood and documented
- `pass` if user-facing `--limit` means display limit, not accidental pre-filter
  fetch limit
- `partial` if the plugin works but result completeness is only heuristic
- `fail` if pagination causes obviously incomplete or misleading results

Review notes:

- prefer provider-side pagination plus post-filter truncation only where needed
- document known limits when a provider search API cannot express needed filters

### 8. schema and field mapping

- `pass` if provider fields are normalized into the shared task model clearly
- `pass` if schema variability is handled intentionally
- `partial` if heuristics are used but documented
- `fail` if shared fields depend on unstable assumptions with no guardrails

Review questions:

- are title, status, assignee, due date, and url mapped consistently
- do provider-specific fields leak into the shared task model unnecessarily
- are provider-specific custom fields isolated from the core contract

### 9. capability boundaries

- `pass` if unsupported features are rejected explicitly
- `pass` if provider-specific capabilities are documented clearly
- `partial` if unsupported behavior fails indirectly rather than explicitly
- `fail` if commands assume unsupported features exist

Examples:

- comments
- thread/activity
- attachments
- workspaces
- advanced custom fields

### 10. write safety

- `pass` if create, update, complete, and delete use documented provider flows
- `pass` if destructive actions are handled carefully in the CLI
- `partial` if writes work but provider-specific caveats are undocumented
- `fail` if writes can corrupt state because provider-side rules are ignored

Review questions:

- are create/update payload limits respected
- are required parent/container/list/workspace ids explicit
- does delete use the provider's actual delete/archive semantics correctly

### 11. error mapping and user experience

- `pass` if provider errors become actionable CLI errors
- `pass` if auth, permission, quota, not-found, and unsupported-feature failures
  are distinguishable
- `partial` if errors are readable but not diagnostic enough
- `fail` if provider failures surface as opaque stack-like messages

Minimum expectation:

- provider name included
- useful reason included when available
- useful suggestion included when available

### 12. caching behavior

- `pass` if cache usage is safe for the provider's freshness and quota profile
- `partial` if cache is generic but acceptable
- `fail` if caching risks stale destructive actions or hides critical updates

Review questions:

- is the cache TTL reasonable for the provider
- are mutable metadata lookups cached safely
- could stale cache create misleading UX

### 13. observability and diagnostics

- `pass` if the plugin exposes enough information to debug common failures
- `partial` if debugging depends mostly on reading source
- `fail` if provider failures cannot be diagnosed without adding ad hoc logging

Useful signals:

- connected user identity
- selected workspace or database
- common provider warnings
- known plan limitations

### 14. test coverage

- `pass` if the plugin has focused tests for auth, mapping, query, and write
  behavior
- `pass` if regressions around provider-specific edge cases are covered
- `partial` if only happy paths are tested
- `fail` if provider behavior is mostly untested

Minimum expected tests:

- auth initialization and invalid credential handling
- task mapping into the normalized task model
- list/search behavior
- one write path
- unsupported feature behavior
- provider-specific regression tests for known bugs

### 15. documentation quality

- `pass` if user docs match the actual credential and capability model
- `pass` if provider caveats are documented honestly
- `partial` if docs are mostly correct but incomplete
- `fail` if docs claim features or auth paths that do not work

Review notes:

- `README.md`
- provider-related docs under `docs/`
- command help text
- examples for env-based auth

## provider review template

Use this template when reviewing a provider:

```md
## provider: <name>

- official api usage: pass | partial | fail
- authentication model: pass | partial | fail
- api versioning and sdk discipline: pass | partial | fail
- request construction: pass | partial | fail
- rate limits, retries, and backoff: pass | partial | fail
- timeout and network-failure handling: pass | partial | fail
- pagination, limit, and result semantics: pass | partial | fail
- schema and field mapping: pass | partial | fail
- capability boundaries: pass | partial | fail
- write safety: pass | partial | fail
- error mapping and user experience: pass | partial | fail
- caching behavior: pass | partial | fail
- observability and diagnostics: pass | partial | fail
- test coverage: pass | partial | fail
- documentation quality: pass | partial | fail

### findings

1. ...
2. ...

### required fixes before release

1. ...
2. ...

### follow-up improvements

1. ...
2. ...
```

## release gate rule

A provider should not be treated as production-ready unless:

- there are no `fail` ratings in auth, request construction, write safety, or
  error mapping
- rate-limit handling is at least `partial` with explicit documentation
- documentation matches the actual code path
- the plugin has regression tests for its known edge cases

## recommended next step for this repository

Use this checklist to perform a formal pass on:

1. Asana
2. Notion
3. Trello
4. Linear
5. ClickUp

Then record the results either:

- in `docs/API-risk-report.md` as a summary
- or in separate provider review docs under `docs/archives/` or `docs/reviews/`

The checklist should also become part of the review gate for every new provider
plugin.
