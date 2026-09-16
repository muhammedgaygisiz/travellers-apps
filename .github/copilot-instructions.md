# GitHub Copilot Instructions

## Purpose

This file is a GitHub Copilot entrypoint for the shared repository agent contract.

The source of truth is not Copilot-specific. Follow `AGENTS.md` and the SSOT pages under
`ssot`.

## Required Start

1. Read `AGENTS.md`.
2. Read `ssot/README.md`.
3. Read `ssot/overview/agent-operating-contract.md`.
4. Use `ssot/overview/traceability-map.md` to connect the request to product, domain, use case,
   epic, architecture, implementation, testing, and release context.
5. Follow `ssot/overview/spec-to-code-workflow.md` for implementation work.
6. Follow `ssot/overview/feature-delivery-workflow.md` for normal issue-to-merge work.
7. Follow `ssot/overview/release-workflow.md` for Sunday release work.

## Task-Scoped Guidance

Detailed guidance lives in `skills/travellers-apps/SKILL.md` and its `references/` files. Read
the reference that matches the task rather than relying on this file.

## Copilot-Specific Note

Do not treat this file as a separate workflow, and do not restate architecture, conventions,
tooling versions, or commands here. It only points Copilot to the model-agnostic SSOT contract
so Codex, Claude, Copilot, and other coding agents work from the same operating model.

Copilot also reads `AGENTS.md` directly. This file exists for the surfaces that look for
`.github/copilot-instructions.md` first.
