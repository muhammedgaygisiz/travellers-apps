# Validation

## Workflow

1. Confirm the repository root:

```bash
git status --short --branch
```

2. Identify touched projects:

```bash
git diff --name-only
```

Map changed files to the nearest `project.json`. Project names may contain slashes, for example `bite-tribe/profile` and `bite-tribe/api`; do not infer names by replacing slashes with hyphens.

3. For narrow Jest-only library changes, prefer the direct Jest command against the project's own `jest.config.ts` or `jest.config.cts`. This avoids the recurring Nx daemon/project-graph startup stall while still using the library's real Jest setup.

4. Try focused Nx tests when the project graph behavior itself needs coverage, when the target has no direct equivalent, or when the user explicitly asks for Nx:

```bash
NX_DAEMON=false npx nx test "<project-name>" --runInBand
```

Run one Nx target at a time. Parallel Nx runs may block each other on project graph construction.

If Nx starts without useful output for roughly 10 seconds, stop it and use the direct command for the touched project. Report that Nx was bypassed because of the recurring silent startup/project-graph stall.

5. If Nx is silent, hangs, or reports project graph trouble, stop early. `project.json` declares no Jest target — `@nx/jest/plugin` infers `test` from the `jest.config.ts` or `jest.config.cts` in the project root (issue #1379). Run that config directly:

```bash
npx jest --config libs/bite-tribe/profile/page/jest.config.ts --runInBand
npx jest --config libs/bite-tribe/api/jest.config.ts --runInBand
```

Use direct Jest configs as the preferred fallback for small edits. This avoids waiting on Nx daemon/graph startup while preserving each library's Jest transform/setup.

Prefer scaffolding new Angular libraries with the repo's Nx generators so `project.json`, tsconfigs, Jest setup, tags, and path mappings are created consistently. If generator use is impractical or a generated config fails, compare against the nearest sibling library's `jest.config.ts`, `tsconfig.json`, `tsconfig.lib.json`, `tsconfig.spec.json`, and `src/test-setup.ts`; bare Jest configs often fail to transform Angular/Ionic `.mjs` packages without the existing `jest-preset-angular` transform and `transformIgnorePatterns`.

## Linting And Formatting

- Most Angular/Nx libraries use repo-root ESLint through each library's `eslint.config.mjs` or Nx `lint` target. `project.json` declares no `lint` target — `@nx/eslint/plugin` infers it and runs `eslint .` with the cwd set to the project root (issue #1379). When adding a `files` or `ignores` pattern to any ESLint config, write it so it matches from either basePath; see the basePath trap in `ssot/pages/Architecture - Nx Workspace.md`.
- Prefer targeted ESLint for touched Angular files:

```bash
npx eslint libs/bite-tribe/search/page/src/lib/integration/search.service.ts
```

- Run Prettier only on touched files:

```bash
npx prettier --write path/to/file.ts path/to/file.html path/to/file.scss
```

- Use Stylelint for touched SCSS when relevant:

```bash
npx stylelint path/to/file.scss
```

## Cheap Consistency Checks

Always run:

```bash
git diff --check
```

For JSON locale edits:

```bash
node -e "for (const f of process.argv.slice(1)) JSON.parse(require('fs').readFileSync(f,'utf8'))" apps/bite-tribe/src/assets/i18n/*.json apps/bite-tribe-business/src/assets/i18n/en.json
```

## Firebase Functions

For Firebase functions changes, run from `apps/bite-tribe-firebase/functions`:

```bash
npm run build
npm run lint
```

If only callable filtering/mapping changed, these are often the highest-signal checks unless function specs already exist.

Firebase functions lint uses Google style and single quotes are accepted by the current formatter/lint setup after repo Prettier.

## Known Project Paths

- `libs/bite-tribe/profile/page/project.json`
  - Name: `bite-tribe/profile`
  - Jest config: `libs/bite-tribe/profile/page/jest.config.ts`
- `libs/bite-tribe/api/project.json`
  - Name: `bite-tribe/api`
  - Jest config: `libs/bite-tribe/api/jest.config.ts`
- `libs/bite-tribe/search/page/project.json`
  - Name: `bite-tribe/search`
  - Jest config: `libs/bite-tribe/search/page/jest.config.cts`
- `libs/bite-tribe/search/data-access/project.json`
  - Name: `bite-tribe/search-data-access`
  - Jest config: `libs/bite-tribe/search/data-access/jest.config.ts`
