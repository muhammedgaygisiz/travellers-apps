# Spec To Code Workflow

## Purpose

This workflow describes how an agent should move from a product/spec request to a validated code change in this repository.

It exists to make agentic engineering repeatable, traceable, safe, and model-agnostic.

Use this workflow with Codex, Claude, GPT, local IDE agents, or any other coding assistant. Tool-specific instruction files should point here instead of defining separate implementation rules.

## Step 1 - Intake

- Read the user request or GitHub issue.
- Identify whether it is product, domain, architecture, implementation, release, or cleanup work.
- If a GitHub issue or PR is referenced, fetch and read the current source before editing.
- Check local status with `git status --short --branch`.
- Do not revert unrelated local changes.
- Follow [[Agent Operating Contract]].

## Step 2 - Trace The Spec

Use [[Traceability Map]] to find the relevant SSOT chain.

Minimum trace:

```text
Mission or decision
Domain
Use case
Epic or issue
Architecture page
Implementation rule
Testing rule
Release impact
```

If the trace is missing, update the SSOT before or alongside the code change.

## Step 3 - Locate Ownership

- Find the smallest app or library that owns the behavior.
- Read the current component, container, service, data-access layer, tests, and backend/API integration before editing.
- Read the nearest `project.json` for the real Nx project name.
- Prefer existing patterns over new abstractions.

## Step 4 - Design The Change

- Keep UI-only display logic in page components.
- Keep navigation and workflow decisions in integration services.
- Keep remote reads and feature resources in data-access.
- Keep shared Firebase operations in `libs/bite-tribe/api`.
- Keep backend-owned query semantics in Firebase Functions.
- Keep shared domain types in `libs/bite-tribe-common/model` only when multiple libraries need them.
- Keep visible text in Transloco locale files.

## Step 5 - Implement

- Edit the smallest set of files that satisfies the spec.
- Preserve existing behavior unless the spec explicitly changes it.
- Add tests where the behavior contract changes.
- Update Storybook when shared UI gains visible states or layout behavior.
- Update locale files for user-facing text.
- Use Capacitor sync commands for native wrapper dependency changes.

## Step 6 - Validate

Run the smallest reliable checks for the touched surface.

Common checks:

```bash
NX_DAEMON=false npx nx test "<project-name>" --runInBand
npx jest --config path/to/jest.config.ts --runInBand
npm run build
npm run build:storybook
git diff --check
```

Validation rules:

- Use focused Nx targets when they behave.
- If Nx is silent or blocked by project graph issues, switch to direct Jest with the touched project's Jest config.
- For Firebase Functions, run build and lint from `apps/bite-tribe-firebase/functions`.
- For locale JSON changes, parse every relevant locale file.
- Always finish with `git diff --check`.

## Step 7 - Update Documentation

Update the relevant SSOT page when implementation changes the product truth, domain model, architecture rule, workflow, release state, or known issue list.

User-facing release changes should also update changelog output through the existing changelog workflow when requested.

## Step 8 - Report

Final response should include:

- What changed.
- Which files or SSOT areas were updated.
- Which validation commands ran.
- Whether Nx was used or bypassed, and why.
- Any known warnings, skipped checks, or remaining risks.

## Done Definition

A change is done when:

- The spec is traceable through SSOT or the missing trace has been added.
- The code change is scoped to the owning layer.
- Tests or focused validation prove the changed contract.
- Documentation reflects changed product or implementation truth.
- `git diff --check` passes.

## Related Pages

- [[Traceability Map]]
- [[Agent Operating Contract]]
- [[Feature Delivery Workflow]]
- [[Release Workflow]]
- [[Implementation - Code Map]]
- [[Implementation - Testing]]
- [[Architecture - Testing]]
