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
- Inferred-task conversion is its own track, run on a settled Nx major rather than inside one. Phases 1 and 2 deliberately deferred it; it landed on the stable Nx 23 workspace in issue #1379.

## Current Baseline

As of 24 August 2026:

| Area                | Current State                                                                                     | Migration Relevance                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Nx                  | `23.1.0` across the official top-level packages (issue #1033)                                     | Phase 2 complete; Nx 23 carried Angular 22 without a version change.                          |
| Angular             | `22.1.3` framework / `22.1.5` CLI family (issue #1037)                                            | Phase 4 complete; the workspace is on the Angular 22 major.                                   |
| TypeScript          | `6.0.3` (issue #1037)                                                                             | Inside Angular 22's supported `>=6.0 <6.1` range. TypeScript 7 is not installed.              |
| Node.js             | Pinned to `24.15.0`+ (`24.18.0`) via `.nvmrc`, `package.json` engines, and CI `node-version-file` | Aligned and pinned (issue #1030); inside the supported Node 24 line for Nx 23 and Angular 22. |
| NgRx                | `22.0.0` (issue #1037)                                                                            | Stable NgRx 22 published on 24 August 2026; it peers `@angular/core ^22.0.0`.                 |
| Capacitor Nx plugin | `@nxext/capacitor@23.0.0`                                                                         | Loads Nx 23 (issue #1033); the nested Nx 21 generation is gone.                               |
| Visual regression   | `loki@0.35.1` invoked directly via repository scripts; `nx-loki` removed                          | Nx adapter removed (issue #1040); Loki now runs through `loki.config.js`.                     |
| E2E                 | Playwright consumer suite; legacy Cypress business project removed                                | Cypress removed; place all E2E coverage in Playwright.                                        |
| Jest task wiring    | `@nx/jest/plugin` inferred `test` targets; no `@nx/jest:jest` executor anywhere (issue #1379)     | Off the Nx 24 removal path; shared config lives in `nx.json` `targetDefaults.test`.           |
| Lint task wiring    | `@nx/eslint/plugin` inferred `lint` targets; no `@nx/eslint:lint` executor anywhere (issue #1379) | Off the Nx 24 removal path; the plugin's own inputs replaced the `targetDefaults` entry.      |

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

| Package                  | Installed | Older generation it loads                                                                                                                            | Decision                                                                                                                                                                     |
| ------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@nxext/capacitor`       | `23.0.0`  | none nested; depends on `@nx/devkit@^23` and `nx@^23`, satisfied by the hoisted `23.1.0`, so `@nxext/common@23.0.0` no longer carries a nested Nx 21 | Upgraded to `@nxext/capacitor@23` in Phase 2 (issue #1033); the workspace now runs a single Nx 23 generation.                                                                |
| `@ionic/angular-toolkit` | `12.3.0`  | nested `@angular-devkit/core@20.3.20` (peer `@angular-devkit/*@^20`), one generation behind the workspace's `21.0.4`                                 | Keep; schematics-only, not an application runtime dependency. Validate generators before any Angular major bump; do not upgrade blindly.                                     |
| `nx-stylelint`           | `19.0.0`  | none nested; v19 declares `@nx/devkit@^22` as a direct dependency, so an override pins it to the hoisted `@nx/devkit@23.1.0` (issue #1039)           | Upgraded to `nx-stylelint@19` with Stylelint 17 in the dedicated Stylelint batch (issue #1039); the override keeps a single Nx generation.                                   |
| `nx-mcp`                 | `0.3.0`   | none (no `nx`/`@nx` dependency; no repository MCP config or script references it)                                                                    | Kept pinned at `0.3.0` in issue #1039; intended use is unverified, so it was not upgraded merely because `0.25.0` exists, and it adds no dependency or Nx-generation impact. |

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
- Storybook 10.1.x to the latest compatible Storybook 10.x release. Status: complete (issue #1036).
- Jest 30.0.x and its environments/utilities to a consistent Jest 30 release. Status: complete (issue #1036).
- `jest-preset-angular` to a release supporting Angular 21, Jest 30, and the selected TypeScript version. Status: complete (issue #1036).
- Playwright to a current compatible release, followed by browser reinstallation and E2E validation. Status: complete (issue #1036).

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

Validation run for issue #1031 (Node 24.18.0): `bite-tribe` and `bite-tribe-business` production builds passed; `nx run-many -t test --all` passed for all 81 projects; lint passed for `bite-tribe`, `bite-tribe-business`, `common-ui-page`, `bite-tribe-business/organisation-dashboard`, `bite-tribe-business/edit-menu`, and `storybook-host`; the Firebase Functions `tsc` build and the project's real `npm run lint` are clean; the Storybook host build passed and the Storybook dev server rendered Ionic components correctly in a real browser; direct Loki visual regression passed with zero differences across three consecutive full runs (244 stories per run); `git diff --check` is clean. Playwright E2E and native Capacitor Android/iOS builds were deferred to CI/device runs because they need emulators and native toolchains.

Direct Loki initially reported failures on the restaurant `@defer` image stories. Investigation showed this was a pre-existing capture race rather than an Angular or Ionic regression: every diff was confined to the hero-image region while all surrounding layout, text, and map pixels matched exactly, and 237 of 244 stories passed untouched. Loki was capturing before the `@placeholder (minimum 1000ms)` block resolved, and seven references had been approved in the skeleton state. Fixed at the Loki/Storybook boundary with a per-story settle gate and re-recorded references; see [[Current State - Known Issues]].

### Storybook, Jest, and Playwright batch (issue #1036)

Landed together as the shared test/visual-regression toolchain, each kept inside its current major:

| Package family                                                                | From      | To        |
| ----------------------------------------------------------------------------- | --------- | --------- |
| Storybook (`storybook`, `@storybook/angular`, `@storybook/addon-docs`)        | `10.1.11` | `10.5.2`  |
| `eslint-plugin-storybook`                                                     | `10.1.11` | `10.5.2`  |
| `@chromatic-com/storybook`                                                    | `5.0.0`   | `5.2.1`   |
| Jest (`jest`, `jest-environment-jsdom`, `jest-environment-node`, `jest-util`) | `30.0.5`  | `30.4.1`  |
| `ts-jest`                                                                     | `29.4.1`  | `29.4.11` |
| `jest-preset-angular`                                                         | `16.0.0`  | `16.2.0`  |
| `@playwright/test`                                                            | `1.54.2`  | `1.61.1`  |

`@types/jest` was already at its latest `30.0.0` and is unchanged. The `@angular-devkit/build-angular` override that pins `jest`/`jest-environment-jsdom` was moved from `30.0.5` to `30.4.1` so the whole Jest set resolves to one version. No framework major changed: Storybook stays on 10, Jest on 30, `jest-preset-angular` on 16 (16.2.0 still declares `@angular/core >=19 <23`, `jest ^30`, and `typescript >=5.5`, so Angular 21 / Jest 30 / TypeScript 5.9 remain in range), and Playwright on 1.x. `jest-preset-angular@17` and `storybook@10.6`+ prereleases were deliberately not taken.

One source-level adaptation was required:

- Storybook 10.5 tightened the toolbar `globalTypes` type: `showName` was removed from `ToolbarConfig`, so `apps/storybook-host/.storybook/preview.ts` failed to compile with `TS2353`. Removed the `showName: true` entry from the `locale` toolbar; `dynamicTitle: true` already drives the selected-value title. This is Storybook manager chrome, not part of the story preview iframe Loki captures, so it does not change any visual-regression reference.

Validation run for issue #1036 (Node 24 target; run locally under Node 22 in the agent sandbox): representative Angular Jest suites (`bite-tribe/bite-data-access`, `bite-tribe/store`, `common-ui-card`) and a non-Angular suite (`utils-common`) passed through Nx (55 suites / 425 tests); the Storybook host build passed after the `preview.ts` fix; `eslint-plugin-storybook` 10.5 flat-config lint for `storybook-host` passed; Playwright `1.61.1` loaded `apps/bite-tribe-e2e/playwright.config.ts` and enumerated its five specs; `git diff --check` is clean. Serial Playwright E2E against the Firebase emulators, CI browser (re)installation, and direct Loki visual regression were deferred to CI/device runs because they need the Firebase emulators, a downloaded browser binary, and the `sharp` prebuilt binary (blocked by the sandbox egress policy, the same limitation recorded for issue #1033). The Storybook build that Loki consumes is green and no story-facing render changed.

## Phase 4 - Angular 22

Status: complete (issue #1037). Angular, NgRx, and TypeScript moved to their next majors as one coordinated set on 24 August 2026, the day stable NgRx `22.0.0` was published and the last declared prerequisite closed. Every prerequisite below was satisfied on its own published version range; no peer override was added to force the set together.

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

### Angular 22, NgRx 22, and TypeScript 6 batch (issue #1037)

| Package family                                                                                    | From                | To        |
| ------------------------------------------------------------------------------------------------- | ------------------- | --------- |
| Angular framework (`core`, `common`, `compiler`, `forms`, `router`, `localize`, ...)              | `21.2.18`           | `22.1.3`  |
| Angular CLI, Devkit, `@angular/build`, `pwa`, `@schematics/angular`                               | `21.2.19`           | `22.1.5`  |
| `@angular/compiler-cli`, `@angular/language-service`                                              | `21.2.18`           | `22.1.3`  |
| `@angular/material`, `@angular/cdk`, `@angular/cdk-experimental`                                  | `21.2.14`           | `22.1.3`  |
| All `@ngrx/*` packages, `@ngrx/schematics`, `@ngrx/store-devtools`                                | `21.1.1`            | `22.0.0`  |
| `typescript`                                                                                      | `5.9.3`             | `6.0.3`   |
| `angular-eslint`                                                                                  | `21.1.0`            | `22.1.0`  |
| `typescript-eslint`, `@typescript-eslint/{eslint-plugin,parser,utils}`                            | `8.51.0` / `8.53.1` | `8.68.0`  |
| Storybook (`storybook`, `@storybook/angular`, `@storybook/addon-docs`, `eslint-plugin-storybook`) | `10.5.2`            | `10.5.10` |

Each Angular and NgRx family was moved with `nx migrate <package>@<version>`; no raw `npm update` was used.

Two packages entered the batch because TypeScript 6 forces them, not because Angular 22 does:

- `typescript-eslint` and its three sibling packages peered `typescript >=4.8.4 <6.0.0` up to `8.53`. `8.60.0` widened that to `<6.1.0`, so the trio moved to the current `8.68.0`. The existing `overrides` entry pinning `@typescript-eslint/parser` under `@typescript-eslint/eslint-plugin` was retargeted to the same version rather than dropped, so the single-parser mechanism from issue #1039 still holds.
- Storybook declared `typescript ^4.9.0 || ^5.0.0` through `10.5.4` and added `|| ^6.0.0` in `10.5.5`. The family moved to `10.5.10`, still inside Storybook 10. `@chromatic-com/storybook` stays `5.2.1`; it is unaffected.

`zone.js` stays `0.16.0`: the Angular migration selected no change and Angular 22 peers `~0.15.0 || ~0.16.0`. `jest-preset-angular` stays `16.2.0`, which already declares `@angular/core >=19.0.0 <23.0.0`, `jest ^30`, and `typescript >=5.5`; `jest-preset-angular@17` was again not taken. `@ionic/angular` (`8.8.14`), `@jsverse/transloco` (`8.4.0`), `@nx/*` (`23.1.0`), and `@nxext/capacitor` (`23.0.0`) all needed no change, because their declared ranges already admit Angular 22. TypeScript 7 was not installed.

All thirteen generated Angular migrations ran. The two optional ones were excluded under Migration Principle 4: `use-application-builder` (the workspace builds through Nx executors) and `migrate-karma-to-vitest` (the workspace tests with Jest). Four applied migrations changed files:

- `change-detection-eager` pinned the six components without an explicit `changeDetection` and two spec host components to `ChangeDetectionStrategy.Eager`, preserving the pre-v22 default. The other 141 components already declared `OnPush`.
- `strict-safe-navigation-narrow` suppressed the `nullishCoalescingNotNullable` and `optionalChainNotNullable` extended diagnostics across the project tsconfigs, so Angular 22's improved safe-navigation narrowing does not surface as new diagnostics.
- `safe-optional-chaining` wrapped optional chaining in ten templates with `$safeNavigationMigration()`, so `a?.b` keeps evaluating to `null` rather than v22's `undefined`.
- `strict-templates-default` pinned `strictTemplates: false` in two spec tsconfigs that did not inherit it. Both belong to utility libraries with no Angular templates.

The last three are Angular's compatibility shims rather than the v22 behavior. They were kept so this change stays a version move with unchanged behavior; removing them is tracked separately as adoption work.

TypeScript 6 also required the two `@nx/js` migrations that Phase 2 generated and deliberately reverted, both gated on `requires: typescript >=6.0.0` and therefore inert until now: `add-ignore-deprecations-for-ts6` and `set-tsconfig-root-dir-for-ts6`. Without the first, the production build fails outright with `TS5101: Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0`.

`add-ignore-deprecations-for-ts6` wrote `"ignoreDeprecations": "6.0"` into every project tsconfig, including `apps/bite-tribe-firebase/functions/tsconfig.json` — the one project the workspace compiler does not necessarily build. That project carries its own `node_modules` with `typescript ^5.7.3`, and TypeScript 5.x rejects the value outright with `TS5103: Invalid value for '--ignoreDeprecations'`. CI never saw it, because it installs only the workspace root and the functions `tsc` therefore resolves to the workspace TypeScript 6; a developer who has installed the functions dependencies got TypeScript 5.9.3 instead, and `npm run build` inside `apps/bite-tribe-firebase/functions` failed. That build is a dependency of `bite-tribe-firebase:firebase-build`, so it blocked `nx e2e`, `npm run development`, and the `firebase deploy --only functions` predeploy hook alike. The flag was removed from that one tsconfig: unlike the Angular projects it carries no `baseUrl` and nothing else deprecated, and the config compiles clean under both TypeScript 5.9.3 and 6.0.3 without it. Do not let a future `nx migrate` put it back there. The version split between the workspace (`6.0.3`) and the functions package (`^5.7.3`) is unchanged and still decides which compiler produces a deploy artifact.

One adaptation was made beyond the migration output. Two of the components `change-detection-eager` pinned to `Eager` failed `@angular-eslint/prefer-on-push-component-change-detection`, a rule this workspace already enforces. All six production components are `OnPush`-safe by construction — `storybook-host`'s `App` holds one constant title and `NxWelcome` is a fully static template, `cv`'s `AppComponent` assigns readonly arrays once and `Technology` reads only `input()` signals, `DeleteAccount` keeps its only mutable state in a `signal()`, and `PrivacyPolicy` is signal- and computed-driven — and both applications are zoneless, so nothing outside a signal write or an explicit `markForCheck` drives change detection under either strategy. Those six therefore take the new v22 `OnPush` default. The two spec host components keep `Eager`, because their tests mutate plain fields and rely on `fixture.detectChanges()` re-rendering the host.

No production source adaptation was needed. The workspace uses none of the removed or changed APIs on either side of the upgrade: no `tapResponse` callback signature, no `data-persistence` sub-package, no `signalState` union slices (NgRx 22); and no `ChangeDetectorRef.checkNoChanges`, `ComponentFactoryResolver`, `createNgModuleRef`, `provideRoutes`, `CanMatchFn`, `TitleStrategy`, Hammer.js, JSONP, `reportProgress`, or `@angular/animations` import (Angular 22).

Validation run for issue #1037 (Node 24 target; run under Node 22 in the agent sandbox, so `npm install` used `--ignore-scripts` because the `sharp` prebuilt-binary postinstall stays blocked by the egress policy, the same limitation recorded for the earlier phases): `bite-tribe`, `bite-tribe-business`, and `cv` production builds passed; `nx run-many -t test --all` passed for all 83 projects; lint passed for `bite-tribe`, `bite-tribe-business`, `cv`, `storybook-host`, `common-ui-card`, and `bite-tribe-e2e` under `angular-eslint@22` and `typescript-eslint@8.68` (only the three pre-existing `playwright/expect-expect` warnings remain); the Firebase Functions `tsc` build is clean under TypeScript 6; the Storybook host build passed on `@storybook/angular@10.5.10`; and `git diff --check` is clean.

The three gates the sandbox could not run were then executed by CI rather than deferred. [Run 2809](https://github.com/muhammedgaygisiz/travellers-apps/actions/runs/32866446626) on commit `a6761fc` is green end to end, and its jobs cover most of the Phase 4 gate directly:

| Gate                                                 | CI job                                                                                                                                   | Result |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Full production builds for every Angular application | `bite-tribe-build`, `bite-tribe-business-build`                                                                                          | pass   |
| All focused and affected Jest suites                 | `tests` (with Codecov coverage)                                                                                                          | pass   |
| Storybook build and direct Loki visual regression    | `loki` — full suite through the upstream CLI against the committed `.loki/reference` images, headless Chrome in Docker, 4m 31s, blocking | pass   |
| Serial Playwright E2E against Firebase emulators     | `e2e` (6m 43s) and `business-e2e`                                                                                                        | pass   |
| Lint and Stylelint across the workspace              | `lint`, `stylelint`                                                                                                                      | pass   |

So Loki visual regression and both Playwright E2E suites did run for this phase, against real emulators and committed reference images, and neither reported a difference. This is the first phase of the epic where those two gates were actually executed rather than carried forward.

CI has no native job, and the Playwright suites drive headless Chromium rather than a WKWebView or an Android WebView, so the native half of the gate was executed by hand on a physical Android device. That run is recorded below. What remains genuinely unexecuted after it is iOS only: the iOS build and a WKWebView pass.

### Phase 4 Android device validation

Run on 25 August 2026 against a Samsung Galaxy A56 (`SM-A566B`, Android 16, SDK 36) on the branch head, using a production `bite-tribe` bundle built with `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED=true` and installed through `nx run bite-tribe-android:run`. The setup this needs is written down in [[Implementation - Android Device Testing]].

`nx run bite-tribe-android:sync` produced **no committed native diff**, which is the outcome issue #1038 established for a version-only move inside the Capacitor 8 family. `capacitor.build.gradle` and `variables.gradle` are unchanged, and the copied bundle is the one just built.

| Check                                                       | Result                                                                |
| ----------------------------------------------------------- | --------------------------------------------------------------------- |
| Translations in a non-English locale, force-quit cold start | pass — German and Arabic both render from their own catalogues        |
| Ionic overlays, each opened twice                           | pass — alert, toast and modal, identical on the second open           |
| The ten templates `safe-optional-chaining` rewrote          | pass on the four reachable bite-tribe surfaces; see the residue below |
| App Check enforced-mode gate                                | pass in both directions                                               |

The translation check is the one the device run existed for, and it clears the concern directly. Angular 22 makes root `HttpBackend` resolve to `FetchBackend`, and neither application calls `provideHttpClient()`, so both Transloco loaders moved from `XMLHttpRequest` to `fetch()` (see issue #1375). Inside the Capacitor WebView the loader reads `/assets/i18n/<lang>.json` off the local bundle scheme rather than over the network, which is the case Chromium never exercised. Attaching to the WebView over CDP shows `en.json` and `ar.json` both returning `200` from `https://localhost/assets/i18n/` with resource type `Fetch` rather than `XHR`. So the transport did move, and it reads the bundle scheme correctly. German and Arabic cold starts after a force-quit render their own catalogues (`Entdecken. Probieren. Teilen.` / `ابحث عنه. جربه. شاركه.`), and screens deeper in the app stay translated. A failure here would have been invisible in English, because `en` is the fallback.

Overlays were opened twice each, because Angular 22 removes styles when the associated host is dropped and Ionic builds overlays outside the Angular component tree. Alert, toast and modal were measured on both opens and were identical in background, radius, width and classes, with only Ionic's normal per-overlay `z-index` increment differing. The toast case is the stronger one: it is presented at the app root and survives the navigation that destroys the settings page which raised it.

App Check was exercised in both directions rather than only the happy path. The first launch failed Play Integrity attestation, and the enforced gate correctly blocked with its translated retry screen and no partial Firebase screens, which is the behaviour issue #933 specifies. After the debug secret was allow-listed the gate released and initial navigation resumed. The production build also strips `NX_APP_BITE_TRIBE_IS_DEV` and `NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN`, confirmed by reading the inlined `process.env` object out of the built bundle, so this genuinely ran under enforcement.

Two of the ten rewritten templates could not be exercised on the device, and neither is a gap in the upgrade:

- `libs/bite-tribe/restaurant/page/.../menu-item/menu-item.component.html` is **dead code**. Two components share the name `MenuItemComponent`; the one `category.component.ts` imports is `libs/bite-tribe/menu/page/.../menu-item/`, which carries no shim. The shimmed one is referenced only by its own spec, so it renders on no screen. That is worth folding into issue #1374 as a scope note: the shim can be deleted with the component rather than migrated.
- The onboarding identity step is unreachable on an onboarded account. Its shim is the same `@let photoUrl = $safeNavigationMigration(form.get('photoUrl')?.value)` construct as `edit-profile.page.html`, which was verified on the device. This is recorded as inferred, not observed.

The four surfaces that were verified against real production data are the Bite card, Bite details, profile with its header, and edit profile. Both branches of the distance binding were covered: `-` with location denied, and real values once granted. Bite details covers seven of the twenty-one shim sites in one screen, including dual-currency prices, German relative time, and the Leaflet map, whose marker paints on the device although it never does in Loki's Docker Chrome.

Two defects were found during the run and filed as `P0`, neither caused by this upgrade. The restaurant page has no loading state and offers its menu button before the restaurant document resolves (issue #1381), and the menu page has neither a loading nor a failure state, so an unresolved menu is indistinguishable from an empty one (issue #1382). Both were confirmed against unchanged code: the branch changes **zero `.ts` files**, and every component in the restaurant and menu path already declared `ChangeDetectionStrategy.OnPush` explicitly before and after, so the v22 default change does not reach them.

Two environment observations that are not defects in the app. The Gradle build requires a JDK 21 toolchain and fails on a Homebrew JDK 25 default, which [[Implementation - Store Release Steps]] documents for the release script but which the debug `:run` path had no written answer for until [[Implementation - Android Device Testing]]. And the WebView logs two `403`s from `firebase.googleapis.com/.../webConfig` and `firebaseinstallations.googleapis.com`, reading `Requests from referer https://localhost/ are blocked` — an HTTP-referrer restriction on the Firebase web API key that does not cover the Capacitor origin. Those are the Firebase JS SDK's own internal fetches and never pass through Angular's `HttpClient`, so Angular 22 cannot have caused them; Analytics falls back to the local measurement id, while Installations fails outright, which is what FCM registration depends on.

Angular 22 deprecates `@angular/animations` in favour of `animate.enter`/`animate.leave`. The package is still a direct dependency at `22.1.3` but is imported nowhere in the workspace and is an optional peer of `@angular/platform-browser`, so removing it is adoption work rather than part of this version move.

## Inferred Targets

### Jest inferred targets

Status: complete (issue #1379). The deprecated `@nx/jest:jest` executor is gone from the workspace. `@nx/jest/plugin` is registered in `nx.json` and infers one `test` target per project from its `jest.config.{ts,cts}`; 82 `project.json` files lost their Jest target and nothing replaced it in them. Nx 24 removes the executor, and this was deliberately run on the settled Nx 23 workspace rather than under the time pressure of the next major.

`nx g @nx/jest:convert-to-inferred` was run and its output reviewed rather than accepted. Two things in it were rejected:

- **It inlined the shared configuration into all 82 projects.** The generator copies the `targetDefaults` inputs, `passWithNoTests`, and the `ci` configuration into every `project.json` and leaves the now-dead `@nx/jest:jest` `targetDefaults` key behind — roughly 2,000 added lines and 83 places to edit the next time the input list changes. Instead the `targetDefaults` entry was re-keyed from `@nx/jest:jest` to `test` in the array form with `filter: { plugin: "@nx/jest/plugin" }`, which scopes it to the inferred targets and keeps it in one place.
- **It pinned the plugin to an 83-entry `include` list.** That list has to be edited by hand for every new library, and a forgotten entry means a library with tests and no `test` target. It was replaced with a two-entry `exclude`, so new libraries are covered automatically.

Decisions taken:

| Question                                 | Decision                                                                                                                                                                                                 |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Where shared Jest task config lives      | `nx.json` `targetDefaults.test`, filtered to `@nx/jest/plugin`. Target defaults outrank an inferred target's own values, so this entry — not the plugin — owns the cache inputs.                         |
| The story exclusions                     | Carried over verbatim. The plugin's own inputs do not exclude `*.stories.*`, `.storybook/**`, or `tsconfig.storybook.json`; losing them degrades cache correctness silently.                             |
| `codeCoverage` in the `ci` configuration | Renamed to `coverage`. The inferred target shells out to the `jest` CLI, which has no `--codeCoverage` flag. Nothing in CI or `package.json` runs `-c ci`, so the entry stays inert.                     |
| Jest toolchain in the cache key          | Added `externalDependencies: [jest, @nx/jest, ts-jest, jest-preset-angular]`, which the plugin computes per project. Dropping it would leave toolchain versions out of the task hash.                    |
| `apps/bite-tribe-firebase/functions`     | Excluded. It keeps its explicit `nx:run-commands` `test` target with `--runInBand`, and the `plugin` filter keeps the new target defaults off it, so it is byte-identical to before.                     |
| `apps/storybook-host`                    | Excluded. It has a Jest config and one never-run spec; inferring a target would newly enter it into CI, which is a separate decision from this conversion.                                               |
| `useInferencePlugins`                    | Stays `false`. It gates only whether generators and `nx add` register plugins automatically; it has never gated the plugins listed explicitly in `nx.json`, as the four already-registered plugins show. |

`NODE_MODULES_TO_IGNORE` was untouched. It lives inside each project's Jest config, not in the executor options, so the 63 configs that use it for `@ionic`, `@stencil`, `@capacitor`, and `@jsverse` are unaffected.

#### Jest inferred targets validation gate

Validation run for issue #1379 (Node 24.13.0 locally; the repo pins 24.18.0):

- `nx run-many -t test --all --skip-nx-cache` — 83 of 83 projects passed in 3m 37s, with no deprecation warning.
- `nx run-many -t test --all` twice more — second run populated the cache, third run was 82/83 hit in 1.4s. The one miss is `functions:test`, which was never cached before this change either.
- A story file was appended to and `nx run-many -t test --all` stayed at 82/83 hit, proving the story exclusions survived the conversion.
- Project graph diffed before and after: the same 90 projects and the same 83 `test` targets, with identical resolved `inputs`, `cache`, and coverage `outputs` for every one.
- `nx run bite-trail:test --coverage --coverageReporters=cobertura` produced `coverage/libs/bite-tribe-common/bite-trail/cobertura-coverage.xml`, matching what the CI `tests` job and Codecov expect.
- `git diff --check` is clean.

CI coverage and `nx affected` behavior over a real base still need a pipeline run to confirm; a local run cannot prove them.

### ESLint inferred targets

Status: complete (issue #1379). `@nx/eslint:lint` carries the same Nx 24 removal deadline as the Jest executor and was converted in the same change, after the deprecation was raised on the issue. 84 `project.json` files lost their `lint` target. `@nx/eslint/plugin` was already registered, so 6 projects were already running on inferred lint targets — that head start is what made the conversion's real behaviour observable before committing to it.

The now-dead `@nx/eslint:lint` `targetDefaults` entry was deleted outright rather than re-keyed the way the Jest one was. The plugin's own inputs are a superset of it: they add each project's own `eslint.config.mjs` and its tsconfig `extends` chain, and they drop `{workspaceRoot}/.eslintrc.json`, which has not existed in this workspace for some time. Editing a library's ESLint config now invalidates that library's lint cache, which the flat workspace-wide input list never did.

Three defects surfaced, all of them pre-existing and all of them latent only because the executor ran ESLint from the workspace root. They are written up as a rule in [[Architecture - Nx Workspace]]:

| Defect                                                                                                                                                                                                                                             | Fix                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `functions` infers `lint` from its own `package.json` script, `cd ../../.. && npx nx run functions:lint`, so the task invokes itself. Nx detects the loop and fails the task.                                                                      | An explicit `nx:run-commands` `lint` target in `project.json`.                        |
| The root `eslint.config.mjs` ended with two eslintrc-era blocks using the `extends` key. `files: ['*.js']` matches nothing at the workspace root, so they were dead; from a project root they match `env-var-plugin.js` and ESLint aborts the run. | Both blocks removed. Neither had ever contributed a rule.                             |
| `apps/storybook-host` ignored its gitignored Nx-graph bundle with a workspace-root-relative path that stops matching once the basePath is the project root — 12,513 errors.                                                                        | The ignore now carries both the workspace-relative and the project-relative spelling. |

`functions` also runs its ESLint from the workspace root rather than the project root, because that directory carries its own nested `node_modules` with ESLint 8.57.1; a project-root cwd resolves that copy instead of the workspace's ESLint 9.33.0 and dies on a typescript-eslint rule it cannot load.

### Storybook lint rules

Status: complete (issue #1379). Removing the dead eslintrc blocks revealed that `eslint-plugin-storybook` — installed at `^10.5.10` — had never linted anything. The old block was `extends: ['plugin:storybook/recommended']` with `files: ['*.stories.*']`, and an unprefixed glob only matches files directly in the basePath directory, never a story nested under `src`. It was reinstated as `...storybook.configs['flat/recommended']`, whose own globs are `**/`-prefixed.

Enabling it produced 25 `storybook/prefer-pascal-case` warnings across 8 story files in 6 libraries, and one hard error: `storybook/no-uninstalled-addons` resolves its `packageJsonLocation` against `process.cwd()`, which the inferred `lint` target sets to a project root that has no `package.json`. That rule is now configured in `apps/storybook-host/eslint.config.mjs`, the only project with a `.storybook/main.ts`.

All 25 exports were renamed to PascalCase. The rename does not touch a single visual reference: Storybook derives story names with `startCase`, so `imageLoaded` and `ImageLoaded` both yield `Image Loaded`, leaving the story id and every `.loki/reference` filename unchanged. This is recorded in [[Implementation - Storybook]] so a future reviewer does not mistake it for a reference-invalidating change.

#### ESLint inferred targets validation gate

- `nx run-many -t lint --all --skip-nx-cache` — 90 of 90 projects passed, with no deprecation warning.
- Findings compared project by project against a pre-conversion baseline: **0 errors and 62 warnings before, 0 errors and 62 warnings after, every project identical**. The 62 warnings are pre-existing and untouched.
- `nx run-many -t lint --all` a second time — 90/90 cache hit.
- Project graph diffed before and after: the same 90 `lint` targets, none lost, none gained, and no change to any target's `cache` flag.
- `nx run functions:lint` reports the same 17 warnings as the executor did with its `lintFilePatterns` scoping.
- `nx run-many -t test --all` re-run after the `nx.json` edit — 83 of 83 still pass, 82/83 cache hit.

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

### Capacitor 8 native stack alignment (issue #1038)

Status: complete (issue #1038). The Capacitor 8 family was moved off its mixed `8.0.0`/`8.0.1`/`8.3.0` pins onto one consistent set of compatible Capacitor 8 releases, kept separate from the Nx and Angular tracks. `@nxext/capacitor` stays on `23.0.0` (owned by the Nx track) and `@capacitor/assets` stays on `3.0.5` (a standalone asset-generation tool on its own major, not part of the Capacitor 8 runtime family).

| Package group                                                                                                                           | From                          | To      |
| --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------- |
| Capacitor core, CLI, Android, iOS (`@capacitor/core`, `/cli`, `/android`, `/ios`)                                                       | `8.0.0`                       | `8.4.2` |
| `@capacitor/app`                                                                                                                        | `8.0.0`                       | `8.1.1` |
| `@capacitor/app-launcher`                                                                                                               | `8.0.0`                       | `8.0.1` |
| `@capacitor/camera`                                                                                                                     | `8.0.0`                       | `8.2.1` |
| `@capacitor/filesystem`                                                                                                                 | `8.0.0`                       | `8.1.2` |
| `@capacitor/geolocation`                                                                                                                | `8.0.0`                       | `8.2.0` |
| `@capacitor/haptics`                                                                                                                    | `8.0.0`                       | `8.0.2` |
| `@capacitor/keyboard`                                                                                                                   | `8.0.0`                       | `8.0.5` |
| `@capacitor/preferences`                                                                                                                | `8.0.0`                       | `8.0.1` |
| `@capacitor/push-notifications`                                                                                                         | `8.0.0`                       | `8.1.2` |
| `@capacitor/splash-screen`                                                                                                              | `8.0.0`                       | `8.0.2` |
| `@capacitor/status-bar`                                                                                                                 | `8.0.0`                       | `8.0.3` |
| `@capacitor/network`, `@capacitor/share`                                                                                                | `8.0.1`                       | `8.0.1` |
| `@capawesome/capacitor-file-picker`                                                                                                     | `8.0.1`                       | `8.0.3` |
| All eight `@capacitor-firebase/*` plugins (analytics, app-check, authentication, crashlytics, firestore, functions, messaging, storage) | mixed `8.0.0`/`8.0.1`/`8.3.0` | `8.3.0` |

The eight `@capacitor-firebase/*` plugins were the only real drift risk: they were spread across `8.0.0`, `8.0.1`, and `8.3.0`, and are now on one release family (`8.3.0`). `@capacitor-firebase/*@8.3.0` peers `@capacitor/core >=8.0.0` (satisfied by `8.4.2`) and `firebase ^12.6.0`; the installed `firebase@12.6.0` and the existing `overrides` that pin `firebase` to `12.6.0` for the Firebase plugins both stay valid, so no `firebase` change was needed on this track (that is the separate issue #1034 backend/client track).

Version pins live only in the root `package.json`; both wrapper `package.json` files (`apps/bite-tribe-android`, `apps/bite-tribe-ios`) reference the root `node_modules` by path, and the committed native manifests (`capacitor.settings.gradle`, `capacitor.build.gradle`, `Podfile`) reference each plugin by path rather than by version. Because no plugin was added or removed, a version-only bump within the Capacitor 8 family produces no native manifest diff.

One source-level adaptation was required. `@capacitor/geolocation@8.2.0` added four fields to `Position.coords` (`magneticHeading`, `trueHeading`, `headingAccuracy`, `course`, each `number | null | undefined`, populated only during `watchPosition`). The details page Storybook story (`libs/bite-tribe/details/page/.../details.page.stories.ts`) builds a mock position with `satisfies Position`, so the missing keys failed the Storybook build with a `TS2739` compile error, which in turn failed the Loki visual-regression CI job that consumes that build. Added the four keys as `null` (correct for a static, non-watch position); no visual reference changed. Production code was unaffected because `libs/bite-tribe/home/data-access/src/lib/home-data-access.service.ts` constructs its geolocation object with an `as GeolocationPosition` cast, and the `.spec.ts` position mocks are not type-checked by the Storybook build.

The tracked changes are therefore `package.json`, `package-lock.json`, and the one story mock.

Validation run for issue #1038 (Node 24 target; run under Node 22 in the agent sandbox): `npm install` regenerated `package-lock.json` with every Capacitor 8 package resolved to the aligned versions above (the `sharp` prebuilt-binary postinstall stayed blocked by the sandbox egress policy, the same environmental limitation recorded for issues #1030/#1033, so the lockfile was settled with `--ignore-scripts`); `npx cap doctor` reports installed `@capacitor/{cli,core,android,ios}` at `8.4.2` matching latest with no problems; `npx cap update` from `apps/bite-tribe-android` enumerated all 22 Capacitor plugins at the aligned versions and rewrote the Android plugin manifests with no committed diff (it only failed writing the gitignored build-time `android/app/src/main/assets/capacitor.plugins.json`, which is not part of the committed tree); `git diff --check` is clean. Full `cap sync` copy (needs the web build in `dist/apps/bite-tribe`), the iOS `pod install`, and the Android/iOS device builds and Firebase-integration smoke checks were deferred to CI/device runs because they need the native toolchains, CocoaPods, and a macOS/Android build host, consistent with the deferrals recorded for the earlier phases.

### Firebase client and backend tooling (issue #1034)

Status: complete (issue #1034). The Firebase web client, the Functions/CLI tooling, and the Admin SDK backend major were upgraded as three separate commits by risk under the tracking issue, and kept off the Nx and Angular tracks.

| Package                   | From     | To        | Track / risk                                |
| ------------------------- | -------- | --------- | ------------------------------------------- |
| `firebase` (web client)   | `12.6.0` | `12.16.0` | Frontend, within major 12                   |
| `firebase-functions`      | `7.0.3`  | `7.3.0`   | Backend tooling, within major 7             |
| `firebase-tools`          | `15.2.1` | `15.24.0` | Backend tooling, within major 15            |
| `firebase-functions-test` | `3.4.1`  | `3.5.0`   | Backend dev tooling, within major 3         |
| `firebase-admin`          | `13.6.0` | `14.2.0`  | Backend major (explicit step, API-reviewed) |

Three commits landed so their differing risk stays separately reviewable and revertible:

1. Frontend client `firebase` 12.6.0 -> 12.16.0. The six `@capacitor-firebase/*` `firebase` override pins were aligned to 12.16.0 so the plugins resolve the same hoisted client. Validated by the `bite-tribe` production build.
2. Backend tooling `firebase-functions` 7.3.0, `firebase-tools` 15.24.0, `firebase-functions-test` 3.5.0, keeping `firebase-admin` on 13 so the low-risk change stays isolated from the Admin major.
3. `firebase-admin` 13 -> 14. v14 removes the legacy `admin.*` namespace API, so all 41 namespace-using function files were migrated to the modular SDK: `admin.firestore()`/`auth()`/`messaging()`/`storage()` -> `getFirestore()`/`getAuth()`/`getMessaging()`/`getStorage()`, `admin.initializeApp`/`admin.apps` -> `initializeApp()`/`getApps()` from `firebase-admin/app`, `admin.firestore.<Type>` -> named type imports from `firebase-admin/firestore`, and the emulator-spec teardown `app?.delete()` -> `deleteApp(app)`. Unit-test mocks moved from the `firebase-admin` namespace to the matching modular subpaths (`getFirestore`/`getAuth`).

Admin 14 API review:

- v14 requires Node `>=22`; the workspace is pinned to Node 24, so the deploy runtime stays in range.
- The functions use only stable APIs (`sendEachForMulticast`, `getFirestore`, `getAuth`, `getMessaging`, `getStorage`); none of the removed InstanceID or legacy messaging surfaces are used.
- `firebase-functions-test@3.5.0` (dev-only) still peers `firebase-admin <=13`, one major behind the runtime. The published API is compatible, so `apps/bite-tribe-firebase/functions/.npmrc` mirrors the workspace root's `legacy-peer-deps=true` (the same mechanism introduced for the Nx 23 `@swc/cli` peer in Phase 2). Production function deploys omit devDependencies and never install `firebase-functions-test`, so the lag only affects local/CI test installs. Retire the setting once `firebase-functions-test` peers `firebase-admin 14`.

Validation run for issue #1034 (Node 24 target; run under Node 22 in the agent sandbox): the `bite-tribe` production build passed on `firebase@12.16.0`; from `apps/bite-tribe-firebase/functions` the `tsc` build and `eslint` are clean and Jest passed (20 suites / 121 tests) against `firebase-admin@14.2.0`; `git diff --check` is clean. Emulator-backed and native Firebase integration checks (callable, trigger, scheduled, Auth, Firestore, Storage, App Check, and messaging behavior on the emulators and devices) remain deferred to CI/device runs, consistent with the earlier phases. A full strict `tsc` over the spec files surfaces pre-existing latent type issues in the restaurant and `user-country-codes` test helpers that predate this change and are not exercised by the project's build (specs excluded) or the ts-jest `isolatedModules` runner; they are unrelated to the Firebase upgrade and were left untouched to keep the change scoped.

### Independent lint and localization tooling (issue #1039)

Status: complete (issue #1039). The remaining independent developer tooling was upgraded in three separately reviewable commits by compatible package group, kept off the Nx and Angular tracks.

| Package group                                     | From      | To                  |
| ------------------------------------------------- | --------- | ------------------- |
| Stylelint (`stylelint`)                           | `16.18.0` | `17.14.1`           |
| `stylelint-config-standard`                       | `38.0.0`  | `40.0.0`            |
| `stylelint-config-standard-scss`                  | `14.0.0`  | `17.0.0`            |
| `nx-stylelint`                                    | `18.0.0`  | `19.0.0`            |
| `@jsverse/transloco`                              | `7.6.1`   | `8.4.0`             |
| `@commitlint/cli`, `@commitlint/config-nx-scopes` | `19.8.1`  | `21.2.1` / `21.2.0` |
| `prettier`                                        | `3.6.2`   | `3.9.5`             |
| `commitizen`                                      | `4.3.1`   | `4.3.2`             |
| `lint-staged`                                     | `16.1.5`  | `17.1.0`            |
| `eslint-plugin-playwright`                        | `1.8.3`   | `2.10.5`            |
| `jsonc-eslint-parser`                             | `^2.1.0`  | `^3.1.0`            |

Three source-level adaptations were required:

- **Stylelint group.** `nx-stylelint@19` requires `stylelint@^17` (and `stylelint-config-standard >=40`, `stylelint-config-standard-scss >=17`), but it also moved `@nx/devkit` from a permissive `>=19.0.0` dependency to a pinned `^22.0.0`, which would nest an `@nx/devkit@22` generation under the hoisted `23.1.0`. An `overrides` entry (`nx-stylelint` -> `@nx/devkit@23.1.0`) keeps the workspace on a single Nx generation. Only the `nx-stylelint:lint` executor is used (the inference plugin is not registered in `nx.json`), and it consumes stable devkit utilities, so the override is safe. All five styled projects (`common-ui-page`, `password-validator`, `common-ui-coach-mark`, `auth`, `common-ui-card`) lint clean.
- **Transloco.** v8 pulls in a new ESM-only transitive dependency (`@jsverse/utils`, `type: module` with a `.js` entry). Jest does not transform `node_modules` by default, so every spec importing Transloco failed to parse it. `@jsverse` was added to the existing `NODE_MODULES_TO_IGNORE` transform allow-list (the same mechanism already used for `@ionic`/`@stencil`/`@capacitor`) in the 63 project Jest configs that define it. The app uses only stable Transloco APIs (`provideTransloco`, `TranslocoLoader`, `TranslocoPipe`, `TranslocoService` with `translate`/`langChanges$`/`getActiveLang`/`setActiveLang`, `Translation`); there is no `TRANSLOCO_SCOPE`/scoped-lazy usage, so lazy loading remains the single-file HTTP loader per language.
- **Prettier.** Prettier 3.7+ collapses short union/`extends` types that fit within `printWidth` onto one line. Eight source files were reformatted to that rule so the bump introduces no new formatting debt; the pre-existing unformatted files (identical count under 3.6.2 and 3.9.5) were left untouched as unrelated debt.

`nx-mcp` was kept at `0.3.0` (see the dependency inventory table): its intended use is unverified, it has no `nx`/`@nx` dependency, and no committed MCP config or script references it, so it was not upgraded to `0.25.0`.

Validation run for issue #1039 (Node 24 target; run under Node 22 in the agent sandbox, so `npm install` used `--ignore-scripts` because the `sharp` prebuilt-binary postinstall stays blocked by the egress policy, the same limitation recorded for the earlier phases): all five `stylelint` targets pass with no nested `@nx/devkit`; `nx run-many -t test --all` passes for all 81 projects (including component specs that render the Transloco pipe); the `bite-tribe` production build completes on Transloco 8; `nx lint bite-tribe-e2e` (eslint-plugin-playwright 2) and `nx lint push-notifications` (jsonc-eslint-parser 3) pass; commitlint 21 with config-nx-scopes 21 enforces the Nx-project scope-enum against Nx 23; `prettier --check` shows no new debt beyond the pre-existing files; lint-staged 17 loads its config; and `git diff --check` is clean. Native/emulator checks remain deferred to CI/device runs, consistent with the earlier phases.

## Completion Criteria

The roadmap is complete when:

- Nx 23 and every official `@nx/*` package are aligned.
- `@nxext/capacitor` is aligned with Nx 23.
- Cypress and the legacy Cypress project are gone.
- Playwright owns all E2E coverage.
- `nx-loki` is gone and direct `oblador/loki` commands own visual regression.
- Local and CI Node.js versions are explicitly aligned.
- Angular 22 and TypeScript 6 have landed only after their dependency prerequisites are satisfied. Done in issue #1037; every prerequisite was met on a published version range without a peer override.
- The deprecated `@nx/jest:jest` and `@nx/eslint:lint` executors are gone and both Jest and ESLint run through inferred targets. Done in issue #1379, ahead of the Nx 24 removal.
- The full validation gate is green and remaining exceptions are recorded in [[Current State - Known Issues]].

## Related Pages

- [[Current State - Roadmap]]
- [[Current State - Known Issues]]
- [[Current State - Release State]]
- [[Architecture - Nx Workspace]]
- [[Architecture - Testing]]
- [[Implementation - Testing]]
- [[Implementation - Release And Build Workflow]]
