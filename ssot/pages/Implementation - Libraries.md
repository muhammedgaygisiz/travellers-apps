# Implementation - Libraries

## Purpose

Libraries are the main unit of implementation ownership in BiteTribe.

Each library should have a clear reason to exist and should keep dependencies flowing toward stable shared surfaces, not sideways through feature internals.

## Library Types

| Library Type  | Responsibility                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------- |
| `page`        | Presentation components, containers, integration services, page tests                               |
| `data-access` | Feature reads, Angular resources, callable wrappers, feature-local DTOs                             |
| `api`         | Shared Firebase/Firestore/Storage services used by multiple features                                |
| `store`       | App-wide NgRx state, effects, selectors, and router-derived state                                   |
| `model`       | Shared domain types used by multiple apps or features                                               |
| `common/ui`   | Reusable visual components and Storybook-backed UI states                                           |
| `common/*`    | Shared technical capabilities such as geolocation, utilities, network state, and Firebase bootstrap |

## Consumer App Libraries

Consumer functionality lives under `libs/bite-tribe`.

Most feature areas use this shape:

```text
libs/bite-tribe/<feature>/page
libs/bite-tribe/<feature>/data-access
```

## Business App Libraries

Business functionality lives under `libs/bite-tribe-business`.

Business features follow the same page/data-access split where the feature has both UI workflow and remote data behavior.

## Shared Domain Libraries

Shared BiteTribe domain concepts live under `libs/bite-tribe-common`.

Use `libs/bite-tribe-common/model` only when multiple features need the same type. Keep one-off feature response shapes inside the feature data-access library.

## Adding A Library

- Prefer Nx generators so `project.json`, tags, path mappings, Jest config, and TypeScript config are created consistently.
- Compare with the nearest sibling library before hand-writing config.
- Keep import boundaries aligned with the owning domain.
- Add tests and Storybook coverage when the library introduces visible reusable UI behavior.

## Related Pages

- [[Architecture - Nx Workspace]]
- [[Implementation - Code Map]]
- [[Implementation - Naming Conventions]]
