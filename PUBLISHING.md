# Publishing Playbook (Agent-Safe)

This is the single source of truth for publishing the workspace packages from this monorepo.

## Non-Negotiable Rules

1. Use `pnpm` commands for publish flow.
2. Do not run `npm publish` inside `packages/*`.
3. Run preflight checks before any publish.
4. Publish in dependency order when doing manual filtered publishes.

Why rule #2 exists:
- Internal dependencies use `workspace:^` in source manifests.
- `pnpm publish` rewrites these to normal semver in publish artifacts.
- `npm publish` can leave `workspace:^` unresolved in packed metadata.

## Packages and Dependency Order

Publish order must follow dependency graph:

1. `packages/core`
2. `packages/plugin-asana`
3. `packages/plugin-notion`
4. `packages/plugin-trello`
5. `packages/plugin-linear`
6. `packages/plugin-clickup`
7. `packages/cli`

If you need the published package names, read them from each package's `package.json`.

## Standard Release Flow (Recommended)

Use Changesets for versioning + publishing:

```bash
pnpm changeset
pnpm changeset:version
pnpm install
pnpm prepublish:check
pnpm changeset:publish
```

What this does:
- Records release intent.
- Bumps versions/changelogs.
- Ensures lockfile is in sync.
- Verifies build/test/lint.
- Publishes packages to npm in workspace-aware mode.

## Manual Publish Flow (Only If Needed)

Use this only when you intentionally skip changesets.

### 1) Version bump

Update changed package versions in `package.json` files (semver).

### 2) Validate

```bash
pnpm install --frozen-lockfile
pnpm prepublish:check
pnpm publish:dry
```

### 3) Publish in order

```bash
pnpm --filter ./packages/core publish --no-git-checks --access public
pnpm --filter ./packages/plugin-asana publish --no-git-checks --access public
pnpm --filter ./packages/plugin-notion publish --no-git-checks --access public
pnpm --filter ./packages/plugin-trello publish --no-git-checks --access public
pnpm --filter ./packages/plugin-linear publish --no-git-checks --access public
pnpm --filter ./packages/plugin-clickup publish --no-git-checks --access public
pnpm --filter ./packages/cli publish --no-git-checks --access public
```

## Fast Path Commands

Publish all workspace packages:

```bash
pnpm publish:all
```

Dry run all workspace packages:

```bash
pnpm publish:dry
```

## Authentication

```bash
npm whoami
```

If this fails, run:

```bash
npm login
```

If npm 2FA is enabled for publish, add `--otp <code>` to the publish command(s).

## Post Publish

```bash
git add -A
git commit -m "chore: release vX.Y.Z"
git tag vX.Y.Z
git push
git push --tags
```

## Agent Checklist (Must Pass)

- [ ] No `npm publish` commands used.
- [ ] `pnpm install --frozen-lockfile` passes.
- [ ] `pnpm prepublish:check` passes.
- [ ] `pnpm publish:dry` reviewed.
- [ ] Real publish executed via `pnpm` only.
- [ ] Git commit and tag pushed.
