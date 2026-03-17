# asana provider api compliance review

review date: 2026-03-15
review type: static code and documentation review
live api exercised: no
review baseline: `docs/provider-api-compliance-checklist.md`

## scope

This review covers the current Asana provider implementation in:

- `packages/plugin-asana/src/client.ts`
- `packages/plugin-asana/src/mapper.ts`
- `packages/plugin-asana/src/index.ts`
- `packages/plugin-asana/test/*.test.ts`
- `docs/features/asana.md`
- `README.md`

Official references used for review:

- https://developers.asana.com/docs/authentication
- https://developers.asana.com/docs/rate-limits
- https://developers.asana.com/docs/tasks
- https://developers.asana.com/docs/search-api
- https://developers.asana.com/docs/workspaces

## summary

The Asana plugin is one of the strongest integrations in the repository.

It has the richest capability surface, the clearest provider-specific behavior,
and materially better regression coverage than the other providers. The create,
update, workspace, custom-field, thread, and attachment flows are all much more
intentional than the average provider implementation.

The main weaknesses are operational rather than structural:

- no explicit retry or backoff behavior
- no explicit timeout strategy
- SDK version drift risk
- status normalization that still relies on section-name heuristics

## scorecard

- official api usage: `pass`
- authentication model: `pass`
- api versioning and sdk discipline: `partial`
- request construction: `pass`
- rate limits, retries, and backoff: `partial`
- timeout and network-failure handling: `partial`
- pagination, limit, and result semantics: `partial`
- schema and field mapping: `partial`
- capability boundaries: `pass`
- write safety: `pass`
- error mapping and user experience: `partial`
- caching behavior: `partial`
- observability and diagnostics: `partial`
- test coverage: `partial`
- documentation quality: `partial`

## what is good

### 1. the provider uses the official integration path

The plugin uses the official `asana` SDK and the public Asana API surface
through `packages/plugin-asana/src/client.ts`.

This is the right default for a mature provider with a first-party SDK.

### 2. the auth and workspace model is coherent

The auth path is simple and explicit:

- token-based auth
- user validation on connect
- workspace discovery during initialization
- persisted default workspace selection

The workspace model also fits Asana's actual product shape and is carried into
create/update flows rather than being faked as a generic cross-provider concept.

Relevant code:

- `packages/plugin-asana/src/client.ts:236`
- `packages/plugin-asana/src/client.ts:281`
- `packages/plugin-asana/src/client.ts:317`
- `packages/plugin-asana/src/client.ts:328`

### 3. write flows are stronger than the shared contract

The Asana plugin has real provider-side behavior for:

- project resolution
- section resolution
- workspace resolution
- custom-field resolution
- custom-field ambiguity handling
- task thread and attachment workflows

That makes it the best current example of a provider adapter with actual
provider-aware orchestration rather than a thin CRUD wrapper.

Relevant code:

- `packages/plugin-asana/src/index.ts:195`
- `packages/plugin-asana/src/index.ts:231`
- `packages/plugin-asana/src/index.ts:284`

### 4. regression coverage is meaningful

The Asana test suite does not only test mapping. It also tests:

- create-time project/section resolution
- custom-field resolution and ambiguity behavior
- update custom-field behavior
- thread and attachment pagination/joining

Relevant tests:

- `packages/plugin-asana/test/create-task-resolution.test.ts`
- `packages/plugin-asana/test/update-custom-fields.test.ts`
- `packages/plugin-asana/test/thread.test.ts`

## findings

### 1. no explicit rate-limit or retry handling

Severity: medium

The Asana client sends SDK requests directly without any visible provider-aware
retry, backoff, or `Retry-After` handling.

This matters because Asana documents rate limits and concurrent request limits,
and this provider is one of the heavier ones in the repo.

Evidence:

- `packages/plugin-asana/src/client.ts:391`
- `packages/plugin-asana/src/client.ts:413`
- `packages/plugin-asana/src/client.ts:441`

Impact:

- bursty search/list usage can fail harder than necessary
- future expansion of bulk or dashboard flows will amplify this weakness

Recommended fix:

1. add a small Asana-aware retry wrapper in the client
2. detect rate-limited responses explicitly
3. honor `Retry-After` or equivalent SDK metadata when available

### 2. timeout handling is missing, including attachment download

Severity: medium

There is no explicit timeout or abort strategy in the Asana path. Attachment
download uses bare `fetch` with no timeout guard.

Evidence:

- `packages/plugin-asana/src/index.ts:337`

Impact:

- slow or stalled downloads can hang longer than they should
- future network issues will surface as generic failures

Recommended fix:

1. wrap fetch-based attachment downloads with `AbortController`
2. introduce a consistent timeout policy for provider network operations

### 3. sdk version drift remains a real risk

Severity: medium

The Asana plugin uses the official SDK, but the dependency is still range-pinned
as `^3.0.0`.

Evidence:

- `packages/plugin-asana/package.json:28`

Impact:

- runtime behavior can drift without an intentional upgrade review

Recommended fix:

1. pin the Asana SDK to an exact version
2. treat upgrades as explicit maintenance work

### 4. task status normalization is still heuristic

Severity: medium

`mapAsanaStatus()` uses completion first, then infers non-done status from the
first membership section name.

Evidence:

- `packages/plugin-asana/src/mapper.ts:39`
- `packages/plugin-asana/src/mapper.ts:45`

Impact:

- custom workflows can be misclassified
- multi-homed tasks can be classified based on the wrong section
- section names like `review`, `blocked`, or provider-specific workflow stages
  collapse into `todo`

Recommended fix:

1. document the heuristic clearly
2. consider provider-specific status mapping configuration or richer normalized
   placement/state metadata

### 5. result completeness for list/search is not explicitly proven at the client level

Severity: low

The thread and attachment APIs paginate explicitly, but the primary task list
methods do not show equivalent pagination logic in the client.

Evidence:

- non-thread list methods: `packages/plugin-asana/src/client.ts:369`
- non-thread search methods: `packages/plugin-asana/src/client.ts:398`
- explicit thread pagination: `packages/plugin-asana/src/client.ts:651`
- explicit attachment pagination: `packages/plugin-asana/src/client.ts:679`

This is not necessarily wrong because the SDK may already abstract some of this,
but it is not obvious from the code and there are no explicit regression tests
proving multi-page completeness for these paths.

Recommended fix:

1. document whether the SDK call fully paginates or not
2. add at least one regression test around large result sets if practical

### 6. user-facing docs do not yet surface known provider caveats

Severity: low

The feature docs are strong, but they do not currently call out:

- rate-limit behavior
- plan-based search limitations
- custom status-mapping heuristics

Evidence:

- `docs/features/asana.md`

Recommended fix:

1. add a short "provider caveats" section to the Asana feature doc

## detailed notes by checklist area

### official api usage

Rating: `pass`

- official Asana SDK is used
- request fields are explicit
- workspace/task/search APIs map to public platform concepts

### authentication model

Rating: `pass`

- token auth is explicit
- workspace state is persisted cleanly
- connect initializes the user and workspace state immediately

### api versioning and sdk discipline

Rating: `partial`

- official SDK is a good choice
- range pinning is still too loose for a provider with meaningful workflow depth

### request construction

Rating: `pass`

- task list, search, overdue, project, section, and custom-field requests all
  use clear provider concepts
- create/update payload construction is coherent and explicit

### rate limits, retries, and backoff

Rating: `partial`

- risks are known and documented in repo docs
- implementation does not yet respond deliberately to rate limits

### timeout and network-failure handling

Rating: `partial`

- there is some provider-specific validation and resolution behavior
- there is no clear timeout policy

### pagination, limit, and result semantics

Rating: `partial`

- thread and attachments are handled carefully
- main list/search behavior depends on SDK behavior that is not obvious from the
  code itself

### schema and field mapping

Rating: `partial`

- placement mapping is good
- custom-field resolution is strong
- normalized status still depends on section-name heuristics

### capability boundaries

Rating: `pass`

- Asana-specific features are implemented on the Asana path instead of being
  pretended as cross-provider features

### write safety

Rating: `pass`

- create/update flows have real resolution logic
- ambiguous inputs fail with useful resolution behavior

### error mapping and user experience

Rating: `partial`

- some provider-specific validation exists
- retry/plan-related failures are not surfaced with the same intentionality yet

### caching behavior

Rating: `partial`

- metadata caches are targeted and pragmatic
- overall task caching is still generic rather than provider-tuned

### observability and diagnostics

Rating: `partial`

- connection info is decent
- provider health and rate-limit visibility are still minimal

### test coverage

Rating: `partial`

- very strong relative to the other providers
- still missing auth-failure and operational-failure coverage

### documentation quality

Rating: `partial`

- feature docs are detailed and useful
- provider caveats are still under-documented

## required fixes before calling this best-in-class

1. add explicit rate-limit and retry/backoff handling
2. add timeout handling for attachment download and other long network paths
3. pin the Asana SDK to an exact version
4. document the current status-mapping heuristic and known provider caveats

## follow-up improvements

1. prove or document list/search pagination completeness
2. add auth-failure and provider-error-path tests
3. expose more provider health/debug signals in `pm providers`

## conclusion

Asana is currently the strongest provider implementation in the repository.

If the team wants a reference adapter for future plugin architecture, Asana is
the closest thing to that today. The next step is not a redesign. It is
operational hardening: rate limits, timeouts, SDK pinning, and clearer caveat
documentation.
