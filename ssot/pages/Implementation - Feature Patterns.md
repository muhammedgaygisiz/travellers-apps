# Implementation - Feature Patterns

## Purpose

Feature patterns describe the preferred shape for implementing user-facing behavior.

## Page Layer

Page libraries own visible behavior and route-level integration.

They commonly contain:

- Standalone Angular/Ionic components
- Template control flow with `@if` and `@for`
- `input()`, `output()`, and `computed()` signals
- Containers that bind route/service data to presentation components
- Integration services that handle navigation and workflow decisions

## Container Pattern

Containers should stay thin.

They should:

- Read route state or service signals
- Pass data into the component
- Route component outputs back into the integration service
- Avoid owning business rules directly

## Service Pattern

Integration services should own workflow decisions such as:

- Navigation
- Modal and alert orchestration
- Save/delete/update flows
- Calling feature data-access services
- Coordinating user actions that touch multiple dependencies

## Data-Access Pattern

Data-access libraries should own:

- Feature-local Angular resources
- Firebase callable wrappers
- Firestore reads that are local to the feature
- Feature-local request and result types
- Mapping remote payloads into feature-ready shapes

## Shared API Pattern

Use `libs/bite-tribe/api` for shared Firebase, Firestore, and Storage operations that multiple features consume.

Do not duplicate shared Firebase access logic inside unrelated feature libraries.

## Image Pattern

For Bite images, prefer this display fallback:

```text
imagePath || image || ''
```

`imagePath` often contains the usable Firebase Storage download URL.

## Related Pages

- [[Architecture - Data Access]]
- [[Architecture - State Management]]
- [[Implementation - Code Map]]
