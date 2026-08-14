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

## Scope Boundaries Between The Two Apps

`depConstraints` in `eslint.config.mjs` is what actually holds the app boundary. Both `scope:bite-tribe` and `scope:bite-tribe-business` have an entry; a scope with no entry is unconstrained, not restricted.

The two apps share the **platform** layers and nothing else:

| Shared                                                          | Not shared                                 |
| --------------------------------------------------------------- | ------------------------------------------ |
| `type:api` (one Firebase client), `type:store` (one NgRx store) | `type:feature` libraries                   |
| `type:model`, `scope:common`, `type:ui`                         | feature-local `type:data-access` libraries |

**A feature-local data-access library belongs to exactly one app.** When both apps touch the same entity, each owns its own read and write surface over the shared store and API rather than importing the other's.

This was learned the expensive way. `scope:bite-tribe-business` had no `depConstraints` entry at all until [issue #1317](https://github.com/muhammedgaygisiz/travellers-apps/issues/1317), so business libraries could import anything. Three things had drifted in under it:

- `bite-tribe/restaurant-data-access` held six restaurant **write** methods that only the business app ever called, and the business edit page imported that library to reach them — while its sibling new-restaurant page used the business one. Two services in one library, two data-access libraries, same entity.
- `libs/bite-tribe/restaurant/page` carried an unreachable duplicate of the business edit UI, container and component and service, exported from nothing and routed by nothing.
- `libs/bite-tribe-business/start` was tagged `scope:bite-tribe` despite living in the business app and being routed only by the business shell.

Adding the constraint found all three in one lint run. Two known crossings remain deliberately excused in the rule's `allow` array rather than silently permitted; each names its issue.

**A tag that disagrees with the directory is a defect.** Nothing derives the scope tag from the path, so `libs/bite-tribe-business/**` carrying `scope:bite-tribe` lints clean and quietly opts that library out of the boundary.

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
