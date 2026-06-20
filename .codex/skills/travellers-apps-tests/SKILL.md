---
name: travellers-apps-tests
description: Architecture and validation workflow for the muhammedgaygisiz/travellers-apps Nx workspace. Use when Codex implements or validates Angular/Ionic features, Capacitor native plugin dependencies or sync flows, Firebase functions, shared model/data-access changes, profile/API/store/search flows, linting, or when Nx project graph/daemon behavior hangs or obscures test output.
---

# Travellers Apps

## Purpose

Use this skill to implement and validate changes in `travellers-apps` while preserving the repo's feature layering and avoiding known Nx/lint/test traps.

## Feature Architecture

Prefer the existing Nx library boundaries instead of widening a layer casually:

- `libs/**/page`: presentation and integration. Component files own template/state rendering; `integration/*.container.ts` wires components to services; `integration/*.service.ts` owns UI workflow and navigation.
- `libs/**/data-access`: resource signals, callable/API wrappers, Firestore/API access, and typed request/result shapes used by the feature.
- `libs/bite-tribe-common/model`: shared app models only when multiple libraries need the same domain type. For feature-local result shapes, prefer colocated exported types in that feature's data-access library.
- `libs/bite-tribe/store`: NgRx state, router selectors, derived selectors, effects, and app-wide state transformations.
- `libs/bite-tribe/api`: client-side Firebase/Firestore API services and storage helpers used by app features.
- `apps/bite-tribe-firebase/functions`: backend callable/storage/pubsub functions. Export new functions from `src/index.ts`.
- `apps/bite-tribe/src/assets/i18n/*.json`: Bite Tribe app translations. If visible UI text is added, add keys for every app locale, not only English.

Common feature flow:

1. Read the current feature's component, container, service, data-access service, tests, and any related Firebase/API function before editing.
2. Keep UI-only display logic in the page component unless it drives navigation or persistence.
3. Keep navigation and workflow decisions in the integration service.
4. Keep remote calls and resource params in data-access. Add typed request/result interfaces there when the shape is feature-local.
5. Keep backend filtering/mapping in Firebase functions when a callable owns the query semantics.

## Implementation Patterns

- Angular/Ionic pages generally use standalone components, signals, `input()`, `output()`, `computed()`, and HTML control flow (`@if`, `@for`).
- Containers should stay thin: pass service signals/resource values into the page and route page outputs back to service methods.
- For result lists, prefer discriminated unions over guessing from object shape. This keeps click handling and display helpers explicit.
- For images, follow the repo convention `imagePath || image || ''`. `imagePath` often contains the usable Firebase Storage download URL.
- For Ionic icons, check `libs/common/utils/src/lib/add-necessary-icons.ts`; register new icon names there if they are not already included.
- Prefer Ionic layout helper classes such as `ion-display-flex`, `ion-flex-column`, `ion-flex-row`, and `ion-justify-content-*` in templates for simple flex layout before adding component CSS with `display: flex` or `flex-direction`.
- For dialogs/labels/buttons, use Transloco keys. Avoid hardcoded visible English in templates or alert config.
- For route assembly, reuse `PATH` from `libs/common/utils/src/lib/paths.ts` where possible and mirror existing services for route conventions.
- Avoid broad refactors while implementing an issue. Touch the layer that owns the behavior and adjacent tests.

## Linting Structure

- Most Angular/Nx libraries use repo-root ESLint through each library's `eslint.config.mjs` or Nx `lint` target.
- Firebase functions have their own Node/TypeScript lint setup under `apps/bite-tribe-firebase/functions`:

```bash
npm run lint
```

- Firebase functions lint uses Google style and single quotes are accepted by the current formatter/lint setup after repo Prettier. Run lint from the functions directory after adding or editing function files.
- Prefer targeted ESLint for touched Angular files when validating small changes:

```bash
npx eslint libs/bite-tribe/search/page/src/lib/integration/search.service.ts
```

- Run Prettier only on touched files to avoid formatting churn:

```bash
npx prettier --write path/to/file.ts path/to/file.html path/to/file.scss
```

## Workflow

1. Confirm the repository root:
   - Expected root: `/Users/mo/DEV/travellers-apps`
   - Check status with `git status --short --branch`.

2. Identify touched projects before testing/linting:
   - Prefer `git diff --name-only` and map changed files to the nearest `project.json`.
   - Project names may contain slashes, for example `bite-tribe/profile` and `bite-tribe/api`.
   - Do not infer Nx project names by replacing slashes with hyphens.

3. Try focused Nx tests when the project name is known:
   - Use `NX_DAEMON=false npx nx test "<project-name>" --runInBand`.
   - Quote slash-containing project names.
   - Run one Nx target at a time; parallel Nx runs may block each other on graph construction.

4. If Nx is silent, hangs, or reports project graph trouble:
   - Stop the run after a reasonable interval.
   - Read the touched project’s `project.json` for `targets.test.options.jestConfig`.
   - Run Jest directly with that config:

```bash
npx jest --config libs/bite-tribe/profile/page/jest.config.ts --runInBand
npx jest --config libs/bite-tribe/api/jest.config.ts --runInBand
```

5. Use direct Jest configs as the preferred fallback for this repo when validating a small set of edited libraries. This avoids waiting on Nx daemon/graph setup while preserving the library’s Jest transform and setup files.

6. Always run cheap consistency checks for broad file edits:
   - `git diff --check`
   - For JSON locale edits:

```bash
node -e "for (const f of process.argv.slice(1)) JSON.parse(require('fs').readFileSync(f,'utf8'))" apps/bite-tribe/src/assets/i18n/*.json apps/bite-tribe-business/src/assets/i18n/en.json
```

7. For Firebase functions changes:
   - Run `npm run build` from `apps/bite-tribe-firebase/functions`.
   - Run `npm run lint` from `apps/bite-tribe-firebase/functions`.
   - If only callable filtering/mapping changed, these checks are often the highest-signal validation unless function specs already exist.

## Capacitor Native Plugin Changes

When adding or removing native Capacitor plugins, treat the app wrapper package files as the durable source for native plugin discovery:

1. Add the plugin to the root `package.json` if it is not already installed.
2. Add the plugin to the relevant wrapper `package.json`, for example `apps/bite-tribe-ios/package.json` or `apps/bite-tribe-android/package.json`.
3. Regenerate the corresponding wrapper `package-lock.json` with `npm install --package-lock-only --ignore-scripts` from that wrapper directory.
4. Run the platform sync target, such as `nx run bite-tribe-ios:sync`, so Capacitor updates generated native dependency files like the iOS `Podfile`.
5. Review the generated native diffs and lockfiles. Prefer the sync workflow over hand-editing generated native dependency blocks as the primary path.

If Android native setup is intentionally deferred but shared TypeScript/native bridge code is Android-ready, still consider adding the Android wrapper package entry so future Android sync/update work can discover the plugin consistently.

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

## Reporting

When finishing, report:

- Which test commands were run.
- Whether Nx was used or bypassed, and why.
- Any warnings that appeared but did not fail the run, such as existing `ts-jest` warnings or expected console errors from tests.
- Any tests that could not be run.
