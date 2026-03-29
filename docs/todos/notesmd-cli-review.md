# NotesMD CLI Review For PM-CLI

This report compares `pm-cli` with [`Yakitrak/notesmd-cli`](https://github.com/Yakitrak/notesmd-cli) and focuses only on ideas that transfer cleanly into this project.

## Summary

`pm-cli` already has a reasonable monorepo and plugin architecture. The strongest opportunities from `notesmd-cli` are not about copying its command model, but about improving packaging, output contracts, config/path handling, and regression coverage around the CLI surface.

## Suggested Improvements

### 1. Make release packaging real, or stop advertising it

`pm-cli` currently documents Homebrew installation, but the implementation is incomplete:

- [README.md](../README.md) documents Homebrew with a placeholder tap owner.
- [packaging/homebrew/pm-cli.rb](../packaging/homebrew/pm-cli.rb) still contains `REPLACE_WITH_TARBALL_SHA256`.
- [.github/workflows/release.yml](../.github/workflows/release.yml) only publishes to npm and creates a GitHub release.

By comparison, `notesmd-cli` automates downstream packaging in [`.goreleaser.yml`](https://github.com/Yakitrak/notesmd-cli/blob/main/.goreleaser.yml), including Homebrew, Scoop, and AUR.

Applicable recommendation for `pm-cli`:

- automate Homebrew tap updates from the release workflow, or
- remove the Homebrew install instructions until the packaging path is actually maintained

This is the highest-leverage docs-to-reality cleanup in the repo.

### 2. Tighten output-mode behavior for scripting

Status:
- completed on 2026-03-29
- implementation record:
  `docs/todos/completed/cli-output-contract-hardening-slice.md`

Task list commands in `pm-cli` expose multiple output flags, but they are not enforced as mutually exclusive:

- [packages/cli/src/commands/tasks/assigned.ts](../packages/cli/src/commands/tasks/assigned.ts)
- [packages/cli/src/commands/tasks/overdue.ts](../packages/cli/src/commands/tasks/overdue.ts)
- [packages/cli/src/commands/tasks/search.ts](../packages/cli/src/commands/tasks/search.ts)

Today a user can combine `--json`, `--plain`, and `--ids-only`, and the command silently picks one by precedence. That is workable, but not a strong CLI contract.

`notesmd-cli` is more explicit:

- [`cmd/list_vaults.go`](https://github.com/Yakitrak/notesmd-cli/blob/main/cmd/list_vaults.go) marks output flags as mutually exclusive
- [`cmd/search_content.go`](https://github.com/Yakitrak/notesmd-cli/blob/main/cmd/search_content.go) switches behavior based on whether stdin/stdout are attached to a terminal

Applicable recommendation for `pm-cli`:

- add one shared helper to register output flags consistently
- enforce mutual exclusivity for `--json`, `--plain`, and `--ids-only`
- consider auto-switching to script-friendly output when stdout is not a TTY

This would reduce ambiguity and make shell automation safer.

### 3. Centralize path resolution for config, auth, and cache

`pm-cli` currently resolves storage locations in multiple places:

- [packages/core/src/managers/config-manager.ts](../packages/core/src/managers/config-manager.ts)
- [packages/core/src/managers/cache-manager.ts](../packages/core/src/managers/cache-manager.ts)
- [packages/core/src/managers/auth-manager.ts](../packages/core/src/managers/auth-manager.ts)

That works today, but it becomes brittle as more commands and environments are supported.

`notesmd-cli` has a stronger pattern here:

- dedicated config/path resolution logic in [`pkg/config/obsidian_path.go`](https://github.com/Yakitrak/notesmd-cli/blob/main/pkg/config/obsidian_path.go)
- extensive OS-specific tests in [`pkg/config/obsidian_path_test.go`](https://github.com/Yakitrak/notesmd-cli/blob/main/pkg/config/obsidian_path_test.go)

Applicable recommendation for `pm-cli`:

- introduce a shared `paths.ts` module for all filesystem locations
- support XDG-style overrides where appropriate
- optionally add explicit env overrides such as `PM_CONFIG_DIR` and `PM_CACHE_DIR`

That would make the repo easier to harden for CI, containers, and user-specific setups.

### 4. Expand CLI regression coverage around user-facing behavior

`pm-cli` has solid tests in a few important areas, especially create/update/thread flows, but the CLI surface still has gaps. I did not find direct command tests for:

- `tasks search`
- `providers`
- `config get`
- `config list`
- `config path`

Those commands are exactly where output format drift and automation regressions usually show up first.

`notesmd-cli` is stronger at this seam, especially around behavioral testing for interactive versus non-interactive search:

- [`pkg/actions/search_content_test.go`](https://github.com/Yakitrak/notesmd-cli/blob/main/pkg/actions/search_content_test.go)

Applicable recommendation for `pm-cli`:

- add command-level tests for output-flag conflicts
- add tests for warning aggregation when one provider fails and another succeeds
- add tests for config path and merged config value behavior
- add tests for non-interactive output expectations

This would increase confidence without changing the architecture.

### 5. Add a real static-analysis and security lane to CI

Current CI in `pm-cli` is straightforward and useful, but narrow:

- [.github/workflows/ci.yml](../.github/workflows/ci.yml) runs install, typecheck, build, and tests
- the current `lint` script is effectively TypeScript compilation only

`notesmd-cli` separates CI concerns more clearly:

- tests
- linting
- security checks

See [`.github/workflows/ci.yml`](https://github.com/Yakitrak/notesmd-cli/blob/main/.github/workflows/ci.yml).

Applicable recommendation for `pm-cli`:

- add ESLint, Biome, or Oxlint as an actual linting layer
- add a dependency vulnerability check
- consider CodeQL or another static-analysis/security workflow

For a CLI that stores credentials and talks to multiple external providers, this is a reasonable quality bar.

### 6. Surface shell completion and developer ergonomics better

`pm-cli` already includes `@oclif/plugin-autocomplete` in [packages/cli/package.json](../packages/cli/package.json), but that capability is not surfaced clearly in the main README.

`notesmd-cli` goes further by packaging completion artifacts for multiple shells through its release process.

Applicable recommendation for `pm-cli`:

- document shell completion in the install or quickstart section
- if release packaging is improved, consider shipping completion setup as part of distribution

This is a smaller improvement, but very aligned with a CLI-first product.

## Prioritized Next Steps

If this repo only takes a few ideas from `notesmd-cli`, these are the best candidates:

1. Fix or remove the incomplete Homebrew distribution path.
2. Standardize and enforce output-mode flag behavior.
3. Add command-level tests for config and search/output behavior.
4. Introduce a shared path-resolution layer.
5. Add a real lint/security lane in CI.

## Scope Notes

This review was based on source inspection only. I did not run either repository's test suite.

## Sources

External repo:

- [`notesmd-cli` README](https://github.com/Yakitrak/notesmd-cli/blob/main/README.md)
- [`notesmd-cli` CI workflow](https://github.com/Yakitrak/notesmd-cli/blob/main/.github/workflows/ci.yml)
- [`notesmd-cli` release config](https://github.com/Yakitrak/notesmd-cli/blob/main/.goreleaser.yml)
- [`notesmd-cli` search-content command](https://github.com/Yakitrak/notesmd-cli/blob/main/cmd/search_content.go)
- [`notesmd-cli` list-vaults command](https://github.com/Yakitrak/notesmd-cli/blob/main/cmd/list_vaults.go)
- [`notesmd-cli` config path tests](https://github.com/Yakitrak/notesmd-cli/blob/main/pkg/config/obsidian_path_test.go)
- [`notesmd-cli` search-content tests](https://github.com/Yakitrak/notesmd-cli/blob/main/pkg/actions/search_content_test.go)

Local repo:

- [README.md](../README.md)
- [.github/workflows/ci.yml](../.github/workflows/ci.yml)
- [.github/workflows/release.yml](../.github/workflows/release.yml)
- [packaging/homebrew/pm-cli.rb](../packaging/homebrew/pm-cli.rb)
- [packages/core/src/managers/config-manager.ts](../packages/core/src/managers/config-manager.ts)
- [packages/core/src/managers/cache-manager.ts](../packages/core/src/managers/cache-manager.ts)
- [packages/core/src/managers/auth-manager.ts](../packages/core/src/managers/auth-manager.ts)
- [packages/cli/src/commands/tasks/assigned.ts](../packages/cli/src/commands/tasks/assigned.ts)
- [packages/cli/src/commands/tasks/overdue.ts](../packages/cli/src/commands/tasks/overdue.ts)
- [packages/cli/src/commands/tasks/search.ts](../packages/cli/src/commands/tasks/search.ts)
- [packages/cli/package.json](../packages/cli/package.json)
