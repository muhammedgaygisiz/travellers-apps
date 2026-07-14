---
name: travellers-apps
description: Repo operating guide for muhammedgaygisiz/travellers-apps. Use when implementing or validating Angular/Ionic Bite Tribe features, shared UI components, Storybook stories, Firebase functions, Capacitor native plugin changes, localization, profile/API/store/search flows, or when Nx project graph behavior affects validation.
---

# Travellers Apps

Use this skill when working in `/Users/mo/DEV/travellers-apps`. Keep changes scoped to the requested surface, preserve existing behavior unless the user asks otherwise, and prefer the repo's established Nx library boundaries.

## Start Here

This skill is a Codex adapter to the shared, model-agnostic contract. It does not define a separate product or implementation truth. Follow these first:

1. Read `AGENTS.md`.
2. Read `ssot/pages/SSOT.md`.
3. Read `ssot/pages/Agent Operating Contract.md`.
4. Use `ssot/pages/Traceability Map.md` to connect the request to product, domain, use case, epic, architecture, implementation, testing, and release context.
5. Follow `ssot/pages/Spec To Code Workflow.md` for implementation work.
6. Follow `ssot/pages/Feature Delivery Workflow.md` for issue-to-merge work.
7. Follow `ssot/pages/Release Workflow.md` for Sunday release work.

The sections below are Codex-specific operational notes. When they seem to conflict with the SSOT, the SSOT wins.

## Reference Map

Read only the references relevant to the current task:

- [architecture.md](references/architecture.md): feature layering, implementation ownership, shared model boundaries, and common Angular/Ionic patterns.
- [validation.md](references/validation.md): focused Jest/Nx workflow, direct Jest fallback, linting, Firebase functions checks, and cheap consistency checks.
- [firebase-functions.md](references/firebase-functions.md): callable/trigger patterns, Firestore query gotchas, aggregate migrations, and operational logging.
- [storybook.md](references/storybook.md): when and how to update Storybook stories, Ionic story wrappers, Storybook host Transloco setup, and Storybook validation commands.
- [capacitor.md](references/capacitor.md): native plugin dependency and sync workflow for iOS/Android wrappers.
- [analytics.md](references/analytics.md): product event taxonomy, how to emit events, and how to check launch metrics via the `analytics:report` CLI (GA4 Data API).

## Core Defaults

- Inspect local status first: `git status --short --branch`.
- Use the authenticated `gh` CLI for GitHub issue, pull request, project, label, and status reads or writes in this repo. Connector-backed GitHub tools are only supplementary read helpers; durable issue or PR updates should go through `gh`.
- When a task starts from a GitHub issue URL/number and network is restricted, go straight to a scoped approval request for `gh issue view <number> --repo muhammedgaygisiz/travellers-apps --json number,title,body,labels,state,url` instead of first running an unauthorised network probe.
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
