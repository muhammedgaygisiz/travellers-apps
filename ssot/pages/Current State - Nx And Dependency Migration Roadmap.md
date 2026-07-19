# Current State - Nx And Dependency Migration Roadmap

## Purpose

This page defines the staged migration path for Nx, Angular, Node.js, test tooling, visual regression tooling, and closely coupled workspace dependencies.

The goal is to improve project-graph reliability and keep the toolchain supported without combining unrelated major upgrades into one change.

## Decisions

- Playwright is the only E2E framework for this workspace.
- The legacy Cypress project and all Cypress configuration and dependencies should be removed rather than migrated.
- Visual regression uses the `oblador/loki` CLI directly.
- The `nx-loki` plugin, its `nx.json` registration, and Nx-inferred Loki targets should be removed.
- Updating Node.js is not a blocker. Local development and CI should use the same explicitly supported Node.js line.
- Official `nx` and `@nx/*` packages must stay on exactly the same version.
- Nx should be upgraded independently from Angular when the current Angular version remains supported.
- Angular 22 is not part of the initial Nx 23 migration.
- TypeScript must follow Angular's supported range; do not upgrade to TypeScript 7 independently.
- Capacitor, Firebase, Stylelint, Storybook, and other ecosystem upgrades should be separate batches unless an Nx migration strictly requires them.

## Current Baseline

As of 19 July 2026:

| Area                | Current State                                                                                     | Migration Relevance                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Nx                  | `23.1.0` across the official top-level packages (issue #1033)                                     | Phase 2 complete; Angular 22 is the next major boundary (Phase 4).                            |
| Angular             | `21.2.x` (issue #1031)                                                                            | Supported by Nx 23; on the latest Angular 21 family before the Angular 22 boundary.           |
| TypeScript          | `5.9.3`                                                                                           | Correct for Angular 21; retained on Nx 23 (TypeScript 6 deferred to Angular 22).              |
| Node.js             | Pinned to `24.15.0`+ (`24.18.0`) via `.nvmrc`, `package.json` engines, and CI `node-version-file` | Aligned and pinned (issue #1030); inside the supported Node 24 line for Nx 23 and Angular 21. |
| NgRx                | `21.1.1` (issue #1031)                                                                            | Stable NgRx 21 requires Angular 21, so it currently blocks Angular 22.                        |
| Capacitor Nx plugin | `@nxext/capacitor@23.0.0`                                                                         | Loads Nx 23 (issue #1033); the nested Nx 21 generation is gone.                               |
| Visual regression   | `loki@0.35.1` invoked directly via repository scripts; `nx-loki` removed                          | Nx adapter removed (issue #1040); Loki now runs through `loki.config.js`.                     |
| E2E                 | Playwright consumer suite; legacy Cypress business project removed                                | Cypress removed; place all E2E coverage in Playwright.                                        |

The installed dependency tree now contains a single Nx generation. `@nxext/capacitor@23` loads Nx 23 (issue #1033), the `nx-loki` adapter has been removed, and the previously nested `nx@21`/`@nx/devkit@21` under `@nxext/capacitor`/`@nxext/common` is gone. This closes the documented multi-generation project-graph risk.

## Migration Principles

1. Make obsolete tooling removal explicit before changing the Nx major version.
2. Upgrade at most one Nx major at a time.
3. Keep each phase independently reviewable and revertible.
4. Run the migration generators, inspect their output, and do not accept optional ecosystem upgrades automatically.
5. Do not move to the next phase until the current validation gate is green.
6. Preserve application behavior; this roadmap is infrastructure work, not a product feature change.
7. Do not let toolchain work displace launch-blocking product and production-readiness work.

## Phase 0 - Remove Obsolete Tooling Constraints

### Cypress removal

Status: complete (issue #1032). The steps below are done; keep them for context.

- Remove `apps/bite-tribe-business-e2e` and its Cypress configuration.
- Remove Cypress-specific lint, TypeScript, executor, and dependency references.
- Do not add `@nx/cypress` or `cypress` during the Nx migration.
- Recreate any still-required business-app E2E scenarios in Playwright before deleting unique behavioral coverage.
- Keep consumer and business E2E coverage under the Playwright testing architecture.

### Direct Loki adoption

Status: complete (issue #1040). The steps below are done; keep them for context.

- Remove `nx-loki` from dependencies and from the `nx.json` plugin list.
- Keep the upstream `loki` package from `oblador/loki`.
- Run visual tests through direct CLI commands such as `loki test` and `loki update`, exposed through repository scripts.
- Update the Loki reference-update workflow so it calls the direct CLI instead of Nx `update-loki` targets.
- Preserve the current reference-image review and pull-request workflow.
- Validate `loki@0.35.1` directly against the current Angular Storybook 10 host. If upstream compatibility work is needed, solve it at the direct Loki/Storybook boundary and do not reintroduce an Nx adapter.

### Node.js alignment

Status: complete (issue #1030). The steps below are done; keep them for context.

- Selected Node.js `24.18.0` (Krypton LTS), the newest patch in the supported Node 24 line and above the `24.15.0` floor.
- Recorded the pinned version in `.nvmrc` (`24.18.0`), in `package.json` `engines` (`node: ">=24.15.0 <25.0.0"`, `npm: ">=11.0.0"`), and in the shared CI setup action `.github/actions/setup/action.yml` via `node-version-file: '.nvmrc'` instead of the floating `22.x` selector. `apps/bite-tribe-firebase/functions/package.json` already declares `engines.node: "24"`, so the deploy runtime is consistent.
- Local development and CI now resolve the same explicit Node version because the CI setup action reads `.nvmrc`.
- Completed early because Angular 21, Nx 22.7, and Nx 23 can all run on the selected Node 24 line; it then ceases to be an Angular 22 prerequisite risk.
- Validated by a clean `npm ci` from the lockfile under Node `24.18.0` (only the environmental `sharp` prebuilt-binary download was blocked by egress policy, not a Node 24 incompatibility), `nx show projects`, and a focused Jest suite.

### Dependency inventory

Package-tree audit under Node `24.18.0` records the following non-official Nx / older-Devkit loaders and their keep/upgrade/remove decisions:

| Package                  | Installed | Older generation it loads                                                                                                                            | Decision                                                                                                                                  |
| ------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `@nxext/capacitor`       | `23.0.0`  | none nested; depends on `@nx/devkit@^23` and `nx@^23`, satisfied by the hoisted `23.1.0`, so `@nxext/common@23.0.0` no longer carries a nested Nx 21 | Upgraded to `@nxext/capacitor@23` in Phase 2 (issue #1033); the workspace now runs a single Nx 23 generation.                             |
| `@ionic/angular-toolkit` | `12.3.0`  | nested `@angular-devkit/core@20.3.20` (peer `@angular-devkit/*@^20`), one generation behind the workspace's `21.0.4`                                 | Keep; schematics-only, not an application runtime dependency. Validate generators before any Angular major bump; do not upgrade blindly.  |
| `nx-stylelint`           | `18.0.0`  | none nested (peer `@nx/devkit >=19` satisfied by the hoisted `@nx/devkit@22.3.3`)                                                                    | Keep with the Stylelint 16 configuration until the dedicated Stylelint migration track.                                                   |
| `nx-mcp`                 | `0.3.0`   | none (no `nx`/`@nx` dependency; no repository MCP config references it)                                                                              | Keep pinned as an optional developer aid; confirm intentional use before upgrading, do not upgrade merely because a newer version exists. |

After Phase 2 (issue #1033), only `@ionic/angular-toolkit` (Angular Devkit 20) still loads an older generation, and it has an explicit follow-up decision. The `@nxext/capacitor` Nx 21 nesting that drove the documented multi-generation project-graph risk is resolved: the tree now carries a single Nx 23 generation.

### Phase 0 validation gate

- Nx can construct and print the project graph.
- Storybook builds.
- Direct Loki comparison and reference update commands work.
- The Playwright suite runs serially against the Firebase emulators.
- Local development and CI use the same pinned Node.js version.
- No first-party Cypress project, configuration, script, or direct dependency remains; unavoidable transitive package metadata does not count as a supported Cypress surface.
- No `nx-loki` dependency, plugin registration, script, or workflow invocation remains outside historical changelog pages.

## Phase 1 - Stabilize On Nx 22.7

Status: complete (issue #1035). `nx` and every official `@nx/*` package are aligned on `22.7.7`. `nx migrate 22.7.7` generated only Nx-scoped migrations (gitignore/prettierignore entries for `.nx/polygraph` and `.nx/self-healing`, and `@nx/eslint:lint` executor input defaults in `nx.json`); no inferred-task conversion. The Angular 21.0.x -> 21.2.x, `angular-eslint`, and other ecosystem bumps that `nx migrate` proposed were reverted and left for their dedicated Phase 3 tracks. The Nx-coupled `@swc/*` build-tooling bumps were kept. Angular 21.0.x, TypeScript 5.9.3, and `@nxext/capacitor@21` are unchanged.

- Upgrade `nx` and every official `@nx/*` package from `22.3.3` to the same latest `22.7.x` version.
- Run all generated Nx migrations before continuing.
- Keep Angular 21 and TypeScript 5.9 during this phase.
- Keep `@nxext/capacitor@21` temporarily; its alignment is resolved in Phase 2 because there is no matching stable v22 release.
- Adopt no inferred-task conversion as part of this phase.

Expected benefits relevant to this workspace:

- Lower daemon memory usage.
- Faster project-graph and cache behavior.
- Worktree-aware caching for parallel agent work.
- Better target input/output inspection.
- `nx affected --stdin` support for CI and tooling.
- Optional task sandboxing to audit cache correctness.

### Phase 1 validation gate

- `nx report`, `nx show projects`, and project graph generation complete without a silent stall.
- Consumer and business application production builds pass.
- Representative focused Jest suites pass through Nx and directly through Jest.
- Firebase Functions build and lint pass.
- Storybook build and direct Loki tests pass.
- Playwright E2E passes serially.
- Capacitor doctor/sync and the relevant native builds pass.

Validation run for issue #1035 (Node 24.13.0 locally; the repo pins 24.18.0): `nx report` and `nx show projects` (88 projects, unchanged set) and file-based graph generation completed with no stall; `bite-tribe` and `bite-tribe-business` production builds passed; focused Jest (`bite-tribe/bite-data-access`, `common-ui-card`) passed through Nx and directly through Jest; the Firebase Functions `tsc` build passed and the project's real lint (`npm run lint` inside `apps/bite-tribe-firebase/functions`) is clean; the Storybook host build passed; `bite-tribe` and `bite-tribe-business` flat-config lint passed; `git diff --check` is clean. The inferred `nx lint bite-tribe-firebase` phantom problems remain the pre-existing known issue tracked in [[Current State - Known Issues]] and are unaffected by the Nx version. Playwright E2E, direct Loki visual tests, and Capacitor sync/native builds were deferred to CI/device runs because they need emulators, reference images, and native toolchains.

## Phase 2 - Upgrade To Nx 23.1

Status: complete (issue #1033). `nx` and every official `@nx/*` package are aligned on `23.1.0`, and `@nxext/capacitor` is on `23.0.0` so the whole tree now runs a single Nx 23 generation (the nested `nx@21`/`@nx/devkit@21` under `@nxext/capacitor`/`@nxext/common` is gone). `nx migrate 23.1.0` was run and its migrations reviewed: the Nx-scoped deterministic migrations were applied (`.nx/migrate-runs` added to `.gitignore`, the removed `@typescript-eslint/no-extra-semi` extension rule dropped from the root `eslint.config.mjs`, and the Jest snapshot guide URL refreshed in three `.snap` files). The `set-ts-jest-isolated-modules` migration produced no changes on this workspace, and the `ban-types` prompt migration was a no-op (no config references the removed rule). The two TypeScript 6 migrations (`add-ignore-deprecations-for-ts6`, `set-tsconfig-root-dir-for-ts6`) and every ecosystem bump `nx migrate` proposed (TypeScript 6.0, Storybook 10.5, Jest 30.3, ts-jest 29.4.9, typescript-eslint 8.64) were reverted; Angular 21.0.x, TypeScript 5.9.3, Storybook 10.1.11, and the Jest 30.0.x stack are unchanged and stay on their dedicated Phase 3/4 tracks. No Cypress project, `nx-loki`, inferred-task conversion, Angular 22, TypeScript 6, or Stylelint 17 was introduced.

Nx 23's `@nx/js` adds an optional `@swc/cli` peer whose own `chokidar@^5` peer conflicts with the workspace's hoisted `chokidar@4`. npm's strict resolver refuses to skip the optional peer and fails the Nx-major update, so a `.npmrc` with `legacy-peer-deps=true` was added to keep `npm install`/`npm ci` (local and CI) consistent with the resolved lockfile. This does not install `@swc/cli` (it stays absent from the tree) and keeps the `package-lock.json` delta scoped to the Nx dependency subtree rather than floating unrelated `^`/`~` ranges. Retire the setting if a later Nx or `@swc/cli` release removes the conflict.

Validation run for issue #1033 (Node 24.18.0): `nx report` and `nx show projects` (88 projects, unchanged set) and file-based graph generation completed with no stall; the tree carries a single Nx `23.1.0` / `@nx/devkit@23.1.0` generation; `bite-tribe` and `bite-tribe-business` production builds passed; focused Jest (`bite-tribe/bite-data-access`, `bite-tribe/store`, `common-ui-chart`) passed through Nx including the touched snapshots; the Firebase Functions `tsc` build passed and the project's real lint (`npm run lint` inside `apps/bite-tribe-firebase/functions`) is clean (pre-existing `no-explicit-any` warnings only); flat-config lint (`common-ui-card`) and the legacy `.eslintrc.js` functions lint both load under ESLint 9; the Storybook host build passed; and the `@nxext/capacitor:cap` executor invoked the Capacitor CLI for `bite-tribe-ios`. Playwright E2E, direct Loki visual tests, and native Capacitor Android/iOS builds were deferred to CI/device runs because they need emulators, reference images, and native toolchains (the Loki path also needs the `sharp` prebuilt binary, which the environment's egress policy blocks).

- Upgrade `nx` and every official `@nx/*` package together to `23.1.x`.
- Use the migration package-selection mechanism to include required Nx updates while retaining Angular 21.
- Upgrade `@nxext/capacitor` to v23 in the same phase so it loads Nx 23 instead of Nx 21.
- Keep TypeScript 5.9.
- Review every generated migration before execution.
- Do not introduce Cypress, `nx-loki`, inferred-task conversion, Angular 22, TypeScript 6, or Stylelint 17 in this phase.

Repository scans show no current use of the main Nx 23 removals: deprecated Nx deep imports, `createNodesV2`, Angular module-federation imports, deprecated Jest executor setup options, Karma executors, SSR `experimentalPlatform`, or legacy Nx release-tag configuration. The expected source migration is therefore small, but validation remains mandatory.

### Phase 2 validation gate

- Repeat the full Phase 1 gate on Nx 23.
- Confirm there is only one official Nx 23 toolchain at the workspace level and through `@nxext/capacitor`.
- Confirm the Android and iOS Nx targets still invoke Capacitor correctly.
- Confirm ESLint flat configs and all Jest configs load successfully.

## Phase 3 - Same-Major Ecosystem Stabilization

Perform these as small, separately validated batches:

- Angular 21.0.x to the latest supported Angular 21.2.x family. Status: complete (issue #1031).
- NgRx 21.0.x to the latest NgRx 21.x family. Status: complete (issue #1031).
- Ionic 8.7.x to the latest compatible Ionic 8.x release. Status: complete (issue #1031).
- Storybook 10.1.x to the latest compatible Storybook 10.x release.
- Jest 30.0.x and its environments/utilities to a consistent Jest 30 release.
- `jest-preset-angular` to a release supporting Angular 21, Jest 30, and the selected TypeScript version.
- Playwright to a current compatible release, followed by browser reinstallation and E2E validation.

Do not use raw `npm update` for Angular. Use Nx/Angular migrations so the Angular framework, CLI, Devkit, Material, CDK, compiler, and Zone.js remain compatible.

### Angular, NgRx, and Ionic batch (issue #1031)

Landed together because they are the interlocking Angular-runtime packages:

| Package family                                                      | From     | To        |
| ------------------------------------------------------------------- | -------- | --------- |
| Angular framework (`core`, `common`, `forms`, `router`, ...)        | `21.0.6` | `21.2.18` |
| Angular CLI, Devkit, `@angular/build`, `pwa`, `@schematics/angular` | `21.0.4` | `21.2.19` |
| `@angular/material`, `@angular/cdk`, `@angular/cdk-experimental`    | `21.0.5` | `21.2.14` |
| All `@ngrx/*` packages and schematics                               | `21.0.1` | `21.1.1`  |
| `@ionic/angular`                                                    | `8.7.16` | `8.8.14`  |

Each family was moved with `nx migrate <package>@<version>`; no raw `npm update` was used. Every migration run reported no migrations to execute, so no generated codemods were applied. TypeScript stays `5.9.3`, `zone.js` stays `0.16.0`, and no Angular 22 or TypeScript 6 package entered the lockfile as a direct dependency. `@nx/eslint` still nests a transitive `typescript@6.0.3`; that is pre-existing and not a direct dependency.

Two source-level adaptations were required:

- Angular 21.2 renamed the experimental signal-forms `Field` directive to `FormField` (selector `[field]` -> `[formField]`, input alias `formField`). `Field` still exists as a type, so the old code failed with `TS2693`/`NG1010` at build time rather than silently. Angular ships no automated migration for this rename. Updated the three `libs/bite-tribe-business/edit-menu` components and their templates. Verified the directive still matches and pushes values to the DOM (six `FormField` instances bound; `ion-input.value` receives the model value).
- Ionic `8.7.18` began bundling its own Stencil runtime, which patches `childNodes` and `textContent` so they read empty under jsdom. This broke one element-tree snapshot and two `textContent` assertions while leaving browser behavior correct. The affected assertions now read `innerHTML`. Recorded in [[Current State - Known Issues]].

Validation run for issue #1031 (Node 24.18.0): `bite-tribe` and `bite-tribe-business` production builds passed; `nx run-many -t test --all` passed for all 81 projects; lint passed for `bite-tribe`, `bite-tribe-business`, `common-ui-page`, `bite-tribe-business/organisation-dashboard`, and `bite-tribe-business/edit-menu`; the Firebase Functions `tsc` build and the project's real `npm run lint` are clean; the Storybook host build passed and the Storybook dev server rendered Ionic components correctly in a real browser; `git diff --check` is clean. Playwright E2E, direct Loki visual tests, and native Capacitor Android/iOS builds were deferred to CI/device runs because they need emulators, reference images, and native toolchains.

## Phase 4 - Angular 22

Angular 22 starts only when the complete dependency set is available and compatible.

Prerequisites:

- The Phase 0 Node.js alignment is complete and remains inside Angular 22's supported range.
- Stable NgRx 22 is available.
- Ionic, Storybook, Jest, `jest-preset-angular`, Transloco, and the Angular tooling declare Angular 22 compatibility.
- The Nx 23 workspace is stable before changing Angular.

Coordinated upgrade set:

- Angular framework, CLI, compiler, Devkit, build tooling, Material, CDK, PWA, and service worker to 22.
- NgRx packages and schematics to 22.
- Angular ESLint to 22.
- TypeScript to the Angular 22-supported `6.0.x` range.
- Zone.js and other packages selected by the Angular migration.

Do not install TypeScript 7 during this phase.

### Phase 4 validation gate

- Full production builds for every Angular application.
- All focused and affected Jest suites.
- Storybook build and direct Loki visual regression.
- Serial Playwright E2E against Firebase emulators.
- Firebase Functions validation.
- Capacitor sync plus Android and iOS builds.
- Manual launch-critical device checks from [[Current State - Release State]].

## Separate Migration Tracks

The following should not be bundled into the Nx or Angular major migrations:

| Track                                            | Rule                                                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Capacitor core and plugins                       | Upgrade the Capacitor 8 family together, run Capacitor sync, and validate both native platforms. |
| Capacitor Firebase plugins                       | Keep their versions aligned and validate every native Firebase integration.                      |
| Firebase client, Admin SDK, Functions, and tools | Separate frontend SDK updates from backend major-version changes such as Firebase Admin.         |
| Stylelint                                        | Upgrade `nx-stylelint`, Stylelint, and both shared configs as one dedicated batch.               |
| Transloco                                        | Treat its major upgrade as an application compatibility change, not an Nx requirement.           |
| Commitlint and formatting                        | Upgrade independently unless an Nx migration explicitly requires a compatible version.           |

## Completion Criteria

The roadmap is complete when:

- Nx 23 and every official `@nx/*` package are aligned.
- `@nxext/capacitor` is aligned with Nx 23.
- Cypress and the legacy Cypress project are gone.
- Playwright owns all E2E coverage.
- `nx-loki` is gone and direct `oblador/loki` commands own visual regression.
- Local and CI Node.js versions are explicitly aligned.
- Angular 22 and TypeScript 6 have landed only after their dependency prerequisites are satisfied.
- The full validation gate is green and remaining exceptions are recorded in [[Current State - Known Issues]].

## Related Pages

- [[Current State - Roadmap]]
- [[Current State - Known Issues]]
- [[Current State - Release State]]
- [[Architecture - Nx Workspace]]
- [[Architecture - Testing]]
- [[Implementation - Testing]]
- [[Implementation - Release And Build Workflow]]
