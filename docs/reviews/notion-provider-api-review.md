# notion provider api compliance review

review date: 2026-03-15
review type: static code and documentation review
live api exercised: no
review baseline: `docs/provider-api-compliance-checklist.md`

## scope

This review covers the current Notion provider implementation in:

- `packages/plugin-notion/src/client.ts`
- `packages/plugin-notion/src/mapper.ts`
- `packages/plugin-notion/src/index.ts`
- `packages/plugin-notion/test/*.test.ts`
- `docs/features/notion.md`
- `README.md`

Official references used for review:

- https://developers.notion.com/reference/authentication
- https://developers.notion.com/reference/request-limits
- https://developers.notion.com/reference/post-database-query
- https://developers.notion.com/reference/post-search
- https://developers.notion.com/reference/patch-page

## summary

The Notion plugin uses the official SDK and now has a clearer credential model
than before, which is good. The provider is functional for the main happy-path
flows and the recent database-id and dynamic title-property fixes materially
improved correctness.

However, Notion is also where the shared provider contract starts to show its
weakness most clearly.

The main architectural problem is that the plugin does not truly implement
"assigned tasks" in the same way as other providers. It returns tasks from the
connected database, not tasks assigned to the current user. That is a pragmatic
product choice, but it is not a clean fit with the current shared interface.

The main implementation problems are:

- schema handling still relies heavily on heuristics
- configured property maps are not used by the plugin
- search is title-based rather than broad database text search
- there is no retry/backoff or timeout strategy
- test coverage is thin outside the mapper

## scorecard

- official api usage: `pass`
- authentication model: `pass`
- api versioning and sdk discipline: `partial`
- request construction: `partial`
- rate limits, retries, and backoff: `partial`
- timeout and network-failure handling: `partial`
- pagination, limit, and result semantics: `partial`
- schema and field mapping: `partial`
- capability boundaries: `partial`
- write safety: `partial`
- error mapping and user experience: `partial`
- caching behavior: `partial`
- observability and diagnostics: `partial`
- test coverage: `fail`
- documentation quality: `partial`

## what is good

### 1. the provider uses the official sdk and explicit credentials

The Notion plugin uses the official `@notionhq/client` and now requires both:

- integration token
- database id

That is materially better than pretending the token alone is enough.

Relevant code:

- `packages/plugin-notion/src/client.ts:23`
- `packages/plugin-notion/src/client.ts:42`
- `packages/plugin-notion/src/index.ts:29`
- `packages/core/src/models/plugin.ts:307`

### 2. recent correctness fixes improved the search path

The provider now resolves the actual title property dynamically before running
its database-title search.

Relevant code:

- `packages/plugin-notion/src/client.ts:217`
- `packages/plugin-notion/src/client.ts:243`

### 3. unsupported custom-field mutation is rejected explicitly

Notion does not pretend to support the richer Asana-style custom-field flows.

Relevant code:

- `packages/plugin-notion/src/index.ts:191`
- `packages/plugin-notion/src/index.ts:233`

## findings

### 1. `getassignedtasks` does not actually mean "assigned to me"

Severity: high

The shared provider contract says `getAssignedTasks()` should return tasks
assigned to the current user.

The Notion implementation does not query assignee at all. It queries database
pages sorted by `last_edited_time`, then filters out completed tasks.

Evidence:

- `packages/plugin-notion/src/index.ts:68`
- `packages/plugin-notion/src/index.ts:75`
- `packages/plugin-notion/src/index.ts:82`

Impact:

- the shared interface is semantically inconsistent across providers
- user expectations differ by provider
- future application-service extraction will inherit a leaky contract

Context:

- `docs/features/notion.md` does partially acknowledge this limitation later in
  the doc
- the shared interface itself still presents this as a true assigned-task query

Recommended fix:

1. decide whether Notion should keep a database-scoped interpretation
2. if yes, make that difference explicit in the provider capability model or
   application-service layer
3. do not keep pretending this is equivalent to Asana/Linear-style assignment

### 2. schema handling is still heuristic and ignores configured property maps

Severity: high

The repo has a Notion property-map config surface, but the plugin does not use
it. Instead it relies on hard-coded alias matching and title-property discovery.

Evidence:

- config surface exists in `packages/core/src/managers/config-manager.ts:15`
- alias-based schema resolution in `packages/plugin-notion/src/index.ts:103`
- alias-based write resolution in `packages/plugin-notion/src/index.ts:209`
- alias-based mapper logic in `packages/plugin-notion/src/mapper.ts:8`

Impact:

- user databases remain more fragile than they need to be
- the repo exposes configuration that does not actually guide the plugin
- future plugin authors get a misleading picture of how schema mapping should work

Recommended fix:

1. either remove the unused property-map contract
2. or wire `configManager.notion.propertyMap` into the plugin consistently
3. prefer explicit mapping over alias heuristics where users configure it

### 3. search semantics are narrower than the docs imply

Severity: medium

The Notion search path uses a title-property `contains` filter on the connected
database. It is not broad full-text search across page content.

Evidence:

- search implementation: `packages/plugin-notion/src/client.ts:217`
- docs wording: `docs/features/notion.md:112`

Impact:

- users can expect body/content search and not get it
- cross-provider search semantics diverge more than the command name suggests

Recommended fix:

1. document this explicitly as title-property search
2. if broader search is desired later, design it deliberately rather than
   implying it already exists

### 4. sdk usage is official, but the type import path is brittle

Severity: medium

The plugin imports Notion API endpoint types from an internal SDK build path:

- `@notionhq/client/build/src/api-endpoints.js`

Evidence:

- `packages/plugin-notion/src/client.ts:5`
- `packages/plugin-notion/package.json:22`

Impact:

- SDK internals can move in patch/minor releases
- this increases upgrade fragility on top of the current `^2.2.0` range

Recommended fix:

1. pin the SDK to an exact version
2. avoid internal build-path imports if the SDK exposes a more stable public type
   surface

### 5. no explicit rate-limit, retry, or timeout strategy exists

Severity: medium

The Notion client uses SDK calls directly with no visible queue, backoff, or
timeout policy.

Evidence:

- `packages/plugin-notion/src/client.ts:120`
- `packages/plugin-notion/src/client.ts:130`
- `packages/plugin-notion/src/client.ts:172`
- `packages/plugin-notion/src/client.ts:190`

Impact:

- bursty usage can fail harder than necessary
- Notion's lower request ceilings will be felt earlier than on some other providers

Recommended fix:

1. add a simple Notion-aware request wrapper with backoff for `429`
2. define a timeout policy for long-running SDK operations

### 6. write behavior depends on database aliases and payload assumptions

Severity: medium

Create/update behavior depends on finding properties with common names like:

- `description`
- `notes`
- `details`
- `status`
- `state`
- `due`
- `deadline`

Evidence:

- `packages/plugin-notion/src/index.ts:199`
- `packages/plugin-notion/src/index.ts:209`
- `packages/plugin-notion/src/index.ts:219`
- `packages/plugin-notion/src/index.ts:269`

Impact:

- writes can silently become weaker in user databases with different property names
- the integration remains more "best effort" than contract-driven

Recommended fix:

1. wire explicit property-map configuration
2. document which properties are required for best results
3. add regression tests for non-default schema names

### 7. test coverage is too thin for the complexity of this provider

Severity: medium

The Notion provider currently has mapper coverage but no meaningful coverage for:

- auth initialization
- query behavior
- search behavior
- create/update behavior
- unsupported custom-field behavior

Evidence:

- existing tests: `packages/plugin-notion/test/mapper.test.ts`

Impact:

- behavior can regress without detection
- the provider is less trustworthy as a reference implementation

Recommended fix:

1. add client/plugin tests for auth and query flows
2. add write-path tests
3. add regression tests for schema alias behavior and unsupported features

## detailed notes by checklist area

### official api usage

Rating: `pass`

- official Notion SDK is used
- no unofficial endpoints or scraping behavior were found

### authentication model

Rating: `pass`

- token and database id are both explicit
- connect flow and env-based expectations are now aligned better than before

### api versioning and sdk discipline

Rating: `partial`

- official SDK is the right base choice
- range pinning plus internal type imports increase drift risk

### request construction

Rating: `partial`

- database query usage is coherent
- search and assigned-task semantics are narrower than the shared command names imply

### rate limits, retries, and backoff

Rating: `partial`

- repo docs recognize the risk
- implementation does not yet react deliberately to provider rate limits

### timeout and network-failure handling

Rating: `partial`

- there is no explicit timeout strategy visible in the plugin

### pagination, limit, and result semantics

Rating: `partial`

- the current behavior is pragmatic
- result meaning still depends heavily on schema and provider query limits

### schema and field mapping

Rating: `partial`

- title-property discovery is good
- the rest of the mapping is still alias-driven and not contract-driven

### capability boundaries

Rating: `partial`

- unsupported custom-field mutation is rejected explicitly
- the provider still stretches the meaning of "assigned tasks"

### write safety

Rating: `partial`

- archive semantics for delete are reasonable and explicit
- write success depends heavily on heuristic schema discovery

### error mapping and user experience

Rating: `partial`

- user-facing errors exist in some places
- many failures still surface as generic `Error` rather than richer
  provider-specific diagnostics

### caching behavior

Rating: `partial`

- generic task caching exists
- nothing here is obviously unsafe, but it is not provider-tuned

### observability and diagnostics

Rating: `partial`

- provider info exposes the connected user and database-scoped state
- deeper schema/debug visibility is still missing

### test coverage

Rating: `fail`

- mapper coverage alone is not enough for this provider

### documentation quality

Rating: `partial`

- docs are much better than before
- search semantics and schema caveats still need more honesty

## required fixes before calling this a strong reference plugin

1. resolve the assigned-task contract mismatch explicitly
2. wire or remove `notion.propertyMap` so the contract is honest
3. add real plugin-level tests beyond mapper coverage
4. pin the SDK deliberately and avoid brittle internal type imports
5. document title-only search and schema expectations more clearly

## follow-up improvements

1. add rate-limit/backoff handling for `429`
2. add a timeout policy for SDK operations
3. add richer diagnostics for schema mismatch and missing expected properties

## conclusion

The Notion provider is workable, but it is not yet a strong architectural
reference for future plugins.

Its main problem is not that it uses Notion. The main problem is that it has to
bend the shared contract in order to fit Notion's database model, and the repo
has not yet made that bending explicit enough.

If the team wants a solid long-term provider architecture, the Notion review is
the clearest signal that provider capability and query semantics need to become
more explicit in the shared design.
