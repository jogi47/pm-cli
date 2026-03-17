# asana provider implementation plan

last updated: 2026-03-15
status: active
source review: `docs/reviews/asana-provider-api-review.md`

## purpose

This document turns the Asana provider review into an execution plan.

It is not a redesign plan. The Asana plugin is already the strongest provider in
the repository. The goal here is operational hardening and contract cleanup:

- make network behavior safer
- reduce SDK drift risk
- tighten documentation around known caveats
- improve confidence in list/search correctness

## target outcome

After this plan is complete, the Asana provider should be the reference-quality
provider in the repo:

- official API usage remains intact
- network failure handling is deliberate
- rate-limit behavior is handled intentionally
- attachment download cannot hang indefinitely
- SDK upgrades are explicit
- the remaining mapping heuristics are documented honestly

## guiding principles

1. keep provider behavior stable unless the user experience clearly improves
2. prefer small changes in `client.ts`, `index.ts`, tests, and docs
3. do not mix broad architecture refactors into this provider hardening work
4. keep Asana-specific behavior on the Asana path instead of polluting shared
   abstractions

## current key gaps

From the review, the highest-value gaps are:

1. no explicit retry/backoff handling
2. no timeout strategy, especially for attachment download
3. SDK dependency is range-pinned
4. status normalization still uses section-name heuristics
5. list/search pagination completeness is not explicitly proven
6. provider caveats are under-documented

## milestone 1: harden network behavior

### goal

Make request failure behavior more predictable without changing core product
semantics.

### tasks

1. add a small Asana request wrapper for SDK-backed operations
2. detect rate-limited failures and map them into clearer provider errors
3. add bounded retry behavior for retry-safe read operations only
4. define a conservative max retry count
5. keep create/update/delete/comment writes non-retrying by default unless the
   operation is proven idempotent

### likely files

- `packages/plugin-asana/src/client.ts`
- `packages/core/src/errors/*` or the existing provider-error utilities if needed
- provider tests under `packages/plugin-asana/test/`

### implementation notes

- start with read-only calls:
  - `getMyTasks`
  - `searchTasks`
  - `getOverdueTasks`
  - `getProjects`
  - `getSectionsForProject`
  - `getCustomFieldSettingsForProject`
  - `getTaskStories`
  - `getTaskAttachments`
- map rate-limit failures to a message that tells the user what happened and
  whether retry is automatic or manual
- if the SDK exposes useful error metadata, keep the mapping local to the Asana
  client instead of leaking SDK details into shared code

### tests

Add tests for:

1. rate-limited read request retries then succeeds
2. rate-limited read request exhausts retries and throws a clear error
3. write operations do not silently retry unless intentionally allowed

### acceptance criteria

- Asana read requests no longer fail immediately on the first transient
  rate-limit event
- error messages are clearer than generic SDK failures
- no destructive operation gains unsafe retry behavior

## milestone 2: add timeout handling

### goal

Prevent long-running or stalled network operations from hanging indefinitely.

### tasks

1. add timeout support for attachment download in `index.ts`
2. add timeout support for any direct `fetch` path on the Asana side
3. decide whether SDK-backed calls need a documented timeout boundary or just
   clearer failure wrapping

### likely files

- `packages/plugin-asana/src/index.ts`
- `packages/plugin-asana/src/client.ts`
- `packages/plugin-asana/test/thread.test.ts`

### implementation notes

- use `AbortController` for attachment downloads
- keep the timeout value configurable only if there is a real user need; do not
  add a new flag unless necessary
- start with a pragmatic default timeout for downloads

### tests

1. attachment download aborts on timeout
2. timeout errors are rendered as actionable provider/file-download failures

### acceptance criteria

- attachment downloads cannot hang forever
- timeout failures mention the Asana provider and the download context

## milestone 3: pin and manage sdk versions intentionally

### goal

Make SDK upgrades explicit rather than accidental.

### tasks

1. pin `asana` to an exact version in `packages/plugin-asana/package.json`
2. update release/maintenance docs if needed
3. add a short note in the API risk doc that Asana SDK drift is now controlled

### likely files

- `packages/plugin-asana/package.json`
- `docs/API-risk-report.md`

### implementation notes

- this is intentionally small and mechanical
- keep it separate from behavior changes

### acceptance criteria

- the dependency no longer uses `^`
- future upgrades are explicit PRs/commits

## milestone 4: document and contain mapping heuristics

### goal

Make the remaining status-mapping heuristic honest and easier to revisit later.

### tasks

1. document how `mapAsanaStatus()` currently works
2. document the limitation around section-name inference
3. decide whether richer placement/status metadata should be a later architecture
   task instead of a provider-local fix
4. add mapper tests for ambiguous or uncommon section names

### likely files

- `packages/plugin-asana/src/mapper.ts`
- `packages/plugin-asana/test/mapper.test.ts`
- `docs/features/asana.md`

### implementation notes

- do not over-engineer this immediately
- first make the heuristic explicit
- then decide later whether to expand normalized status semantics at the core
  model level

### acceptance criteria

- maintainers know exactly why a task became `todo` vs `in_progress`
- docs do not imply perfect workflow-state fidelity

## milestone 5: prove or document list/search pagination behavior

### goal

Remove ambiguity about whether list/search completeness depends on SDK behavior.

### tasks

1. confirm whether the current SDK calls return all requested pages or only one
   page
2. if they already paginate adequately, document that in code comments/tests
3. if not, implement explicit pagination where needed
4. add regression tests for large result sets where practical

### likely files

- `packages/plugin-asana/src/client.ts`
- `packages/plugin-asana/test/*`
- `docs/API-risk-report.md`

### implementation notes

- thread and attachment pagination already show the desired explicit style
- list/search should either match that explicitness or be documented clearly

### acceptance criteria

- maintainers can answer whether large Asana result sets are complete
- the answer is encoded in tests or clear code comments, not guesswork

## milestone 6: improve user-facing docs and caveats

### goal

Align docs with actual provider behavior and constraints.

### tasks

1. add a short "provider caveats" section to `docs/features/asana.md`
2. document possible rate-limit behavior and retry expectations
3. document that workflow-state normalization is approximate
4. mention any known plan-related search limitations if still relevant

### likely files

- `docs/features/asana.md`
- `README.md`
- `docs/API-risk-report.md`

### acceptance criteria

- docs are honest about caveats
- users are less surprised by provider-specific behavior

## recommended commit boundaries

Keep these as separate commits where possible:

1. `fix(asana): add retry handling for read operations`
2. `fix(asana): add timeout handling for downloads`
3. `chore(asana): pin sdk version`
4. `test(asana): cover status heuristics and pagination behavior`
5. `docs(asana): document provider caveats`

## minimum viable first slice

If only one milestone should be done next, choose:

### milestone 1 first

Reason:

- highest operational value
- lowest user frustration reduction per line changed
- complements the API compliance work directly

### concrete first implementation slice

1. add a local retry helper in `packages/plugin-asana/src/client.ts`
2. wrap `getMyTasks`, `searchTasks`, and `getOverdueTasks`
3. add tests for retried vs exhausted read failures
4. keep writes unchanged in the same slice

## risks while implementing

1. accidental retry of non-idempotent operations
2. over-generalized retry logic leaking into other providers too early
3. changing behavior of working flows without enough tests

## mitigation

1. start with read-only operations only
2. keep retry logic local to Asana first
3. add regression coverage before widening scope

## definition of done

The Asana provider hardening work is done when:

- rate-limit handling exists for read operations
- downloads have timeout protection
- the SDK is pinned deliberately
- status heuristics are documented and better tested
- list/search completeness is either proven or clearly documented
- feature docs include provider caveats
