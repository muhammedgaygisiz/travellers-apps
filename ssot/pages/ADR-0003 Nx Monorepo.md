# ADR-0003 Nx Monorepo

## Status

Accepted.

## Context

BiteTribe contains multiple apps, native wrappers, Firebase backend code, shared UI, shared domain models, feature libraries, data-access libraries, app-wide state, and tests.

The product needs focused feature ownership while still sharing common platform capabilities.

## Decision

BiteTribe uses an Nx monorepo.

Apps, libraries, backend functions, e2e projects, Storybook, and native wrapper projects live in one workspace and are organized by product surface and implementation responsibility.

## Consequences

- Feature work should happen inside the smallest owning library.
- Consumer app code lives under `libs/bite-tribe`.
- Business app code lives under `libs/bite-tribe-business`.
- Shared BiteTribe domain code lives under `libs/bite-tribe-common`.
- Shared technical capabilities live under `libs/common`.
- Nx project names should be read from `project.json` instead of inferred.
- New libraries should preferably be created with Nx generators to preserve tags, targets, path mappings, and test setup.
- Validation should use focused Nx targets or direct Jest/build/lint fallbacks when Nx graph behavior is slow or blocked.

## Trade-Offs

- A monorepo makes cross-cutting product and platform work easier to coordinate.
- Boundaries need discipline so features do not depend on each other's internals.
- Broad validation can be expensive, so targeted validation is preferred.

## Links

- [[Architecture - Nx Workspace]]
- [[Implementation - Code Map]]
- [[Implementation - Libraries]]
- [[Implementation - Testing]]
