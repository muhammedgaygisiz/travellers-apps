# Architecture - Testing

## Purpose

Testing protects feature behavior, shared UI states, store effects/selectors, Firebase API wrappers, and backend functions.

## Test Strategy

- Use focused Jest/Nx targets for touched libraries.
- Use direct Jest when Nx graph or daemon behavior is noisy.
- Update Storybook stories when shared UI states or component behavior change.
- Validate Firebase functions with focused function build/test commands when backend contracts change.
- Always run `git diff --check`.

## Common Test Locations

```text
libs/**/__specs__
libs/**/jest.config.ts
libs/**/jest.config.cts
apps/bite-tribe-firebase/functions/src/**/*.spec.ts
```

## Architecture Risk Areas

- Firebase callable contracts.
- Firestore query semantics.
- Store effects and selectors.
- Image upload and storage update flows.
- Auth and restored-session flows.
- Shared UI components used across many pages.

## Code Anchors

```text
.codex/skills/travellers-apps/references/validation.md
libs/bite-tribe/store
libs/bite-tribe/api
apps/bite-tribe-firebase/functions
libs/common/ui
```

## Current Limitations

- Broad Nx commands can be slower or hang due to project graph behavior.
- Focused validation is preferred until the touched surface requires broader checks.
