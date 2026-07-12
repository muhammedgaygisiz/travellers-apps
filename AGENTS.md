# AGENTS.md

## Purpose

This repository is set up for agentic engineering.

Agents should use the SSOT before making changes so product intent, domain language, architecture decisions, implementation rules, and release state stay connected.

This contract is model-agnostic. Codex, Claude, GPT, local IDE agents, and future assistants should all follow the same SSOT workflow.

## Start Here

1. Read `ssot/pages/SSOT.md`.
2. Read `ssot/pages/Agent Operating Contract.md`.
3. Use `ssot/pages/Traceability Map.md` to connect the request to product, domain, use case, epic, architecture, implementation, testing, and release context.
4. Follow `ssot/pages/Feature Delivery Workflow.md` for normal issue-to-merge work.
5. Follow `ssot/pages/Release Workflow.md` for Sunday release work.
6. Use `ssot/pages/Spec To Code Workflow.md` for implementation details.
7. Use tool-specific guidance, such as `.codex/skills/travellers-apps/SKILL.md` or `CLAUDE.md`, only as an adapter to this shared workflow.

## Core Rules

- Keep changes scoped to the requested surface.
- Preserve existing behavior unless the spec explicitly changes it.
- Do not revert unrelated user or agent changes.
- Prefer existing Nx library boundaries and local patterns.
- Use Transloco keys for visible UI text.
- Update every relevant locale file when adding user-facing copy.
- Update Storybook when shared UI gains visible states, inputs, modes, or layout behavior.
- Use Capacitor sync commands for native wrapper dependency changes.
- Keep Logseq backup pages out of the committed SSOT graph.

## Traceability Rule

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

If the chain is missing, update the SSOT as part of the work.

## Validation Rule

Run the smallest validation that proves the touched contract.

Preferred order:

1. Focused Nx target for the owning project.
2. Direct Jest/build/lint fallback when Nx is silent or blocked.
3. Specialized checks for Firebase Functions, locale JSON, Storybook, or Capacitor changes.
4. `git diff --check` before finishing.

## Important Paths

```text
ssot/pages/SSOT.md
ssot/pages/Agent Operating Contract.md
ssot/pages/Traceability Map.md
ssot/pages/Spec To Code Workflow.md
ssot/pages/Feature Delivery Workflow.md
ssot/pages/Release Workflow.md
.codex/skills/travellers-apps/SKILL.md
CLAUDE.md
apps/bite-tribe
apps/bite-tribe-business
apps/bite-tribe-firebase/functions
libs/bite-tribe
libs/bite-tribe-business
libs/bite-tribe-common
libs/common
```

## Reporting Rule

When finishing, report:

- The user-visible result.
- The validation commands that ran.
- Whether Nx was used or bypassed.
- Any warnings, skipped checks, or remaining risks.
