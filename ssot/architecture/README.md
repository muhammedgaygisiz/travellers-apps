# Architecture

Structural constraints: what the system is made of and what is not allowed to cross.

Part of the [SSOT index](../README.md).

- [Architecture - AI](ai.md)
- [Architecture - Analytics](analytics.md)
- [Architecture - Auth](auth.md)
- [Architecture - Capacitor](capacitor.md)
- [Architecture - Context](context.md)
- [Architecture - Data Access](data-access.md)
- [Architecture - Deployment](deployment.md)
- [Architecture - Environments](environments.md)
- [Architecture - Firebase](firebase.md)
- [Architecture - Internationalization](internationalization.md)
- [Architecture - Nx Workspace](nx-workspace.md)
- [Architecture - Overview](overview.md)
- [Architecture - State Management](state-management.md)
- [Architecture - Storage](storage.md)
- [Architecture - Testing](testing.md)

## arc42 Mapping

[arc42](https://arc42.org/overview) is the checklist this architecture is read against, not
its structure. The SSOT keeps its own folders, because each fact already has one owning page
and restructuring into the twelve chapters would give it a second home (epic [#2063],
`Decisions`). The table says which page answers each section; a section with no answer reads
`Gap` and names the area of the epic that closes it.

| arc42 section               | Answered by                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Introduction and goals    | [Vision](../product/vision.md), [Mission](../product/mission.md), [Principles](../product/principles.md). The quality goals are row 10                                                                                                                                                                                                                                                                                                                                                   |
| 2 Constraints               | [ADR-0002 Firebase Backend](../decisions/adr-0002-firebase-backend.md), [ADR-0003 Nx Monorepo](../decisions/adr-0003-nx-monorepo.md), [Recorded Decisions](../decisions/recorded-decisions.md), [Implementation - Store Declarations](../implementation/store-declarations.md)                                                                                                                                                                                                           |
| 3 Context and scope         | [Architecture - Context](context.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 4 Solution strategy         | `Solution Strategy` in [Architecture - Overview](overview.md), which links each choice to its decision                                                                                                                                                                                                                                                                                                                                                                                   |
| 5 Building block view       | [Architecture - Overview](overview.md), [Architecture - Nx Workspace](nx-workspace.md), [Implementation - Code Map](../implementation/code-map.md)                                                                                                                                                                                                                                                                                                                                       |
| 6 Runtime view              | The flows and actograms of the [use cases](../use-cases/README.md), and `Main Flow` in [Architecture - Auth](auth.md)                                                                                                                                                                                                                                                                                                                                                                    |
| 7 Deployment view           | [Architecture - Deployment](deployment.md)                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 8 Crosscutting concepts     | [Architecture - Auth](auth.md), [Architecture - Storage](storage.md), [Architecture - Analytics](analytics.md), [Architecture - AI](ai.md), [Architecture - Internationalization](internationalization.md), [Architecture - State Management](state-management.md), [Architecture - Data Access](data-access.md), [Architecture - Capacitor](capacitor.md), [Architecture - Firebase](firebase.md), [Architecture - Environments](environments.md), [Architecture - Testing](testing.md) |
| 9 Architecture decisions    | The [ADRs](../decisions/README.md) and [Recorded Decisions](../decisions/recorded-decisions.md)                                                                                                                                                                                                                                                                                                                                                                                          |
| 10 Quality requirements     | `Gap`, closed by `Quality goals and scenarios` of epic [#2063]. Its open questions are in [Current State - Open Questions](../current-state/open-questions.md)                                                                                                                                                                                                                                                                                                                           |
| 11 Risks and technical debt | [Current State - Known Issues](../current-state/known-issues.md), and `Current Limitations` on each architecture page                                                                                                                                                                                                                                                                                                                                                                    |
| 12 Glossary                 | [Glossary](../product/glossary.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

[#2063]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2063
