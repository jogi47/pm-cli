# pm-cli api risk report

last reviewed against repository: 2026-03-15
external research baseline carried forward from earlier report: february 2026
status: active operational document

## purpose

This document tracks provider-specific API risks that still matter to the
current `pm-cli` codebase.

It is intentionally a live current-state document.

It should answer:

- which providers are actually implemented
- which constraints still matter operationally
- which risks are already mitigated in the codebase
- which risks remain open and actionable

This file should not be used as a milestone history log.

If a note is purely historical, move it to `docs/archives/`.

## current implementation status

All five provider packages are implemented in the repository:

| Provider | Package | Status |
|---|---|---|
| Asana | `pm-cli-plugin-asana` | implemented |
| Notion | `pm-cli-plugin-notion` | implemented |
| Trello | `pm-cli-plugin-trello` | implemented |
| Linear | `pm-cli-plugin-linear` | implemented |
| ClickUp | `pm-cli-plugin-clickup` | implemented |

## official api references and integration path

This section is the canonical pointer to the provider documentation that should
be used when reviewing or extending each plugin.

The CLI does talk to the providers through their public APIs. The only question
is whether it does so through an official SDK or through direct HTTP requests.

| Provider | Official docs | Current integration path in repo | Current auth style in repo |
|---|---|---|---|
| Asana | https://developers.asana.com/docs/authentication and https://developers.asana.com/docs/rate-limits | official `asana` sdk via `packages/plugin-asana/src/client.ts` | personal access token in `Authorization: Bearer ...` |
| Notion | https://developers.notion.com/reference/authentication and https://developers.notion.com/reference/request-limits | official `@notionhq/client` sdk via `packages/plugin-notion/src/client.ts` | integration token with database access |
| Trello | https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/ and https://developer.atlassian.com/cloud/trello/guides/rest-api/rate-limits/ | direct REST calls via `fetch` in `packages/plugin-trello/src/client.ts` | api key + token as query params |
| Linear | https://linear.app/developers/graphql and https://linear.app/developers/rate-limiting | direct GraphQL over `fetch` in `packages/plugin-linear/src/client.ts` | personal api key in `Authorization` header |
| ClickUp | https://developer.clickup.com/docs/index and https://developer.clickup.com/docs/rate-limits | direct REST calls via `fetch` in `packages/plugin-clickup/src/client.ts` | personal token in `Authorization` header |

### why this section exists

- future plugin work should start from official docs, not blog posts or SDK
  examples copied from random sources
- provider behavior should be validated against these references when auth,
  pagination, search, write flows, or rate-limit handling change
- this repo should document whether a plugin is intentionally using an official
  SDK or intentionally bypassing one

## best-practice alignment against provider apis

This is the short answer to "are we using the providers in a best-practice
way?".

| Provider | Good alignment | Current gaps |
|---|---|---|
| Asana | uses official sdk; uses bearer auth; supports workspace-aware flows | sdk is range-pinned, not exact; known free-plan/search degradation is not surfaced clearly |
| Notion | uses official sdk; requires database id explicitly; handles schema lookup for title property | no request queue/backoff on `429`; no generalized handling for payload-size/rich-text limits |
| Trello | uses documented REST endpoints and auth model | no use of rate-limit headers; no throttling; no explicit long-term auth migration strategy |
| Linear | uses documented GraphQL endpoint and header auth; checks GraphQL `errors` array | no use of request/complexity headers; no backoff or query-cost controls |
| ClickUp | uses documented v2 REST endpoints and header auth | no use of rate-limit headers; no retry/backoff; no timeout strategy; workspace/list assumptions are still thin |

### practical rule

For every provider plugin, "best practice" should mean at least:

1. use the official public API and official docs as the source of truth
2. use the provider's recommended auth flow for the product shape of this CLI
3. respect documented rate-limit behavior, including `429` and reset headers
4. prefer provider-supported pagination and filtering instead of client-side
   overfetch where possible
5. surface provider-specific plan or capability limitations clearly to users
6. keep SDK versions pinned deliberately when an SDK is used

## current feature surface by provider

This table reflects the codebase today, not the original planning milestones.

| Provider | list/search/basic crud | comments | thread/activity | attachment download | workspaces | advanced custom-field support |
|---|---|---|---|---|---|---|
| Asana | yes | yes | yes | yes | yes | yes |
| Notion | yes | yes | no | no | no | no |
| Trello | yes | yes | no | no | no | no |
| Linear | yes | yes | no | no | no | no |
| ClickUp | yes | yes | no | no | no | no |

Notes:

- thread and attachment flows are currently implemented only on the Asana path
- workspace switching is operationally meaningful only for Asana today
- advanced create/update field resolution is currently concentrated in the
  Asana plugin

## risk summary

This section focuses on active engineering risks for the current implementation.

| Provider | Main risk type | Current severity | Why it matters now |
|---|---|---|---|
| Asana | free-plan search restrictions and rate-limit handling | medium | search/overdue behavior can degrade on some plans; retry logic is not implemented |
| Notion | rate limiting and schema variability | medium | property mapping and throughput remain user-schema dependent |
| Trello | auth migration and search/rate-limit discipline | low to medium | current plugin works, but future auth changes could affect long-term support |
| Linear | schema churn and GraphQL rate/compexity handling | low to medium | current plugin avoids sdk churn, but API evolution still matters |
| ClickUp | reliability and custom-field/rate-limit constraints | medium to high | platform performance and free-plan custom-field limits can affect UX |

## repository-level observations

These are cross-provider facts about the current codebase.

### 1. no universal provider-side rate limiter yet

Current state:

- requests are sent directly through provider clients
- there is no shared token bucket or provider-specific throttling layer in
  `core`
- there is no centralized retry/backoff strategy

Impact:

- bursty usage can still trigger provider-specific rate limits
- different providers will continue to handle throttling inconsistently until a
  shared strategy exists

### 2. caching is uniform, not provider-tuned

Current state:

- the repository uses a uniform 5-minute TTL through `cacheManager`
- cache path is `~/.cache/pm-cli/cache.json`

Impact:

- good enough for now
- not ideal for providers with very different latency or quota profiles

### 3. provider health visibility is minimal

Current state:

- `pm providers` shows connection status and basic user/workspace details
- it does not show:
  - rate-limit state
  - last failure state
  - recent latency
  - plan-related warnings

Impact:

- troubleshooting remains reactive

### 4. provider-specific graceful degradation is incomplete

Current state:

- some provider limitations are known from research
- not all of them are surfaced to users in a provider-specific way

Impact:

- users can still hit provider limitations and receive generic API failures

## provider details

## 1. asana

status: implemented
risk level: medium

### what is implemented

- assigned tasks
- overdue tasks
- search
- task detail
- create/update/complete/delete
- comments
- task thread
- attachment inspection and download
- workspace switching
- advanced custom-field resolution

### active risks

#### a. free-plan search restrictions

Earlier provider research identified Asana search restrictions on some free
plans, especially around `/tasks/search` returning HTTP 402.

Current repo state:

- the codebase does not implement a dedicated graceful fallback for this known
  limitation
- there is no provider-specific "paid plan required" UX path in the Asana
  plugin today

Why it matters:

- `pm tasks search` and possibly parts of overdue/search-like flows can still
  degrade poorly for affected users

#### b. rate-limit and retry handling

Current repo state:

- there is no `Retry-After` handling or provider-specific backoff logic

Why it matters:

- Asana rate limits and concurrency limits can still surface as avoidable
  failures under heavier usage

#### c. sdk version pinning

Current repo state:

- the Asana package still uses a version range:
  - `asana: "^3.0.0"`

Why it matters:

- automatic minor/patch drift in third-party SDK behavior can change runtime
  behavior unexpectedly

### mitigations already present

- workspace selection flow exists
- workspace state is persisted
- task thread and attachment behavior is isolated to the Asana path
- metadata caching reduces repeated project/section/custom-field fetches

### recommended next actions

1. add provider-specific handling for known 402 search restrictions
2. add retry/backoff support for rate-limited Asana requests
3. pin the Asana SDK to an exact version
4. consider surfacing provider health warnings in `pm providers`

## 2. notion

status: implemented
risk level: medium

### what is implemented

- assigned tasks
- overdue tasks
- search
- task detail
- create/update/complete/delete
- comments

### active risks

#### a. schema variability

Notion databases are user-defined, so field naming and status property design
are not stable across users.

Current repo state:

- the plugin resolves several fields heuristically
- status and due-date mapping still depend on user schema conventions
- advanced custom-field updates are not supported

Why it matters:

- integrations remain sensitive to user-specific database setup

#### b. rate limiting

Current repo state:

- no explicit request throttling exists

Why it matters:

- Notion's low average request rate can still become a bottleneck under bursty
  usage

#### c. rich text and payload limits

Current repo state:

- the code does not implement generalized chunking for long rich text payloads

Why it matters:

- long descriptions or notes can hit provider-side payload or rich-text limits

#### d. sdk version pinning

Current repo state:

- the Notion package still uses a version range:
  - `@notionhq/client: "^2.2.0"`

Why it matters:

- version drift can change behavior unexpectedly

### mitigations already present

- Notion env auth now requires both token and database id
- title-property search now resolves the actual title property dynamically
- unsupported custom-field mutation is rejected explicitly
- pagination support exists in the client

### recommended next actions

1. document required schema expectations more clearly for users
2. add request throttling / queueing for Notion API calls
3. add rich-text chunking for large create/update payloads
4. pin the Notion SDK to an exact version

## 3. trello

status: implemented
risk level: low to medium

### what is implemented

- assigned tasks
- overdue tasks
- search
- task detail
- create/update/complete/delete
- comments

### active risks

#### a. auth migration risk

Earlier research flagged Trello's ongoing OAuth 2.0 migration direction.

Current repo state:

- the plugin still uses API key + token auth

Why it matters:

- long-term auth support could change in ways that are awkward for CLI flows

#### b. search and rate-limit discipline

Current repo state:

- there is no provider-specific rate-limit handling based on Trello response
  headers

Why it matters:

- Trello exposes useful rate-limit headers that are currently unused

### mitigations already present

- the plugin is relatively simple
- task/comment support is implemented without provider-specific advanced
  behavior leaking into shared code

### recommended next actions

1. monitor Trello auth migration announcements
2. use Trello rate-limit headers if provider throttling work begins
3. document any search-specific caveats if observed in real use

## 4. linear

status: implemented
risk level: low to medium

### what is implemented

- assigned tasks
- overdue tasks
- search
- task detail
- create/update/complete/delete
- comments

### active risks

#### a. rate-limit and complexity handling

Linear's GraphQL model has both request and query-complexity concerns.

Current repo state:

- there is no explicit complexity tracking or throttling layer

Why it matters:

- future expansion of query breadth could degrade reliability if complexity
  rises significantly

#### b. continuous schema evolution

Current repo state:

- the Linear plugin does not depend on `@linear/sdk`, which is good
- however, the GraphQL schema can still evolve over time

Why it matters:

- API shape changes still require monitoring even without SDK churn

### mitigations already present

- no direct Linear SDK dependency is used in the plugin package today
- the implementation is relatively small and adapter-focused

### recommended next actions

1. keep Linear queries small and focused
2. add provider-specific handling if rate-limit or complexity issues appear in
   practice
3. monitor upstream API/schema changes

## 5. clickup

status: implemented
risk level: medium to high

### what is implemented

- assigned tasks
- overdue tasks
- search
- task detail
- create/update/complete/delete
- comments

### active risks

#### a. platform reliability and latency

Earlier research identified ClickUp as the highest operational-risk provider.

Current repo state:

- there is no provider-specific timeout/retry/backoff strategy

Why it matters:

- slower or less reliable provider behavior can create a noticeably worse CLI
  experience than other providers

#### b. free-plan custom-field limits

Earlier research identified serious free-plan limits around custom-field usage.

Current repo state:

- the current plugin does not expose rich custom-field mutation paths like the
  Asana plugin

Why it matters:

- this reduces immediate risk, but it should remain a design constraint if
  ClickUp custom-field support is expanded later

#### c. rate-limit handling

Current repo state:

- response headers are not used for active throttling or user feedback

Why it matters:

- a tighter provider can benefit more from proactive rate-limit handling than a
  looser one

### mitigations already present

- current ClickUp integration stays closer to basic task/comment operations
- no advanced custom-field support is exposed in the shared CLI path today

### recommended next actions

1. add timeout/backoff handling if ClickUp reliability becomes a common user
   issue
2. avoid exposing custom-field-heavy workflows without a clear plan
3. consider more aggressive caching or provider-specific TTLs if needed

## open cross-provider actions

These are the highest-value open items across providers.

### high value

1. introduce provider-aware rate limiting and retry strategy
2. improve provider-specific graceful degradation for known plan limitations
3. expose provider warnings more clearly to users

### medium value

1. pin third-party SDK versions where SDKs are used
2. add provider-specific health visibility
3. revisit cache TTL strategy by provider

### lower priority

1. create a dedicated troubleshooting guide per provider
2. surface more provider plan/performance warnings in docs and CLI output

## recommended near-term priorities

If this repository wants to reduce operational risk without a large rewrite,
these are the most useful next steps:

1. implement provider-specific retry/backoff support
2. pin the Asana and Notion SDK versions exactly
3. add clearer Asana free-plan failure messaging if 402 search limitations are
   still observed in practice
4. add basic provider health metadata or warnings to `pm providers`

## maintenance rule for this document

Keep this file current by following these rules:

- update it when a provider moves from unsupported to supported
- update it when a major provider limitation is mitigated in code
- remove milestone references and stale "planned" language
- move historical snapshots into `docs/archives/`
- prefer "current repo state" over aspirational roadmap wording
