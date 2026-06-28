# Architecture - Data Access

## Purpose

Data access libraries isolate feature reads, resources, API calls, and request/result mapping from page components.

## Pattern

```text
Page component
|
Container
|
Integration service
|
Data-access service
|
Store, API service, Firebase, or backend callable
```

## Responsibilities

- Load feature data.
- Own Angular `resource` loaders and params.
- Expose signals/resources to integration services.
- Delegate shared Firebase operations to `libs/bite-tribe/api`.
- Keep feature-local types near the feature.

## Code Anchors

```text
libs/bite-tribe/*/data-access
libs/bite-tribe-business/*/data-access
libs/bite-tribe/api
libs/bite-tribe/store
```

## Current Limitations

- Some feature flows still mix store-derived state and resource-derived state.
- Shared API services should stay the choke point for repeated Firestore operations.
- Backend-owned query semantics should move to Firebase Functions when needed for trust, performance, or security.
