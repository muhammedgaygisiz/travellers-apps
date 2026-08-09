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

## Story Data Must Not Move On Its Own

Every story is a committed visual reference under `.loki/reference`, so a story
whose render depends on the wall clock fails the visual job on a calendar
boundary with no code change behind it, and the failure looks like a regression
in whatever was pushed that day.

Pin a story's time-dependent data to an **offset from now**, never to a fixed
date:

```ts
const isoAgo = (ms: number): string => new Date(Date.now() - ms).toISOString();

createdAt: isoAgo(5 * MINUTE_MS); // always renders "5 min. ago"
```

A fixed date renders a different string every time the calendar crosses the
next unit boundary. The Bite details stories carried exactly that: the relative
timestamp was measured against a hardcoded `2025-05-17` fallback, so their
references aged from `1 y ago` to `1 y 2 m ago` on their own. See issue \#1272.

Keep the offset comfortably inside its unit band, so a slow render cannot tip
it into the next one.

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
