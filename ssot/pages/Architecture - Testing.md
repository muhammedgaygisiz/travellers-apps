# Architecture - Testing

## Purpose

Testing protects feature behavior, shared UI states, store effects/selectors, Firebase API wrappers, and backend functions.

## Test Strategy

- Use focused Jest/Nx targets for touched libraries.
- Use direct Jest when Nx graph or daemon behavior is noisy.
- Update Storybook stories when shared UI states or component behavior change.
- Validate Firebase functions with focused function build/test commands when backend contracts change.
- Use Playwright as the workspace's only E2E framework for launch-critical consumer and business flows that need the real app, browser APIs, and Firebase emulators together.
- Use the upstream `oblador/loki` CLI directly for Storybook visual regression; do not couple visual testing to an Nx plugin.
- Always run `git diff --check`.

## E2E And Visual Regression Decisions

- Do not add Cypress coverage; the legacy Cypress project has been removed.
- Keep all consumer and business E2E coverage in Playwright.
- Keep Playwright emulator-backed suites serial when they share seeded users and emulator state.
- Keep Storybook as the visual fixture surface and Loki as the screenshot comparison tool.
- Invoke Loki directly through repository scripts so Nx plugin compatibility cannot block visual regression.

## Common Test Locations

```text
libs/**/__specs__
libs/**/jest.config.ts
libs/**/jest.config.cts
apps/bite-tribe-firebase/functions/src/**/*.spec.ts
apps/bite-tribe-e2e/src/tests
apps/storybook-host/.storybook
```

## Architecture Risk Areas

- Firebase callable contracts.
- Firestore query semantics.
- Store effects and selectors.
- Image upload and storage update flows.
- Auth and restored-session flows.
- Browser/emulator launch flows such as login, registration, and Bite creation.
- Shared UI components used across many pages.

## Code Anchors

```text
.codex/skills/travellers-apps/references/validation.md
libs/bite-tribe/store
libs/bite-tribe/api
apps/bite-tribe-firebase/functions
apps/bite-tribe-e2e
libs/common/ui
```

## Current Limitations

- Broad Nx commands can be slower or hang due to project graph behavior.
- Focused validation is preferred until the touched surface requires broader checks.
- The legacy `nx-loki` adapter has been removed; visual regression now runs through the upstream `oblador/loki` CLI directly, as tracked in Phase 0 of [[Current State - Nx And Dependency Migration Roadmap]]. The legacy Cypress project has also already been removed.

## Related Pages

- [[Implementation - Testing]]
- [[Current State - Nx And Dependency Migration Roadmap]]
