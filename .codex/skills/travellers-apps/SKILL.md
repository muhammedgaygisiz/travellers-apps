---
name: travellers-apps
description: Repo operating guide for muhammedgaygisiz/travellers-apps. Use when implementing or validating Angular/Ionic Bite Tribe features, shared UI components, Storybook stories, Firebase functions, Capacitor native plugin changes, localization, profile/API/store/search flows, or when Nx project graph behavior affects validation.
---

# Travellers Apps

Use this skill when working in `/Users/mo/DEV/travellers-apps`. Keep changes scoped to the requested surface, preserve existing behavior unless the user asks otherwise, and prefer the repo's established Nx library boundaries.

## Reference Map

Read only the references relevant to the current task:

- [architecture.md](references/architecture.md): feature layering, implementation ownership, shared model boundaries, and common Angular/Ionic patterns.
- [validation.md](references/validation.md): focused Jest/Nx workflow, direct Jest fallback, linting, Firebase functions checks, and cheap consistency checks.
- [storybook.md](references/storybook.md): when and how to update Storybook stories, Ionic story wrappers, Storybook host Transloco setup, and Storybook validation commands.
- [capacitor.md](references/capacitor.md): native plugin dependency and sync workflow for iOS/Android wrappers.

## Core Defaults

- Inspect local status first: `git status --short --branch`.
- Read the current feature's component, container, service/data-access layer, tests, and nearby integration points before editing.
- Use Transloco keys for visible text and update every relevant app locale when adding user-facing copy.
- When a shared UI component gains a visible state, input, mode, loading/empty branch, or layout behavior, update or verify its Storybook stories as well as tests.
- Run the smallest validation that proves the touched contract. If Nx sits silent on startup, stop early and use the direct commands in [validation.md](references/validation.md).
- Always finish with `git diff --check`.

## Reporting

When finishing, report:

- Which validation commands ran.
- Whether Nx was used or bypassed, and why.
- Any warnings that appeared but did not fail the run.
- Any checks that could not be run.
