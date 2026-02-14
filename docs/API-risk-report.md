# PM CLI — API Risk Report

> Concrete analysis of rate limits, free plan restrictions, deprecation risks,
> and mitigation strategies for every provider pm-cli integrates with.
>
> Based on official API documentation and developer community reports.
> Last updated: February 2026.

---

## Implementation Status

| Provider | Plugin Package | Status | Milestone |
|----------|---------------|--------|-----------|
| **Asana** | `@jogi47/pm-cli-plugin-asana` | **Implemented** | — |
| **Notion** | `@jogi47/pm-cli-plugin-notion` | **Implemented** | — |
| **Trello** | `@jogi47/pm-cli-plugin-trello` | Planned | M2 |
| **Linear** | `@jogi47/pm-cli-plugin-linear` | Planned | M2 |
| **ClickUp** | `@jogi47/pm-cli-plugin-clickup` | Planned | M5 |

> Sections 1 (Asana) and 5 (Notion) describe **currently active** integrations.
> Sections 2 (Trello), 3 (Linear), and 4 (ClickUp) are **pre-implementation research** for planned plugins.

---

## Risk Summary Matrix

| Risk | Asana | Notion | Trello | Linear | ClickUp |
|------|-------|--------|--------|--------|---------|
| **Rate limit (free)** | 150 req/min | 3 req/sec | 100 req/10s | 5,000 req/hr | 100 req/min |
| **Rate limit (paid)** | 1,500 req/min | Same (for now) | Same | Same | 1,000-10,000 req/min |
| **Search restricted on free?** | YES (402) | No | No (but stricter limits) | No | No |
| **Write ops on free?** | Full | Full | Full | Full (250 issue cap) | Full (60 custom field uses) |
| **Token expiration** | Never (except Enterprise) | Never | Configurable (`never` option) | Never (personal keys) | Never |
| **API deprecation risk** | Medium (breaking changes active) | Low (indefinite version support) | Medium (OAuth 2.0 migration coming) | High (SDK churn) | Low (v2 stable, v3 gradual) |
| **Reliability** | Good | Good (slow on large DBs) | Good | Good | Poor (documented perf issues) |
| **Overall risk for pm-cli** | LOW-MEDIUM | LOW-MEDIUM | LOW | LOW-MEDIUM | MEDIUM-HIGH |

---

## 1. Asana (Implemented)

### Rate Limits

| Metric | Free Plan | Paid Plan |
|--------|-----------|-----------|
| Requests per minute | **150** | **1,500** |
| Concurrent GET requests | 50 | 50 |
| Concurrent POST/PUT/DELETE | 15 | 15 |
| Search endpoint | **60 req/min** (paid only) | 60 req/min |
| Pagination max page size | 100 items | 100 items |

**How it works:** Limits are per-token (each PAT gets independent quota). No `X-RateLimit-Remaining` headers proactively — you only find out when you hit 429. The `Retry-After` header tells you how long to wait.

**Computational cost limits:** Asana also enforces a cost-based limit tied to graph traversal complexity. Fetching tasks with deeply nested subtasks, many custom fields, or >1,000 tasks in a project can trigger additional throttling even under the request rate limit.

### Free Plan Restrictions

| Feature | Free Plan | Impact |
|---------|-----------|--------|
| Task search (`/tasks/search`) | **402 Payment Required** | Cannot use `pm tasks search` or `pm tasks overdue` |
| Task CRUD (create/update/complete) | Full access | No impact |
| Comments (`/tasks/{id}/stories`) | Full access | No impact |
| Workspaces | Full access | No impact |
| Custom fields | Limited | Minor impact |
| Portfolios API | Blocked | No impact (not used by pm-cli) |

**Critical risk:** Search is paid-only. `pm tasks search` and `pm tasks overdue` will fail with HTTP 402 on free plans. Must implement client-side filtering as fallback or show a clear error message.

### Deprecation Risks

**Active breaking changes (already enforced):**

1. **Workspace parameter required** (Sept 2025) — `GET /projects`, `GET /users`, `GET /tags` now fail without a `workspace` or `team` parameter for multi-workspace users. **pm-cli already handles this** via workspace selection flow.

2. **assignee_status deprecated** — The `assignee_status` property on tasks is removed. GET returns nothing, PUT is ignored. Use new user task list API instead.

3. **New Asana URL format** — Browser URLs changing. May affect `pm open` if URL patterns are hardcoded.

**Detection:** Asana sends `Asana-Change` response headers when your request is affected by an upcoming breaking change. **Recommendation:** Log these headers to warn users proactively.

**Deprecation process:** Asana uses opt-in/opt-out headers (`Asana-Enable`, `Asana-Disable`) with a typical 3-4 month transition window. No API versioning system — changes deployed via feature flags.

### Mitigation Strategy

| # | Action | Status |
|---|--------|--------|
| 1 | Handle 402 errors gracefully for search — show "requires paid Asana plan" message | TODO |
| 2 | Implement client-side task filtering as fallback for free plan users | TODO |
| 3 | Use opt_fields parameter to minimize data fetched (reduces cost-based throttling) | Partial — used in some queries |
| 4 | Log Asana-Change headers to detect upcoming breaking changes | TODO |
| 5 | Cache workspace GID on first run (avoid repeated /workspaces calls) | Done — workspace stored in auth config |
| 6 | Implement retry with Retry-After header on 429 responses | TODO |
| 7 | Pin `asana` SDK version (currently `^3.0.0`, should be exact) | TODO |

---

## 2. Trello (Planned — M2)

### Rate Limits

| Metric | Value | Scope |
|--------|-------|-------|
| Per API key | **300 req / 10 seconds** | Per application |
| Per token | **100 req / 10 seconds** | Per user |
| `/1/members/` endpoints | **100 req / 900 seconds** (15 min) | Per token |
| `/1/search` endpoint | **Undocumented** (stricter than general) | Per token |
| 429 error blocking threshold | **200 errors / 10 sec → key blocked** | Per API key |

**Dual-layer limiting:** Trello enforces BOTH key-level and token-level limits simultaneously. Your CLI will be throttled by whichever is more restrictive (usually the 100 req/10s token limit).

**Rate limit headers** (returned on every response):
```
x-rate-limit-api-token-remaining: <count>
x-rate-limit-api-key-remaining: <count>
x-rate-limit-api-token-interval-ms: 10000
x-rate-limit-api-key-interval-ms: 10000
```

**Critical danger:** If your CLI generates >200 rate limit errors in a 10-second window, Trello **blocks the entire API key** for the remainder of the window. Aggressive retry logic can trigger this.

### Free Plan Restrictions

| Feature | Free Plan | Impact |
|---------|-----------|--------|
| Boards per workspace | **10 max** | Limits scope, not API access |
| Collaborators per workspace | **10 max** | View-only if exceeded |
| API endpoints | **All available** | No restrictions |
| Rate limits | **Same as paid** | No difference |
| Power-Ups per board | 1 | No API impact |
| Open cards per board | 5,000 (all plans) | Hard limit |

**No API-specific restrictions between free and paid plans.** The 10-board limit is a workspace creation constraint, not an API access constraint.

### Deprecation Risks

**OAuth 2.0 migration (RFC-89, March 2025):**
- Trello announced migration from API key + token to OAuth 2.0 (3LO)
- **Explicitly stated:** "This is not a deprecation notice"
- **Promised:** At least 6 months notice before sunsetting current auth
- **No concrete deadline** as of February 2026
- **CLI concern:** OAuth 2.0 requires callback URLs, which is awkward for CLI tools. Trello is exploring Atlassian API Tokens and device flow as alternatives.

**Recent API deprecations (all minor):**
- SCIM API deprecated (Dec 2025)
- Legacy compliance route removed (June 2025)
- Board preference endpoint deprecated (Dec 2025)
- None affect core card/board CRUD operations

**No v1 API sunset announced.** Unlike Jira/Confluence which have aggressive migration timelines, Trello's v1 REST API has no deprecation date.

### Pagination

| Resource | Max per request | Pagination method |
|----------|----------------|-------------------|
| Cards | 1,000 | `before`/`since` parameters |
| Actions | 1,000 | `before`/`since` parameters |
| Boards | All (no pagination) | N/A |
| Lists | All (no pagination) | N/A |
| Search results | Undocumented | `cards_limit` parameter |

**Tip:** Fetch nested resources in single requests to reduce API calls:
```
GET /1/boards/{id}?cards=all&card_fields=name,desc,idList
```

### Mitigation Strategy (for implementation)

| # | Action |
|---|--------|
| 1 | Monitor x-rate-limit-api-token-remaining header on every response |
| 2 | Implement a 429 error counter — if >50 errors in 10s, pause all requests |
| 3 | Cache board metadata (changes infrequently) with 1-hour TTL |
| 4 | Use nested resource fetching (e.g., ?cards=all) to reduce calls |
| 5 | For /1/members/ endpoints, implement 15-minute window tracking |
| 6 | For search, cache results aggressively and use sparingly |
| 7 | Monitor RFC-89 for OAuth 2.0 migration timeline |
| 8 | Request tokens with expiration=never for CLI use |

---

## 3. Linear (Planned — M2)

### Rate Limits

| Metric | Authenticated | Unauthenticated |
|--------|--------------|-----------------|
| Requests per hour | **5,000** | 60 |
| Complexity points per hour | **250,000** | 10,000 |
| Max complexity per query | **10,000 points** | 10,000 points |

**Dual-limit system:** Linear enforces both request count AND complexity points. For a CLI tool, the **complexity limit is the real constraint** because GraphQL queries with nested connections multiply costs.

**How complexity is calculated:**
- Each property: 0.1 points
- Each object: 1 point
- Connections multiply by pagination argument (default: 50)
- Score rounds up to nearest integer

**Example:** Fetching 50 issues with 3 properties each = 1 + 50 + 15 = **66 points**. Same query with `first: 10` = **14 points**.

**Scope:** Per-user, not per-key. Creating multiple API keys does NOT increase limits — all keys for the same user share the same quota.

**Error handling:** Rate limit errors return HTTP 400 (not 429) with `"extensions": { "code": "RATELIMITED" }`. No explicit `Retry-After` header documented.

### Free Plan Restrictions

| Feature | Free Plan | Impact |
|---------|-----------|--------|
| Active issues | **250 max** | Cannot create beyond limit |
| Archived issues | Unlimited | No impact |
| API access | **Full** | Same rate limits as paid |
| Webhooks | Available | No restrictions |
| All endpoints | Available | No restrictions |

**The 250 active issue cap is the only constraint.** Archiving issues lets you stay on free tier indefinitely. No API endpoint restrictions.

### SDK Stability Risk

**This is Linear's biggest risk for pm-cli.**

The `@linear/sdk` releases major versions extremely frequently with breaking changes:
- v74.0.0 (Feb 6, 2025) — Removed `userDemoteAdmin` and similar methods
- v73.0.0 (Jan 30, 2025) — Made `commitSha` required in `ReleaseSyncInput`
- v72.0.0 (Jan 28, 2025) — Removed `releaseCreate` mutation
- v71.0.0 (Jan 22, 2025) — Removed `allowedAiProviders` field
- v70.0.0 (Jan 20, 2025) — Made `label` required in agent input

**5 breaking major versions in 3 weeks.** Auto-updating the SDK would break your CLI regularly.

### Deprecation Risks

- Linear's GraphQL API does **not use traditional versioning** (no v1/v2)
- Schema evolves continuously with `@deprecated` directives
- Linear proactively contacts affected developers before breaking changes
- No specific deprecation timeline commitments documented

### Mitigation Strategy (for implementation)

| # | Action |
|---|--------|
| 1 | PIN @linear/sdk to an exact version (e.g., "74.0.0", not "^74.0.0") |
| 2 | Use small page sizes (first: 10-20) instead of default 50 to reduce complexity |
| 3 | Track complexity points consumed, not just request count |
| 4 | Implement exponential backoff — watch for RATELIMITED error code (HTTP 400, not 429) |
| 5 | Warn users about 250 active issue limit on free plan |
| 6 | Monitor Linear changelog for [API] tagged entries |
| 7 | Test SDK upgrades in CI before releasing new pm-cli versions |

---

## 4. ClickUp (Planned — M5)

### Rate Limits

| Plan | Requests per minute |
|------|-------------------|
| Free Forever | **100** |
| Unlimited | 100 |
| Business | 100 |
| Business Plus | 1,000 |
| Enterprise | 10,000 |

**No burst allowance** — these are hard limits. No per-endpoint differentiation. Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: <count>
X-RateLimit-Reset: <unix_timestamp>
```

### Free Plan Restrictions

| Feature | Free Plan | Impact |
|---------|-----------|--------|
| Custom field uses | **60 total** (lifetime) | **SEVERE** — each field value set = 1 use |
| Automations | 50 active, 100 actions/month | No direct API impact |
| API rate limit | 100 req/min | Same as Unlimited/Business |
| Task CRUD | Full access | No restrictions |
| Comments | Unlimited | No restrictions |

**The custom field limit is a dealbreaker on free plan.** Every time you set ANY custom field value (dropdown, label, etc.) it counts as one of 60 total lifetime uses. A CLI that sets priority/status via custom fields would exhaust this in days. There is no API endpoint to check remaining uses.

### Custom Field API Design Flaw

**This is ClickUp's biggest risk for pm-cli.**

The `PUT /task/{id}` endpoint **cannot update custom fields**. Each custom field requires a separate `Set Custom Field Value` API call. Updating a task with 5 custom fields = **6 API calls** (1 PUT + 5 custom field calls).

At 100 req/min on free plan, updating 15 tasks with custom fields could exhaust your entire rate limit.

### Reliability Concerns

| Metric | Value | Source |
|--------|-------|--------|
| Documented outages (5 years) | **443+** | StatusGator |
| Average outage frequency | ~1 every 4-5 days | Calculated |
| Typical page load time | 8-10+ seconds | Benchmark testing |
| Community "SLOWNESS" votes | Thousands | ClickUp feedback board |

**Performance is genuinely poor.** Multiple independent reviews confirm:
- 8-10 second response times for basic operations
- 30-second to 2-minute delays for task status changes
- Search functionality lag
- Dashboard loading hangs

**This is not anecdotal — it's a systemic, documented issue** that has persisted for 2+ years since ClickUp v3.0.

### API Version Status

- **v2:** Current primary API, stable, no deprecation timeline
- **v3:** Gradual migration, a few endpoints migrated (terminology change: "Team" → "Workspace")
- **Coexistence:** v2 and v3 work side by side
- **Recommendation:** Use v2 for now, no urgency to migrate

### Pagination

| Resource | Max per page | Method |
|----------|-------------|--------|
| Tasks per list | **100** | Check response length vs limit |
| Comments | Not documented | Unknown |
| Workspaces | All (single response) | N/A |

**Pagination is poorly documented.** No explicit `page` or `offset` parameters in docs — you're expected to check if response length equals limit to determine if more pages exist.

### Mitigation Strategy (for implementation)

| # | Action |
|---|--------|
| 1 | AVOID custom fields on free plan — use native task properties only |
| 2 | Implement aggressive request batching to stay under 100 req/min |
| 3 | Add timeout handling (expect 8-10s response times) |
| 4 | Implement retry logic with X-RateLimit-Reset header |
| 5 | Cache task data aggressively (5-10 min TTL) to reduce API calls |
| 6 | Warn users about ClickUp's known performance issues in docs |
| 7 | For custom field updates, queue and batch to avoid rate limit exhaustion |
| 8 | Consider recommending Business Plus plan ($12/user/mo) for serious use |

---

## 5. Notion (Implemented)

### Rate Limits

| Metric | Value | Scope |
|--------|-------|-------|
| Average rate | **3 requests / second** | Per integration |
| Burst allowance | "Some bursts beyond average" (unspecified) | Per integration |
| Per-plan differences | **None currently** (may change) | All plans equal |

**3 req/s = 180 req/min.** This is the most restrictive rate limit of all providers, but the "per-integration" scope means each connected workspace gets its own quota.

**Future changes:** Notion hints at "distinct rate limits for workspaces in different pricing plans" but hasn't implemented this yet.

### Free Plan Restrictions

| Feature | Free Plan | Impact |
|---------|-----------|--------|
| API endpoints | **All available** | No restrictions |
| Rate limits | **Same as paid** | No difference |
| File upload size | 5MB (vs unlimited on paid) | Minor impact |
| Guest limit | 10 guests | No API impact |
| Block limit (with teams) | 1,000 trial blocks | Potential impact for heavy use |

**No API-specific restrictions on free plan.** The constraints are workspace-level (file sizes, guests, blocks).

### Property Mapping Risks

**This is Notion's unique challenge for pm-cli.** Notion databases have user-defined schemas, so mapping to a unified Task model requires handling custom property names.

**Read-only properties (cannot be set via API):**
| Property | Restriction |
|----------|-------------|
| Formula | Computed values only |
| Rollup | Aggregated from relations |
| Unique ID | Auto-generated |
| Created by / Created time | System-managed |
| Last edited by / Last edited time | System-managed |

**Status property gotcha:** Status property **values** can be set via API, but the **schema** (option names, groups) **cannot be modified via API**. Users must configure Status options manually in Notion UI first.

**Formula edge case:** If a formula references a relation with >25 linked pages, only 25 are evaluated — your CLI may receive incomplete computed values.

### Content Size Limits

| Limit | Value |
|-------|-------|
| Rich text per object | **2,000 characters** |
| Blocks per request | **100** |
| Payload size | **500 KB** |
| Database query page size | **100 results** |
| Filter nesting depth | **2 levels** |

**Rich text workaround:** Chunk content into multiple 2,000-character rich_text objects within a single block.

### API Versioning

| Current version | `2025-09-03` |
|----------------|--------------|
| Versioning scheme | Date-based (`Notion-Version` header) |
| Old version support | "No plans to stop supporting older versions" |
| Breaking change frequency | Rare (major versions every 1-2 years) |

**Low deprecation risk.** Notion explicitly commits to indefinite old version support and gives advance notice for breaking changes.

### Reliability

- **Generally reliable** (AWS-hosted, enterprise uptime)
- **Performance drops on large databases** (>5,000 records noticeably slower, >10,000 significantly slower)
- **Eventual consistency:** Writes may not be immediately available in reads — implement retry logic for write-then-read patterns
- **No documented timeout values** — occasional `RequestTimeoutError` for large queries

### Mitigation Strategy

| # | Action | Status |
|---|--------|--------|
| 1 | Implement client-side rate limiter (token bucket, 3 tokens/sec) | TODO |
| 2 | Queue all API requests through the rate limiter | TODO |
| 3 | Document that users must configure Status property options in Notion UI | TODO |
| 4 | Support configurable property mapping via .pmrc.json (M4) | TODO (M4) |
| 5 | Chunk rich text into 2,000-char segments automatically | TODO |
| 6 | Use cursor-based pagination (iterate until has_more=false) | Done — pagination implemented in client |
| 7 | Pin to Notion-Version header | Done — set via `@notionhq/client` SDK |
| 8 | For large databases, warn users about potential slowness | TODO |
| 9 | Implement retry with Retry-After header on 429 responses | TODO |
| 10 | Pin `@notionhq/client` SDK version (currently `^2.2.0`, should be exact) | TODO |

---

## Cross-Provider Risk Analysis

### Which provider is riskiest for pm-cli?

**ClickUp is the highest-risk integration** due to:
1. Poor API reliability (8-10s response times, frequent outages)
2. Custom field API design flaw (separate calls per field)
3. Tight rate limit on free plan (100 req/min) combined with the custom field workaround
4. Poorly documented pagination

**Linear has the highest SDK maintenance risk** due to extremely frequent breaking changes (5 major versions in 3 weeks). Pin versions aggressively.

**Asana has the highest free-plan feature gap** — search being paid-only means two of pm-cli's core commands (`pm tasks search`, `pm tasks overdue`) won't work on free plans.

### Rate Limit Impact on Common CLI Operations

| Operation | API calls | Asana (150/min) | Trello (600/min) | Linear (83/min) | ClickUp (100/min) | Notion (180/min) |
|-----------|-----------|-----------------|-------------------|-----------------|--------------------|-------------------|
| `pm tasks assigned` (25 tasks) | 1-2 | OK | OK | OK | OK | OK |
| `pm today` (3 queries) | 3-6 | OK | OK | OK | OK | OK |
| `pm tasks create` | 1 | OK | OK | OK | OK | OK |
| `pm done` (5 tasks) | 5 | OK | OK | OK | OK | OK |
| `pm standup` (3 queries + filter) | 3-6 | OK | OK | OK | OK | OK |
| `pm bulk update` (50 tasks) | 50 | OK | OK | OK | **TIGHT** | OK |
| `pm bulk update` (50 tasks + 3 custom fields each) | 200 | Over limit | OK | OK | **BLOCKED** | Over limit |

*Linear's 83/min is derived from 5,000 req/hr, but complexity points are the real constraint.*

### Caching Strategy Per Provider

**Current state:** All providers use a uniform 5-minute TTL via `cacheManager` (`~/.cache/pm-cli/cache.json`). No per-provider TTL differentiation.

| Provider | Current TTL | Recommended TTL | Reason |
|----------|------------|----------------|--------|
| Asana | 5 min | 5 min (keep) | Good rate limits, moderate data freshness needs |
| Notion | 5 min | 5 min (keep) | Moderate rate limit, eventual consistency means stale reads anyway |
| Trello | — | 5 min tasks, 1 hour boards | Board metadata changes rarely |
| Linear | — | 3-5 min | Good rate limits, fast-changing task status |
| ClickUp | — | 10 min | Tight rate limits + slow API = cache aggressively |

---

## Recommendations for pm-cli Architecture

> **Status:** These are planned improvements. None are currently implemented in the codebase.
> Target milestone: M4 (DX & Extensibility).

### 1. Implement a Universal Rate Limiter

Each plugin should include a provider-specific rate limiter that:
- Tracks remaining quota via response headers (where available)
- Implements exponential backoff with jitter on 429/rate-limit errors
- Pre-emptively pauses when approaching limits (don't wait for rejection)
- Logs rate limit warnings for debugging

**Suggested implementation in `@jogi47/pm-cli-core`:**
```typescript
interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number;       // e.g., 10000 for Trello, 60000 for Asana
  burstAllowance?: number;
}
```

**Current state:** Neither the Asana nor Notion plugin implements rate limiting or retry logic. Requests fire directly without throttling.

### 2. Graceful Degradation for Free Plans

| Provider | Degraded Feature | Fallback | Implemented? |
|----------|-----------------|----------|--------------|
| Asana | `pm tasks search`, `pm tasks overdue` | Client-side filtering of assigned tasks | No — 402 errors propagate unhandled |
| ClickUp | Custom fields after 60 uses | Warn user, skip custom field updates | N/A (plugin not built) |
| Linear | Task creation after 250 active issues | Warn user, suggest archiving | N/A (plugin not built) |

### 3. Provider Health Monitoring

Add a `pm providers --health` command that shows:
- Current rate limit status (remaining quota)
- Response time (last API call latency)
- Provider-specific warnings (paid-only features, approaching limits)

**Current state:** `pm providers` shows connection status only. No health/rate-limit monitoring.

### 4. Error Message Standards

Every provider error should include:
```
Error: [What happened] ([Provider] HTTP [code])

[Why it happened — plain English]
[How to fix it — actionable step]

Docs: [link to relevant troubleshooting]
```

Example:
```
Error: Search requires a paid Asana plan (HTTP 402)

The task search API is only available on Asana Premium, Business, or Enterprise plans.
To use search on your current plan, try: pm tasks assigned --plain | grep "keyword"

Docs: https://github.com/user/pm-cli/docs/troubleshooting#asana-402
```

**Current state:** Errors use generic `renderError()` utility. No provider-specific enrichment, recovery suggestions, or docs links.

---

## Sources

### Asana
- [Asana API Rate Limits](https://developers.asana.com/docs/rate-limits)
- [Asana API Pagination](https://developers.asana.com/docs/pagination)
- [Asana Deprecations](https://developers.asana.com/docs/deprecations)
- [Asana API Changelog](https://developers.asana.com/docs/change-log)
- [Asana Developer Forum — API tier restrictions](https://forum.asana.com/t/which-api-features-are-available-for-each-pricing-tier/104411)
- [Asana Developer Forum — Search 402 error](https://forum.asana.com/t/task-search-returns-http-402/99804)

### Trello
- [Trello API Rate Limits](https://developer.atlassian.com/cloud/trello/guides/rest-api/rate-limits/)
- [Trello API Limits](https://developer.atlassian.com/cloud/trello/guides/rest-api/limits/)
- [Trello Authorization](https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/)
- [RFC-89: OAuth 2.0 for Trello](https://community.developer.atlassian.com/t/rfc-89-introducing-oauth2-to-trello/90359)
- [Trello Developer Changelog](https://developer.atlassian.com/cloud/trello/changelog/)

### Linear
- [Linear API Rate Limiting](https://linear.app/developers/rate-limiting)
- [Linear GraphQL Getting Started](https://linear.app/developers/graphql)
- [Linear Pagination](https://linear.app/developers/pagination)
- [Linear OAuth 2.0 Authentication](https://linear.app/developers/oauth-2-0-authentication)
- [Linear Deprecations](https://linear.app/developers/deprecations)
- [@linear/sdk on npm](https://www.npmjs.com/package/@linear/sdk)

### ClickUp
- [ClickUp API Rate Limits](https://developer.clickup.com/docs/rate-limits)
- [ClickUp API Authentication](https://developer.clickup.com/docs/authentication)
- [ClickUp API v2/v3 Terminology](https://developer.clickup.com/docs/general-v2-v3-api)
- [ClickUp Custom Fields Uses](https://help.clickup.com/hc/en-us/articles/10993484102167-Custom-Fields-uses)
- [ClickUp Public API Status — StatusGator](https://statusgator.com/services/clickup/public-api)
- [ClickUp Feedback Board — SLOWNESS](https://feedback.clickup.com/public-api/p/slowness)

### Notion
- [Notion API Request Limits](https://developers.notion.com/reference/request-limits)
- [Notion API Versioning](https://developers.notion.com/reference/versioning)
- [Notion Database Query](https://developers.notion.com/reference/post-database-query)
- [Notion Property Types](https://developers.notion.com/reference/property-object)
- [Notion Authorization](https://developers.notion.com/docs/authorization)
- [Notion API Filter Reference](https://developers.notion.com/reference/post-database-query-filter)
