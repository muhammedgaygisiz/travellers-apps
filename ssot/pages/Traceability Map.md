# Traceability Map

- ## Purpose

  The traceability map connects the SSOT from product intent to implementation and release state.

  It should help an agent answer:

- Why does this change matter?
- Which domain does it touch?
- Which use case or epic motivates it?
- Which architecture and implementation rules constrain it?
- Which tests and release risks must be checked?
- ## End-To-End Chain

  ```text
  Vision and Mission
  |
  Principles and Decisions
  |
  Domain
  |
  Use Cases
  |
  Epics and GitHub issues
  |
  Architecture
  |
  Implementation
  |
  Tests and validation
  |
  Release state and changelog
  ```

- ## Product To Domain

  | Product Source | Connects To                                                         | Meaning                                              |
  | -------------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
  | [[Vision]]     | [[Bite]], [[Bite Trail]], [[Market Place]]                          | Defines the long-term product direction.             |
  | [[Mission]]    | [[Bite]], [[User]], [[Restaurant]], [[Bucket List]], [[Bite Trail]] | Keeps the product centered on real food experiences. |
  | [[Principles]] | [[ADR-0001 Dish First Product]]                                     | Turns product values into decision rules.            |
  | [[Glossary]]   | All domain pages                                                    | Keeps business language consistent.                  |
  | [[Personas]]   | Use Cases section in [[SSOT]]                                       | Explains who each supported workflow serves.         |

- ## Domain To Use Cases

  | Domain           | Main Use Cases                                                                                                                    |
  | ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
  | [[Bite]]         | [[UC - Create And Maintain Personal Bites]], [[UC - Discover Bites]], [[UC - Inspect Bite Details]], [[UC - Search In BiteTribe]] |
  | [[User]]         | [[UC - Manage Profile And Social Graph]], [[UC - Use Account And Legal Flows]], [[UC - Use Gamification Signals]]                 |
  | [[Restaurant]]   | [[UC - Browse Restaurants And Places]], [[UC - View Restaurant Menus]], [[UC - Maintain Restaurants In The Business App]]         |
  | [[Bucket List]]  | [[UC - Save And Rate BiteTrails Through Bucket Lists]]                                                                            |
  | [[Bite Trail]]   | [[UC - Discover BiteTrails In The Marketplace]], [[UC - Create And Operate BiteTrails In The Business App]]                       |
  | [[Market Place]] | [[UC - Discover BiteTrails In The Marketplace]], [[UC - Mature BiteTrail Marketplace Packages]]                                   |

- ## Use Cases To Open P0 Epics

  | Use Case Area                       | Epic Links                                                                        |
  | ----------------------------------- | --------------------------------------------------------------------------------- |
  | Bite creation and quality           | [[epic-907]]                                                                      |
  | New user onboarding                 | [[epic-850]]                                                                      |
  | Discovery, search, and navigation   | [[epic-735]], [[epic-738]]                                                        |
  | Restaurant and menu context         | [[epic-734]]                                                                      |
  | Marketplace and BiteTrails          | [[epic-738]]                                                                      |
  | Platform readiness and data quality | [[epic-907]], [[Current State - Known Issues]], [[Current State - Release State]] |

- ## Decisions To Constraints

  | Decision                        | Constraint                                                                                                          |
  | ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
  | [[ADR-0001 Dish First Product]] | Keep Bites as the first-class product unit. Restaurant, menu, and marketplace work should support dish discovery.   |
  | [[ADR-0002 Firebase Backend]]   | Put backend-owned query semantics, security-sensitive behavior, triggers, and scheduled work in Firebase Functions. |
  | [[ADR-0003 Nx Monorepo]]        | Put changes in the smallest owning app or library and respect Nx boundaries.                                        |

- ## Architecture To Implementation

  | Architecture Page                       | Implementation Page                                                            |
  | --------------------------------------- | ------------------------------------------------------------------------------ |
  | [[Architecture - Overview]]             | [[Implementation - Overview]], [[Implementation - Code Map]]                   |
  | [[Architecture - Firebase]]             | [[Implementation - Firebase Functions]], [[Implementation - Testing]]          |
  | [[Architecture - Nx Workspace]]         | [[Implementation - Libraries]], [[Implementation - Naming Conventions]]        |
  | [[Architecture - Capacitor]]            | [[Implementation - Testing]], [[Implementation - Release And Build Workflow]]  |
  | [[Architecture - Auth]]                 | [[Implementation - Code Map]], [[Implementation - Feature Patterns]]           |
  | [[Architecture - Storage]]              | [[Implementation - Firebase Functions]], [[Implementation - Feature Patterns]] |
  | [[Architecture - Analytics]]            | [[Implementation - Analytics Events]], [[Analytics Operations]]                |
  | [[Architecture - State Management]]     | [[Implementation - Feature Patterns]], [[Implementation - Testing]]            |
  | [[Architecture - Data Access]]          | [[Implementation - Feature Patterns]], [[Implementation - Libraries]]          |
  | [[Architecture - Internationalization]] | [[Implementation - Localization]]                                              |
  | [[Architecture - Testing]]              | [[Implementation - Testing]]                                                   |

- ## Current State To Work Selection

  | Current State Page                                      | Use In Planning                                                                                                  |
  | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
  | [[Current State - Roadmap]]                             | Prioritize launch preparation, product intelligence, public launch, and learning work.                           |
  | [[Current State - E2E Coverage]]                        | Select the next uncovered use-case journey and preserve the latest Playwright coverage state.                    |
  | [[Current State - Nx And Dependency Migration Roadmap]] | Sequence Nx, Node.js, Angular, test-tooling, and dependency upgrades without combining unrelated migration risk. |
  | [[Current State - Known Issues]]                        | Check whether a requested change touches an existing launch risk.                                                |
  | [[Current State - Open Questions]]                      | Identify unclear product, analytics, or release decisions before implementation.                                 |
  | [[Current State - Release State]]                       | Decide whether a change is launch-blocking, release-candidate work, or post-launch learning.                     |

- ## Work Output Trace

  Every implemented change should leave this trail:

  ```text
  Spec or issue
  |
  Relevant SSOT pages
  |
  Touched code and tests
  |
  Validation command output
  |
  Changelog or release note when user-facing
  ```

- ## Related Pages
- [[Spec To Code Workflow]]
- [[Agent Operating Contract]]
- [[Implementation - Testing]]
- [[Current State - Release State]]
