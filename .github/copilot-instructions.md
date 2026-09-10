# GitHub Copilot Instructions

## Purpose

This file is a GitHub Copilot entrypoint for the shared repository agent contract.

The source of truth is not Copilot-specific. Follow `AGENTS.md` and the SSOT pages under
`ssot/pages`.

## Required Start

1. Read `AGENTS.md`.
2. Read `ssot/pages/SSOT.md`.
3. Read `ssot/pages/Agent Operating Contract.md`.
4. Use `ssot/pages/Traceability Map.md` to connect the request to product, domain, use case,
   epic, architecture, implementation, testing, and release context.
5. Follow `ssot/pages/Spec To Code Workflow.md` for implementation work.
6. Follow `ssot/pages/Feature Delivery Workflow.md` for normal issue-to-merge work.
7. Follow `ssot/pages/Release Workflow.md` for Sunday release work.

## Task-Scoped Guidance

Detailed guidance lives in `skills/travellers-apps/SKILL.md` and its `references/` files:
architecture, validation, Firebase functions, Storybook, Capacitor, and analytics. Read the
reference that matches the task rather than relying on this file.

## Copilot-Specific Note

Do not treat this file as a separate workflow, and do not restate architecture, conventions,
tooling versions, or commands here. It only points Copilot to the model-agnostic SSOT contract
so Codex, Claude, Copilot, and other coding agents work from the same operating model.

Copilot also reads `AGENTS.md` directly. This file exists for the surfaces that look for
`.github/copilot-instructions.md` first.
