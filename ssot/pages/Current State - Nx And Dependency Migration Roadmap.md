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

As of 18 July 2026:

| Area                | Current State                                                    | Migration Relevance                                                    |
| ------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Nx                  | `22.3.3` across the official top-level packages                  | Upgrade through the latest 22.7 release before Nx 23.                  |
| Angular             | `21.0.x`                                                         | Supported by Nx 23; retain during the Nx migration.                    |
| TypeScript          | `5.9.3`                                                          | Correct for Angular 21; retain until Angular 22.                       |
| Node.js             | Pinned to `24.15.0`+ (`24.18.0`) via `.nvmrc`, `package.json` engines, and CI `node-version-file` | Aligned and pinned (issue #1030); inside the supported Node 24 line for Nx 22.7/23 and Angular 21. |
| NgRx                | `21.0.1`                                                         | Stable NgRx 21 requires Angular 21, so it currently blocks Angular 22. |
| Capacitor Nx plugin | `@nxext/capacitor@21.0.0`                                        | Loads Nx 21 internally; upgrade to v23 with Nx 23.                     |
| Visual regression   | `loki@0.35.1` invoked directly via repository scripts; `nx-loki` removed | Nx adapter removed (issue #1040); Loki now runs through `loki.config.js`. |
| E2E                 | Playwright consumer suite; legacy Cypress business project removed | Cypress removed; place all E2E coverage in Playwright.                |

The installed dependency tree still contains multiple Nx generations because `@nxext/capacitor` loads Nx 21 (the `nx-loki` adapter, which loaded an older Nx Devkit, has been removed). This is a project-graph risk, but it is not yet proven to be the sole cause of silent Nx startup or graph stalls.

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

| Package | Installed | Older generation it loads | Decision |
| ------- | --------- | ------------------------- | -------- |
| `@nxext/capacitor` | `21.0.0` | nested `nx@21.6.10` + `@nx/devkit@21.6.10` (hard peer `nx@^21`); also pulls transitive `@nxext/common@21.0.0` with the same nested Nx 21 | Upgrade to `@nxext/capacitor@23` in Phase 2 (issue #1033) so it loads Nx 23; do not upgrade independently. |
| `@ionic/angular-toolkit` | `12.3.0` | nested `@angular-devkit/core@20.3.20` (peer `@angular-devkit/*@^20`), one generation behind the workspace's `21.0.4` | Keep; schematics-only, not an application runtime dependency. Validate generators before any Angular major bump; do not upgrade blindly. |
| `nx-stylelint` | `18.0.0` | none nested (peer `@nx/devkit >=19` satisfied by the hoisted `@nx/devkit@22.3.3`) | Keep with the Stylelint 16 configuration until the dedicated Stylelint migration track. |
| `nx-mcp` | `0.3.0` | none (no `nx`/`@nx` dependency; no repository MCP config references it) | Keep pinned as an optional developer aid; confirm intentional use before upgrading, do not upgrade merely because a newer version exists. |

Only `@nxext/capacitor`/`@nxext/common` (Nx 21) and `@ionic/angular-toolkit` (Angular Devkit 20) load an older generation; both have explicit follow-up decisions. Multiple Nx generations therefore remain in the tree solely because of `@nxext/capacitor`, which is the documented project-graph risk resolved in Phase 2.

### Phase 0 validation gate

- Nx can construct and print the project graph.
- Storybook builds.
- Direct Loki comparison and reference update commands work.
- The Playwright suite runs serially against the Firebase emulators.
- Local development and CI use the same pinned Node.js version.
- No first-party Cypress project, configuration, script, or direct dependency remains; unavoidable transitive package metadata does not count as a supported Cypress surface.
- No `nx-loki` dependency, plugin registration, script, or workflow invocation remains outside historical changelog pages.

## Phase 1 - Stabilize On Nx 22.7

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

## Phase 2 - Upgrade To Nx 23.1

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

- Angular 21.0.x to the latest supported Angular 21.2.x family.
- NgRx 21.0.x to the latest NgRx 21.x family.
- Ionic 8.7.x to the latest compatible Ionic 8.x release.
- Storybook 10.1.x to the latest compatible Storybook 10.x release.
- Jest 30.0.x and its environments/utilities to a consistent Jest 30 release.
- `jest-preset-angular` to a release supporting Angular 21, Jest 30, and the selected TypeScript version.
- Playwright to a current compatible release, followed by browser reinstallation and E2E validation.

Do not use raw `npm update` for Angular. Use Nx/Angular migrations so the Angular framework, CLI, Devkit, Material, CDK, compiler, and Zone.js remain compatible.

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
