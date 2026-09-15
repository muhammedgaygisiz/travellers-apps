# BiteTribe SSOT

The single source of truth for BiteTribe: product intent, domain language, use cases,
architecture, implementation rules, release state and decisions. Where a document
elsewhere disagrees with a page here on a fact, the page here wins.

Start with [Agent Operating Contract](overview/agent-operating-contract.md) for how to work in this
repository, and [Traceability Map](overview/traceability-map.md) to find the pages a change touches.

| Folder                                      | Holds                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------ |
| [overview/](overview/README.md)             | How work is done here: contracts, workflows, page formats                            |
| [product/](product/README.md)               | Vision, mission, principles, glossary, personas, roles, monetization                 |
| [domain/](domain/README.md)                 | The domain model, one page per aggregate                                             |
| [use-cases/](use-cases/README.md)           | Behaviour, one page per use case, per [Use Case Format](overview/use-case-format.md) |
| [architecture/](architecture/README.md)     | Structural constraints                                                               |
| [implementation/](implementation/README.md) | How the constraints are realised in code and CI                                      |
| [current-state/](current-state/README.md)   | What is true right now: roadmap, known issues, release state                         |
| [decisions/](decisions/README.md)           | ADRs and the `RD-*` decision register                                                |
| [records/](records/README.md)               | Closing records for work already done. History, not specification                    |
| [test-runs/](test-runs/README.md)           | Release-candidate execution records                                                  |
| [releases/](releases/README.md)             | Changelog and per-build pages                                                        |
| [operations/](operations/README.md)         | Running the product day to day                                                       |

## Overview

- [Agent Operating Contract](overview/agent-operating-contract.md)
- [Traceability Map](overview/traceability-map.md)
- [Recorded Decisions](decisions/recorded-decisions.md)
- [Spec To Code Workflow](overview/spec-to-code-workflow.md)
- [Feature Delivery Workflow](overview/feature-delivery-workflow.md)
- [GitHub Project Board And Issue Handling](overview/github-project-board-and-issue-handling.md)
- [GitHub Issue Format](overview/github-issue-format.md)
- [Use Case Format](overview/use-case-format.md)
- [Actogram Format](overview/actogram-format.md)
- [Release Workflow](overview/release-workflow.md)

## Product

- [Vision](product/vision.md)
- [Mission](product/mission.md)
- [Principles](product/principles.md)
- [Glossary](product/glossary.md)
- [Personas](product/personas.md)
- [User Roles](product/user-roles.md)
- [Monetization](product/monetization.md)

## Domain

- [Bite](domain/bite.md)
- [User](domain/user.md)
- [Subscription](domain/subscription.md)
- [Restaurant](domain/restaurant.md)
- [Bucket List](domain/bucket-list.md)
- [Bite Trail](domain/bite-trail.md)
- [Market Place](domain/market-place.md)
- [Floor Plan](domain/floor-plan.md)
- [Table](domain/table.md)
- [Table Visit](domain/table-visit.md)

## Use Cases

### Supported today

- [UC - Discover Bites](use-cases/uc-discover-bites.md)
- [UC - Create And Maintain Personal Bites](use-cases/uc-create-and-maintain-personal-bites.md)
- [UC - Inspect Bite Details](use-cases/uc-inspect-bite-details.md)
- [UC - Search In BiteTribe](use-cases/uc-search-in-bitetribe.md)
- [UC - Manage Profile And Social Graph](use-cases/uc-manage-profile-and-social-graph.md)
- [UC - Browse Restaurants And Places](use-cases/uc-browse-restaurants-and-places.md)
- [UC - View Restaurant Menus](use-cases/uc-view-restaurant-menus.md)
- [UC - Save And Rate BiteTrails Through Bucket Lists](use-cases/uc-save-and-rate-bitetrails-through-bucket-lists.md)
- [UC - Discover BiteTrails In The Marketplace](use-cases/uc-discover-bitetrails-in-the-marketplace.md)
- [UC - Use Gamification Signals](use-cases/uc-use-gamification-signals.md)
- [UC - Use Local Gallery Support](use-cases/uc-use-local-gallery-support.md)
- [UC - Configure Personal Settings](use-cases/uc-configure-personal-settings.md)
- [UC - Use Account And Legal Flows](use-cases/uc-use-account-and-legal-flows.md)
- [UC - Receive App Notifications And Engagement Updates](use-cases/uc-receive-app-notifications-and-engagement-updates.md)
- [UC - Maintain Restaurants In The Business App](use-cases/uc-maintain-restaurants-in-the-business-app.md)
- [UC - Create And Operate BiteTrails In The Business App](use-cases/uc-create-and-operate-bitetrails-in-the-business-app.md)
- [UC - Run Operational Migrations](use-cases/uc-run-operational-migrations.md)
- [UC - Operate BiteTribe In The Admin App](use-cases/uc-operate-bitetribe-in-the-admin-app.md)
- [UC - Harden Platform And Backend Trust](use-cases/uc-harden-platform-and-backend-trust.md)
- [UC - Detect Restaurant Candidate](use-cases/uc-detect-restaurant-candidate.md)
- [UC - Verify Restaurant Candidate](use-cases/uc-verify-restaurant-candidate.md)
- [UC - Guide New Users After Registration](use-cases/uc-guide-new-users-after-registration.md)
- [UC - Own And Claim Restaurants](use-cases/uc-own-and-claim-restaurants.md)
- [UC - Strengthen Location Currency And Data Quality Guidance](use-cases/uc-strengthen-location-currency-and-data-quality-guidance.md)
- [UC - Configure Restaurant Floor Plans And Tables](use-cases/uc-configure-restaurant-floor-plans-and-tables.md)
- [UC - Manage Tables During Service](use-cases/uc-manage-tables-during-service.md)
- [UC - Order At The Table Through A QR Code](use-cases/uc-order-at-the-table-through-a-qr-code.md)

### Next to implement

- [UC - Complete Universal Search](use-cases/uc-complete-universal-search.md)
- [UC - Contact A Restaurant And Plan A Visit](use-cases/uc-contact-a-restaurant-and-plan-a-visit.md)
- [UC - Price A BiteTrail For Sale](use-cases/uc-price-a-bitetrail-for-sale.md)
- [UC - Add BiteTrail Gamification](use-cases/uc-add-bitetrail-gamification.md)
- [UC - Improve Localization Quality](use-cases/uc-improve-localization-quality.md)
- [UC - Subscribe To BiteTribe Pro](use-cases/uc-subscribe-to-bitetribe-pro.md)
- [UC - See Ads As A Free User](use-cases/uc-see-ads-as-a-free-user.md)
- [UC - Buy A Paid BiteTrail](use-cases/uc-buy-a-paid-bitetrail.md)
- [UC - Earn From A Paid BiteTrail](use-cases/uc-earn-from-a-paid-bitetrail.md)

### Obsolete - pending deletion

- none

## Epics

Epics are GitHub issues titled `epic: …` and are **not mirrored here** - a copy drifts the
day it is written. For the current set, ask GitHub:

```bash
gh issue list -R muhammedgaygisiz/travellers-apps --search 'is:open epic: in:title'
```

Their priority is the `Priority` field on the `Bite Tribe` project board, not a label; see
[GitHub Project Board And Issue Handling](overview/github-project-board-and-issue-handling.md).
Closing records for epics that produced one are in [records/](records/README.md).

## Architecture

- [Architecture - Overview](architecture/overview.md)
- [Architecture - Firebase](architecture/firebase.md)
- [Architecture - Nx Workspace](architecture/nx-workspace.md)
- [Architecture - Capacitor](architecture/capacitor.md)
- [Architecture - Auth](architecture/auth.md)
- [Architecture - Storage](architecture/storage.md)
- [Architecture - Analytics](architecture/analytics.md)
- [Architecture - State Management](architecture/state-management.md)
- [Architecture - Data Access](architecture/data-access.md)
- [Architecture - Internationalization](architecture/internationalization.md)
- [Architecture - Testing](architecture/testing.md)

## Implementation

- [Implementation - Overview](implementation/overview.md)
- [Implementation - Code Map](implementation/code-map.md)
- [Implementation - Libraries](implementation/libraries.md)
- [Implementation - Naming Conventions](implementation/naming-conventions.md)
- [Implementation - Feature Patterns](implementation/feature-patterns.md)
- [Implementation - Performance Guidelines](implementation/performance-guidelines.md)
- [Implementation - Ionic Patterns](implementation/ionic-patterns.md)
- [Implementation - Firebase Functions](implementation/firebase-functions.md)
- [Implementation - Analytics Events](implementation/analytics-events.md)
- [Implementation - Localization](implementation/localization.md)
- [Implementation - Storybook](implementation/storybook.md)
- [Implementation - Testing](implementation/testing.md)
- [Implementation - Android Device Testing](implementation/android-device-testing.md)
- [Implementation - iOS Simulator Testing](implementation/ios-simulator-testing.md)
- [Implementation - Release And Build Workflow](implementation/release-and-build-workflow.md)
- [Implementation - Store Release Steps](implementation/store-release-steps.md)
- [Implementation - Store Listing Assets](implementation/store-listing-assets.md)
- [Implementation - Store Listing Translations](implementation/store-listing-translations.md)
- [Implementation - Brand Characters](implementation/brand-characters.md)
- [Implementation - Store Declarations](implementation/store-declarations.md)
- [Implementation - Web Search And Social Metadata](implementation/web-search-and-social-metadata.md)
- [Implementation - Social Media Channels](implementation/social-media-channels.md)
- [Implementation - CI Pipeline](implementation/ci-pipeline.md)

## Decisions

- [ADR-0001 Dish First Product](decisions/adr-0001-dish-first-product.md)
- [ADR-0002 Firebase Backend](decisions/adr-0002-firebase-backend.md)
- [ADR-0003 Nx Monorepo](decisions/adr-0003-nx-monorepo.md)

## Operations

- [Analytics Operations](operations/analytics-operations.md)

## Current State

- [Current State - Roadmap](current-state/roadmap.md)
- [Current State - Product Direction](current-state/product-direction.md)
- [Current State - E2E Coverage](current-state/e2e-coverage.md)
- [Current State - Nx And Dependency Migration Roadmap](current-state/nx-and-dependency-migration-roadmap.md)
- [Current State - Known Issues](current-state/known-issues.md)
- [Current State - Open Questions](current-state/open-questions.md)
- [Current State - Release State](current-state/release-state.md)
- [Current State - Release Candidate Test Charter](current-state/release-candidate-test-charter.md)

## Releases

- [Changelog](releases/changelog.md)

[#735]: https://github.com/muhammedgaygisiz/travellers-apps/issues/735
[#738]: https://github.com/muhammedgaygisiz/travellers-apps/issues/738
[#907]: https://github.com/muhammedgaygisiz/travellers-apps/issues/907
[#1070]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1070
[#1071]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1071
[#1072]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1072
[#1073]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1073
[#1121]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1121
[#1122]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1122
[#1123]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1123
[#1124]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1124
[#1125]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1125
