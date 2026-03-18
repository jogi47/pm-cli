# notion provider implementation plan

last updated: 2026-03-15
status: active
source review: `docs/reviews/notion-provider-api-review.md`

## purpose

This document turns the Notion provider review into an implementation plan.

Unlike Asana, the main challenge here is not only operational hardening. The
Notion plugin also exposes structural tension in the shared provider contract.

The plan therefore has two tracks:

- make the current integration safer and more predictable
- make the contract mismatch explicit so the provider architecture becomes more
  honest

## target outcome

After this plan is complete, the Notion provider should:

- have a clear and honest query contract
- stop depending entirely on fragile schema aliases
- either use explicit property mapping or remove the illusion that it exists
- have real regression coverage beyond mapper tests
- document its search and assignment semantics clearly
- handle rate limits and network failure more deliberately

## guiding principles

1. do not pretend Notion behaves like Asana if it does not
2. make semantic differences explicit in code and docs
3. prefer a smaller honest contract over a larger misleading one
4. add tests before making deeper behavior changes

## current key gaps

From the review, the highest-value gaps are:

1. `getAssignedTasks()` is not truly "assigned to me"
2. `notion.propertyMap` exists in config but is not used by the plugin
3. schema mapping is heavily alias-driven
4. search semantics are narrower than the command name suggests
5. SDK type imports and versioning are brittle
6. rate-limit, timeout, and failure behavior are thin
7. plugin-level tests are too light

## milestone 1: make the contract mismatch explicit

### goal

Stop hiding the fact that Notion's "assigned tasks" flow is currently
database-scoped rather than genuinely assignee-scoped.

### tasks

1. document the current behavior in the provider docs and code comments
2. decide whether the current behavior should remain:
   - database-scoped task listing
   - or a best-effort assignee-aware query
3. update the provider-interface hardening notes if the Notion case drives a new
   capability or query-semantic distinction

### likely files

- `packages/plugin-notion/src/index.ts`
- `docs/features/notion.md`
- `docs/todos/completed/provider-interface-hardening-plan.md`
- potentially `packages/core/src/models/plugin.ts` later

### implementation notes

- do not change semantics blindly before deciding the product contract
- the first win is honesty
- the second win is architecture clarity

### acceptance criteria

- maintainers and users can tell what `pm tasks assigned --source notion`
  actually means
- the shared architecture docs acknowledge this provider mismatch explicitly

## milestone 2: wire explicit property mapping or remove the dead contract

### goal

Resolve the inconsistency where `configManager` exposes Notion property maps but
the plugin does not actually use them.

### options

Option A:

- wire `notion.propertyMap` into mapper and write-path schema resolution

Option B:

- remove or de-emphasize the config surface until it is truly supported

### recommended option

Option A is better if the team wants Notion to remain a serious provider.

### tasks

1. identify all places currently using alias heuristics
2. define precedence:
   - configured property map
   - then title-property discovery where the API guarantees it
   - then alias fallback only if necessary
3. apply the property map in:
   - title/status/due-date/assignee/tag/priority mapping
   - create/update writes
   - overdue query resolution
4. update docs to tell users how to configure it

### likely files

- `packages/plugin-notion/src/index.ts`
- `packages/plugin-notion/src/mapper.ts`
- `packages/core/src/managers/config-manager.ts`
- `docs/features/notion.md`
- `README.md`

### acceptance criteria

- the Notion property-map feature is either real or removed
- schema handling becomes more deterministic for configured databases

## milestone 3: strengthen search and query semantics

### goal

Make Notion query behavior more understandable and less surprising.

### tasks

1. document that current search is title-property search if that remains true
2. decide whether broader search is desirable and feasible
3. if broader search is not implemented, avoid wording that implies true
   full-text search
4. review whether overdue and assigned queries should use more provider-side
   filters when the mapped properties are known

### likely files

- `packages/plugin-notion/src/client.ts`
- `packages/plugin-notion/src/index.ts`
- `docs/features/notion.md`
- `README.md`

### implementation notes

- this milestone is partly docs and partly behavior clarification
- do not oversell search capability

### acceptance criteria

- users understand what Notion search does and does not search
- docs and code semantics match

## milestone 4: harden sdk usage and network behavior

### goal

Reduce brittleness and make failure handling more intentional.

### tasks

1. pin `@notionhq/client` to an exact version
2. replace internal build-path type imports if possible
3. add a Notion-aware request wrapper or interception layer for rate-limit
   handling
4. define timeout expectations for SDK operations

### likely files

- `packages/plugin-notion/package.json`
- `packages/plugin-notion/src/client.ts`
- `docs/API-risk-report.md`

### implementation notes

- if the SDK does not expose public types needed cleanly, pinning becomes even
  more important
- start with read operations before deciding whether writes should be retried

### tests

1. `429` handling behavior
2. error mapping for schema/query failures
3. client initialization failures

### acceptance criteria

- SDK drift is controlled
- rate-limit failures no longer look like generic opaque errors

## milestone 5: expand test coverage beyond the mapper

### goal

Make the Notion plugin safe to change.

### tasks

1. add tests for auth initialization
2. add tests for assigned/search/overdue behavior
3. add tests for create/update using configured or aliased properties
4. add tests for unsupported custom-field update behavior
5. add regression tests for title-property discovery and property-map precedence

### likely files

- `packages/plugin-notion/test/plugin.test.ts`
- `packages/plugin-notion/test/client.test.ts`
- `packages/plugin-notion/test/mapper.test.ts`

### acceptance criteria

- the provider has meaningful plugin-level tests
- contract-sensitive behavior is no longer protected only by mapper tests

## milestone 6: improve user-facing diagnostics

### goal

Make Notion-specific failures easier to understand.

### tasks

1. replace generic `Error` throws with richer provider-aware errors where helpful
2. surface missing schema/property issues more clearly
3. distinguish:
   - not connected
   - invalid database id
   - missing expected mapped property
   - unsupported field mutation
   - rate-limited behavior

### likely files

- `packages/plugin-notion/src/index.ts`
- `packages/plugin-notion/src/client.ts`
- shared error helpers if needed

### acceptance criteria

- Notion failures become actionable rather than ambiguous

## milestone 7: align docs with actual Notion behavior

### goal

Make the documentation honest and useful.

### tasks

1. add a "provider caveats" section to `docs/features/notion.md`
2. explain the database-scoped nature of the integration more prominently
3. explain property-map usage once it is real
4. explain title-based search if that remains the behavior
5. explain which schema properties are recommended for best results

### likely files

- `docs/features/notion.md`
- `README.md`
- `docs/API-risk-report.md`

### acceptance criteria

- docs match behavior
- users can set up their Notion database with fewer surprises

## recommended commit boundaries

Keep these separate where possible:

1. `docs(notion): clarify query and search semantics`
2. `fix(notion): apply configured property mappings`
3. `test(notion): add plugin-level regression coverage`
4. `fix(notion): improve provider error handling`
5. `chore(notion): pin sdk version`

## minimum viable first slice

If only one thing should happen next, choose:

### milestone 2 first

Reason:

- highest structural value
- removes a misleading contract in the repo
- reduces schema fragility immediately

### concrete first implementation slice

1. decide property-map precedence
2. wire property-map usage into the mapper and write-path property lookup
3. add tests for configured mappings overriding alias heuristics
4. update Notion feature docs accordingly

## risks while implementing

1. mixing semantic contract cleanup with too many behavior changes at once
2. breaking current users whose databases happen to work via aliases today
3. overfitting to one Notion schema shape

## mitigation

1. keep semantics and implementation changes in separate commits
2. preserve alias fallback where reasonable during migration
3. add tests covering both configured mappings and alias fallback

## definition of done

The Notion provider cleanup is done when:

- the "assigned tasks" semantic mismatch is explicit and addressed
- property mapping is either truly supported or cleanly removed
- search semantics are documented honestly
- SDK versioning is controlled
- plugin-level tests exist for query and write flows
- provider-specific diagnostics are materially clearer
