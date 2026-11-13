# AGENTS.md

## Purpose

This repository is set up for agentic engineering.

Agents should use the SSOT before making changes so product intent, domain language, architecture decisions, implementation rules, and release state stay connected.

This contract is model-agnostic. Codex, Claude, GPT, local IDE agents, and future assistants should all follow the same SSOT workflow.

## Always Read

Every task reads these two before anything else:

- `ssot/README.md`
- `ssot/overview/agent-operating-contract.md`

## Read By Task

Then read what the task needs, and no more:

| Task                                              | Reads in addition                                                                                                           |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Feature, fix, behavioural refactor                | `ssot/overview/traceability-map.md`, `ssot/overview/feature-delivery-workflow.md`, `ssot/overview/spec-to-code-workflow.md` |
| Release                                           | `ssot/overview/release-workflow.md`                                                                                         |
| Dependency or framework migration                 | `ssot/current-state/nx-and-dependency-migration-roadmap.md`                                                                 |
| CI and build                                      | `ssot/implementation/ci-pipeline.md`                                                                                        |
| SSOT page or issue writing                        | `ssot/overview/use-case-format.md` or `ssot/overview/github-issue-format.md`, as the page requires                          |
| What happened in a past release, test run or epic | `ssot/history/`; never as the source for a current fact                                                                     |
| Anything else                                     | Nothing by default; `ssot/overview/traceability-map.md` when the task needs the page that owns a fact                       |

`CLAUDE.md`, `.github/copilot-instructions.md` and the skills in `skills/` point here and
add only what their tool needs. They are adapters to this workflow, not a second one.

## Core Rules

- Keep changes scoped to the requested surface.
- Preserve existing behavior unless the spec explicitly changes it.
- Do not revert unrelated user or agent changes.
- Prefer existing Nx library boundaries and local patterns.
- Use Transloco keys for visible UI text.
- Update every relevant locale file when adding user-facing copy.
- Adding a language means four lists, not one: Transloco locales, the Firebase Functions notification catalog, the published privacy-policy languages, and the iOS `InfoPlist.strings` variant group. Follow the checklist in `ssot/implementation/localization.md`; a missed list silently falls back to English instead of failing.
- Update Storybook when shared UI gains visible states, inputs, modes, or layout behavior.
- Use Capacitor sync commands for native wrapper dependency changes.
- Do not hand-edit a generated page. `tools/README.md` names which scripts write into `ssot/`; change the generator instead.
- A change that makes an SSOT fact untrue also removes the caveats that grew around the old one. Correcting the owning page is not the whole change; see `Superseded Facts` in `ssot/overview/agent-operating-contract.md`.

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
ssot/README.md
ssot/overview/agent-operating-contract.md
ssot/overview/traceability-map.md
ssot/overview/spec-to-code-workflow.md
ssot/overview/feature-delivery-workflow.md
ssot/overview/release-workflow.md
skills/travellers-apps/SKILL.md
skills/instagram-city-top5/SKILL.md
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
