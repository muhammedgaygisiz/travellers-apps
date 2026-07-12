# Agent Operating Contract

## Purpose

This page defines the model-agnostic working contract for coding agents in this repository.

It applies to Codex, Claude, GPT, local assistants, IDE agents, and any future model used for implementation, review, release, or SSOT maintenance.

## Core Contract

Every coding agent must use the SSOT before making repository changes.

The SSOT is the shared source for:

- Product intent.
- Domain language.
- Use-case boundaries.
- Epic and issue context.
- Architecture constraints.
- Implementation ownership.
- Testing expectations.
- Release state and known risks.

Tool-specific files such as `AGENTS.md`, `CLAUDE.md`, IDE rules, or agent skills are adapters. They may explain how a tool should discover the workflow, but they must not define a separate product or implementation truth.

## Required Intake

Before editing code or SSOT content, an agent must:

1. Read the user request or linked issue.
2. Fetch current GitHub issue or PR text when one is referenced.
3. Check local state with `git status --short --branch`.
4. Read [[SSOT]].
5. Use [[Traceability Map]] to identify the relevant product, domain, use-case, epic, architecture, implementation, testing, and release context.
6. Read the owning code surface before editing.

For analysis-only requests, stop after evidence gathering and report concrete findings without changing files.

## Traceability Requirement

Every implementation should be traceable through this chain:

```text
Spec or issue
|
SSOT product/domain/use-case context
|
Epic or current-state driver
|
Architecture and implementation rules
|
Touched code and tests
|
Validation result
```

If the trace is missing or outdated, update the relevant SSOT page before or alongside the implementation.

## Implementation Rules

- Keep changes scoped to the requested surface.
- Preserve existing behavior unless the spec explicitly changes it.
- Prefer existing Nx library boundaries and local patterns.
- Do not invent a parallel workflow when an existing app, migration page, callable pattern, component, or service already owns the behavior.
- Do not revert unrelated user or agent changes.
- Use Transloco keys for visible UI text and update every relevant locale file.
- Update Storybook when shared UI gains visible states, inputs, modes, or layout behavior.
- Use Capacitor sync commands for native wrapper dependency changes.
- Keep Logseq backup pages out of the committed SSOT graph.

## Validation Rules

Run the smallest validation that proves the touched contract.

Preferred order:

1. Focused Nx target for the owning project.
2. Direct Jest, build, or lint fallback when Nx is silent or blocked.
3. Specialized checks for Firebase Functions, locale JSON, Storybook, or Capacitor changes.
4. `git diff --check` before finishing.

## Reporting Rules

When finishing, report:

- The user-visible result.
- The SSOT or code areas updated.
- The validation commands that ran.
- Whether Nx was used or bypassed.
- Any warnings, skipped checks, or remaining risks.

## Related Pages

- [[SSOT]]
- [[Traceability Map]]
- [[Spec To Code Workflow]]
- [[Feature Delivery Workflow]]
- [[Release Workflow]]
- [[Implementation - Testing]]
