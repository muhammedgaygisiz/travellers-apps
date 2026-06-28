# Implementation - Overview

## Purpose

Implementation describes how BiteTribe code should be added, changed, tested, and kept consistent across the Nx workspace.

Architecture explains the system shape. Implementation explains the day-to-day rules for moving through that shape without breaking ownership boundaries.

## Default Flow

1. Find the feature library or app that owns the behavior.
2. Read the page, container, integration service, data-access layer, tests, and related backend/API code before editing.
3. Change the smallest layer that owns the behavior.
4. Add or update focused tests near the changed contract.
5. Run the smallest validation that proves the touched behavior.
6. Finish with `git diff --check`.

## Implementation Principles

- Prefer existing feature library patterns over new abstractions.
- Keep containers thin.
- Keep UI state and display logic close to page components.
- Keep workflow and navigation decisions in integration services.
- Keep remote reads, resources, and feature-local request/result shapes in data-access.
- Keep shared Firebase operations in API libraries.
- Keep backend-owned query semantics in Firebase Functions.
- Keep user-facing text in Transloco locale files.

## Primary Work Areas

```text
apps/bite-tribe
apps/bite-tribe-business
apps/bite-tribe-firebase/functions
libs/bite-tribe
libs/bite-tribe-business
libs/bite-tribe-common
libs/common
```

## Related Pages

- [[Implementation - Code Map]]
- [[Implementation - Libraries]]
- [[Implementation - Naming Conventions]]
- [[Implementation - Feature Patterns]]
- [[Implementation - Testing]]
