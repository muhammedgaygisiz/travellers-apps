# Architecture - Overview

## Purpose

The architecture of BiteTribe is a modular Nx workspace around Angular, Ionic, Capacitor, Firebase, and shared domain libraries.

It should keep product features isolated enough for focused changes while still sharing the common domain model, store, Firebase access, UI components, and native capabilities.

## Shape

Every directory directly under `apps/` and `libs/` is named below. `npm run check:ssot`
fails (rule `BLOCKS`) when one is added without being named here, so this view cannot fall
behind the workspace unnoticed. The scope is the `scope:*` tag in the project's
`project.json`; [Architecture - Nx Workspace](nx-workspace.md) explains what the tags enforce,
and [Implementation - Code Map](../implementation/code-map.md) goes down to the single
library.

### Apps

| Path                           | Role                                                                                                             | Scope                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `apps/bite-tribe`              | The consumer app: the web app, and the bundle the native wrappers ship                                           | `scope:bite-tribe`                                   |
| `apps/bite-tribe-business`     | The business app, where restaurant owners and staff maintain their restaurants and run the service floor         | `scope:bite-tribe-business`                          |
| `apps/bite-tribe-admin`        | The admin app, the internal operations tool of the BiteTribe Operator                                            | `scope:bite-tribe-admin`                             |
| `apps/bite-tribe-firebase`     | The backend: Firestore and Storage rules, indexes and emulator setup, and the Cloud Functions under `functions/` | none on the project; `scope:firebase` on `functions` |
| `apps/bite-tribe-ios`          | The Capacitor iOS wrapper of the consumer app                                                                    | `scope:bite-tribe`                                   |
| `apps/bite-tribe-android`      | The Capacitor Android wrapper of the consumer app                                                                | `scope:bite-tribe`                                   |
| `apps/bite-tribe-e2e`          | Playwright end-to-end tests of the consumer app                                                                  | `scope:bite-tribe`                                   |
| `apps/bite-tribe-business-e2e` | Playwright end-to-end tests of the business app                                                                  | `scope:bite-tribe-business`                          |
| `apps/storybook-host`          | Storybook for the shared and feature UI states, and the visual regression baseline                               | `scope:bite-tribe`                                   |

### Library Families

| Path                       | Role                                                                                                            | Scope                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `libs/bite-tribe`          | The consumer features, and the platform layers every app shares: `libs/bite-tribe/api`, `libs/bite-tribe/store` | `scope:bite-tribe`          |
| `libs/bite-tribe-business` | The business app's features                                                                                     | `scope:bite-tribe-business` |
| `libs/bite-tribe-admin`    | The admin app's features                                                                                        | `scope:bite-tribe-admin`    |
| `libs/bite-tribe-common`   | The domain model and the BiteTribe UI more than one app uses: Bites, BiteTrails, the map, opening hours         | `scope:bite-tribe`          |
| `libs/common`              | Services and UI that know nothing of BiteTribe: Firebase bootstrap, toasts, haptics, sounds, geolocation        | `scope:common`              |

### Outside The BiteTribe Domain

| Path      | Role                                                                                                                                                                                                                             | Scope      |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `apps/cv` | A personal CV site. It shares the workspace tooling and nothing else: it imports no library under `libs/`, nothing imports it, and it deploys on its own, to its own Firebase project, through `.github/workflows/deploy-cv.yml` | `scope:cv` |

It is named so that a reader does not take it for part of the product. Nothing else in the
workspace belongs here.

### Building Blocks

```mermaid
flowchart TB
  subgraph apps["Apps"]
    consumer["bite-tribe<br/>consumer app"]
    ios["bite-tribe-ios"]
    android["bite-tribe-android"]
    business["bite-tribe-business"]
    admin["bite-tribe-admin"]
    functions["bite-tribe-firebase<br/>Cloud Functions, rules"]
  end

  subgraph libs["Library families"]
    libConsumer["libs/bite-tribe<br/>consumer features"]
    platform["libs/bite-tribe api and store<br/>shared platform layers"]
    libBusiness["libs/bite-tribe-business"]
    libAdmin["libs/bite-tribe-admin"]
    libCommonDomain["libs/bite-tribe-common<br/>model, shared BiteTribe UI"]
    libCommon["libs/common<br/>app-agnostic services and UI"]
  end

  firebase[("Firebase<br/>Auth, Firestore, Storage, Functions")]

  ios --> consumer
  android --> consumer
  consumer --> libConsumer
  business --> libBusiness
  admin --> libAdmin
  libConsumer & libBusiness & libAdmin --> platform
  libConsumer & libBusiness & libAdmin --> libCommonDomain
  libConsumer & libBusiness & libAdmin --> libCommon
  platform --> libCommon
  platform --> firebase
  functions --> firebase
```

The test, e2e and Storybook apps and `apps/cv` are left out of the diagram. What the system
talks to outside the workspace is [Architecture - Context](context.md).

## Core Principles

- Feature behavior lives in feature libraries.
- Shared domain types live in `libs/bite-tribe-common/model` only when multiple features need them.
- Shared Firebase/API access lives in `libs/bite-tribe/api`.
- App-wide client state lives in `libs/bite-tribe/store`.
- Backend-owned query semantics and side effects live in Firebase Functions.
- Native runtime concerns flow through Capacitor wrappers and sync targets.
- UI text uses Transloco keys across app locale files.

## Feature Layering

```text
page
|-- presentation components
|-- containers
|-- integration services

data-access
|-- Angular resources
|-- Firebase reads
|-- feature-local request/result shapes

api
|-- shared Firebase/Firestore services
|-- storage helpers
|-- callable wrappers

store
|-- NgRx actions
|-- reducers
|-- effects
|-- selectors
```

## Decision Rule

When adding or changing behavior, put the change in the smallest layer that owns the behavior:

- Template-only display belongs in page components.
- Navigation and user workflow belongs in integration services.
- Remote reads and feature resource params belong in data-access.
- Shared Firebase operations belong in API services.
- App-wide derived state belongs in store selectors/effects.
- Backend query semantics belong in Firebase Functions.

## Code Anchors

```text
apps/bite-tribe
apps/bite-tribe-business
apps/bite-tribe-admin
apps/bite-tribe-firebase/functions
libs/bite-tribe
libs/bite-tribe-business
libs/bite-tribe-common/model
libs/bite-tribe/api
libs/bite-tribe/store
libs/common
tools/check-ssot.mjs
```

## Related Architecture Pages

- [Architecture - Context](context.md)
- [Architecture - Nx Workspace](nx-workspace.md)
- [Architecture - Firebase](firebase.md)
- [Architecture - Capacitor](capacitor.md)
- [Architecture - Data Access](data-access.md)
- [Architecture - State Management](state-management.md)
- [Implementation - Code Map](../implementation/code-map.md)
