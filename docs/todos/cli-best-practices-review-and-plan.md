# CLI Best Practices Review And Implementation Plan

Date: 2026-03-15

Reference article:
- https://hackmd.io/@arturtamborski/cli-best-practices

Additional agent-oriented review inputs:
- "Agentic CLI Design: 7 Principles for Designing CLI as a Protocol for AI Agents"
  as summarized in the user-provided notes
- supporting ecosystem references around agent-friendly CLI behavior, including:
  - https://oneuptime.com/blog/post/2025-07-02-why-cli-is-the-new-mcp-for-ai-agents/view
  - https://dev.to/zachary62/llms-love-clis-why-modern-agents-need-tool-friendly-command-line-interfaces-58f6
  - https://github.com/BlueCentre/code-agent

## Purpose

This document reviews the current `pm` CLI against the guidance in the
reference article and turns the findings into a practical implementation plan.
It is intended to be picked up later as a backlog item.

## Scope Reviewed

- command structure and subcommand model
- live `--help` output
- output and error rendering
- scripting and JSON behavior
- exit code behavior
- state/config/cache/auth storage behavior
- destructive and interactive command UX
- current test coverage shape

## Overall Assessment

`pm` already follows several good CLI practices:

- short binary name: `pm`
- task-oriented subcommands
- built-in help and examples
- shell autocomplete support via oclif
- explicit `--json` support on several read commands
- generally clear human-readable error formatting
- documented config and cache behavior in the README

The main gaps are not in command structure. They are in scriptability,
consistency of exit behavior, and a few places where interactive UX does not
yet have a clean non-interactive alternative.

From the agent-focused review lens, the biggest gap is that `pm` is currently a
good human CLI with partial scripting support, but it is not yet shaped as a
stable protocol surface for autonomous agents.

## Agentic CLI Assessment

The agent-oriented guidance mostly reinforces the earlier findings, but it also
raises the bar in a few important ways.

### A. Machine-readable output is present, but not yet protocol-grade

Current state:
- several commands support `--json`
- stdout and stderr are not consistently separated for JSON flows
- there is no stable JSON envelope with metadata such as `schemaVersion`
- there is no single `--output json` style convention across commands

What is missing for agents:
- stable top-level envelope for machine output
- `schemaVersion` for backward-compatible evolution
- predictable distinction between data, warnings, and logs

Recommendation:
- standardize on a versioned JSON envelope for machine-readable commands
- keep human formatting as a separate mode

Suggested envelope:

```json
{
  "schemaVersion": "1",
  "command": "tasks assigned",
  "data": [],
  "errors": [],
  "warnings": [],
  "meta": {}
}
```

### B. Non-interactive execution is incomplete

Current state:
- many commands are already flag-driven
- `delete` supports `--force`
- `workspace switch` still depends on a prompt by default
- `connect` is interactive-only today

What is missing for agents:
- explicit non-interactive mode or fully flag-driven alternatives
- clear failure behavior when required input is missing in non-TTY contexts

Recommendation:
- prioritize non-interactive alternatives for all commands with prompts
- add `--non-interactive` only if it improves consistency; otherwise prefer
  complete explicit flags per command

### C. Idempotency and retry safety are weak for write operations

Current state:
- there is no request dedupe key such as `--client-request-id`
- there is no `--if-exists skip|update|fail` behavior on create-like flows
- list commands support `--limit`, but there is no exposed cursor model

What is missing for agents:
- safe retries for network/API failures
- deterministic handling of repeated create attempts
- resumable pagination for large result sets

Recommendation:
- introduce idempotency support for create flows before bulk features expand
- add cursor-style pagination only where provider APIs can support it cleanly

### D. Observability is human-readable, but not structured enough

Current state:
- there is readable stderr output for errors and warnings
- there is no first-class `--verbose` or `--debug`
- exit codes are not yet classified as an interface

What is missing for agents:
- structured debug signals
- error classification that can drive retries or escalation
- stable exit semantics

Recommendation:
- add classified exit codes
- add a consistent debug mode with structured detail when requested

### E. Context-efficiency features are minimal

Current state:
- list commands support filtering and `--limit`
- there is no `--fields` projection
- there is no NDJSON output mode for streaming or low-overhead consumption
- there is no server-side field projection surfaced at the CLI contract level

What is missing for agents:
- smaller payloads for constrained contexts
- control over which fields are returned
- streaming-friendly output for large result sets

Recommendation:
- add `--fields` before considering NDJSON
- treat NDJSON as a later optimization after JSON envelope stability

### F. Introspection and self-discovery are missing

Current state:
- oclif help is good for humans
- there is no command inventory output in JSON
- there is no exported machine-readable schema for command outputs

What is missing for agents:
- `commands --json` style discovery
- `schema` or JSON Schema output for key machine-readable payloads

Recommendation:
- add command and schema introspection after output contracts stabilize

### G. Framework guidance is low priority for this repo

The Typer/Click guidance is useful in general, but this repo is already a
TypeScript + oclif CLI with established structure, tests, and published
package boundaries.

Recommendation:
- do not prioritize a framework rewrite
- keep the focus on protocol quality, non-interactive behavior, output
  contracts, and observability

## Key Findings

### 1. `--json` is not consistently safe for scripting

Impact: High

Problem:
- some mutating commands print success text to stdout before printing JSON
- that makes the output invalid as a machine-readable contract

Examples:
- `packages/cli/src/commands/tasks/create.ts`
- `packages/cli/src/commands/tasks/update.ts`
- `packages/core/src/utils/output.ts`

Why it matters:
- the article treats machine-readable output as a core scripting contract
- once `--json` exists, stdout should be parseable without filtering

Recommendation:
- if `--json` is enabled, print only JSON on stdout
- send human status messages to stderr, or suppress them entirely
- add command-level tests that assert stdout is valid JSON

### 2. Some error paths appear to return success exit codes

Impact: High

Problem:
- some commands render an error and then `return` without explicit non-zero exit

Examples:
- `packages/cli/src/commands/connect.ts`
- `packages/cli/src/commands/disconnect.ts`
- `packages/cli/src/commands/workspace.ts`

Why it matters:
- scripts and CI rely on exit status, not text
- an error message with exit code `0` is a broken CLI contract

Recommendation:
- any branch that represents failure should exit non-zero
- keep explicitly idempotent no-op cases separate from true failures
- test exit behavior for common failure modes

### 3. Exit codes are not yet treated as a documented interface

Impact: Medium

Problem:
- command failures are mostly flattened into exit code `1`
- the README does not document exit status behavior

Example:
- `packages/cli/src/lib/command-error.ts`

Why it matters:
- the article explicitly recommends using and documenting exit codes
- stable exit semantics make automation much safer

Recommendation:
- define a small exit code contract
- document it in README and help-oriented docs

Suggested contract:
- `0`: success
- `1`: runtime or provider operation failure
- `2`: usage or validation error
- `3`: authentication or connection error
- `4`: partial bulk-operation failure

### 4. `workspace switch` is interactive-only

Impact: Medium

Problem:
- changing workspace currently depends on an interactive selector

Example:
- `packages/cli/src/commands/workspace.ts`

Why it matters:
- the CLI is less useful in scripts, CI, and repeatable workflows
- interactive prompts are fine as a default, but they should not be the only path

Recommendation:
- add `pm workspace switch --workspace <id|name>`
- keep the interactive selector as the fallback when the flag is omitted

### 5. Destructive and side-effect commands have limited dry-run support

Impact: Medium

Problem:
- `delete` has confirmation, which is good
- but there is no `--dry-run` style workflow for delete, branch, create, or update

Why it matters:
- the reference article strongly recommends dry-run behavior for side effects
- dry-run is especially valuable for bulk or provider-backed operations

Recommendation:
- start with `delete` and `branch`
- consider extending to create/update once the UX is clear

### 6. State/config/auth file behavior is only partially documented

Impact: Low

Problem:
- README documents config and cache locations
- auth storage behavior and location are not surfaced with the same clarity

Examples:
- `packages/core/src/managers/config-manager.ts`
- `packages/core/src/managers/cache-manager.ts`
- `packages/core/src/managers/auth-manager.ts`

Why it matters:
- the article recommends documenting behavior-affecting files
- users should understand where the CLI stores config, cache, and credentials

Recommendation:
- document all behavior-affecting files in one section
- include env var overrides and precedence rules
- be explicit that current auth storage is obfuscation, not secure secret storage

### 7. Command-level behavioral tests are thinner than helper-level tests

Impact: Low

Problem:
- there are useful helper tests
- there are fewer end-to-end command behavior tests for stdout, stderr, and exit codes

Why it matters:
- the article emphasizes testing the actual CLI behavior
- this is the quickest way to prevent output-contract regressions

Recommendation:
- add focused command tests for:
  - `--json` output shape
  - stderr vs stdout separation
  - exit codes
  - interactive fallback vs non-interactive failure behavior

### 8. JSON output lacks a stable schema envelope for agents

Impact: High

Problem:
- JSON outputs are mostly raw arrays or objects
- they do not expose `schemaVersion`, `meta`, `warnings`, or a consistent shape

Why it matters:
- agents need stable contracts, not just parseable JSON
- schema evolution without a version marker becomes brittle

Recommendation:
- define a small shared JSON response envelope
- use it first on list/detail/write commands that already support JSON

### 9. Prompted flows do not yet have a complete headless path

Impact: High

Problem:
- `workspace switch` is prompt-first unless additional support is added
- `connect` is interactive-only today

Why it matters:
- agents, CI jobs, and wrappers need fully explicit execution paths
- prompts should be an optional UX layer, not a required execution model

Recommendation:
- add flag-driven alternatives before adding more interactive behavior
- define expected non-TTY behavior explicitly in tests

### 10. Write commands are not yet idempotency-friendly

Impact: Medium

Problem:
- repeated create attempts cannot be safely correlated or deduplicated
- the CLI does not expose request identity or create conflict policy

Why it matters:
- agent retries are common under network and provider instability
- create flows are the highest-risk area for duplicate side effects

Recommendation:
- design an idempotency contract for create and future bulk-create flows
- start with provider-agnostic CLI flags even if initial provider support is
  partial

### 11. Context-efficient output controls are too limited for agent workflows

Impact: Medium

Problem:
- there is no `--fields` projection
- there is no streaming-oriented output mode such as NDJSON

Why it matters:
- large result sets waste tokens and make downstream agent processing slower
- field projection is often more valuable than adding new commands

Recommendation:
- add `--fields` to key list/detail commands after JSON envelope work

### 12. The CLI is not yet introspectable as a machine interface

Impact: Medium

Problem:
- there is no `commands --json`
- there is no schema discovery command for output contracts

Why it matters:
- agentic systems benefit from self-discovery rather than hardcoded prompt lore

Recommendation:
- expose command inventory and output schemas once core contracts stabilize

## Priority Model

The right way to sequence this work is not by generic importance, but by
dependency order. Some improvements only become worth doing after the CLI
contract is stable.

Priority order:

1. stabilize the machine contract
2. make failure semantics reliable
3. eliminate prompt-only execution paths
4. make write operations safer
5. document the stabilized contract
6. reduce payload size and token cost
7. add self-discovery and schema introspection

Rationale:

- machine-readable output and exit behavior are foundational
- headless execution depends on reliable output and error semantics
- idempotency and dry-run design should build on the stabilized command model
- introspection should reflect the final contract, not a moving target

## Milestone Roadmap

This plan should be executed one milestone at a time. Do not start a later
milestone before the current one has passing tests, updated docs where
required, and a clear acceptance decision.

### Milestone 1: Machine Contract Baseline

Objective:
- make JSON output trustworthy for scripts and agents

Includes:
- clean stdout for machine-readable modes
- shared versioned JSON envelope with `schemaVersion`
- command-level tests that validate JSON-only stdout

Why first:
- every later automation improvement depends on this contract being stable

Exit criteria:
- key JSON commands emit only JSON on stdout
- JSON commands use a consistent top-level envelope
- tests cover stdout/stderr separation for the initial command set

### Milestone 2: Failure And Exit Semantics

Objective:
- make success and failure machine-detectable without text parsing

Includes:
- fix all error branches that return success exit codes
- classify exit codes
- test common usage, auth, provider, and bulk-failure paths

Why second:
- retries, agents, wrappers, and CI all depend on reliable exit semantics

Exit criteria:
- true failures exit non-zero
- documented exit-code contract exists
- command tests verify exit behavior

### Milestone 3: Headless Command Execution

Objective:
- remove prompt-only blockers from the core command surface

Includes:
- non-interactive `workspace switch`
- non-interactive `connect` path
- deterministic non-TTY behavior

Why third:
- after machine output and exits are stable, headless execution becomes usable

Exit criteria:
- core prompted commands have explicit headless paths
- non-TTY behavior is tested and documented

### Milestone 4: Safe Write Semantics

Objective:
- reduce accidental side effects and retry duplication

Includes:
- `--dry-run` for selected destructive or repository-affecting commands
- idempotency design for create flows
- initial retry-safety contract for future bulk writes

Why fourth:
- write-safety design should sit on top of stable command and error contracts

Exit criteria:
- selected side-effect commands support preview
- create flows have a documented idempotency direction
- tests verify dry-run does not perform the real operation

### Milestone 5: Operational Documentation

Objective:
- document the CLI as an operational interface

Includes:
- exit status docs
- files and state docs
- env precedence docs
- examples aligned with headless and machine-readable behavior

Why fifth:
- docs should describe the stabilized behavior, not pre-announce unfinished
  contracts

Exit criteria:
- README and skill docs match actual behavior
- users can understand where state lives and how automation should consume `pm`

### Milestone 6: Context-Efficient Output

Objective:
- reduce over-fetching and over-rendering for agents

Includes:
- `--fields` projection
- later evaluation of NDJSON
- paging/filtering follow-up where provider support is real

Why sixth:
- this is valuable, but only after the protocol is stable and documented

Exit criteria:
- key read commands support output projection
- tests verify projected output behavior

### Milestone 7: Introspection And Discovery

Objective:
- let agents discover commands and output contracts programmatically

Includes:
- `commands --json`
- schema discovery
- documented schema stability expectations

Why seventh:
- introspection is best added after the rest of the contract has settled

Exit criteria:
- command inventory and output-schema discovery exist
- introspection output is tested and documented

## Implementation Plan

## Milestone 1: Machine Output Contract Hardening

Goal:
- ensure JSON output is a stable protocol surface, not just a convenience flag

Tasks:
- audit all commands with `--json`
- remove success/info banners from stdout when JSON is requested
- decide whether status messages should move to stderr or be suppressed
- normalize bulk command JSON output to follow the same rule
- define a shared JSON envelope with:
  - `schemaVersion`
  - `data`
  - `warnings`
  - `errors`
  - `meta`
- standardize JSON serialization through shared helpers instead of ad hoc
  `console.log(JSON.stringify(...))`
- add tests that parse stdout as JSON for create, update, done, delete, thread

Target files:
- `packages/cli/src/commands/tasks/create.ts`
- `packages/cli/src/commands/tasks/update.ts`
- `packages/cli/src/commands/done.ts`
- `packages/cli/src/commands/delete.ts`
- `packages/cli/src/commands/tasks/thread.ts`
- `packages/core/src/utils/output.ts`

Definition of done:
- `--json` commands emit valid JSON and nothing else on stdout
- machine-readable commands return a consistent top-level envelope
- tests fail if extra text is printed before or after JSON

## Milestone 2: Exit Code Normalization

Goal:
- make failure semantics reliable for humans and scripts

Tasks:
- audit all commands for `renderError(...); return`
- replace failure returns with explicit non-zero exits
- distinguish between:
  - invalid usage
  - not connected/auth issues
  - provider/runtime failures
  - partial bulk failures
- update shared error handling if distinct exit codes are adopted

Target files:
- `packages/cli/src/commands/connect.ts`
- `packages/cli/src/commands/disconnect.ts`
- `packages/cli/src/commands/workspace.ts`
- `packages/cli/src/lib/command-error.ts`

Definition of done:
- all true failures exit non-zero
- exit code behavior is stable and covered by tests

## Milestone 3: Non-Interactive Command Paths

Goal:
- preserve interactive UX while supporting scripting and agents

Tasks:
- add `--workspace <id|name>` to `pm workspace switch`
- support exact name or ID selection
- use prompt only when the flag is absent and TTY is available
- return a clear error for non-interactive use without enough input
- design a non-interactive `connect` path using explicit flags and/or env-driven
  setup with validation
- document which commands are safe to run in non-TTY environments
- update help text and examples

Target files:
- `packages/cli/src/commands/workspace.ts`
- `packages/cli/src/commands/connect.ts`
- related provider workspace helpers if needed
- `README.md`
- `skills/SKILL.md`

Definition of done:
- prompt-based commands have an explicit headless path
- non-TTY behavior is deterministic and documented

## Milestone 4: Safe Write Semantics

Goal:
- reduce risk from retries, destructive actions, and repository-modifying
  operations

Tasks:
- add `--dry-run` to `delete`
- add `--dry-run` to `branch`
- evaluate whether `tasks create` and `tasks update` should support request preview
- ensure dry-run output is useful in both human and JSON modes
- design idempotency flags for create-like operations, such as:
  - `--client-request-id`
  - `--if-exists skip|update|fail`
- define which semantics are provider-agnostic and which are best-effort
- align this design with future bulk-create work

Target files:
- `packages/cli/src/commands/delete.ts`
- `packages/cli/src/commands/branch.ts`
- possibly `packages/cli/src/commands/tasks/create.ts`
- possibly `packages/cli/src/commands/tasks/update.ts`

Definition of done:
- users can preview key side effects before executing them
- create flows have a documented retry-safety story

## Milestone 5: Documentation And Exit Status Contract

Goal:
- document the CLI as an operational interface, not just a user tool

Tasks:
- add an "Exit Status" section to README
- add a "Files And State" section to README
- document:
  - project config path
  - user config path
  - cache path
  - auth storage path/behavior
  - env var precedence
- align command examples with any new flags added above

Target files:
- `README.md`
- `skills/SKILL.md`

Definition of done:
- users can understand where state lives and how to automate the CLI safely

## Milestone 6: Context-Efficient Output

Goal:
- reduce payload size and downstream token cost for agents and scripts

Tasks:
- add `--fields` projection to key commands:
  - `tasks assigned`
  - `tasks overdue`
  - `tasks search`
  - `tasks show`
- define a stable field-selection grammar
- ensure projection works in JSON mode first
- evaluate NDJSON for large list output after envelope work is settled
- review whether provider-specific server-side filtering can back some of these
  features cleanly

Target files:
- `packages/cli/src/commands/tasks/assigned.ts`
- `packages/cli/src/commands/tasks/overdue.ts`
- `packages/cli/src/commands/tasks/search.ts`
- `packages/cli/src/commands/tasks/show.ts`
- shared output helpers and list-query helpers

Definition of done:
- agents can request smaller payloads without brittle post-processing

## Milestone 7: Introspection And Self-Discovery

Goal:
- make the CLI discoverable as a machine interface

Tasks:
- add a command inventory endpoint such as `pm commands --json`
- expose output schemas for stable JSON commands
- decide whether schemas should be:
  - JSON Schema files checked into the repo
  - generated definitions from shared types
  - or both
- document schema stability expectations

Target files:
- new CLI command(s) under `packages/cli/src/commands/`
- shared schema definitions under `packages/core` or `docs`
- `README.md`

Definition of done:
- an agent can discover available commands and expected output contracts without
  reading prose docs

## Suggested Test Plan

Add or expand command-level tests for:

- `tasks create --json` emits valid JSON only
- `tasks update --json` emits valid JSON only
- `done --json` emits valid JSON only
- `delete --json` emits valid JSON only
- JSON envelopes include the expected versioned top-level keys
- failure cases return non-zero exit codes
- `workspace switch --workspace ...` works non-interactively
- non-interactive workspace switching without enough input fails clearly
- `connect` has deterministic non-interactive behavior
- dry-run commands do not perform side effects
- projected output via `--fields` excludes unrequested fields
- command and schema introspection output is stable

## Suggested Sequencing

Recommended order:

1. Milestone 1
2. Milestone 2
3. Milestone 3
4. Milestone 4
5. Milestone 5
6. Milestone 6
7. Milestone 7

Reasoning:
- Milestones 1 and 2 establish the protocol contract
- Milestone 3 removes prompt-only blockers for automation
- Milestone 4 makes retries and side effects safer before more write surface is added
- Milestone 5 documents stabilized behavior
- Milestone 6 improves efficiency once the protocol is stable
- Milestone 7 depends on earlier contract decisions being settled

## Milestone Rules

Use these rules while executing the roadmap:

1. Only one milestone may be in active implementation at a time.
2. Each milestone must end with tests, docs updates where relevant, and a short
   acceptance summary.
3. If a milestone expands materially, split it before implementation rather
   than carrying hidden scope.
4. Do not add introspection or advanced efficiency features on top of unstable
   JSON contracts.
5. If a later milestone reveals a missing prerequisite, pause and create a
   prerequisite patch in the current or immediately previous milestone.

## Proposed Backlog Tickets

1. Harden `--json` output contract for all supported commands
2. Add a versioned shared JSON envelope for machine-readable commands
3. Normalize non-zero exit behavior across CLI commands
4. Add documented classified exit codes to README
5. Add non-interactive `workspace switch --workspace`
6. Add non-interactive provider connection flow
7. Add dry-run support for `delete` and `branch`
8. Design idempotency support for create and future bulk-create flows
9. Document config, cache, auth, and env precedence
10. Add `--fields` projection to key read commands
11. Add command inventory and schema introspection commands
12. Expand command-level tests for output, headless mode, and exit behavior

## Notes

- This review is based on the current repository state as of 2026-03-15.
- The agent-oriented review changes the target standard from "good human CLI"
  to "stable protocol for wrappers and autonomous agents".
- The biggest practical issue is contract stability for automation, not command
  discoverability by humans.
- If only one improvement is taken on immediately, it should be Phase 1:
  versioned JSON envelopes with stdout cleanliness.
- The Python framework suggestions are not a migration priority for this repo.
  The relevant lesson is protocol design, not rewriting away from oclif.
