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

## Validation Rule

Use focused Nx targets when they are reliable. If Nx daemon or graph behavior hangs, use direct Jest/build/lint commands for the touched project and still run `git diff --check`.

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
