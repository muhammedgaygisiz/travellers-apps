# Architecture - Overview

## Purpose

The architecture of BiteTribe is a modular Nx workspace around Angular, Ionic, Capacitor, Firebase, and shared domain libraries.

It should keep product features isolated enough for focused changes while still sharing the common domain model, store, Firebase access, UI components, and native capabilities.

## Shape

```text
apps
|-- bite-tribe
|-- bite-tribe-business
|-- bite-tribe-firebase
|-- bite-tribe-ios
|-- bite-tribe-android
|-- e2e and support apps

libs
|-- bite-tribe
|-- bite-tribe-business
|-- bite-tribe-common
|-- common
```

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
apps/bite-tribe-firebase/functions
libs/bite-tribe
libs/bite-tribe-business
libs/bite-tribe-common/model
libs/bite-tribe/api
libs/bite-tribe/store
libs/common
```

## Related Architecture Pages

- [[Architecture - Nx Workspace]]
- [[Architecture - Firebase]]
- [[Architecture - Capacitor]]
- [[Architecture - Data Access]]
- [[Architecture - State Management]]
