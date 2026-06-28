# Implementation - Storybook

## Purpose

Storybook documents and verifies reusable UI states outside the full app runtime.

It is especially important when shared UI components gain visible states, loading branches, empty states, layout modes, or new inputs.

## Location

```text
apps/storybook-host
libs/**/**/*.stories.ts
```

## When To Update Stories

Update or add stories when a change introduces:

- New shared UI component behavior
- Loading, empty, error, or disabled states
- New component inputs or outputs
- Layout variants
- Visual behavior that is hard to verify through unit tests alone

## Validation

Build Storybook when UI stories are part of the change:

```bash
npm run build:storybook
```

For local visual inspection:

```bash
npm run storybook
```

## Related Pages

- [[Implementation - Feature Patterns]]
- [[Implementation - Testing]]
