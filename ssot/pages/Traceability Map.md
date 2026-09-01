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

  | Product Source   | Connects To                                                         | Meaning                                              |
  | ---------------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
  | [[Vision]]       | [[Bite]], [[Bite Trail]], [[Market Place]]                          | Defines the long-term product direction.             |
  | [[Mission]]      | [[Bite]], [[User]], [[Restaurant]], [[Bucket List]], [[Bite Trail]] | Keeps the product centered on real food experiences. |
  | [[Principles]]   | [[ADR-0001 Dish First Product]]                                     | Turns product values into decision rules.            |
  | [[Glossary]]     | All domain pages                                                    | Keeps business language consistent.                  |
  | [[Personas]]     | Use Cases section in [[SSOT]]                                       | Explains who each supported workflow serves.         |
  | [[Monetization]] | [[Subscription]], [[Bite Trail]], [[Market Place]], [[User]]        | Defines what is sold, what stays free, and why.      |

- ## Domain To Use Cases

  | Domain           | Main Use Cases                                                                                                                    |
  | ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
  | [[Bite]]         | [[UC - Create And Maintain Personal Bites]], [[UC - Discover Bites]], [[UC - Inspect Bite Details]], [[UC - Search In BiteTribe]] |
  | [[User]]         | [[UC - Manage Profile And Social Graph]], [[UC - Use Account And Legal Flows]], [[UC - Use Gamification Signals]]                 |
  | [[Restaurant]]   | [[UC - Browse Restaurants And Places]], [[UC - View Restaurant Menus]], [[UC - Maintain Restaurants In The Business App]]         |
  | [[Bucket List]]  | [[UC - Save And Rate BiteTrails Through Bucket Lists]]                                                                            |
  | [[Bite Trail]]   | [[UC - Discover BiteTrails In The Marketplace]], [[UC - Create And Operate BiteTrails In The Business App]]                       |
  | [[Market Place]] | [[UC - Discover BiteTrails In The Marketplace]], [[UC - Mature BiteTrail Marketplace Packages]]                                   |
  | [[Floor Plan]]   | [[UC - Configure Restaurant Floor Plans And Tables]]                                                                              |
  | [[Table]]        | [[UC - Configure Restaurant Floor Plans And Tables]], [[UC - Manage Tables During Service]]                                       |
  | [[Table Visit]]  | [[UC - Manage Tables During Service]], [[UC - Order At The Table Through A QR Code]]                                              |
  | [[Subscription]] | [[UC - Subscribe To BiteTribe Pro]], [[UC - See Ads As A Free User]], [[UC - Buy A Paid BiteTrail]]                               |

- ## Use Cases To Open P0 Epics

  | Use Case Area                       | Epic Links                                                                        |
  | ----------------------------------- | --------------------------------------------------------------------------------- |
  | Bite creation and quality           | [[epic-907]]                                                                      |
  | Discovery, search, and navigation   | [[epic-738]]                                                                      |
  | Restaurant and menu context         | [[epic-734]]                                                                      |
  | Marketplace and BiteTrails          | [[epic-738]]                                                                      |
  | Platform readiness and data quality | [[epic-907]], [[Current State - Known Issues]], [[Current State - Release State]] |

- ## Restaurant Interaction Platform (post-launch)

  [[epic-735]] is the umbrella. It and its five stage epics are Priority P1, sequenced behind the P0 launch and migration work.

  | Stage                           | Epic          | Use Case                                             | Domain                          |
  | ------------------------------- | ------------- | ---------------------------------------------------- | ------------------------------- |
  | 0 Ownership and authorization   | [[epic-1069]] | [[UC - Own And Claim Restaurants]]                   | [[Restaurant]], [[User]]        |
  | 1 Floor plan and tables         | [[epic-1070]] | [[UC - Configure Restaurant Floor Plans And Tables]] | [[Floor Plan]], [[Table]]       |
  | 2 Staff table management        | [[epic-1071]] | [[UC - Manage Tables During Service]]                | [[Table]], [[Table Visit]]      |
  | 3 QR menu and ordering          | [[epic-1072]] | [[UC - Order At The Table Through A QR Code]]        | [[Table Visit]], [[Restaurant]] |
  | 4 Payment and Bites from orders | [[epic-1073]] | [[UC - Order At The Table Through A QR Code]]        | [[Table Visit]], [[Bite]]       |

  The 41 child issues (\#1074 to \#1114) have no `issue-*` pages. They are unstarted, and their specifications live on the GitHub issues; the durable product context is in the use-case and domain pages above.

  Stage 0 blocks every later stage. Stages 1 and 2 are independently shippable.

- ## Monetization (post-launch)

  [[epic-1121]] is the umbrella for the three revenue channels. It and its four stage epics are Priority P1, sequenced behind the public launch. [[Monetization]] holds the product decisions and the Free/Pro capability matrix.

  | Stage                    | Epic          | Use Case                            | Domain                           |
  | ------------------------ | ------------- | ----------------------------------- | -------------------------------- |
  | 0 Entitlement foundation | [[epic-1122]] | [[UC - Subscribe To BiteTribe Pro]] | [[Subscription]], [[User]]       |
  | 1 AdMob advertising      | [[epic-1123]] | [[UC - See Ads As A Free User]]     | [[Monetization]], [[Bite]]       |
  | 2 Pro subscriptions      | [[epic-1124]] | [[UC - Subscribe To BiteTribe Pro]] | [[Subscription]], [[User]]       |
  | 3 Paid BiteTrails        | [[epic-1125]] | [[UC - Buy A Paid BiteTrail]]       | [[Bite Trail]], [[Market Place]] |

  The 34 child issues (\#542 and \#1126 to \#1158) have no `issue-*` pages. Their specifications live on the GitHub issues; the durable product context is in the pages above.

  Stage 0 blocks stages 2 and 3. Stage 1 can run in parallel with stage 0, and only its "hide ads for Pro" child depends on it. Stage 3 additionally depends on [[epic-1069]] for the verified identity that creator payouts require.

- ## Review Conversations

  [[issue-1283]] turns the review compartment of a Bite into a thread list and extends review notifications to every participant of a conversation. [[epic-1284]] follows it with edit, delete and reporting, which threading makes necessary but does not itself answer.

  | Work           | Use Case                                                                                 | Domain             |
  | -------------- | ---------------------------------------------------------------------------------------- | ------------------ |
  | [[issue-1283]] | [[UC - Inspect Bite Details]], [[UC - Receive App Notifications And Engagement Updates]] | [[Bite]], [[User]] |
  | [[epic-1284]]  | [[UC - Inspect Bite Details]]                                                            | [[Bite]], [[User]] |

  [[issue-1283]] is implemented. [[epic-1284]] depends on it: a moderation rule for deleting a root review only has meaning once a root review can carry replies.

- ## Photo Position And The Media Permission

[[issue-1394]] moved the Android gallery path onto the single-select Photo
Picker. [[issue-1409]] follows it by moving the media location permission the
photo position depends on out of the picker and into onboarding, with recovery
surfaces in Settings and on the Bite form.

| Work           | Use Case                                                                                 | Domain             |
| -------------- | ---------------------------------------------------------------------------------------- | ------------------ |
| [[issue-1394]] | [[UC - Create And Maintain Personal Bites]]                                              | [[Bite]]           |
| [[issue-1409]] | [[UC - Create And Maintain Personal Bites]], [[UC - Guide New Users After Registration]] | [[Bite]], [[User]] |

[[issue-1409]] supersedes [[issue-1394]]'s decision to keep asking at the
picker. The permission itself is unchanged; only who asks for it moved.

## Onboarding And The Live OS Permission

[[issue-1412]] makes the onboarding location step read the OS grant it was
ignoring, so a user who has already granted location is not asked for it again.

| Work           | Use Case                                    | Domain   |
| -------------- | ------------------------------------------- | -------- |
| [[issue-1412]] | [[UC - Guide New Users After Registration]] | [[User]] |

It completes a pattern rather than starting one: issue \#1184 established that
a permission is a fact about an installation and not an account, [[issue-1394]]
applied that to the photos step, [[issue-1386]] gave notifications a Settings
surface that reflects the live state, and the location step was the one left
reconciling against a stored flag. The rule is on [[Architecture - Capacitor]].

## Own Bite Reactions

[[issue-1401]] gives a Bite creator the reaction counts on their own Bite as a read-only label, on the Bite card and on the Bite details page, and removes the client affordance to react to a Bite they created.

| Work           | Use Case                                                                   | Domain   |
| -------------- | -------------------------------------------------------------------------- | -------- |
| [[issue-1401]] | [[UC - Create And Maintain Personal Bites]], [[UC - Inspect Bite Details]] | [[Bite]] |

The rule it adds is recorded on [[Bite]]. The guard is a client affordance only; nothing in the Firestore rules or the like triggers enforces it.

- ## Decisions To Constraints

  | Decision                        | Constraint                                                                                                          |
  | ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
  | [[ADR-0001 Dish First Product]] | Keep Bites as the first-class product unit. Restaurant, menu, and marketplace work should support dish discovery.   |
  | [[ADR-0002 Firebase Backend]]   | Put backend-owned query semantics, security-sensitive behavior, triggers, and scheduled work in Firebase Functions. |
  | [[ADR-0003 Nx Monorepo]]        | Put changes in the smallest owning app or library and respect Nx boundaries.                                        |

- ## Architecture To Implementation

  | Architecture Page                       | Implementation Page                                                                                                                                                                                                                                                  |
  | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | [[Architecture - Overview]]             | [[Implementation - Overview]], [[Implementation - Code Map]]                                                                                                                                                                                                         |
  | [[Architecture - Firebase]]             | [[Implementation - Firebase Functions]], [[Implementation - Testing]]                                                                                                                                                                                                |
  | [[Architecture - Nx Workspace]]         | [[Implementation - Libraries]], [[Implementation - Naming Conventions]], [[Implementation - CI Pipeline]]                                                                                                                                                            |
  | [[Architecture - Capacitor]]            | [[Implementation - Testing]], [[Implementation - Android Device Testing]], [[Implementation - Release And Build Workflow]], [[Implementation - Store Release Steps]], [[Implementation - Store Listing Assets]], [[Implementation - Web Search And Social Metadata]] |
  | [[Architecture - Auth]]                 | [[Implementation - Code Map]], [[Implementation - Feature Patterns]]                                                                                                                                                                                                 |
  | [[Architecture - Storage]]              | [[Implementation - Firebase Functions]], [[Implementation - Feature Patterns]]                                                                                                                                                                                       |
  | [[Architecture - Analytics]]            | [[Implementation - Analytics Events]], [[Analytics Operations]]                                                                                                                                                                                                      |
  | [[Architecture - State Management]]     | [[Implementation - Feature Patterns]], [[Implementation - Testing]]                                                                                                                                                                                                  |
  | [[Architecture - Data Access]]          | [[Implementation - Feature Patterns]], [[Implementation - Libraries]]                                                                                                                                                                                                |
  | [[Architecture - Internationalization]] | [[Implementation - Localization]], [[Implementation - Firebase Functions]]                                                                                                                                                                                           |
  | [[Architecture - Testing]]              | [[Implementation - Testing]]                                                                                                                                                                                                                                         |

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
