# Architecture - Nx Workspace

## Purpose

Nx organizes BiteTribe into apps and focused libraries so product features, shared UI, native wrappers, backend functions, and tests can evolve independently.

## Apps

```text
apps/bite-tribe
apps/bite-tribe-business
apps/bite-tribe-firebase
apps/bite-tribe-ios
apps/bite-tribe-android
apps/bite-tribe-e2e
apps/bite-tribe-business-e2e
apps/storybook-host
```

## Library Families

```text
libs/bite-tribe
libs/bite-tribe-business
libs/bite-tribe-common
libs/common
```

## Feature Library Pattern

- `page` libraries own presentation, containers, and workflow services.
- `data-access` libraries own feature reads, resources, and feature-local request/result shapes.
- `api` owns shared Firebase and Firestore operations.
- `store` owns app-wide NgRx state and derived state.
- `common/ui` owns reusable UI components.
- `common/utils` owns cross-cutting helpers and shared paths.

## Boundary Rule

Prefer existing library boundaries over new abstractions. Add a new abstraction only when it removes real complexity or matches an existing local pattern.

## Bundle Budget Rule

`apps/bite-tribe` enforces an initial bundle budget of 3 MB (error) and 500 kB (warning). The error budget fails the production build in CI.

Every consumer route is lazy through `loadComponent`. A route that references its component statically pulls that component's whole dependency chain into the initial bundle, so route components should stay lazy.

Keep large optional dependencies out of the initial bundle at their source rather than through routing. Import them on demand inside the function that needs them:

```ts
const { default: heic2any } = await import('heic2any');
```

This is preferred over lazy routing because it benefits every consumer of the shared library at once. Loading `heic2any` on demand removed roughly 1.4 MB from the initial bundle and helps every feature that uploads an image.

## Lazy Library Rule

Nx forbids statically importing a library that is also lazily loaded (`@nx/enforce-module-boundaries`: _"Static imports of lazy-loaded libraries are forbidden"_). The rule applies per **project**, not per file, so a second entry point inside the same project does not satisfy it.

Route guards must be imported statically to build the route config. A lazily loaded feature library therefore cannot also export that route's guards: the guards belong in their own project. `bite-tribe/onboarding-guards` is the split that exists for this pattern.

Before reaching for lazy routing to fix a bundle, prefer the on-demand dependency import above: it is cheaper, has no module-boundary consequences, and helps every consumer.

## Validation Rule

Use focused Nx targets when they are reliable. If Nx daemon or graph behavior hangs, use direct Jest/build/lint commands for the touched project and still run `git diff --check`.

## Toolchain Direction

- Keep `nx` and all official `@nx/*` packages on one exact version.
- Use Playwright as the only E2E framework; the legacy Cypress project has been removed and must not be reintroduced.
- Invoke `oblador/loki` directly and do not load visual regression through an Nx plugin.
- Follow [[Current State - Nx And Dependency Migration Roadmap]] for the staged Nx 22.7, Nx 23, Node.js, and Angular migration sequence.

## Code Anchors

```text
nx.json
project.json
apps/*/project.json
libs/**/project.json
libs/bite-tribe/shell/src/lib/routes.ts
libs/bite-tribe-business/shell/src/lib/routes.ts
```

## Current Limitations

- The workspace is broad, so targeted validation is preferred over broad test runs.
- Some shared models and data-access boundaries are still evolving as product domains become clearer.

## Related Pages

- [[Architecture - Testing]]
- [[Implementation - Testing]]
- [[Implementation - CI Pipeline]]
- [[Current State - Nx And Dependency Migration Roadmap]]
